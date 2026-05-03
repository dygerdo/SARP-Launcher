import { ipcMain } from "electron"
import { IPC } from "./channels"
import store from "../services/store"
import type { LauncherStoreSchema } from "../services/store"
import { getGameDir } from "../services/paths"

export function registerIpcHandlers() {
  ipcMain.handle(IPC.STORE_GET, async (_event, key: keyof LauncherStoreSchema) => {
    return store.get(key)
  })

  ipcMain.handle(
    IPC.STORE_SET,
    async (_event, payload: { key: keyof LauncherStoreSchema; value: unknown }) => {
      store.set(payload.key, payload.value as never)
      return true
    },
  )

  ipcMain.handle(IPC.GAME_DIR_GET, async () => getGameDir())
}
