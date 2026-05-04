import { app, net, shell } from "electron"
import { spawn } from "node:child_process"
import { createHash, randomBytes } from "node:crypto"
import { createReadStream, createWriteStream, existsSync, statSync } from "node:fs"
import { promises as fsp } from "node:fs"
import { dirname, join, normalize, sep } from "node:path"
import type { Readable } from "node:stream"
import { pipeline } from "node:stream/promises"
import yauzl from "yauzl"
import type { Entry, ZipFile } from "yauzl"
import { fetchManifest, getCachedManifest } from "./manifest"
import type { LauncherManifest } from "./manifest"
import store from "./store"

const DOWNLOAD_TIMEOUT_MS = 600_000 // 10 min — 1 GB on a slow line
const EXTRACT_TIMEOUT_MS = 600_000
const SPEED_WINDOW_MS = 2000 // sliding window for throughput estimation
const ZIP_FILENAME = "GTA_RIP.zip"

// Same exit codes used by the SAMP installer flow so the renderer can map a
// cancelled UAC consistently regardless of which install path triggered it.
const ELEVATED_EXIT_UAC_CANCELLED = 1223
const ELEVATED_EXIT_LAUNCH_FAILED = 1224
const ELEVATED_EXIT_NO_PROCESS = 1225

export type GtaInstallPhase =
  | "preflight"
  | "download"
  | "verify"
  | "extract"
  | "shortcut"
  | "done"
  | "error"

export interface GtaInstallProgress {
  phase: GtaInstallPhase
  percent: number
  bytesDone?: number
  bytesTotal?: number
  speedBps?: number
  message?: string
}

export interface GtaInstallResult {
  ok: boolean
  error?: string
  cancelled?: boolean
}

export type GtaInstallProgressCallback = (progress: GtaInstallProgress) => void

async function ensureManifest(): Promise<LauncherManifest> {
  const cached = getCachedManifest()
  if (cached) return cached
  return fetchManifest()
}

async function ensureTempDir(): Promise<string> {
  const stored = store.get("gtaInstallTempDir")
  if (stored) {
    try {
      await fsp.mkdir(stored, { recursive: true })
      return stored
    } catch {
      // fall through and create a fresh one
    }
  }
  const fresh = join(app.getPath("temp"), `sarp-launcher-${randomBytes(8).toString("hex")}`)
  await fsp.mkdir(fresh, { recursive: true })
  store.set("gtaInstallTempDir", fresh)
  return fresh
}

async function clearTempDir(): Promise<void> {
  const stored = store.get("gtaInstallTempDir")
  if (stored) {
    try {
      await fsp.rm(stored, { recursive: true, force: true })
    } catch {
      // best-effort
    }
  }
  store.set("gtaInstallTempDir", null)
}

async function canWriteToDir(path: string): Promise<boolean> {
  const probe = join(path, `.sarp-probe-${randomBytes(4).toString("hex")}`)
  try {
    await fsp.writeFile(probe, "")
    await fsp.unlink(probe)
    return true
  } catch {
    return false
  }
}

export async function sha256OfFile(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256")
    const stream = createReadStream(path)
    stream.on("data", (chunk) => hash.update(chunk))
    stream.on("end", () => resolve(hash.digest("hex")))
    stream.on("error", reject)
  })
}

export interface DownloadOpts {
  url: string
  destPath: string
  expectedSize: number
  /** Optional. When present, a fully-downloaded file on disk is hashed and
   *  reused only if the hash matches. When absent, size match is enough. */
  expectedSha256?: string
  onProgress: GtaInstallProgressCallback
}

