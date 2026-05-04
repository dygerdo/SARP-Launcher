import { BrowserWindow, ipcMain, shell } from "electron"
import { IPC } from "./channels"
import type { GameLaunchPayload, HealthCheckPayload } from "./channels"
import store from "../services/store"
import type { LauncherStoreSchema } from "../services/store"
import { getGameDir, pickGameDir, pickEmptyInstallDir } from "../services/paths"
import type { PickGameDirResult } from "../services/paths"
import { detectGtaMods } from "../services/gtaMods"
import type { DetectedMod } from "../services/gtaMods"
import { installGta } from "../services/gtaInstall"
import type { GtaInstallProgress, GtaInstallResult } from "../services/gtaInstall"
import { checkCache, checkGta, checkSamp } from "../services/health"
import { getGameStatus, launchGame } from "../services/launcher"
import { cdnGet } from "../services/cdn"
import { pingServer } from "../services/sampQuery"
import { fetchManifest, getCachedManifest, refreshManifest } from "../services/manifest"
import type { LauncherManifest } from "../services/manifest"
import { verifySampFiles } from "../services/sampVerify"
import type { SampVerificationResult } from "../services/sampVerify"
import { installSamp, canWriteToGameDir } from "../services/sampInstall"
import type { InstallProgress, InstallResult } from "../services/sampInstall"

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

  ipcMain.handle(IPC.SERVER_PING, async (_event, payload: { ip: string; port: number }) => {
    if (typeof payload?.ip !== "string" || typeof payload?.port !== "number") {
      return { alive: false, ms: null, info: null, error: "invalid args" }
    }
    return pingServer(payload.ip, payload.port)
  })

  ipcMain.handle(
    IPC.MANIFEST_FETCH,
    async (_event, options?: { force?: boolean }): Promise<LauncherManifest> => {
      if (options?.force) return refreshManifest()
      const cached = getCachedManifest()
      if (cached) return cached
      return fetchManifest()
    },
  )

  ipcMain.handle(IPC.SAMP_VERIFY, async (): Promise<SampVerificationResult> => {
    let manifest = getCachedManifest()
    if (!manifest) {
      try {
        manifest = await fetchManifest()
      } catch (error) {
        return {
          ok: false,
          files: [],
          error: error instanceof Error ? error.message : "manifest fetch failed",
        }
      }
    }
    return verifySampFiles(manifest)
  })

  ipcMain.handle(IPC.SAMP_INSTALL, async (event): Promise<InstallResult> => {
    const send = (progress: InstallProgress) => {
      if (event.sender.isDestroyed()) return
      event.sender.send(IPC.SAMP_INSTALL_PROGRESS, progress)
    }
    return installSamp(send)
  })

  ipcMain.handle(IPC.SAMP_INSTALL_REQUIRES_ELEVATION, async (): Promise<boolean> => {
    const writable = await canWriteToGameDir(getGameDir())
    return !writable
  })

  ipcMain.handle(IPC.GAME_DIR_PICK, async (): Promise<PickGameDirResult> => pickGameDir())

  ipcMain.handle(
    IPC.GAME_DIR_PICK_EMPTY,
    async (): Promise<PickGameDirResult> => pickEmptyInstallDir(),
  )

  ipcMain.handle(IPC.GTA_MODS_DETECT, async (): Promise<DetectedMod[]> => detectGtaMods())

  ipcMain.handle(
    IPC.GTA_INSTALL,
    async (event, payload: { targetDir: string }): Promise<GtaInstallResult> => {
      if (typeof payload?.targetDir !== "string") {
        return { ok: false, error: "Falta la carpeta destino." }
      }
      const send = (progress: GtaInstallProgress) => {
        if (event.sender.isDestroyed()) return
        event.sender.send(IPC.GTA_INSTALL_PROGRESS, progress)
      }
      const result = await installGta(payload.targetDir, send)
      if (result.ok) {
        // Promote the chosen folder to the canonical gtaPath so subsequent
        // health checks read the install we just created.
        store.set("gtaPath", payload.targetDir)
      }
      return result
    },
  )

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
