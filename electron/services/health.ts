import { existsSync } from "node:fs"
import { join } from "node:path"
import { app } from "electron"
import { findMissingGtaItems, getGameDir, REQUIRED_GTA_DIRS, REQUIRED_GTA_FILES } from "./paths"

export interface HealthCheckItem {
  ok: boolean
  detail?: string
}

export interface GtaHealthCheckItem extends HealthCheckItem {
  /** True when *every* required file/dir is missing — an empty (or fake)
   *  install. Used by the renderer to decide whether to offer "Instalar". */
  missingAll: boolean
}

const TOTAL_REQUIRED = REQUIRED_GTA_FILES.length + REQUIRED_GTA_DIRS.length

export function checkGta(): GtaHealthCheckItem {
  const missing = findMissingGtaItems(getGameDir())
  const all = [...missing.files, ...missing.dirs]
  const missingAll = all.length === TOTAL_REQUIRED
  if (all.length === 0) return { ok: true, missingAll: false }
  if (missingAll) {
    return {
      ok: false,
      missingAll: true,
      detail: "No está instalado en esta carpeta.",
    }
  }
  if (all.length === 1) {
    return { ok: false, missingAll: false, detail: `No encontramos ${all[0]} en la carpeta.` }
  }
  return {
    ok: false,
    missingAll: false,
    detail: `Faltan en la carpeta: ${all.join(", ")}.`,
  }
}

export function checkSamp(): HealthCheckItem {
  const exe = join(getGameDir(), "samp.exe")
  if (!existsSync(exe)) {
    return { ok: false, detail: "Falta samp.exe. Vuelve a abrir el launcher para descargarlo." }
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
