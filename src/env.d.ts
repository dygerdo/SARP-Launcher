/// <reference types="vite/client" />

import type { LauncherApi } from "../electron/preload"

declare module "*.vue" {
  import type { DefineComponent } from "vue"
  const component: DefineComponent<object, object, unknown>
  export default component
}

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_CDN_URL: string
  readonly VITE_GAME_SERVER_IP: string
  readonly VITE_GAME_SERVER_PORT: string
  readonly VITE_GAME_SERVER_LOCATION?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare global {
  interface Window {
    launcher: LauncherApi
  }
  /** Short git commit hash baked into the bundle by Vite at build time.
   *  Surfaced in the footer ("v1.0.0 (a3f2b1c)") so support can identify
   *  which build a user is running. */
  const __GIT_COMMIT__: string
}
