// Build-time environment variables (see Vite's import.meta.env).
declare global {
  interface ImportMetaEnv {
    /** Base URL of the calculator API. Empty when it is served on the same origin. */
    readonly VITE_API_BASE_URL?: string
  }
}

export {}
