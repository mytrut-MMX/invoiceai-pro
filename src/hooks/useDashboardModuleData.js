import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";

const CACHE_TTL = 60_000; // 60 seconds — matches useDashboardCache

// Module-level cache keyed by userId
let _moduleCache = { userId: null, data: null, ts: 0 };

/**
 * @typedef {object} DashboardModuleData
 * @property {boolean} loading
 * @property {string|null} error
 * @property {object[]|null} vatPeriods        - Recent vat_periods rows, null if not VAT registered
 * @property {object[]|null} itsaPeriods       - Recent itsa_periods rows, null if not sole trader
 * @property {object[]|null} payrollRuns       - Recent payroll_runs rows, null if no employees
 * @property {object[]} employees              - Employee rows (id + status only)
 * @property {object[]} hmrcBills              - Unpaid bills where supplier_name ILIKE 'HMRC'
 * @property {boolean} hasEmployees
 * @property {boolean} hasPayrollHistory
 * @property {boolean} isVatRegistered
 * @property {boolean} isSoleTrader
 */

const EMPTY = {
  loading: false,
  error: null,
  vatPeriods: null,
  itsaPeriods: null,
  payrollRuns: null,
  employees: [],
  hmrcBills: [],
  hasEmployees: false,
  hasPayrollHistory: false,
  isVatRegistered: false,
  isSoleTrader: false,
};

/**
 * Loads module-specific data needed by dashboard KPIs and alerts.
 * Queries run in parallel. Individual failures don't crash the hook.
 * Results cached for 60s to avoid re-fetching on tab switches.
 *
 * @param {string} userId
 * @param {object} orgSettings
 * @returns {DashboardModuleData}
 */
export function useDashboardModuleData(userId, orgSettings) {
  const [data, setData] = useState(() => {
    // Return cache if still valid
    if (_moduleCache.userId === userId && _moduleCache.data && (Date.now() - _moduleCache.ts) < CACHE_TTL) {
      return { ...EMPTY, ..._moduleCache.data, loading: false };
    }
    return { ...EMPTY, loading: true };
  });

  const orgRef = useRef(orgSettings);
  orgRef.current = orgSettings;

  useEffect(() => {
    if (!userId || !supabase) {
      setData({ ...EMPTY });
      return;
    }

    // Check cache
    if (_moduleCache.userId === userId && _moduleCache.data && (Date.now() - _moduleCache.ts) < CACHE_TTL) {
      setData({ ...EMPTY, ..._moduleCache.data, loading: false });
      return;
    }

    let cancelled = false;

    (async () => {
      setData(prev => ({ ...prev, loading: true, error: null }));
      const org = orgRef.current || {};
      const isVatRegistered = org.vatReg === "Yes";
      const isSoleTrader = org.bType === "Sole Trader / Freelancer";

      const result = {
        vatPeriods: null,
        itsaPeriods: null,
        payrollRuns: null,
        employees: [],
        hmrcBills: [],
        hasEmployees: false,
        hasPayrollHistory: false,
        isVatRegistered,
        isSoleTrader,
      };

      const errors = [];

      // Run all queries in parallel
      const [empRes, vatRes, itsaRes, hmrcRes] = await Promise.all([
        // a) employees
        (async () => {
          try {
            const { data, error } = await supabase
              .from("employees")
              .select("id, status")
              .eq("user_id", userId);
            if (error) throw error;
            return { data: data || [], error: null };
          } catch (err) {
            return { data: [], error: err?.message || "Failed to load employees" };
          }
        })(),

        // c) vat_periods
        (async () => {
          if (!isVatRegistered) return { data: null, error: null };
          try {
            const cutoff = new Date(Date.now() - 90 * 86400000).toISOString().split("T")[0];
            const { data, error } = await supabase
              .from("vat_periods")
              .select("*")
              .eq("user_id", userId)
              .gte("period_end", cutoff)
              .order("period_end", { ascending: true })
              .limit(8);
            if (error) throw error;
            return { data: data || [], error: null };
          } catch (err) {
            return { data: [], error: err?.message || "Failed to load VAT periods" };
          }
        })(),

        // d) itsa_periods
        (async () => {
          if (!isSoleTrader) return { data: null, error: null };
          try {
            const { data, error } = await supabase
              .from("itsa_periods")
              .select("*")
              .eq("user_id", userId)
              .order("period_start", { ascending: false })
              .limit(8);
            if (error) throw error;
            return { data: data || [], error: null };
          } catch (err) {
            return { data: [], error: err?.message || "Failed to load ITSA periods" };
          }
        })(),

        // e) hmrcBills
        (async () => {
          try {
            const { data, error } = await supabase
              .from("bills")
              .select("id, due_date, total, status, bill_number")
              .eq("user_id", userId)
              .ilike("supplier_name", "HMRC")
              .neq("status", "Paid")
              .order("due_date", { ascending: true });
            if (error) throw error;
            return { data: data || [], error: null };
          } catch (err) {
            return { data: [], error: err?.message || "Failed to load HMRC bills" };
          }
        })(),
      ]);

      if (cancelled) return;

      // Process employees
      result.employees = empRes.data;
      result.hasEmployees = empRes.data.length > 0;
      if (empRes.error) errors.push(empRes.error);

      // b) payroll_runs — only fetch if employees exist
      if (result.hasEmployees) {
        try {
          const { data, error } = await supabase
            .from("payroll_runs")
            .select("*")
            .eq("user_id", userId)
            .order("pay_date", { ascending: false })
            .limit(12);
          if (error) throw error;
          if (!cancelled) {
            result.payrollRuns = data || [];
            result.hasPayrollHistory = (data || []).length > 0;
          }
        } catch (err) {
          errors.push(err?.message || "Failed to load payroll runs");
          result.payrollRuns = [];
        }
      }

      if (cancelled) return;

      // Process VAT
      result.vatPeriods = vatRes.data;
      if (vatRes.error) errors.push(vatRes.error);

      // Process ITSA
      result.itsaPeriods = itsaRes.data;
      if (itsaRes.error) errors.push(itsaRes.error);

      // Process HMRC bills
      result.hmrcBills = hmrcRes.data || [];
      if (hmrcRes.error) errors.push(hmrcRes.error);

      // Update cache
      _moduleCache = { userId, data: result, ts: Date.now() };

      if (!cancelled) {
        setData({
          ...result,
          loading: false,
          error: errors.length > 0 ? errors.join("; ") : null,
        });
      }
    })();

    return () => { cancelled = true; };
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  return data;
}

/** Force cache invalidation (e.g. after payroll run or VAT submission) */
export function invalidateModuleDataCache() {
  _moduleCache = { userId: null, data: null, ts: 0 };
}
