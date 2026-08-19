/** The two views a list page can be shown in. Anything else is corrupt data. */
const VALID_VIEWS = ['table', 'board']

const STORAGE_KEY = 'flowbird.deals.view'

/**
 * Reads the persisted view choice for the deals page.
 * Defensive throughout: storage being unavailable, a corrupt entry, or an
 * unknown value must degrade to 'table', never throw.
 */
export function readView() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!VALID_VIEWS.includes(raw)) return 'table'
    return raw
  } catch {
    return 'table'
  }
}

/** Writes the view choice. Storage being unavailable is not worth breaking the page over. */
export function writeView(view) {
  try {
    localStorage.setItem(STORAGE_KEY, view)
  } catch {
    // Private browsing or a full quota — the page still works, the choice just won't persist.
  }
}
