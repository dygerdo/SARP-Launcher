import { ipcMain, shell } from "electron"
import { IPC } from "./channels"
import type { GameLaunchPayload, HealthCheckPayload, WindowState } from "./channels"
import store from "../services/store"
import type { LauncherStoreSchema } from "../services/store"
import { getGameDir, pickGameDir, pickEmptyInstallDir } from "../services/paths"
import type { PickGameDirResult } from "../services/paths"
import { detectGtaMods } from "../services/gtaMods"
import type { DetectedMod } from "../services/gtaMods"
import { installGta } from "../services/gtaInstall"
import type { GtaInstallProgress, GtaInstallResult } from "../services/gtaInstall"
import { installCache } from "../services/cacheInstall"
import type { CacheInstallProgress, CacheInstallResult } from "../services/cacheInstall"
import { getGameStatus, launchGame } from "../services/launcher"
import { cdnGet } from "../services/cdn"
import { pingServer } from "../services/sampQuery"
import { fetchManifest, getCachedManifest, refreshManifest } from "../services/manifest"
import type { LauncherManifest } from "../services/manifest"
import { verifySampFiles } from "../services/sampVerify"
import type { SampVerificationResult } from "../services/sampVerify"
import { installSamp, canWriteToGameDir } from "../services/sampInstall"
import type { InstallProgress, InstallResult } from "../services/sampInstall"
import { quitAndInstall } from "../services/updater"
import path from "node:path"
import fs from "node:fs"
import { execSync } from "node:child_process"
import type { Mod, ModFile, SystemDependency, DepStatus } from "../../src/types/mods"
import {
  appService,
  windowService,
  settingsService,
  modVerifierService,
  healthService,
  modController,
  updateController,
} from "../dependencies"

