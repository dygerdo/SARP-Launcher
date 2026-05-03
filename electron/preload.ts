import { contextBridge, ipcRenderer } from "electron"
import { IPC } from "./ipc/channels"
import type { LauncherStoreSchema } from "./services/store"

const launcherApi = {
  getGameDir: (): Promise<string> => ipcRenderer.invoke(IPC.GAME_DIR_GET),

  getStore: <K extends keyof LauncherStoreSchema>(key: K): Promise<LauncherStoreSchema[K]> =>
    ipcRenderer.invoke(IPC.STORE_GET, key),

  setStore: <K extends keyof LauncherStoreSchema>(
    key: K,
    value: LauncherStoreSchema[K],
  ): Promise<boolean> => ipcRenderer.invoke(IPC.STORE_SET, { key, value }),
}

export type LauncherApi = typeof launcherApi

contextBridge.exposeInMainWorld("launcher", launcherApi)
