import { existsSync } from "node:fs"
import { join } from "node:path"
import { app } from "electron"
import { findMissingGtaItems, getGameDir, REQUIRED_GTA_DIRS, REQUIRED_GTA_FILES } from "./paths"
import { fetchManifest, getCachedManifest } from "./manifest"
import store from "./store"

export interface HealthCheckItem {
  ok: boolean
  detail?: string
}

export interface GtaHealthCheckItem extends HealthCheckItem {
  /** True when *every* required file/dir is missing — an empty (or fake)
   *  install. Used by the renderer to decide whether to offer "Instalar". */
  missingAll: boolean
}

export interface CacheHealthCheckItem extends HealthCheckItem {
  /** Carpeta del caché ausente — hay que descargar e instalar desde cero. */
  needsInstall: boolean
  /** Carpeta presente pero con tamaño distinto al del manifest — actualizar. */
  needsUpdate: boolean
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

export async function checkCache(): Promise<CacheHealthCheckItem> {
  const folder = process.env.VITE_GAME_CACHE_FOLDER
  if (!folder) {
    return {
      ok: false,
      needsInstall: false,
      needsUpdate: false,
      detail: "Falta configurar VITE_GAME_CACHE_FOLDER.",
    }
  }

  const cacheDir = join(
    app.getPath("documents"),
    "GTA San Andreas User Files",
    "SAMP",
    "cache",
    folder,
  )

  let manifest = getCachedManifest()
  if (!manifest) {
    try {
      manifest = await fetchManifest()
    } catch {
      // No manifest = no internet (or CDN down). Don't claim the cache is
      // missing or up to date — be honest that we couldn't verify and let
      // the renderer surface the network problem on the SAMP row instead.
      return {
        ok: existsSync(cacheDir),
        needsInstall: false,
        needsUpdate: false,
        detail: "No se pudo verificar el caché. Revisa tu conexión a Internet.",
      }
    }
  }

  if (!existsSync(cacheDir)) {
    return {
      ok: false,
      needsInstall: true,
      needsUpdate: false,
      detail: "El caché del servidor no está instalado.",
    }
  }

  // Only re-download when the manifest is *bigger* than what the user has
  // on disk. A smaller-or-equal manifest size means either nothing changed
  // or the user already has a fatter cache (e.g. they joined some other
  // server that shares the same SAMP cache folder). Either way, no point
  // pulling 700 MB just to end up with fewer bytes.
  const installedSize = store.get("installedCacheSize") ?? 0
  const expectedSize = manifest.cache.zip.size
  if (installedSize < expectedSize) {
    return {
      ok: false,
      needsInstall: false,
      needsUpdate: true,
      detail: "Hay una versión nueva del caché disponible.",
    }
  }

  return {
    ok: true,
    needsInstall: false,
    needsUpdate: false,
  }
}
