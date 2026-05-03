import { app, BrowserWindow } from "electron"
import { fileURLToPath } from "node:url"
import path from "node:path"
import { registerIpcHandlers } from "./ipc/handlers"
import { detectRunningGame } from "./services/launcher"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, "..")
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist")
const ICON_PATH = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public", "favicon.ico")
  : path.join(process.resourcesPath, "favicon.ico")

let win: BrowserWindow | null = null

function createWindow() {
  win = new BrowserWindow({
    title: "San Andreas Roleplay - SA:MP Launcher",
    icon: ICON_PATH,
    width: 960,
    height: 860,
    frame: false,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"))
  }
}

app.whenReady().then(() => {
  registerIpcHandlers()
  createWindow()
  detectRunningGame()
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit()
  win = null
})

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