export function registerIpcHandlers() {
  ipcMain.handle(IPC.STORE_GET, async (_event, key: keyof LauncherStoreSchema) => {
    return settingsService.get(key)
  })

  ipcMain.handle(
    IPC.STORE_SET,
    async (_event, payload: { key: keyof LauncherStoreSchema; value: unknown }) => {
      settingsService.set(payload.key, payload.value as any)
      return true
    },
  )

  ipcMain.handle(IPC.GAME_DIR_GET, async () => settingsService.getGameDir())

  ipcMain.handle(IPC.HEALTH_CHECK, async (): Promise<HealthCheckPayload> => {
    return healthService.performFullCheck()
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
    const gameDir = getGameDir()
    // No folder yet → no idea whether elevation will be needed. Default to
    // false; the actual install attempt will fail loudly with a useful error
    // before any elevation prompt would appear.
    if (!gameDir) return false
    const writable = await canWriteToGameDir(gameDir)
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

      // We promote the chosen folder immediately so the launcher remembers it's
      // the new location even if the user restarts during the download.
      store.set("gtaPath", payload.targetDir)

      const send = (progress: GtaInstallProgress) => {
        if (event.sender.isDestroyed()) return
        event.sender.send(IPC.GTA_INSTALL_PROGRESS, progress)
      }
      const result = await installGta(payload.targetDir, send)
      return result
    },
  )

  ipcMain.handle(IPC.CACHE_INSTALL, async (event): Promise<CacheInstallResult> => {
    const send = (progress: CacheInstallProgress) => {
      if (event.sender.isDestroyed()) return
      event.sender.send(IPC.CACHE_INSTALL_PROGRESS, progress)
    }
    return installCache(send)
  })

  ipcMain.handle(IPC.APP_GET_VERSION, async (): Promise<string> => appService.getVersion())

  ipcMain.handle(IPC.UPDATER_QUIT_AND_INSTALL, async () => {
    quitAndInstall()
  })

  ipcMain.on(IPC.WINDOW_MINIMIZE, (event) => {
    windowService.minimize(event.sender)
  })

  ipcMain.on(IPC.WINDOW_CLOSE, (event) => {
    windowService.close(event.sender)
  })

  ipcMain.on(IPC.WINDOW_TOGGLE_MAXIMIZE, (event) => {
    windowService.toggleMaximize(event.sender)
  })

  ipcMain.on(IPC.WINDOW_TOGGLE_FULLSCREEN, (event) => {
    windowService.toggleFullscreen(event.sender)
  })

  ipcMain.handle(IPC.WINDOW_STATE_GET, (event): WindowState => {
    return windowService.getWindowState(event.sender)
  })

  ipcMain.on(IPC.SHELL_OPEN_EXTERNAL, async (_event, target: unknown) => {
    if (typeof target !== "string") return

    // Special case: Local Folder (GTA Path)
    if (path.isAbsolute(target) && fs.existsSync(target)) {
      shell.openPath(target)
      return
    }

    // Try as URL
    try {
      const parsed = new URL(target)

      // Allow sarp-launcher protocol (self-referential but used for deep links)
      if (parsed.protocol === "sarp-launcher:") {
        return
      }

      if (parsed.protocol !== "https:") return

      const allowed = [
        "sarp.es",
        "api.sarp.es",
        "www.sarp.es",
        "ucp.sarp.es",
        "forum.sarp.es",
        "discord.gg",
      ]
      if (!allowed.some((domain) => parsed.hostname.endsWith(domain))) return

      shell.openExternal(parsed.toString())
    } catch {
      // Not a valid URL, ignore
    }
  })

  // --- MODS SYSTEM ---

  ipcMain.handle(IPC.MODS_SCAN_ESSENTIALS, async () => {
    return modController.scanEssentials()
  })

  ipcMain.handle(IPC.MODS_SCAN_CATALOG, async () => {
    return modController.scanCatalog()
  })

  ipcMain.handle(IPC.MODS_SCAN_INSTALLED, async (_, files: ModFile[]) => {
    return modVerifierService.scanInstalled(files)
  })

  ipcMain.handle(IPC.MODS_INSTALL, async (event, mod: Mod) => {
    return modController.installMod(event, mod)
  })

  // Cancellation support
  ipcMain.handle(IPC.MODS_CANCEL_INSTALL, async (_event, modId: string) => {
    return modController.cancelInstallation(_event, modId)
  })

  // --- UPDATES SYSTEM ---
  ipcMain.handle(IPC.UPDATES_CHECK, async (event) => {
    return updateController.checkForUpdates(event)
  })

  ipcMain.handle(IPC.UPDATES_CHECK_MOD, async (event, modId: string) => {
    return updateController.checkModUpdate(event, modId)
  })

  ipcMain.handle(IPC.MODS_UNINSTALL, async (event, modId: string) => {
    return modController.uninstallMod(event, modId)
  })

  // --- SYSTEM DEPENDENCIES ---

  ipcMain.removeHandler("deps:scan")
  ipcMain.handle("deps:scan", async (_, deps: SystemDependency[]) => {
    const results: { id: string; status: DepStatus }[] = []

    for (const dep of deps) {
      let status: DepStatus = "unverifiable"

      if (dep.registryKey) {
        try {
          const keys = Array.isArray(dep.registryKey) ? dep.registryKey : [dep.registryKey]
          for (const key of keys) {
            // Use reg query to check if registry key exists
            try {
              execSync(`reg query "${key}" /ve`, { stdio: "ignore" })
              status = "installed"
              break
            } catch {
              status = "missing"
            }
          }
        } catch {
          status = "missing"
        }
      }

      results.push({ id: dep.id, status })
    }

    return results
  })

  ipcMain.removeHandler("deps:open-url")
  ipcMain.handle("deps:open-url", async (_, url: string) => {
    if (typeof url !== "string") return
    let parsed: URL
    try {
      parsed = new URL(url)
    } catch {
      return
    }
    if (parsed.protocol !== "https:") return
    shell.openExternal(parsed.toString())
  })
}
