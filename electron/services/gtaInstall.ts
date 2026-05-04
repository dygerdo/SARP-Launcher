import { app, net, shell } from "electron"
import { spawn } from "node:child_process"
import { createHash, randomBytes } from "node:crypto"
import { createReadStream, createWriteStream, existsSync, statSync } from "node:fs"
import { promises as fsp } from "node:fs"
import { join } from "node:path"
import extract from "extract-zip"
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

async function sha256OfFile(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256")
    const stream = createReadStream(path)
    stream.on("data", (chunk) => hash.update(chunk))
    stream.on("end", () => resolve(hash.digest("hex")))
    stream.on("error", reject)
  })
}

interface DownloadOpts {
  url: string
  destPath: string
  expectedSize: number
  expectedSha256: string
  onProgress: GtaInstallProgressCallback
}

async function downloadWithResume(opts: DownloadOpts): Promise<void> {
  const { url, destPath, expectedSize, expectedSha256, onProgress } = opts

  // If we already have something on disk, validate that it's a usable resume
  // candidate. If it's already complete and matches the hash, skip the download
  // entirely — saves an HTTP roundtrip on retries.
  let resumeFrom = 0
  if (existsSync(destPath)) {
    const existingSize = statSync(destPath).size
    if (existingSize === expectedSize) {
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
      // wrong hash → start over
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
      // 206 Partial Content for resume; 200 if server ignored Range.
      if (status === 200 && resumeFrom > 0) {
        // Server didn't honour our Range — restart from zero by truncating.
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
        fail(new Error(`HTTP ${status} al descargar GTA_RIP.zip.`))
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
async function removeZoneIdentifier(filePath: string): Promise<void> {
  try {
    await fsp.unlink(`${filePath}:Zone.Identifier`)
  } catch {
    // intentional
  }
}

async function extractDirect(zipPath: string, targetDir: string): Promise<void> {
  await extract(zipPath, { dir: targetDir })
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

    onProgress({ phase: "extract", percent: 0, message: "Extrayendo archivos..." })
    const writable = await canWriteToDir(targetDir)
    if (writable) {
      await extractDirect(zipPath, targetDir)
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
