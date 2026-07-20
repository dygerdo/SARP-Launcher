import { app, BrowserWindow, Menu, Tray, shell } from "electron"
import { fileURLToPath } from "node:url" // Keep for ESM compatibility if needed
import path from "node:path"
import fs from "node:fs"
import log from "electron-log"
import { registerIpcHandlers } from "./ipc/handlers"
import { IPC } from "./ipc/channels"
import { detectRunningGame } from "./services/launcher"
import { sweepLauncherTemp } from "./services/tempSweep"
import { initUpdater } from "./services/updater"
import { initDiscordRPC } from "./services/discord"

const isSingleInstance = app.requestSingleInstanceLock()
if (!isSingleInstance) {
  app.quit()
  process.exit(0)
}

app.on("second-instance", (_event, commandLine) => {
  if (win) {
    if (win.isMinimized()) win.restore()
    win.focus()

    // Manejar el protocolo si viene en la línea de comandos
    const url = commandLine.find((arg) => arg.startsWith("sarp-launcher://"))
    if (url) {
      log.info("Deep link received:", url)
      // Aquí podrías emitir un evento al renderer para que haga algo
    }
  }
})

import {
  attachWindowStatePersistence,
  loadInitialBounds,
  MIN_HEIGHT,
  MIN_WIDTH,
} from "./services/windowState"

const CHROME_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36"

// Suppress internal Chromium logs like "Invalid cache size" which are harmless
// but clutter the console. 3 = FATAL only.
app.commandLine.appendSwitch("log-level", "3")
app.commandLine.appendSwitch("disable-http-cache")

// Robust __dirname and path resolution
// In CommonJS (Electron default), __dirname is global.
// In ESM, we use import.meta.url.
const _dirname =
  typeof __dirname !== "undefined" ? __dirname : path.dirname(fileURLToPath(import.meta.url))

const APP_ROOT = path.join(_dirname, "..")
process.env.APP_ROOT = APP_ROOT
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL
const RENDERER_DIST = path.join(APP_ROOT, "dist")

// Validate critical environment variables
if (!process.env.VITE_CDN_URL && app.isPackaged) {
  log.warn("VITE_CDN_URL is not defined. Manifest features may fail.")
}

// Robust icon resolution
function resolveIconPath(): string | undefined {
  // 1. Try public path (Dev)
  const devIco = path.join(APP_ROOT, "public", "favicon.ico")
  if (fs.existsSync(devIco)) return devIco

  const devPng = path.join(APP_ROOT, "public", "logo-squared.png")
  if (fs.existsSync(devPng)) return devPng

  // 2. Try resources path (Production)
  const prodIco = path.join(process.resourcesPath, "favicon.ico")
  if (fs.existsSync(prodIco)) return prodIco

  // 3. Last resort: current directory
  const rootIco = path.join(_dirname, "favicon.ico")
  if (fs.existsSync(rootIco)) return rootIco

  return undefined
}

const ICON_PATH = resolveIconPath()

// In production, route every console.* call through electron-log so logs land
// in %APPDATA%\<app>\logs\main.log instead of stdout. Stops users who launch
// the .exe from a terminal from watching the app's internals in real time.
// We keep warn/error visible in the file (electron-log writes them too) but
// never to stdout.
if (app.isPackaged) {
  Object.assign(console, log.functions)
}

let win: BrowserWindow | null = null
let tray: Tray | null = null

function createTray() {
  if (!ICON_PATH) return
  tray = new Tray(ICON_PATH)
  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Mostrar Launcher",
      click: () => {
        if (win) {
          win.show()
          win.focus()
        }
      },
    },
    { type: "separator" },
    { label: "Salir", click: () => app.quit() },
  ])
  tray.setToolTip("San Andreas Roleplay - Launcher")
  tray.setContextMenu(contextMenu)
  tray.on("double-click", () => {
    win?.show()
  })
}

