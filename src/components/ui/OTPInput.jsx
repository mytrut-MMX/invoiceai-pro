import { useRef, useEffect } from "react";

/**
 * 6-digit OTP entry. Auto-advances on input, backspace clears + moves back,
 * and a pasted 6-digit string is distributed across the boxes.
 *
 * Props:
 *   length     — number of boxes (default 6)
 *   value      — current code, string of digits (may be partial)
 *   onChange   — (newValue) => void
 *   onComplete — (fullCode) => void  (fires when all boxes are filled)
 *   autoFocus  — focus the first box on mount (default true)
 *   disabled   — disables every input
 *   error      — when true, boxes use the danger border colour
 */
export default function OTPInput({
  length = 6,
  value = "",
  onChange,
  onComplete,
  autoFocus = true,
  disabled = false,
  error = false,
}) {
  const refs = useRef([]);
  const digits = value.split("").concat(Array(length).fill("")).slice(0, length);

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  const update = (next) => {
    const trimmed = next.slice(0, length);
    onChange?.(trimmed);
    if (trimmed.length === length && /^\d+$/.test(trimmed)) onComplete?.(trimmed);
  };

  const setAt = (i, ch) => {
    const arr = digits.slice();
    arr[i] = ch;
    update(arr.join(""));
  };

  const handleChange = (i) => (e) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (!raw) { setAt(i, ""); return; }
    if (raw.length === 1) {
      setAt(i, raw);
      if (i < length - 1) refs.current[i + 1]?.focus();
      return;
    }
    // Multi-character input (paste into one box) — distribute.
    const arr = digits.slice();
    let cursor = i;
    for (const ch of raw) {
      if (cursor >= length) break;
      arr[cursor] = ch;
      cursor += 1;
    }
    update(arr.join(""));
    refs.current[Math.min(cursor, length - 1)]?.focus();
  };

  const handleKeyDown = (i) => (e) => {
    if (e.key === "Backspace") {
      if (digits[i]) {
        setAt(i, "");
      } else if (i > 0) {
        setAt(i - 1, "");
        refs.current[i - 1]?.focus();
      }
      e.preventDefault();
      return;
    }
    if (e.key === "ArrowLeft" && i > 0) { refs.current[i - 1]?.focus(); e.preventDefault(); }
    if (e.key === "ArrowRight" && i < length - 1) { refs.current[i + 1]?.focus(); e.preventDefault(); }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;
    e.preventDefault();
    update(pasted.padEnd(0, ""));
    refs.current[Math.min(pasted.length, length - 1)]?.focus();
  };

  return (
    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
      {Array.from({ length }).map((_, i) => {
        const filled = !!digits[i];
        const borderCls = error
          ? "border-[var(--danger-600)]"
          : filled
            ? "border-[var(--brand-600)]"
            : "border-[var(--border-default)]";
        return (
          <input
            key={i}
            ref={el => (refs.current[i] = el)}
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            maxLength={1}
            value={digits[i]}
            onChange={handleChange(i)}
            onKeyDown={handleKeyDown(i)}
            onFocus={(e) => e.target.select()}
            disabled={disabled}
            className={[
              "w-12 h-12 text-center text-xl font-semibold border-2 rounded-[var(--radius-md)]",
              "bg-white text-[var(--text-primary)] outline-none transition-colors duration-150",
              "focus:border-[var(--brand-600)] focus:shadow-[var(--focus-ring)]",
              "disabled:bg-[var(--surface-sunken)] disabled:cursor-not-allowed",
              borderCls,
            ].join(" ")}
          />
        );
      })}
    </div>
  );
}
