// Tiny localStorage wrapper. Storage can be unavailable (private mode), so
// every access is guarded and the app still works without persistence.
const PREFIX = "localleet:";

export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* quota or disabled */
  }
}

export function remove(key) {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {}
}
