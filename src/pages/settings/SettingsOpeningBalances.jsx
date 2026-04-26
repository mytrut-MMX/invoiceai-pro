import { useState, useEffect, useContext, useMemo } from "react";
import { Icons } from "../../components/icons";
import { Field, Input, Btn, InfoBox } from "../../components/atoms";
import Section from "../../components/settings/Section";
import { useToast } from "../../components/ui/Toast";
import { AppCtx } from "../../context/AppContext";
import { fetchUserAccounts } from "../../utils/ledger/fetchUserAccounts";
import { postOpeningBalances } from "../../utils/ledger/postOpeningBalances";
import { CUR_SYM } from "../../constants";

const BS_TYPES = ["asset", "liability", "equity"];
const TYPE_LABELS = { asset: "Assets", liability: "Liabilities", equity: "Equity" };

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

function defaultOpeningDate(orgSettings) {
  const fyMonth = Number(orgSettings?.financialYearStart) || 1;
  const today = new Date();
  const year = today.getMonth() + 1 >= fyMonth ? today.getFullYear() : today.getFullYear() - 1;
  const mm = String(fyMonth).padStart(2, "0");
  return `${year}-${mm}-01`;
}

export default function SettingsOpeningBalances({ orgSettings, onSave }) {
  const { toast } = useToast();
  const { user } = useContext(AppCtx);
  const currSym = CUR_SYM[orgSettings?.currency || "GBP"] || "£";

  const alreadyPosted = !!orgSettings?.openingBalances?.posted;
  const postedDate = orgSettings?.openingBalances?.openingDate || "";

  const [accounts, setAccounts]   = useState([]);
  const [userId,   setUserId]     = useState(null);
  const [loading,  setLoading]    = useState(true);
  const [balances, setBalances]   = useState({}); // { [accountId]: stringValue }
  const [openingDate, setOpeningDate] = useState(postedDate || defaultOpeningDate(orgSettings));
  const [posting,  setPosting]    = useState(false);
  const [saved,    setSaved]      = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchUserAccounts().then(({ accounts, userId }) => {
      if (cancelled) return;
      setAccounts(accounts || []);
      setUserId(userId);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!postedDate) setOpeningDate(defaultOpeningDate(orgSettings));
  }, [orgSettings?.financialYearStart]); // eslint-disable-line react-hooks/exhaustive-deps

  const balanceSheetAccounts = useMemo(
    () => (accounts || []).filter(a => BS_TYPES.includes(a.type)),
    [accounts]
  );

  const grouped = useMemo(() => {
    const out = { asset: [], liability: [], equity: [] };
    balanceSheetAccounts.forEach(a => { out[a.type].push(a); });
    return out;
  }, [balanceSheetAccounts]);

  const totals = useMemo(() => {
    let debits = 0;
    let credits = 0;
    balanceSheetAccounts.forEach(a => {
      const raw = Number(balances[a.id]);
      if (!raw || Math.abs(raw) < 0.005) return;
      const normalDebit = a.type === "asset";
      const debitSide = raw > 0 ? normalDebit : !normalDebit;
      const amount = Math.abs(raw);
      if (debitSide) debits += amount;
      else credits += amount;
    });
    return { debits: r2(debits), credits: r2(credits), diff: r2(debits - credits) };
  }, [balances, balanceSheetAccounts]);

  const handleBalanceChange = (accountId, value) => {
    setBalances(prev => ({ ...prev, [accountId]: value }));
  };

  const handlePost = async () => {
    if (!userId) {
      toast({ title: "Not signed in", variant: "danger" });
      return;
    }
    setSaveError("");
    setPosting(true);
    try {
      const payload = balanceSheetAccounts.map(a => ({
        accountId: a.id,
        balance: Number(balances[a.id]) || 0,
        type: a.type,
      }));
      const result = await postOpeningBalances(payload, accounts, userId, openingDate);
      if (!result.success) {
        setSaveError(result.error || "Failed to post opening balances");
        toast({ title: result.error || "Failed to post opening balances", variant: "danger" });
        setPosting(false);
        return;
      }
      onSave({ openingBalances: { openingDate, posted: true, postedAt: new Date().toISOString() } });
      setSaved(true);
      toast({
        title: result.duplicate ? "Opening balances already posted" : "Opening balances posted",
        variant: "success",
      });
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setSaveError(err?.message || "Something went wrong");
      toast({ title: "Failed to post opening balances", variant: "danger" });
    } finally {
      setPosting(false);
    }
  };

  return (
    <>
      <Section title="Opening date">
        <Field label="Opening date" hint="The date your balances were correct">
          <Input value={openingDate} onChange={setOpeningDate} type="date" />
        </Field>
        <InfoBox>
          Enter the date your balances were correct. This is usually the start of your financial year or the date you began using InvoiceSaga.
        </InfoBox>
      </Section>

      <Section title="Account balances">
        {loading ? (
          <p className="text-sm text-[var(--text-secondary)] m-0">Loading accounts…</p>
        ) : balanceSheetAccounts.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)] m-0">
            No balance sheet accounts found. Set up your chart of accounts first.
          </p>
        ) : (
          <>
            {BS_TYPES.map(type => grouped[type].length > 0 && (
              <div key={type} className="mb-5 last:mb-0">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] m-0 mb-2">
                  {TYPE_LABELS[type]}
                </h4>
                <div className="border border-[var(--border-subtle)] rounded-[var(--radius-md)] overflow-hidden">
                  {grouped[type].map((a, i) => (
                    <div
                      key={a.id}
                      className={[
                        "grid grid-cols-[80px_1fr_160px] items-center gap-3 px-3 py-2",
                        i < grouped[type].length - 1 ? "border-b border-[var(--border-subtle)]" : "",
                      ].join(" ")}
                    >
                      <span className="text-xs font-mono text-[var(--text-tertiary)]">{a.code}</span>
                      <span className="text-sm text-[var(--text-primary)]">{a.name}</span>
                      <Input
                        value={balances[a.id] ?? ""}
                        onChange={v => handleBalanceChange(a.id, v)}
                        type="number"
                        align="right"
                        placeholder={`${currSym}0.00`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex justify-end items-center gap-3 mt-4 pt-3 border-t border-[var(--border-subtle)] text-sm">
              <span className="text-[var(--text-secondary)]">
                Debits: <strong className="text-[var(--text-primary)]">{currSym}{totals.debits.toFixed(2)}</strong>
              </span>
              <span className="text-[var(--text-secondary)]">
                Credits: <strong className="text-[var(--text-primary)]">{currSym}{totals.credits.toFixed(2)}</strong>
              </span>
              <span className="text-[var(--text-secondary)]">
                Difference: <strong className="text-[var(--text-primary)]">{currSym}{totals.diff.toFixed(2)}</strong>
                {Math.abs(totals.diff) > 0.005 && (
                  <span className="text-[var(--text-tertiary)] ml-1">→ Retained Earnings (3100)</span>
                )}
              </span>
            </div>
          </>
        )}
      </Section>

      <Section title="Post">
        {alreadyPosted && (
          <InfoBox color="var(--warning-600)">
            Opening balances have already been posted{postedDate ? ` for ${postedDate}` : ""}.
            Re-posting will create another journal entry only if the previous one has been reversed.
          </InfoBox>
        )}
        <div className="flex flex-col items-end gap-2 mt-2">
          {saveError && (
            <div className="flex items-center gap-1.5 text-sm text-[var(--danger-600)] font-semibold">
              <Icons.Alert /> {saveError}
            </div>
          )}
          <div className="flex items-center gap-2.5">
            {saved && (
              <div className="flex items-center gap-1.5 text-sm text-[var(--success-700)] font-semibold">
                <Icons.Check /> Posted.
              </div>
            )}
            <Btn
              onClick={handlePost}
              variant={saved ? "success" : "primary"}
              icon={<Icons.Save />}
              disabled={posting || loading || balanceSheetAccounts.length === 0}
            >
              {posting ? "Posting…" : "Post Opening Balances"}
            </Btn>
          </div>
        </div>
      </Section>
    </>
  );
}
