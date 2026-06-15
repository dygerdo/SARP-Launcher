import { app, BrowserWindow } from "electron"
import log from "electron-log"
import { autoUpdater } from "electron-updater"
import { IPC } from "../ipc/channels"

export interface UpdaterAvailable {
  version: string
  releaseDate?: string
}

export interface UpdaterProgress {
  percent: number
  bytesPerSecond: number
  transferred: number
  total: number
}

export interface UpdaterDownloaded {
  version: string
  releaseDate?: string
}

autoUpdater.logger = log
// Background download keeps the UX simple: the user sees the banner change from
// "available" to "downloaded" without having to opt in. autoInstallOnAppQuit
// is the safety net — if they ignore the "restart" CTA, the install applies the
// next time they close the launcher normally.
autoUpdater.autoDownload = true
autoUpdater.autoInstallOnAppQuit = true

if (process.env.GH_TOKEN) {
  autoUpdater.requestHeaders = { Authorization: `token ${process.env.GH_TOKEN}` }
}

let initialized = false

export function initUpdater(win: BrowserWindow): void {
  if (initialized) return
  initialized = true

  const send = (channel: string, payload?: unknown): void => {
    if (win.isDestroyed() || win.webContents.isDestroyed()) return
    win.webContents.send(channel, payload)
  }

  // In dev there is no app-update.yml shipped so checkForUpdates would throw.
  // We wait for the renderer to finish loading (guaranteeing onMounted and
  // setupListeners have run) before sending the no-update signal, so we never
  // hit the race where the IPC fires before the listener is registered.
  if (!app.isPackaged) {
    log.info("[updater] dev mode — will simulate no-update after renderer ready")
    win.webContents.once("did-finish-load", () => {
      // Small additional delay so Vue's onMounted callbacks complete
      setTimeout(() => {
        log.info("[updater] dev mode — sending no-update")
        send(IPC.UPDATER_NO_UPDATE)
      }, 300)
    })
    return
  }

  autoUpdater.on("update-not-available", () => {
    log.info("[updater] update-not-available")
    send(IPC.UPDATER_NO_UPDATE)
  })

  autoUpdater.on("update-available", (info) => {
    log.info("[updater] update-available", info.version)
    const payload: UpdaterAvailable = {
      version: info.version,
      releaseDate: info.releaseDate,
    }
    send(IPC.UPDATER_AVAILABLE, payload)
  })

  autoUpdater.on("download-progress", (progress) => {
    log.info(`[updater] download-progress ${progress.percent.toFixed(1)}%`)
    const payload: UpdaterProgress = {
      percent: progress.percent,
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total,
    }
    send(IPC.UPDATER_PROGRESS, payload)
  })

  autoUpdater.on("update-downloaded", (info) => {
    log.info("[updater] update-downloaded", info.version)
    const payload: UpdaterDownloaded = {
      version: info.version,
      releaseDate: info.releaseDate,
    }
    send(IPC.UPDATER_DOWNLOADED, payload)
  })

  autoUpdater.on("error", (err) => {
    // Silenced in the UI on purpose: a transient network blip should not pop a
    // scary banner. The full stack lives in %APPDATA%\<app>\logs\main.log.
    log.warn("[updater] error", err.message)
    send(IPC.UPDATER_ERROR, err.message)
  })

  autoUpdater.checkForUpdates().catch((err) => {
    log.warn("[updater] initial check failed", err)
  })
}

export function quitAndInstall(): void {
  // (isSilent=false, isForceRunAfter=true): show the standard NSIS progress
  // (one-click, no UAC) and relaunch the new version once it's installed.
  autoUpdater.quitAndInstall(false, true)
}
