/// <reference types="vite/client" />

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
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
