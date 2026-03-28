/**
 * Persist multiple keys to localStorage in one pass.
 * Returns an array of keys that failed (e.g. QuotaExceededError).
 * Dispatches a "storage-error" CustomEvent on window if any fail.
 */
export function saveAll(stateMap) {
  const failed = [];
  for (const [key, value] of Object.entries(stateMap)) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      failed.push(key);
    }
  }
  if (failed.length > 0) {
    window.dispatchEvent(new CustomEvent("storage-error", { detail: { keys: failed } }));
  }
  return failed;
}