export async function downloadWithResume(opts: DownloadOpts): Promise<void> {
  const { url, destPath, expectedSize, expectedSha256, onProgress } = opts

  // If we already have something on disk, decide whether to reuse / resume
  // / discard it. Without a sha256 we can't tell whether a same-sized blob
  // is actually the file we want (it might be a leftover from a different
  // version of the same key), so the safe move is to start clean.
  let resumeFrom = 0
  if (existsSync(destPath)) {
    const existingSize = statSync(destPath).size

    if (!expectedSha256) {
      await fsp.unlink(destPath)
    } else if (existingSize === expectedSize) {
      const sha = await sha256OfFile(destPath)
      if (sha === expectedSha256) {
        onProgress({
          phase: "download",
          percent: 100,
          bytesDone: expectedSize,
          bytesTotal: expectedSize,
        })
        return
      }
      await fsp.unlink(destPath)
    } else if (existingSize < expectedSize) {
      resumeFrom = existingSize
    } else {
      // larger than expected → corrupted, restart
      await fsp.unlink(destPath)
    }
  }

  await new Promise<void>((resolve, reject) => {
    const request = net.request({ method: "GET", url })
    if (resumeFrom > 0) request.setHeader("Range", `bytes=${resumeFrom}-`)

    let settled = false
    let received = resumeFrom
    let lastEmittedAt = 0
    const speedSamples: { t: number; bytes: number }[] = []

    const settle = (fn: () => void) => {
      if (settled) return
      settled = true
      fn()
    }

    const timeout = setTimeout(() => {
      request.abort()
      settle(() => reject(new Error("La descarga tardó demasiado.")))
    }, DOWNLOAD_TIMEOUT_MS)

    const writer = createWriteStream(destPath, { flags: resumeFrom > 0 ? "a" : "w" })

    const fail = (err: Error) => {
      clearTimeout(timeout)
      writer.destroy()
      settle(() => reject(err))
    }

    writer.on("error", fail)

    request.on("response", (response) => {
      const status = response.statusCode ?? 0
      // 206 Partial Content for resume; 200 if server ignored Range; 416 when
      // our resume offset is past the end of the (now smaller) object on the
      // server — happens when the upstream file changed between attempts.
      // In both the 200-without-Range and 416 cases the right move is to
      // wipe the partial and restart from byte zero.
      if ((status === 200 && resumeFrom > 0) || status === 416) {
        writer.end()
        clearTimeout(timeout)
        settled = true
        fsp
          .unlink(destPath)
          .catch(() => undefined)
          .then(() => downloadWithResume({ ...opts }).then(resolve, (e) => reject(e as Error)))
        return
      }
      if (status !== 200 && status !== 206) {
        fail(new Error(`HTTP ${status} al descargar el archivo.`))
        return
      }

      response.on("data", (chunk: Buffer) => {
        received += chunk.length
        writer.write(chunk)

        const now = Date.now()
        speedSamples.push({ t: now, bytes: chunk.length })
        const cutoff = now - SPEED_WINDOW_MS
        while (speedSamples.length > 0 && speedSamples[0].t < cutoff) speedSamples.shift()

        // Throttle UI updates to once every 100 ms; the underlying stream
        // produces dozens of chunks per second on a fast line.
        if (now - lastEmittedAt < 100) return
        lastEmittedAt = now

        const windowBytes = speedSamples.reduce((s, x) => s + x.bytes, 0)
        const windowMs = Math.max(1, now - speedSamples[0].t)
        const speedBps = Math.round((windowBytes * 1000) / windowMs)
        const percent = expectedSize > 0 ? Math.min(100, (received / expectedSize) * 100) : 0
        onProgress({
          phase: "download",
          percent,
          bytesDone: received,
          bytesTotal: expectedSize,
          speedBps,
        })
      })

      response.on("end", () => {
        writer.end(() => {
          clearTimeout(timeout)
          settle(() => {
            if (received !== expectedSize) {
              reject(new Error("La descarga quedó incompleta."))
              return
            }
            resolve()
          })
        })
      })

      response.on("error", fail)
    })

    request.on("error", fail)
    request.end()
  })
}

