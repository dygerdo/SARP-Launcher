import { app, BrowserWindow } from "electron"
import log from "electron-log"
import pkg from "electron-updater"

import { IPC } from "../ipc/channels"

// electron-updater is a CommonJS module, so the named `autoUpdater` export only
// shows up on the default import when consumed from ESM TypeScript.
const { autoUpdater } = pkg

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

let initialized = false

export function initUpdater(win: BrowserWindow): void {
  if (initialized) return
  // In dev there is no app-update.yml shipped, so checkForUpdates would just
  // throw. Skipping keeps the dev console clean.
  if (!app.isPackaged) return
  initialized = true

  const send = (channel: string, payload: unknown): void => {
    if (win.isDestroyed() || win.webContents.isDestroyed()) return
    win.webContents.send(channel, payload)
  }

  autoUpdater.on("update-available", (info) => {
    const payload: UpdaterAvailable = {
      version: info.version,
      releaseDate: info.releaseDate,
    }
    send(IPC.UPDATER_AVAILABLE, payload)
  })

  autoUpdater.on("download-progress", (progress) => {
    const payload: UpdaterProgress = {
      percent: progress.percent,
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total,
    }
    send(IPC.UPDATER_PROGRESS, payload)
  })

  autoUpdater.on("update-downloaded", (info) => {
    const payload: UpdaterDownloaded = {
      version: info.version,
      releaseDate: info.releaseDate,
    }
    send(IPC.UPDATER_DOWNLOADED, payload)
  })

  autoUpdater.on("error", (err) => {
    // Silenced in the UI on purpose: a transient network blip should not pop a
    // scary banner. The full stack lives in %APPDATA%\<app>\logs\main.log.
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
