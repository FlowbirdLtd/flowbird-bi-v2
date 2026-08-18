/** One key per table, so hiding a column on Deals never affects Contacts. */
export function storageKeyFor(name) {
  return `flowbird.table.${name}.columns`
}

/**
 * Reads the hidden column keys for a table.
 * Defensive throughout: a corrupt entry, a non-array payload, or a key that no
 * longer exists in the config must degrade to "nothing hidden", never throw.
 */
export function readHidden(name, validKeys) {
  try {
    const raw = localStorage.getItem(storageKeyFor(name))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(key => validKeys.includes(key))
  } catch {
    return []
  }
}

/** Writes hidden column keys. Storage being unavailable is not worth breaking the page over. */
export function writeHidden(name, hiddenKeys) {
  try {
    localStorage.setItem(storageKeyFor(name), JSON.stringify(hiddenKeys))
  } catch {
    // Private browsing or a full quota — the table still works, the choice just won't persist.
  }
}
