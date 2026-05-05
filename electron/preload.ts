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
import type { PingResult } from "./services/sampQuery"
import type { LauncherManifest } from "./services/manifest"
import type { SampVerificationResult } from "./services/sampVerify"
import type { InstallProgress, InstallResult } from "./services/sampInstall"
import type { PickGameDirResult } from "./services/paths"
import type { DetectedMod } from "./services/gtaMods"
import type { GtaInstallProgress, GtaInstallResult } from "./services/gtaInstall"
import type { CacheInstallProgress, CacheInstallResult } from "./services/cacheInstall"

const launcherApi = {
  getGameDir: (): Promise<string | null> => ipcRenderer.invoke(IPC.GAME_DIR_GET),

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

  pingServer: (ip: string, port: number): Promise<PingResult> =>
    ipcRenderer.invoke(IPC.SERVER_PING, { ip, port }),

  fetchManifest: (options?: { force?: boolean }): Promise<LauncherManifest> =>
    ipcRenderer.invoke(IPC.MANIFEST_FETCH, options),

  verifySamp: (): Promise<SampVerificationResult> => ipcRenderer.invoke(IPC.SAMP_VERIFY),

  installSamp: (): Promise<InstallResult> => ipcRenderer.invoke(IPC.SAMP_INSTALL),

  sampInstallRequiresElevation: (): Promise<boolean> =>
    ipcRenderer.invoke(IPC.SAMP_INSTALL_REQUIRES_ELEVATION),

  pickGameDir: (): Promise<PickGameDirResult> => ipcRenderer.invoke(IPC.GAME_DIR_PICK),

  pickEmptyInstallDir: (): Promise<PickGameDirResult> =>
    ipcRenderer.invoke(IPC.GAME_DIR_PICK_EMPTY),

  detectGtaMods: (): Promise<DetectedMod[]> => ipcRenderer.invoke(IPC.GTA_MODS_DETECT),

  installGta: (targetDir: string): Promise<GtaInstallResult> =>
    ipcRenderer.invoke(IPC.GTA_INSTALL, { targetDir }),

  onGtaInstallProgress: (callback: (progress: GtaInstallProgress) => void): (() => void) => {
    const listener = (_event: IpcRendererEvent, progress: GtaInstallProgress) => callback(progress)
    ipcRenderer.on(IPC.GTA_INSTALL_PROGRESS, listener)
    return () => ipcRenderer.off(IPC.GTA_INSTALL_PROGRESS, listener)
  },

  onSampInstallProgress: (callback: (progress: InstallProgress) => void): (() => void) => {
    const listener = (_event: IpcRendererEvent, progress: InstallProgress) => callback(progress)
    ipcRenderer.on(IPC.SAMP_INSTALL_PROGRESS, listener)
    return () => ipcRenderer.off(IPC.SAMP_INSTALL_PROGRESS, listener)
  },

  installCache: (): Promise<CacheInstallResult> => ipcRenderer.invoke(IPC.CACHE_INSTALL),

  onCacheInstallProgress: (callback: (progress: CacheInstallProgress) => void): (() => void) => {
    const listener = (_event: IpcRendererEvent, progress: CacheInstallProgress) =>
      callback(progress)
    ipcRenderer.on(IPC.CACHE_INSTALL_PROGRESS, listener)
    return () => ipcRenderer.off(IPC.CACHE_INSTALL_PROGRESS, listener)
  },

  minimize: (): void => ipcRenderer.send(IPC.WINDOW_MINIMIZE),

  close: (): void => ipcRenderer.send(IPC.WINDOW_CLOSE),

  openExternal: (url: string): void => ipcRenderer.send(IPC.SHELL_OPEN_EXTERNAL, url),
}

export type LauncherApi = typeof launcherApi

contextBridge.exposeInMainWorld("launcher", launcherApi)
