import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron"
import { IPC } from "./ipc/channels"
import type {
  CdnResponse,
  GameLaunchPayload,
  GameLaunchResult,
  GameStatus,
  HealthCheckPayload,
} from "./ipc/channels"
import type { LauncherStoreSchema } from "./services/store"

const launcherApi = {
  getGameDir: (): Promise<string> => ipcRenderer.invoke(IPC.GAME_DIR_GET),

  getStore: <K extends keyof LauncherStoreSchema>(key: K): Promise<LauncherStoreSchema[K]> =>
    ipcRenderer.invoke(IPC.STORE_GET, key),

  setStore: <K extends keyof LauncherStoreSchema>(
    key: K,
    value: LauncherStoreSchema[K],
  ): Promise<boolean> => ipcRenderer.invoke(IPC.STORE_SET, { key, value }),

  healthCheck: (): Promise<HealthCheckPayload> => ipcRenderer.invoke(IPC.HEALTH_CHECK),

  launchGame: (payload: GameLaunchPayload): Promise<GameLaunchResult> =>
    ipcRenderer.invoke(IPC.GAME_LAUNCH, payload),

  getGameStatus: (): Promise<GameStatus> => ipcRenderer.invoke(IPC.GAME_STATUS_GET),

  onGameStatusChanged: (callback: (status: GameStatus) => void): (() => void) => {
    const listener = (_event: IpcRendererEvent, status: GameStatus) => callback(status)
    ipcRenderer.on(IPC.GAME_STATUS_CHANGED, listener)
    return () => ipcRenderer.off(IPC.GAME_STATUS_CHANGED, listener)
  },

  cdnGet: <T = unknown>(url: string): Promise<CdnResponse<T>> =>
    ipcRenderer.invoke(IPC.CDN_GET, url),

  minimize: (): void => ipcRenderer.send(IPC.WINDOW_MINIMIZE),

  close: (): void => ipcRenderer.send(IPC.WINDOW_CLOSE),

  openExternal: (url: string): void => ipcRenderer.send(IPC.SHELL_OPEN_EXTERNAL, url),
}

export type LauncherApi = typeof launcherApi

contextBridge.exposeInMainWorld("launcher", launcherApi)
