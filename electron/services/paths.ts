import { app } from "electron"
import { dirname } from "node:path"

const DEV_FALLBACK = "C:\\Program Files (x86)\\Rockstar Games\\GTA San Andreas"

export function getGameDir(): string {
  if (!app.isPackaged) {
    return process.env.DEV_GTA_PATH ?? DEV_FALLBACK
  }
  return dirname(app.getPath("exe"))
}
