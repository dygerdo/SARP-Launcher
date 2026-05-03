import { existsSync } from "node:fs"
import { join } from "node:path"
import { app } from "electron"
import { getGameDir } from "./paths"

export interface HealthCheckItem {
  ok: boolean
  detail?: string
}

export function checkGta(): HealthCheckItem {
  const exe = join(getGameDir(), "gta_sa.exe")
  if (!existsSync(exe)) {
    return { ok: false, detail: "No encontramos gta_sa.exe junto al launcher." }
  }
  return { ok: true }
}

export function checkSamp(): HealthCheckItem {
  const exe = join(getGameDir(), "samp.exe")
  if (!existsSync(exe)) {
    return { ok: false, detail: "Falta samp.exe. Reabrí el launcher para descargarlo." }
  }
  return { ok: true }
}

export function checkCache(): HealthCheckItem {
  const folder = process.env.VITE_GAME_CACHE_FOLDER
  if (!folder) {
    return { ok: false, detail: "Falta configurar VITE_GAME_CACHE_FOLDER." }
  }

  const cacheDir = join(
    app.getPath("documents"),
    "GTA San Andreas User Files",
    "SAMP",
    "cache",
    folder,
  )

  if (!existsSync(cacheDir)) {
    return { ok: false, detail: "El cache del servidor no está instalado." }
  }
  return { ok: true }
}
