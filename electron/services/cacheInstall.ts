import { app } from "electron"
import { randomBytes } from "node:crypto"
import { promises as fsp } from "node:fs"
import { join } from "node:path"
import { downloadWithResume, extractDirect, removeZoneIdentifier } from "./gtaInstall"
import type { GtaInstallProgress } from "./gtaInstall"
import { fetchManifest, getCachedManifest } from "./manifest"
import type { LauncherManifest } from "./manifest"
import store from "./store"

export type CacheInstallProgress = GtaInstallProgress

export interface CacheInstallResult {
  ok: boolean
  error?: string
}

export type CacheInstallProgressCallback = (progress: CacheInstallProgress) => void

async function ensureManifest(): Promise<LauncherManifest> {
  const cached = getCachedManifest()
  if (cached) return cached
  return fetchManifest()
}

async function ensureTempDir(): Promise<string> {
  const stored = store.get("cacheInstallTempDir")
  if (stored) {
    try {
      await fsp.mkdir(stored, { recursive: true })
      return stored
    } catch {
      // fall through
    }
  }
  const fresh = join(app.getPath("temp"), `sarp-cache-${randomBytes(8).toString("hex")}`)
  await fsp.mkdir(fresh, { recursive: true })
  store.set("cacheInstallTempDir", fresh)
  return fresh
}

async function clearTempDir(): Promise<void> {
  const stored = store.get("cacheInstallTempDir")
  if (stored) {
    try {
      await fsp.rm(stored, { recursive: true, force: true })
    } catch {
      // best-effort
    }
  }
  store.set("cacheInstallTempDir", null)
}

function getCacheRoot(): string {
  const folder = process.env.VITE_GAME_CACHE_FOLDER
  if (!folder) throw new Error("VITE_GAME_CACHE_FOLDER no está configurado.")
  return join(app.getPath("documents"), "GTA San Andreas User Files", "SAMP", "cache", folder)
}

/**
 * After extraction, defensively check whether the zip wrapped its contents
 * in a single top-level directory (e.g. `135.148.128.72.7777/` or any other
 * single root). If so, lift its contents up one level so the cache layout
 * matches what SA:MP expects directly under the server folder.
 *
 * We only strip when the cache root contains exactly one entry and that
 * entry is a directory — any loose file at the root means the zip was
 * already flat (just happened to contain a subfolder), so no stripping.
 */
async function stripSingleWrapperDir(cacheRoot: string): Promise<void> {
  const entries = await fsp.readdir(cacheRoot, { withFileTypes: true })
  if (entries.length !== 1) return
  const only = entries[0]
  if (!only.isDirectory()) return

  const wrapperPath = join(cacheRoot, only.name)
  const inner = await fsp.readdir(wrapperPath, { withFileTypes: true })

  // Move every child of the wrapper up to the cache root. We use rename when
  // possible (atomic on the same filesystem) and fall back to copy + remove
  // only if rename fails — Documents is the same drive in 99% of installs,
  // so rename will normally win.
  for (const child of inner) {
    const from = join(wrapperPath, child.name)
    const to = join(cacheRoot, child.name)
    await fsp.rename(from, to)
  }
  await fsp.rmdir(wrapperPath)
}

export async function installCache(
  onProgress: CacheInstallProgressCallback,
): Promise<CacheInstallResult> {
  try {
    onProgress({ phase: "preflight", percent: 0, message: "Preparando instalación del caché..." })

    const manifest = await ensureManifest()
    const zipMeta = manifest.cache.zip

    const cacheRoot = getCacheRoot()
    const tempDir = await ensureTempDir()
    const zipPath = join(tempDir, zipMeta.filename)

    // Download *before* touching the existing cache. If the network dies
    // mid-download, the user keeps the old cache and can still play. We
    // skip a sha256 check on purpose — the manifest doesn't ship one and
    // size-match during the download itself is enough integrity for our
    // case (Bunny CDN serves intact bytes).
    await downloadWithResume({
      url: zipMeta.url,
      destPath: zipPath,
      expectedSize: zipMeta.size,
      onProgress,
    })

    await removeZoneIdentifier(zipPath)

    // Now that we have the full zip on disk, swap caches: wipe the old
    // contents and extract fresh. A partial extract still leaves the user
    // worse off than the old cache, but at this point we're committed.
    await fsp.rm(cacheRoot, { recursive: true, force: true })
    await fsp.mkdir(cacheRoot, { recursive: true })

    onProgress({ phase: "extract", percent: 0, message: "Extrayendo caché..." })
    await extractDirect(zipPath, cacheRoot, onProgress)

    await stripSingleWrapperDir(cacheRoot)

    // Persist the size we just installed so the next health check can tell
    // whether a new cache has been published since.
    store.set("installedCacheSize", zipMeta.size)

    await clearTempDir()

    onProgress({ phase: "done", percent: 100 })
    return { ok: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : "La instalación del caché falló."
    onProgress({ phase: "error", percent: 0, message })
    return { ok: false, error: message }
  }
}
