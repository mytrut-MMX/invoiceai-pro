import { useCallback, useEffect, useState } from "react";
import { DASHBOARD_WIDGETS, getDefaultLayout } from "../utils/dashboard/widgetRegistry";

const STORAGE_KEY = "invoicesaga_dashboard_layout";
const VALID_IDS = new Set(DASHBOARD_WIDGETS.map(w => w.id));

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const cleaned = parsed
      .filter(e => e && typeof e.id === "string" && VALID_IDS.has(e.id))
      .map(e => ({ id: e.id, visible: e.visible !== false }));
    return cleaned.length ? cleaned : null;
  } catch {
    return null;
  }
}

export function useDashboardLayout() {
  const [layout, setLayout] = useState(() => readStored() || getDefaultLayout());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
    } catch {
      // storage unavailable — ignore
    }
  }, [layout]);

  const toggleWidget = useCallback((id) => {
    setLayout(prev => {
      if (prev.some(w => w.id === id)) {
        return prev.map(w => w.id === id ? { ...w, visible: !w.visible } : w);
      }
      return [...prev, { id, visible: true }];
    });
  }, []);

  const moveWidget = useCallback((id, direction) => {
    const delta = direction === "up" ? -1 : direction === "down" ? 1 : 0;
    if (!delta) return;
    setLayout(prev => {
      const idx = prev.findIndex(w => w.id === id);
      if (idx === -1) return prev;
      const target = idx + delta;
      if (target < 0 || target >= prev.length) return prev;
      const next = prev.slice();
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }, []);

  const resetLayout = useCallback(() => {
    setLayout(getDefaultLayout());
  }, []);

  return { layout, toggleWidget, moveWidget, resetLayout };
}
