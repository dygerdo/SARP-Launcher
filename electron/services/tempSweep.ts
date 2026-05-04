import { app } from "electron"
import { promises as fsp } from "node:fs"
import { join } from "node:path"
import store from "./store"

const SARP_TEMP_PREFIX = "sarp-launcher-"
const SCRIPT_PREFIXES = ["sarp-copy-", "sarp-extract-"]
const ZOMBIE_AGE_MS = 24 * 60 * 60 * 1000 // 1 day

/**
 * Removes leftover temp folders/scripts from earlier installer runs that did
 * not get to clean themselves up (file locks, crashes, etc.). Best-effort:
 * any error per-entry is swallowed so a single locked file does not block
 * the rest of the sweep.
 *
 * The folder we currently own (`gtaInstallTempDir` from the store, used for
 * resumable GTA downloads) is preserved regardless of age.
 */
export async function sweepLauncherTemp(): Promise<void> {
  const tempRoot = app.getPath("temp")
  const owned = store.get("gtaInstallTempDir") ?? null
  const cutoff = Date.now() - ZOMBIE_AGE_MS

  let entries: string[]
  try {
    entries = await fsp.readdir(tempRoot)
  } catch {
    return
  }

  await Promise.all(
    entries.map(async (name) => {
      const isFolder = name.startsWith(SARP_TEMP_PREFIX)
      const isScript = SCRIPT_PREFIXES.some((p) => name.startsWith(p))
      if (!isFolder && !isScript) return

      const full = join(tempRoot, name)
      if (full === owned) return

      try {
        const stat = await fsp.stat(full)
        if (stat.mtimeMs > cutoff) return // recent — leave it
        await fsp.rm(full, { recursive: true, force: true })
      } catch {
        // ignore — locked or permission denied
      }
    }),
  )
}
