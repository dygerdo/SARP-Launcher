// Webview preload script — runs before guest page scripts.
// Overrides Electron-specific signals that Cloudflare Turnstile checks.

// navigator.webdriver must be false (Chrome sets it to false)
Object.defineProperty(navigator, "webdriver", {
  get: () => false,
  configurable: true,
})

// Ensure window.chrome exists with the shape Cloudflare expects
if (!window.chrome) {
  ;(window as any).chrome = {}
}
if (!window.chrome.runtime) {
  ;(window as any).chrome.runtime = undefined
}

// Cloudflare checks navigator.languages — ensure it's populated
if (!navigator.languages || navigator.languages.length === 0) {
  Object.defineProperty(navigator, "languages", {
    get: () => ["es-AR", "es", "en-US", "en"],
    configurable: true,
  })
}

// navigator.permissions.query should not throw for "notifications"
const originalQuery = navigator.permissions.query.bind(navigator.permissions)
;(navigator.permissions as any).query = (params: { name: string }) => {
  if (params.name === "notifications") {
    return Promise.resolve({ state: "prompt", onchange: null })
  }
  return originalQuery(params)
}
