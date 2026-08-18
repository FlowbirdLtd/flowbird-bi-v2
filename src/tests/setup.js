import '@testing-library/jest-dom'

// Node 26 defines its own `localStorage` global, which is unavailable unless the
// process was started with --localstorage-file. That property is already on
// globalThis by the time Vitest's jsdom environment runs, so jsdom's own
// implementation never lands and `localStorage` reads as undefined in tests.
// Install a minimal in-memory Storage so code under test can use it normally.
if (!globalThis.localStorage) {
  const store = new Map()
  const storage = {
    get length() { return store.size },
    key: index => [...store.keys()][index] ?? null,
    getItem: key => (store.has(String(key)) ? store.get(String(key)) : null),
    setItem: (key, value) => { store.set(String(key), String(value)) },
    removeItem: key => { store.delete(String(key)) },
    clear: () => { store.clear() },
  }
  for (const target of [globalThis, window]) {
    Object.defineProperty(target, 'localStorage', {
      value: storage, configurable: true, writable: true,
    })
  }
}
