import { app, BrowserWindow, ipcMain, shell } from "electron"
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
import { quitAndInstall } from "../services/updater"
import path from "node:path"
import fs from "node:fs"
import { rm, mkdir } from "node:fs/promises"
import os from "node:os"
import { Buffer } from "node:buffer"
import { execSync } from "node:child_process"
import axios from "axios"
import extract from "extract-zip"
import log from "electron-log"
import type {
  ModDefinition,
  ModFile,
  EssentialsStatus,
  InstallProgressEvent,
  ModFileDestination,
  InstalledModInfo,
  ModStatus,
  SystemDependency,
  DepStatus,
} from "../../src/types/mods"
import { MOD_CATALOG } from "../../src/data/mods"

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
    const [gta, samp, cache] = [checkGta(), checkSamp(), await checkCache()]
    return { gta, samp, cache }
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

  ipcMain.handle(IPC.APP_GET_VERSION, async (): Promise<string> => app.getVersion())

  ipcMain.handle(IPC.UPDATER_QUIT_AND_INSTALL, async () => {
    quitAndInstall()
  })

  ipcMain.on(IPC.WINDOW_MINIMIZE, (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize()
  })

  ipcMain.on(IPC.WINDOW_CLOSE, (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close()
  })

  ipcMain.on(IPC.WINDOW_TOGGLE_MAXIMIZE, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return
    // Fullscreen takes priority — if the user double-clicks the titlebar
    // while in fullscreen we want to leave fullscreen, not toggle maximise
    // underneath it.
    if (win.isFullScreen()) {
      win.setFullScreen(false)
      return
    }
    if (win.isMaximized()) win.unmaximize()
    else win.maximize()
  })

  ipcMain.on(IPC.WINDOW_TOGGLE_FULLSCREEN, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return
    win.setFullScreen(!win.isFullScreen())
  })

  ipcMain.handle(IPC.WINDOW_STATE_GET, (event): WindowState => {
    const win = BrowserWindow.fromWebContents(event.sender)
    return {
      isMaximized: win?.isMaximized() ?? false,
      isFullscreen: win?.isFullScreen() ?? false,
    }
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

  ipcMain.handle(IPC.MODS_SCAN_ESSENTIALS, async (): Promise<EssentialsStatus> => {
    const gameDir = getGameDir()
    if (!gameDir) return { cleo: "missing", modloader: "missing", asiloader: "missing" }

    // Ensure mods folder structure exists
    const modsRoot = path.join(gameDir, "launcher_mods")
    const categories = [
      "essentials",
      "graphics",
      "performance",
      "reality",
      "audio",
      "map",
      "misc",
      "vehicles",
    ]

    try {
      if (!fs.existsSync(modsRoot)) await mkdir(modsRoot, { recursive: true })
      for (const cat of categories) {
        const catPath = path.join(modsRoot, cat)
        if (!fs.existsSync(catPath)) await mkdir(catPath, { recursive: true })
      }
    } catch (err) {
      log.error("Error creating mods folder structure:", err)
    }

    // Helper to check a specific mod by its files
    const checkMod = (modId: string): ModStatus => {
      const mod = MOD_CATALOG.find((m) => m.id === modId)
      if (!mod) return "missing"

      const results = mod.files.map((file) => {
        const fullPath = resolveModPath(gameDir, file.destination, file.filename)
        if (fs.existsSync(fullPath)) {
          return file.isFolder
            ? fs.statSync(fullPath).isDirectory()
            : fs.statSync(fullPath).isFile()
        }
        return false
      })

      if (results.every((v) => v)) return "ok"
      if (results.every((v) => !v)) return "missing"
      return "reparar"
    }

    return {
      cleo: checkMod("cleo"),
      modloader: checkMod("modloader"),
      asiloader: checkMod("asiloader"),
    }
  })

  ipcMain.handle(IPC.MODS_SCAN_CATALOG, async () => {
    const gameDir = getGameDir()
    if (!gameDir) return {}

    const results: Record<string, Record<string, boolean>> = {}
    for (const mod of MOD_CATALOG) {
      const fileStatus: Record<string, boolean> = {}
      for (const file of mod.files) {
        const fullPath = resolveModPath(gameDir, file.destination, file.filename)
        if (fs.existsSync(fullPath)) {
          fileStatus[file.filename] = file.isFolder
            ? fs.statSync(fullPath).isDirectory()
            : fs.statSync(fullPath).isFile()
        } else {
          fileStatus[file.filename] = false
        }
      }
      results[mod.id] = fileStatus
    }
    return results
  })

  ipcMain.handle(IPC.MODS_SCAN_INSTALLED, async (_, files: ModFile[]) => {
    const gameDir = getGameDir()
    if (!gameDir) return {}
    const result: Record<string, boolean> = {}

    for (const file of files) {
      const fullPath = resolveModPath(gameDir, file.destination, file.filename)
      if (fs.existsSync(fullPath)) {
        if (file.isFolder) {
          result[file.filename] = fs.statSync(fullPath).isDirectory()
        } else {
          result[file.filename] = fs.statSync(fullPath).isFile()
        }
      } else {
        result[file.filename] = false
      }
    }

    return result
  })

  ipcMain.handle(IPC.MODS_INSTALL, async (event, mod: ModDefinition) => {
    const gameDir = getGameDir()
    if (!gameDir) throw new Error("No game directory found")

    const repoPath = path.join(gameDir, "launcher_mods", mod.category)
    if (!fs.existsSync(repoPath)) await mkdir(repoPath, { recursive: true })

    const zipPath = path.join(repoPath, `${mod.id}.zip`)
    const tempDir = path.join(os.tmpdir(), `sarp-extract-${mod.id}`)
    const extractDir = path.join(tempDir, "extracted")

    const sendProgress = (
      status: InstallProgressEvent["status"],
      progress: number,
      error?: string,
    ) => {
      if (event.sender.isDestroyed()) return
      event.sender.send(IPC.MODS_INSTALL_PROGRESS, {
        modId: mod.id,
        progress,
        status,
        error,
      } as InstallProgressEvent)
    }

    try {
      if (fs.existsSync(tempDir)) await rm(tempDir, { recursive: true, force: true })
      await mkdir(tempDir, { recursive: true })
      await mkdir(extractDir, { recursive: true })

      // 1. Download
      sendProgress("downloading", 0)
      const response = await axios({
        url: mod.downloadUrl,
        method: "GET",
        responseType: "stream",
      })

      const totalLength = parseInt(response.headers["content-length"]?.toString() || "0", 10)
      let downloadedLength = 0

      const writer = fs.createWriteStream(zipPath)
      response.data.on("data", (chunk: Buffer) => {
        downloadedLength += chunk.length
        if (totalLength > 0) {
          sendProgress("downloading", (downloadedLength / totalLength) * 100)
        }
      })

      response.data.pipe(writer)

      await new Promise<void>((resolve, reject) => {
        writer.on("finish", () => resolve())
        writer.on("error", (err) => reject(err))
      })

      // 2. Extract
      sendProgress("extracting", 100)
      await extract(zipPath, { dir: extractDir })

      // 3. Copy
      sendProgress("copying", 100)
      for (const file of mod.files) {
        const sourcePath = path.join(extractDir, file.filename)
        const destPath = resolveModPath(gameDir, file.destination, file.filename)

        if (fs.existsSync(sourcePath)) {
          // Ensure parent directory exists
          await mkdir(path.dirname(destPath), { recursive: true })
          if (file.isFolder) {
            if (fs.existsSync(destPath)) await rm(destPath, { recursive: true, force: true })
            // Note: fs.cp is node 16.7+, Electron 33 is node 20.9+
            await fs.promises.cp(sourcePath, destPath, { recursive: true })
          } else {
            await fs.promises.copyFile(sourcePath, destPath)
          }
        }
      }

      // 4. Save to store
      const installedMods = (store.get("installedMods") as Record<string, InstalledModInfo>) || {}
      installedMods[mod.id] = {
        installedAt: new Date().toISOString(),
        files: mod.files,
        version: mod.version,
        status: "ok",
      }
      store.set("installedMods", installedMods)

      // 5. Cleanup
      await rm(tempDir, { recursive: true, force: true })
      sendProgress("done", 100)
      log.info(`Mod installed: ${mod.name} (${mod.id})`)
    } catch (error) {
      log.error(`Error installing mod ${mod.id}:`, error)
      sendProgress("error", 0)
      throw error
    }
  })

  ipcMain.handle(IPC.MODS_UNINSTALL, async (_, mod: ModDefinition) => {
    const gameDir = getGameDir()
    if (!gameDir) return { success: false, error: "No game directory found" }

    try {
      const installedMods = store.get("installedMods") || {}
      const info = (installedMods as Record<string, unknown>)[mod.id] as
        | { files: ModFile[] }
        | undefined
      if (!info) return { success: false, error: "Mod not found in store" }

      for (const file of info.files as ModFile[]) {
        const fullPath = resolveModPath(gameDir, file.destination, file.filename)
        if (fs.existsSync(fullPath)) {
          await rm(fullPath, { recursive: true, force: true })
        }
      }

      delete installedMods[mod.id]
      store.set("installedMods", installedMods)

      log.info(`Mod uninstalled: ${mod.id}`)
      return { success: true }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      log.error(`Error uninstalling mod ${mod.id}:`, error)
      return { success: false, error: msg }
    }
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

function resolveModPath(
  gameDir: string,
  destination: ModFileDestination,
  filename: string,
): string {
  switch (destination) {
    case "gta_root":
      return path.join(gameDir, filename)
    case "cleo_folder":
      return path.join(gameDir, "cleo", filename)
    case "modloader_folder":
      return path.join(gameDir, "modloader", filename)
    case "documents_samp":
      return path.join(os.homedir(), "Documents", "GTA San Andreas User Files", "SAMP", filename)
    default:
      return path.join(gameDir, filename)
  }
}
