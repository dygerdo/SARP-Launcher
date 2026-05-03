export const IPC = {
  STORE_GET: "store:get",
  STORE_SET: "store:set",
  GAME_DIR_GET: "game-dir:get",
  HEALTH_CHECK: "health:check",
  GAME_LAUNCH: "game:launch",
  GAME_STATUS_GET: "game:status:get",
  GAME_STATUS_CHANGED: "game:status:changed",
  CDN_GET: "cdn:get",
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
  gta: { ok: boolean; detail?: string }
  samp: { ok: boolean; detail?: string }
  cache: { ok: boolean; detail?: string }
}

export interface GameLaunchPayload {
  host: string
  port: number
}

export interface GameLaunchResult {
  ok: boolean
  error?: string
}
