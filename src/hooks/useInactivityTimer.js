import { useState, useEffect, useCallback, useRef } from "react";

const INACTIVITY_TIMEOUT = 25 * 60 * 1000; // 25 minutes
const DEBOUNCE_MS = 500;
const ACTIVITY_EVENTS = ["mousemove", "keydown", "click", "scroll", "touchstart"];

export function useInactivityTimer() {
  const [inactive, setInactive] = useState(false);
  const timerRef = useRef(null);
  const debounceRef = useRef(null);

  const resetTimer = useCallback(() => {
    setInactive(false);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setInactive(true), INACTIVITY_TIMEOUT);
  }, []);

  const handleActivity = useCallback(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(resetTimer, DEBOUNCE_MS);
  }, [resetTimer]);

  const dismiss = useCallback(() => {
    setInactive(false);
    resetTimer();
  }, [resetTimer]);

  useEffect(() => {
    // Start the initial timer
    resetTimer();

    // Single debounced handler at document level
    ACTIVITY_EVENTS.forEach((evt) =>
      document.addEventListener(evt, handleActivity, { passive: true })
    );

    return () => {
      ACTIVITY_EVENTS.forEach((evt) =>
        document.removeEventListener(evt, handleActivity)
      );
      clearTimeout(timerRef.current);
      clearTimeout(debounceRef.current);
    };
  }, [resetTimer, handleActivity]);

  return { inactive, dismiss };
}
