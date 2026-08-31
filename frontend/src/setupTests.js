// React 19 test environment act flag
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Polyfill window.matchMedia if not implemented in JSDOM
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Polyfill window.scrollTo
window.scrollTo = () => {};