function escapePowerShellSingleQuoted(value: string): string {
  return value.replace(/'/g, "''")
}

/**
 * Removes the NTFS Zone.Identifier alternate data stream Windows attaches to
 * downloaded files. Without this, Defender / SmartScreen may flag the zip
 * (and the executables we then extract) as "from the Internet", which can
 * deny CreateProcess from a non-elevated context with EACCES. Best-effort.
 */
export async function removeZoneIdentifier(filePath: string): Promise<void> {
  try {
    await fsp.unlink(`${filePath}:Zone.Identifier`)
  } catch {
    // intentional
  }
}

// Larger write buffer than Node's default (16 KB). Cuts the number of write
// syscalls per file by ~16x, which matters more on slow HDDs where each seek
// is expensive than on fast SSDs.
const EXTRACT_HIGH_WATER_MARK = 256 * 1024

// Throttle progress events. Emitting per-chunk would flood the IPC channel
// (hundreds of events per second on big files) and stall the renderer.
const PROGRESS_THROTTLE_MS = 100

function openZipReadable(zipPath: string): Promise<ZipFile> {
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
      if (err || !zipfile) {
        reject(err ?? new Error("No se pudo abrir el zip."))
        return
      }
      resolve(zipfile)
    })
  })
}

function openEntryStream(zipfile: ZipFile, entry: Entry): Promise<Readable> {
  return new Promise((resolve, reject) => {
    zipfile.openReadStream(entry, (err, stream) => {
      if (err || !stream) {
        reject(err ?? new Error(`No se pudo abrir ${entry.fileName}`))
        return
      }
      resolve(stream)
    })
  })
}

function isUnsafeEntryPath(rel: string): boolean {
  const normalized = normalize(rel)
  // Reject absolute paths and any segment that escapes the target.
  if (normalized.startsWith(sep) || /^[a-zA-Z]:/.test(normalized)) return true
  return normalized.split(sep).includes("..")
}

/**
 * Extracts a zip entry-by-entry in series, optimised for slow drives:
 *
 * - Single-threaded loop: parallel writes thrash HDD heads with seeks. Serial
 *   keeps the disk doing one sequential write at a time.
 * - Pre-creates every directory once at the top, so the per-entry hot path
 *   skips the recursive `mkdir`.
 * - Larger write buffer (256 KB) than Node's default to amortise syscalls.
 * - Skips `realpath` per entry; we validate the relative path syntactically
 *   instead, which is enough to block traversal without an extra stat.
 * - Progress in real (uncompressed) bytes, not entry count, so the bar moves
 *   proportionally to time when entries vary in size.
 */
