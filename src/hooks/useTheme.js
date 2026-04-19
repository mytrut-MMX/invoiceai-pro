import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "invoicesaga_theme";
const VALID = ["light", "dark", "system"];

function readStoredTheme() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return VALID.includes(v) ? v : "system";
  } catch {
    return "system";
  }
}

function getSystemTheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolve(theme) {
  return theme === "system" ? getSystemTheme() : theme;
}

export function useTheme() {
  const [theme, setThemeState] = useState(readStoredTheme);
  const [resolvedTheme, setResolvedTheme] = useState(() => resolve(readStoredTheme()));

  useEffect(() => {
    const next = resolve(theme);
    setResolvedTheme(next);
    document.documentElement.dataset.theme = next;
  }, [theme]);

  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const next = mq.matches ? "dark" : "light";
      setResolvedTheme(next);
      document.documentElement.dataset.theme = next;
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  const setTheme = useCallback((value) => {
    if (!VALID.includes(value)) return;
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // ignore storage failures
    }
    setThemeState(value);
  }, []);

  return { theme, resolvedTheme, setTheme };
}
