export const IPC = {
  STORE_GET: "store:get",
  STORE_SET: "store:set",
  GAME_DIR_GET: "game-dir:get",
  HEALTH_CHECK: "health:check",
  GAME_LAUNCH: "game:launch",
  GAME_STATUS_GET: "game:status:get",
  GAME_STATUS_CHANGED: "game:status:changed",
  CDN_GET: "cdn:get",
  WINDOW_MINIMIZE: "window:minimize",
  WINDOW_CLOSE: "window:close",
  SHELL_OPEN_EXTERNAL: "shell:open-external",
  SERVER_PING: "server:ping",
  MANIFEST_FETCH: "manifest:fetch",
  SAMP_VERIFY: "samp:verify",
  SAMP_INSTALL: "samp:install",
  SAMP_INSTALL_PROGRESS: "samp:install:progress",
  SAMP_INSTALL_REQUIRES_ELEVATION: "samp:install:requires-elevation",
  GAME_DIR_PICK: "game-dir:pick",
  GAME_DIR_PICK_EMPTY: "game-dir:pick-empty",
  GTA_MODS_DETECT: "gta:mods:detect",
  GTA_INSTALL: "gta:install",
  GTA_INSTALL_PROGRESS: "gta:install:progress",
  CACHE_INSTALL: "cache:install",
  CACHE_INSTALL_PROGRESS: "cache:install:progress",
  APP_GET_VERSION: "app:get-version",
  UPDATER_AVAILABLE: "updater:available",
  UPDATER_PROGRESS: "updater:progress",
  UPDATER_DOWNLOADED: "updater:downloaded",
  UPDATER_ERROR: "updater:error",
  UPDATER_QUIT_AND_INSTALL: "updater:quit-and-install",
} as const

export interface GameStatus {
  running: boolean
  pid: number | null
}

export interface CdnResponse<T = unknown> {
  ok: boolean
  status: number
  data: T | null
  error?: string
}

export interface HealthCheckPayload {
  gta: { ok: boolean; detail?: string; missingAll: boolean }
  samp: { ok: boolean; detail?: string }
  cache: {
    ok: boolean
    detail?: string
    needsInstall: boolean
    needsUpdate: boolean
    expectedFileCount?: number
    actualFileCount?: number
  }
}

export interface GameLaunchPayload {
  host: string
  port: number
}

export interface GameLaunchResult {
  ok: boolean
  error?: string
}
