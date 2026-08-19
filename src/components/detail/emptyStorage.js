/** Single key — the "show all fields" preference is global, not per-object-type. */
const KEY = 'flowbird.detail.showEmpty'

/**
 * Reads the "show empty fields" preference.
 * Defensive throughout: a corrupt entry or a non-boolean payload must degrade
 * to false (the default: hide empty fields), never throw.
 */
export function readShowEmpty() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw === null) return false
    const parsed = JSON.parse(raw)
    return parsed === true
  } catch {
    return false
  }
}

/** Writes the preference. Storage being unavailable is not worth breaking the page over. */
export function writeShowEmpty(value) {
  try {
    localStorage.setItem(KEY, JSON.stringify(!!value))
  } catch {
    // Private browsing or a full quota — the toggle still works, it just won't persist.
  }
}
