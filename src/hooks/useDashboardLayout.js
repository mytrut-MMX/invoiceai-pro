import { useCallback, useSyncExternalStore } from "react";
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

function writeStored(layout) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  } catch {
    // storage unavailable — ignore
  }
}

let state = readStored() || getDefaultLayout();
const listeners = new Set();

function setState(next) {
  state = next;
  writeStored(state);
  listeners.forEach(l => l());
}

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getSnapshot = () => state;

export function useDashboardLayout() {
  const layout = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const toggleWidget = useCallback((id) => {
    const prev = state;
    const next = prev.some(w => w.id === id)
      ? prev.map(w => w.id === id ? { ...w, visible: !w.visible } : w)
      : [...prev, { id, visible: true }];
    setState(next);
  }, []);

  const moveWidget = useCallback((id, direction) => {
    const delta = direction === "up" ? -1 : direction === "down" ? 1 : 0;
    if (!delta) return;
    const prev = state;
    const idx = prev.findIndex(w => w.id === id);
    if (idx === -1) return;
    const target = idx + delta;
    if (target < 0 || target >= prev.length) return;
    const next = prev.slice();
    [next[idx], next[target]] = [next[target], next[idx]];
    setState(next);
  }, []);

  const resetLayout = useCallback(() => {
    setState(getDefaultLayout());
  }, []);

  return { layout, toggleWidget, moveWidget, resetLayout };
}
