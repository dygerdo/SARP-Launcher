/**
 * IPC Contracts and Data Transfer Objects (DTOs)
 * This folder defines the "language" spoken between Main and Renderer.
 */

export interface IAppVersionContract {
  version: string
}

export interface IWindowStateContract {
  isMaximized: boolean
  isFullscreen: boolean
}

export interface IStoreSetContract<T = any> {
  key: string
  value: T
}

// Re-export core types from channels for now to avoid breaking changes
export type {
  GameStatus,
  CdnResponse,
  HealthCheckPayload,
  GameLaunchPayload,
  GameLaunchResult,
} from "../ipc/channels"