export async function extractDirect(
  zipPath: string,
  targetDir: string,
  onProgress: GtaInstallProgressCallback,
): Promise<void> {
  // First pass: collect entries and totals. yauzl can't rewind, so we open
  // the zip twice — once to plan, once to extract. Both passes are cheap
  // because we never read the file bodies in pass one.
  const planning = await openZipReadable(zipPath)
  const entries: Entry[] = []
  const directories = new Set<string>()
  let totalBytes = 0

  await new Promise<void>((resolve, reject) => {
    planning.on("error", reject)
    planning.on("end", resolve)
    planning.on("entry", (entry: Entry) => {
      const isDir = entry.fileName.endsWith("/")
      if (isUnsafeEntryPath(entry.fileName)) {
        reject(new Error(`Ruta no permitida en el zip: ${entry.fileName}`))
        planning.close()
        return
      }
      if (isDir) {
        directories.add(entry.fileName)
      } else {
        entries.push(entry)
        totalBytes += entry.uncompressedSize
        // The directory containing this file must also exist.
        const parent = dirname(entry.fileName)
        if (parent && parent !== ".") directories.add(parent + "/")
      }
      planning.readEntry()
    })
    planning.readEntry()
  })

  // Pre-create every directory once. Sorted by depth so parents come first
  // and `recursive: true` short-circuits on the deeper calls.
  const sortedDirs = [...directories].sort((a, b) => a.length - b.length)
  for (const dir of sortedDirs) {
    await fsp.mkdir(join(targetDir, dir), { recursive: true })
  }

  // Pass two: extract each file in series, streaming inflate → write.
  const zipfile = await openZipReadable(zipPath)
  const totalEntries = entries.length
  let processedBytes = 0
  let processedEntries = 0
  let lastEmittedAt = 0

  const emit = (force = false) => {
    const now = Date.now()
    if (!force && now - lastEmittedAt < PROGRESS_THROTTLE_MS) return
    lastEmittedAt = now
    const percent = totalBytes > 0 ? Math.min(100, (processedBytes / totalBytes) * 100) : 0
    onProgress({
      phase: "extract",
      percent,
      bytesDone: processedBytes,
      bytesTotal: totalBytes,
      message: `Extrayendo ${processedEntries} de ${totalEntries} archivos...`,
    })
  }

  emit(true)

  try {
    await new Promise<void>((resolve, reject) => {
      let pending = entries.length
      if (pending === 0) {
        zipfile.close()
        resolve()
        return
      }

      zipfile.on("error", reject)
      zipfile.on("close", () => {
        if (processedEntries === totalEntries) resolve()
      })

      const next = (): void => {
        zipfile.readEntry()
      }

      zipfile.on("entry", (entry: Entry) => {
        // Directories were already created in pass one; skip them.
        if (entry.fileName.endsWith("/")) {
          next()
          return
        }
        ;(async () => {
          try {
            const dest = join(targetDir, entry.fileName)
            const readStream = await openEntryStream(zipfile, entry)
            const writeStream = createWriteStream(dest, {
              highWaterMark: EXTRACT_HIGH_WATER_MARK,
            })
            // Stream chunks of the *uncompressed* output as they arrive so
            // the progress bar moves continuously even while a single huge
            // file (gta3.img can be 200+ MB) is being inflated. Without
            // this, the bar would freeze for the duration of each big file.
            let entryBytesReported = 0
            readStream.on("data", (chunk: Buffer) => {
              entryBytesReported += chunk.length
              processedBytes += chunk.length
              emit()
            })
            await pipeline(readStream, writeStream)
            // Reconcile in case uncompressedSize > bytes we observed (rare:
            // some encoders pad). Never let processedBytes drift behind
            // what the planning pass said this entry should contribute.
            const drift = entry.uncompressedSize - entryBytesReported
            if (drift > 0) processedBytes += drift
            processedEntries += 1
            emit()
            pending -= 1
            if (pending === 0) {
              zipfile.close()
            } else {
              next()
            }
          } catch (err) {
            reject(err instanceof Error ? err : new Error(String(err)))
          }
        })()
      })

      zipfile.readEntry()
    })
  } finally {
    emit(true)
  }
}

