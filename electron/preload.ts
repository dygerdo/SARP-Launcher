import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron"
import { IPC } from "./ipc/channels"
import type {
  CdnResponse,
  GameLaunchPayload,
  GameLaunchResult,
  GameStatus,
  HealthCheckPayload,
  WindowState,
} from "./ipc/channels"
import type {
  ModDefinition,
  ModFile,
  EssentialsStatus,
  InstallProgressEvent,
  SystemDependency,
} from "../src/types/mods"
import type { LauncherStoreSchema } from "./services/store"
import type { PingResult } from "./services/sampQuery"
import type { LauncherManifest } from "./services/manifest"
import type { SampVerificationResult } from "./services/sampVerify"
import type { InstallProgress, InstallResult } from "./services/sampInstall"
import type { PickGameDirResult } from "./services/paths"
import type { DetectedMod } from "./services/gtaMods"
import type { GtaInstallProgress, GtaInstallResult } from "./services/gtaInstall"
import type { CacheInstallProgress, CacheInstallResult } from "./services/cacheInstall"
import type { UpdaterAvailable, UpdaterDownloaded, UpdaterProgress } from "./services/updater"

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

  toggleMaximize: (): void => ipcRenderer.send(IPC.WINDOW_TOGGLE_MAXIMIZE),

  toggleFullscreen: (): void => ipcRenderer.send(IPC.WINDOW_TOGGLE_FULLSCREEN),

  getWindowState: (): Promise<WindowState> => ipcRenderer.invoke(IPC.WINDOW_STATE_GET),

  onWindowStateChange: (callback: (state: WindowState) => void): (() => void) => {
    const listener = (_event: IpcRendererEvent, state: WindowState) => callback(state)
    ipcRenderer.on(IPC.WINDOW_STATE_CHANGED, listener)
    return () => ipcRenderer.off(IPC.WINDOW_STATE_CHANGED, listener)
  },

  openExternal: (url: string): void => ipcRenderer.send(IPC.SHELL_OPEN_EXTERNAL, url),

  getAppVersion: (): Promise<string> => ipcRenderer.invoke(IPC.APP_GET_VERSION),

  onUpdaterAvailable: (callback: (info: UpdaterAvailable) => void): (() => void) => {
    const listener = (_event: IpcRendererEvent, info: UpdaterAvailable) => callback(info)
    ipcRenderer.on(IPC.UPDATER_AVAILABLE, listener)
    return () => ipcRenderer.off(IPC.UPDATER_AVAILABLE, listener)
  },

  onUpdaterProgress: (callback: (progress: UpdaterProgress) => void): (() => void) => {
    const listener = (_event: IpcRendererEvent, progress: UpdaterProgress) => callback(progress)
    ipcRenderer.on(IPC.UPDATER_PROGRESS, listener)
    return () => ipcRenderer.off(IPC.UPDATER_PROGRESS, listener)
  },

  onUpdaterDownloaded: (callback: (info: UpdaterDownloaded) => void): (() => void) => {
    const listener = (_event: IpcRendererEvent, info: UpdaterDownloaded) => callback(info)
    ipcRenderer.on(IPC.UPDATER_DOWNLOADED, listener)
    return () => ipcRenderer.off(IPC.UPDATER_DOWNLOADED, listener)
  },

  onUpdaterError: (callback: (message: string) => void): (() => void) => {
    const listener = (_event: IpcRendererEvent, message: string) => callback(message)
    ipcRenderer.on(IPC.UPDATER_ERROR, listener)
    return () => ipcRenderer.off(IPC.UPDATER_ERROR, listener)
  },

  quitAndInstall: (): Promise<void> => ipcRenderer.invoke(IPC.UPDATER_QUIT_AND_INSTALL),
  mods: {
    scanEssentials: (): Promise<EssentialsStatus> => ipcRenderer.invoke(IPC.MODS_SCAN_ESSENTIALS),
    scanInstalled: (files: ModFile[]): Promise<Record<string, boolean>> =>
      ipcRenderer.invoke(IPC.MODS_SCAN_INSTALLED, files),
    scanCatalog: (): Promise<Record<string, Record<string, boolean>>> =>
      ipcRenderer.invoke(IPC.MODS_SCAN_CATALOG),
    install: (mod: ModDefinition): Promise<{ success: boolean; error?: string }> => ipcRenderer.invoke(IPC.MODS_INSTALL, mod),
    uninstall: (mod: ModDefinition): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke(IPC.MODS_UNINSTALL, mod),
    onInstallProgress: (
      callback: (event: IpcRendererEvent, data: InstallProgressEvent) => void,
    ): (() => void) => {
      const listener = (event: IpcRendererEvent, data: InstallProgressEvent) =>
        callback(event, data)
      ipcRenderer.on(IPC.MODS_INSTALL_PROGRESS, listener)
      return () => ipcRenderer.off(IPC.MODS_INSTALL_PROGRESS, listener)
    },
    onSecurityAlert: (callback: (message: string) => void): (() => void) => {
      const listener = (_event: IpcRendererEvent, message: string) => callback(message)
      ipcRenderer.on(IPC.SECURITY_ALERT, listener)
      return () => ipcRenderer.off(IPC.SECURITY_ALERT, listener)
    },
  },
  deps: {
    scan: (deps: SystemDependency[]) => ipcRenderer.invoke("deps:scan", deps),
    openUrl: (url: string) => ipcRenderer.invoke("deps:open-url", url),
  },
}

export type LauncherApi = typeof launcherApi

contextBridge.exposeInMainWorld("launcher", launcherApi)

// Dedicated updater bridge — consumed by the Pinia updater store in the renderer.
// Separate from launcherApi so the store can call removeAll() cleanly without
// disturbing any other IPC subscriptions.
const updaterApi = {
  onNoUpdate: (cb: () => void): void => {
    ipcRenderer.on(IPC.UPDATER_NO_UPDATE, cb)
  },
  onAvailable: (cb: (info: UpdaterAvailable) => void): void => {
    ipcRenderer.on(IPC.UPDATER_AVAILABLE, (_e, info: UpdaterAvailable) => cb(info))
  },
  onProgress: (cb: (p: UpdaterProgress) => void): void => {
    ipcRenderer.on(IPC.UPDATER_PROGRESS, (_e, p: UpdaterProgress) => cb(p))
  },
  onDownloaded: (cb: (info: UpdaterDownloaded) => void): void => {
    ipcRenderer.on(IPC.UPDATER_DOWNLOADED, (_e, info: UpdaterDownloaded) => cb(info))
  },
  onError: (cb: (msg: string) => void): void => {
    ipcRenderer.on(IPC.UPDATER_ERROR, (_e, msg: string) => cb(msg))
  },
  removeAll: (): void => {
    ;[
      IPC.UPDATER_NO_UPDATE,
      IPC.UPDATER_AVAILABLE,
      IPC.UPDATER_PROGRESS,
      IPC.UPDATER_DOWNLOADED,
      IPC.UPDATER_ERROR,
    ].forEach((ch) => ipcRenderer.removeAllListeners(ch))
  },
}

export type UpdaterApi = typeof updaterApi

contextBridge.exposeInMainWorld("updater", updaterApi)
