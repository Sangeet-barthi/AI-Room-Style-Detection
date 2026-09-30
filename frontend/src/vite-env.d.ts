/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Public API base path. Never contains a secret. */
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
