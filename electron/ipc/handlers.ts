import { BrowserWindow, ipcMain, shell } from "electron"
import { IPC } from "./channels"
import type { GameLaunchPayload, HealthCheckPayload } from "./channels"
import store from "../services/store"
import type { LauncherStoreSchema } from "../services/store"
import { getGameDir } from "../services/paths"
import { checkCache, checkGta, checkSamp } from "../services/health"
import { getGameStatus, launchGame } from "../services/launcher"
import { cdnGet } from "../services/cdn"

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

  ipcMain.handle(IPC.HEALTH_CHECK, async (): Promise<HealthCheckPayload> => {
    return {
      gta: checkGta(),
      samp: checkSamp(),
      cache: checkCache(),
    }
  })

  ipcMain.handle(IPC.GAME_LAUNCH, async (_event, payload: GameLaunchPayload) => {
    return launchGame(payload.host, payload.port)
  })

  ipcMain.handle(IPC.GAME_STATUS_GET, async () => getGameStatus())

  ipcMain.handle(IPC.CDN_GET, async (_event, url: string) => cdnGet(url))

  ipcMain.on(IPC.WINDOW_MINIMIZE, (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize()
  })

  ipcMain.on(IPC.WINDOW_CLOSE, (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close()
  })

  ipcMain.on(IPC.SHELL_OPEN_EXTERNAL, (_event, url: unknown) => {
    if (typeof url !== "string") return
    let parsed: URL
    try {
      parsed = new URL(url)
    } catch {
      return
    }
    if (parsed.protocol !== "https:") return
    const allowed = ["sarp.es", "api.sarp.es", "www.sarp.es"]
    if (!allowed.includes(parsed.hostname)) return
    shell.openExternal(parsed.toString())
  })
}
