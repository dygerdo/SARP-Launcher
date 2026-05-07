import { app, BrowserWindow, Menu } from "electron"
import { fileURLToPath } from "node:url"
import path from "node:path"
import log from "electron-log"
import { registerIpcHandlers } from "./ipc/handlers"
import { IPC } from "./ipc/channels"
import { detectRunningGame } from "./services/launcher"
import { sweepLauncherTemp } from "./services/tempSweep"
import { initUpdater } from "./services/updater"
import {
  attachWindowStatePersistence,
  loadInitialBounds,
  MIN_HEIGHT,
  MIN_WIDTH,
} from "./services/windowState"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, "..")
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist")
const ICON_PATH = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public", "favicon.ico")
  : path.join(process.resourcesPath, "favicon.ico")

// In production, route every console.* call through electron-log so logs land
// in %APPDATA%\<app>\logs\main.log instead of stdout. Stops users who launch
// the .exe from a terminal from watching the app's internals in real time.
// We keep warn/error visible in the file (electron-log writes them too) but
// never to stdout.
if (app.isPackaged) {
  Object.assign(console, log.functions)
}

let win: BrowserWindow | null = null

function createWindow() {
  const bounds = loadInitialBounds()

  win = new BrowserWindow({
    title: "San Andreas Roleplay - SA:MP Launcher",
    icon: ICON_PATH,
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
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"))
  }
}

app.whenReady().then(() => {
  // Strip Electron's default application menu — kills the View → Toggle
  // Developer Tools entry and its accelerators across the whole app.
  Menu.setApplicationMenu(null)
  registerIpcHandlers()
  createWindow()
  detectRunningGame()
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