async function extractElevated(zipPath: string, targetDir: string): Promise<void> {
  // Same pattern as the SAMP installer: write a .ps1 to disk, run an outer
  // PowerShell that elevates and executes the script. Avoids escape-within-
  // escape headaches and gives us stable exit codes.
  const scriptBody = [
    "$ErrorActionPreference = 'Stop'",
    "try {",
    `  Expand-Archive -LiteralPath '${escapePowerShellSingleQuoted(zipPath)}' -DestinationPath '${escapePowerShellSingleQuoted(targetDir)}' -Force`,
    "  exit 0",
    "} catch {",
    `  exit ${ELEVATED_EXIT_LAUNCH_FAILED}`,
    "}",
  ].join("\r\n")

  const scriptPath = join(app.getPath("temp"), `sarp-extract-${randomBytes(8).toString("hex")}.ps1`)
  await fsp.writeFile(scriptPath, scriptBody, { encoding: "utf8" })

  const launcher = [
    `try { `,
    `  $proc = Start-Process powershell.exe `,
    `    -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-File','${escapePowerShellSingleQuoted(scriptPath)}' `,
    `    -Verb RunAs -Wait -PassThru -WindowStyle Hidden -ErrorAction Stop; `,
    `  if ($null -eq $proc) { exit ${ELEVATED_EXIT_NO_PROCESS} }; `,
    `  exit $proc.ExitCode `,
    `} catch [System.ComponentModel.Win32Exception] { `,
    `  if ($_.Exception.NativeErrorCode -eq 1223) { exit ${ELEVATED_EXIT_UAC_CANCELLED} } `,
    `  else { exit ${ELEVATED_EXIT_LAUNCH_FAILED} } `,
    `} catch { exit ${ELEVATED_EXIT_LAUNCH_FAILED} }`,
  ].join("")

  try {
    await new Promise<void>((resolve, reject) => {
      const child = spawn("powershell.exe", ["-NoProfile", "-Command", launcher], {
        windowsHide: true,
      })

      let settled = false
      const settle = (fn: () => void) => {
        if (settled) return
        settled = true
        fn()
      }

      const timeout = setTimeout(() => {
        try {
          child.kill()
        } catch {
          // ignore — already dead
        }
        settle(() => reject(new Error("La extracción no respondió a tiempo.")))
      }, EXTRACT_TIMEOUT_MS)

      child.on("error", (err) => {
        clearTimeout(timeout)
        settle(() => reject(err))
      })

      child.on("close", (code) => {
        clearTimeout(timeout)
        settle(() => {
          if (code === 0) {
            resolve()
            return
          }
          if (code === ELEVATED_EXIT_UAC_CANCELLED) {
            reject(new Error("Se canceló la solicitud de permisos de administrador."))
            return
          }
          reject(new Error("No se pudo extraer el juego con permisos de administrador."))
        })
      })
    })
  } finally {
    try {
      await fsp.unlink(scriptPath)
    } catch {
      // best-effort
    }
  }
}

async function createLauncherShortcut(targetDir: string): Promise<void> {
  if (!app.isPackaged) return // dev mode: don't litter shortcuts
  try {
    const target = app.getPath("exe")
    const shortcutPath = join(targetDir, "SARP Launcher.lnk")
    shell.writeShortcutLink(shortcutPath, "create", {
      target,
      cwd: targetDir,
      description: "San Andreas Roleplay Launcher",
      icon: target,
      iconIndex: 0,
    })
  } catch {
    // best-effort: shortcut is a nice-to-have, not a blocker
  }
}

export async function installGta(
  targetDir: string,
  onProgress: GtaInstallProgressCallback,
): Promise<GtaInstallResult> {
  try {
    onProgress({ phase: "preflight", percent: 0, message: "Preparando instalación..." })

    const manifest = await ensureManifest()
    const rip = manifest.gta.rip

    const tempDir = await ensureTempDir()
    const zipPath = join(tempDir, ZIP_FILENAME)

    await downloadWithResume({
      url: rip.url,
      destPath: zipPath,
      expectedSize: rip.size,
      expectedSha256: rip.sha256,
      onProgress,
    })

    onProgress({ phase: "verify", percent: 100, message: "Verificando archivo..." })
    const finalSha = await sha256OfFile(zipPath)
    if (finalSha !== rip.sha256) {
      // Drop the bad zip but keep the temp dir so a retry can recreate it.
      try {
        await fsp.unlink(zipPath)
      } catch {
        // ignore
      }
      throw new Error("El archivo descargado no coincide con el original.")
    }

    await removeZoneIdentifier(zipPath)

    const writable = await canWriteToDir(targetDir)
    if (writable) {
      onProgress({ phase: "extract", percent: 0, message: "Extrayendo archivos..." })
      await extractDirect(zipPath, targetDir, onProgress)
    } else {
      onProgress({
        phase: "extract",
        percent: 0,
        message: "Acepta el aviso de Windows para extraer en la carpeta protegida.",
      })
      await extractElevated(zipPath, targetDir)
    }

    onProgress({ phase: "shortcut", percent: 100, message: "Creando acceso directo..." })
    await createLauncherShortcut(targetDir)

    await clearTempDir()

    onProgress({ phase: "done", percent: 100 })
    return { ok: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : "La instalación falló."
    onProgress({ phase: "error", percent: 0, message })
    return { ok: false, error: message }
  }
}