function createWindow() {
  const bounds = loadInitialBounds()

  win = new BrowserWindow({
    title: "San Andreas Roleplay - SA:MP Launcher",
    icon: ICON_PATH ?? undefined,
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    minWidth: MIN_WIDTH,
    minHeight: MIN_HEIGHT,
    frame: false,
    resizable: true,
    maximizable: true,
    fullscreenable: true,
    useContentSize: true,
    autoHideMenuBar: true,
    show: false,
    backgroundColor: "#09090b",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
      // Disable DevTools in packaged builds — neutralises F12, Ctrl+Shift+I
      // and webContents.openDevTools(). Casual users can still extract the
      // .asar, but they cannot poke at the running renderer live.
      devTools: !app.isPackaged,
    },
  })

  if (bounds.isMaximized) win.maximize()
  if (bounds.isFullscreen) win.setFullScreen(true)

  // Defer first paint until the renderer is ready so users don't see a flash
  // of white between window-create and first frame.
  win.once("ready-to-show", () => win?.show())

  attachWindowStatePersistence(win)

  // Push window-state changes to the renderer so the title bar can reflect
  // maximise/restore/fullscreen icons and conditionally hide itself in
  // fullscreen.
  const sendState = () => {
    if (!win || win.isDestroyed()) return
    win.webContents.send(IPC.WINDOW_STATE_CHANGED, {
      isMaximized: win.isMaximized(),
      isFullscreen: win.isFullScreen(),
    })
  }
  win.on("maximize", sendState)
  win.on("unmaximize", sendState)
  win.on("enter-full-screen", sendState)
  win.on("leave-full-screen", sendState)

  // Suppress the default right-click → "Inspect element" entry. With devTools
  // disabled the entry is inert anyway, but hiding the menu avoids surfacing
  // the affordance at all.
  win.webContents.on("context-menu", (event) => event.preventDefault())

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL).catch((err) => {
      log.error("Failed to load dev server URL:", err)
      // Fallback to local files if dev server is unreachable
      if (!app.isPackaged && fs.existsSync(path.join(RENDERER_DIST, "index.html"))) {
        win?.loadFile(path.join(RENDERER_DIST, "index.html"))
      }
    })
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"))
  }
}

app.whenReady().then(() => {
  // Register custom protocol for Discord Join button
  app.setAsDefaultProtocolClient("sarp-launcher")

  // Strip Electron's default application menu
  Menu.setApplicationMenu(null)
  registerIpcHandlers()

  createWindow()

  // Set session-level user agent so all requests (including webview guests)
  // present as a standard Chrome browser to Cloudflare and other anti-bot systems.
  if (win) {
    win.webContents.session.setUserAgent(CHROME_UA)
  }

  // Intercept target="_blank" links inside <webview> elements. When a guest
  // page tries to open a new window, deny it and send the URL to the renderer
  // so it can open the link in a new browser tab within the launcher.
  // Sites that block embedding via X-Frame-Options are opened externally.
  // Requires allowpopups on the <webview> tag for this handler to fire.
  const EMBED_BLOCKED_HOSTS = [
    "discord.com",
    "discord.gg",
    "youtube.com",
    "youtu.be",
    "twitter.com",
    "x.com",
    "twitch.tv",
    "facebook.com",
    "fb.com",
    "instagram.com",
    "reddit.com",
    "linkedin.com",
    "tiktok.com",
    "accounts.google.com",
  ]

  if (win) {
    win.webContents.on("did-attach-webview", (_event, guestContents) => {
      guestContents.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
      )

      guestContents.setWindowOpenHandler(({ url }) => {
        if (!url || url === "about:blank") return { action: "deny" }

        try {
          const host = new URL(url).hostname
          const isBlocked = EMBED_BLOCKED_HOSTS.some((d) => host === d || host.endsWith(`.${d}`))
          if (isBlocked) {
            shell.openExternal(url)
          } else {
            win?.webContents.send(IPC.WEBVIEW_NAVIGATE, url)
          }
        } catch {
          shell.openExternal(url)
        }

        return { action: "deny" }
      })
    })
  }

  // Tray creation can fail if the icon is locked or invalid.
  // Wrap in try-catch so it doesn't block window creation.
  try {
    createTray()
  } catch (err) {
    log.error("Failed to create tray:", err)
  }

  detectRunningGame()
  initDiscordRPC()

  // Fire-and-forget — never block window creation on filesystem I/O.
  sweepLauncherTemp().catch(() => undefined)
  if (win) initUpdater(win)
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit()
  win = null
})

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
