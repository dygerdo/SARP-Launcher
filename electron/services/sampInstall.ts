import { net, app } from "electron"
import { spawn } from "node:child_process"
import { constants as fsConstants } from "node:fs"
import { createHash, randomBytes } from "node:crypto"
import { createWriteStream, promises as fsp } from "node:fs"
import { join } from "node:path"
import { getCachedManifest, fetchManifest } from "./manifest"
import type { LauncherManifest, ManifestFileEntry } from "./manifest"
import { getGameDir } from "./paths"
import { findGameProcess } from "./launcher"
import { verifySampFiles } from "./sampVerify"
import type { FileVerification } from "./sampVerify"

export type InstallPhase = "preflight" | "download" | "install" | "verify" | "done" | "error"

export interface InstallProgress {
  phase: InstallPhase
  percent: number
  message?: string
}

export interface InstallResult {
  ok: boolean
  error?: string
}

export type InstallProgressCallback = (progress: InstallProgress) => void

const DOWNLOAD_TIMEOUT_MS = 120_000
const INSTALL_TIMEOUT_MS = 120_000

async function ensureManifest(): Promise<LauncherManifest> {
  const cached = getCachedManifest()
  if (cached) return cached
  return fetchManifest()
}

async function ensureGameNotRunning(): Promise<void> {
  const pid = await findGameProcess()
  if (pid !== null) {
    throw new Error("Cierra GTA: San Andreas antes de continuar.")
  }
}

function sanitizeFilename(name: string): string {
  // Strip path separators and characters Windows rejects in filenames so we
  // never accidentally write outside the temp dir, and the file shown by UAC
  // matches the manifest's published name exactly when possible.
  const stripped = name
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
  return stripped.length > 0 ? stripped : "sa-mp-installer.exe"
}

async function downloadInstaller(
  url: string,
  filename: string,
  expectedSize: number,
  expectedSha256: string,
  onProgress: InstallProgressCallback,
): Promise<{ filePath: string; dirPath: string }> {
  // Random subdirectory keeps concurrent or zombie installs from colliding,
  // while letting us preserve the original filename inside it. UAC then shows
  // a publicly identifiable name (e.g. sa-mp-0.3.DL-R1-2-MP-install.exe) instead
  // of an opaque randomized one.
  const dirPath = join(app.getPath("temp"), `sarp-launcher-${randomBytes(8).toString("hex")}`)
  await fsp.mkdir(dirPath, { recursive: true })
  const filePath = join(dirPath, sanitizeFilename(filename))

  await downloadFile({
    url,
    destPath: filePath,
    expectedSize,
    expectedSha256,
    onChunk: (received) => {
      const percent = expectedSize > 0 ? Math.min(100, (received / expectedSize) * 100) : 0
      onProgress({ phase: "download", percent })
    },
  })

  await removeZoneIdentifier(filePath)
  return { filePath, dirPath }
}

export async function canWriteToGameDir(gameDir: string): Promise<boolean> {
  try {
    await fsp.access(gameDir, fsConstants.W_OK)
  } catch {
    return false
  }
  // fs.access W_OK can be misleading on Windows because of UAC virtualization:
  // it may report writable on a folder where actual writes get redirected to
  // VirtualStore. We confirm with a real write of a tiny probe file.
  const probe = join(gameDir, `.sarp-probe-${randomBytes(4).toString("hex")}`)
  try {
    await fsp.writeFile(probe, "")
    await fsp.unlink(probe)
    return true
  } catch {
    return false
  }
}

function buildInstallerArgs(silentArgs: readonly string[], gameDir: string): string[] {
  return silentArgs.includes("/D=") ? [...silentArgs] : [...silentArgs, `/D=${gameDir}`]
}

function escapePowerShellSingleQuoted(value: string): string {
  return value.replace(/'/g, "''")
}

// Exit codes emitted by our PowerShell wrapper. We control these explicitly so
// the parent process never has to rely on locale-dependent stderr text.
const ELEVATED_EXIT_UAC_CANCELLED = 1223 // matches Win32 ERROR_CANCELLED
const ELEVATED_EXIT_LAUNCH_FAILED = 1224
const ELEVATED_EXIT_NO_PROCESS = 1225

/**
 * Runs an installer .exe via PowerShell's Start-Process instead of Node's
 * direct spawn. PowerShell tolerates Mark-of-the-Web flagged executables in
 * %TEMP% that Node's CreateProcess sometimes refuses with EACCES, so this is
 * also our default for the non-elevated path. When `useElevation` is true we
 * additionally pass `-Verb RunAs`, which raises the UAC prompt for the
 * installer alone — the launcher itself stays unelevated.
 */
async function runSilentInstallViaPowerShell(
  installerPath: string,
  args: string[],
  gameDir: string,
  useElevation: boolean,
): Promise<void> {
  const argList = args.map((a) => `'${escapePowerShellSingleQuoted(a)}'`).join(",")
  const verbClause = useElevation ? "-Verb RunAs " : ""
  const psCommand = [
    `try { `,
    `  $proc = Start-Process -FilePath '${escapePowerShellSingleQuoted(installerPath)}' `,
    `    -ArgumentList ${argList} `,
    `    -WorkingDirectory '${escapePowerShellSingleQuoted(gameDir)}' `,
    `    ${verbClause}-Wait -PassThru -WindowStyle Hidden -ErrorAction Stop; `,
    `  if ($null -eq $proc) { exit ${ELEVATED_EXIT_NO_PROCESS} }; `,
    `  exit $proc.ExitCode `,
    `} catch [System.ComponentModel.Win32Exception] { `,
    `  if ($_.Exception.NativeErrorCode -eq 1223) { exit ${ELEVATED_EXIT_UAC_CANCELLED} } `,
    `  else { exit ${ELEVATED_EXIT_LAUNCH_FAILED} } `,
    `} catch { exit ${ELEVATED_EXIT_LAUNCH_FAILED} }`,
  ].join("")

  await new Promise<void>((resolve, reject) => {
    const child = spawn("powershell.exe", ["-NoProfile", "-Command", psCommand], {
      windowsHide: true,
    })

    let settled = false
    const settle = (fn: () => void) => {
      if (settled) return
      settled = true
      fn()
    }

    // INSTALL_TIMEOUT_MS counts wall-clock time including any UAC decision —
    // give the user a generous window so clicking "No" never races a timeout.
    const timeout = setTimeout(() => {
      try {
        child.kill()
      } catch {
        // ignore — child may already be dead
      }
      settle(() => reject(new Error("El instalador no respondió a tiempo.")))
    }, INSTALL_TIMEOUT_MS)

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
        if (code === ELEVATED_EXIT_LAUNCH_FAILED || code === ELEVATED_EXIT_NO_PROCESS) {
          reject(
            new Error(
              useElevation
                ? "No se pudo iniciar el instalador con permisos de administrador."
                : "No se pudo iniciar el instalador.",
            ),
          )
          return
        }
        reject(new Error(`El instalador terminó con código ${code}.`))
      })
    })
  })
}

async function runSilentInstall(
  installerPath: string,
  silentArgs: readonly string[],
  gameDir: string,
  onProgress: InstallProgressCallback,
): Promise<void> {
  const args = buildInstallerArgs(silentArgs, gameDir)
  const writable = await canWriteToGameDir(gameDir)
  if (writable) {
    onProgress({ phase: "install", percent: 0, message: "Instalando SA:MP..." })
    await runSilentInstallViaPowerShell(installerPath, args, gameDir, false)
    return
  }
  onProgress({
    phase: "install",
    percent: 0,
    message: "Acepta el aviso de Windows para instalar en la carpeta protegida.",
  })
  await runSilentInstallViaPowerShell(installerPath, args, gameDir, true)
}

async function cleanupSafe(dirPath: string): Promise<void> {
  try {
    await fsp.rm(dirPath, { recursive: true, force: true })
  } catch {
    // intentional: cleanup is best-effort
  }
}

/**
 * Removes the NTFS Zone.Identifier alternate data stream that Windows attaches
 * to files we wrote with content sourced over the network. Without this, the
 * SmartScreen / Defender filter flags the file as "from the Internet" and may
 * deny CreateProcess from a non-elevated shell with EACCES.
 *
 * Best-effort: failures are swallowed (file may not have the ADS at all,
 * volume may be FAT, etc.).
 */
async function removeZoneIdentifier(filePath: string): Promise<void> {
  try {
    await fsp.unlink(`${filePath}:Zone.Identifier`)
  } catch {
    // intentional
  }
}

interface DownloadFileOptions {
  url: string
  destPath: string
  expectedSize: number
  expectedSha256: string
  onChunk?: (received: number) => void
}

async function downloadFile(options: DownloadFileOptions): Promise<void> {
  const { url, destPath, expectedSize, expectedSha256, onChunk } = options
  await new Promise<void>((resolve, reject) => {
    const request = net.request({ method: "GET", url })
    let settled = false
    let received = 0

    const timeout = setTimeout(() => {
      if (settled) return
      settled = true
      request.abort()
      reject(new Error("La descarga tardó demasiado."))
    }, DOWNLOAD_TIMEOUT_MS)

    const writer = createWriteStream(destPath)
    const hash = createHash("sha256")

    const fail = (err: Error) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      writer.destroy()
      reject(err)
    }

    writer.on("error", fail)

    request.on("response", (response) => {
      const status = response.statusCode ?? 0
      if (status < 200 || status >= 300) {
        fail(new Error(`HTTP ${status} al descargar ${destPath}.`))
        return
      }

      response.on("data", (chunk: Buffer) => {
        received += chunk.length
        hash.update(chunk)
        writer.write(chunk)
        if (onChunk) onChunk(received)
      })

      response.on("end", () => {
        writer.end(() => {
          if (settled) return
          settled = true
          clearTimeout(timeout)
          if (received !== expectedSize) {
            reject(new Error("El archivo descargado está incompleto."))
            return
          }
          if (hash.digest("hex") !== expectedSha256) {
            reject(new Error("El archivo descargado no coincide con el original."))
            return
          }
          resolve()
        })
      })

      response.on("error", fail)
    })

    request.on("error", fail)
    request.end()
  })
}

interface StagedFile {
  manifest: ManifestFileEntry
  stagedPath: string
}

async function downloadFilesToStaging(
  failedFiles: FileVerification[],
  manifest: LauncherManifest,
  stagingDir: string,
  onProgress: InstallProgressCallback,
): Promise<StagedFile[]> {
  const targets = failedFiles
    .map((failed) => manifest.samp.files.find((f) => f.path === failed.path))
    .filter((f): f is ManifestFileEntry => f !== undefined)

  const totalBytes = targets.reduce((sum, t) => sum + t.size, 0)
  let priorBytes = 0
  const staged: StagedFile[] = []

  for (const file of targets) {
    const stagedPath = join(stagingDir, sanitizeFilename(file.path))
    await downloadFile({
      url: file.url,
      destPath: stagedPath,
      expectedSize: file.size,
      expectedSha256: file.sha256,
      onChunk: (received) => {
        const total = priorBytes + received
        const percent = totalBytes > 0 ? Math.min(100, (total / totalBytes) * 100) : 0
        onProgress({ phase: "download", percent })
      },
    })
    await removeZoneIdentifier(stagedPath)
    priorBytes += file.size
    staged.push({ manifest: file, stagedPath })
  }

  return staged
}

async function copyStagedDirect(staged: StagedFile[], gameDir: string): Promise<void> {
  for (const item of staged) {
    const dest = join(gameDir, item.manifest.path)
    await fsp.copyFile(item.stagedPath, dest)
  }
}

async function copyStagedElevated(staged: StagedFile[], gameDir: string): Promise<void> {
  // Build a small .ps1 script on disk that does the actual copying. Then
  // elevate a PowerShell process that runs it via -File. Writing the inner
  // script to a file avoids the brittle escape-within-escape we'd need if we
  // tried to inline it through Start-Process -ArgumentList.
  const pairs = staged
    .map((item) => {
      const src = escapePowerShellSingleQuoted(item.stagedPath)
      const dst = escapePowerShellSingleQuoted(join(gameDir, item.manifest.path))
      return `  @{Src='${src}'; Dst='${dst}'}`
    })
    .join(",`r`n")

  const scriptBody = [
    "$ErrorActionPreference = 'Stop'",
    "try {",
    "  $items = @(",
    pairs,
    "  )",
    "  foreach ($i in $items) {",
    "    Copy-Item -LiteralPath $i.Src -Destination $i.Dst -Force",
    "  }",
    "  exit 0",
    "} catch {",
    `  exit ${ELEVATED_EXIT_LAUNCH_FAILED}`,
    "}",
  ].join("\r\n")

  const scriptPath = join(app.getPath("temp"), `sarp-copy-${randomBytes(8).toString("hex")}.ps1`)
  await fsp.writeFile(scriptPath, scriptBody, { encoding: "utf8" })

  // Outer PowerShell does the elevation only; runs the script we just wrote.
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
          // ignore — child may already be dead
        }
        settle(() => reject(new Error("La copia no respondió a tiempo.")))
      }, INSTALL_TIMEOUT_MS)

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
          reject(new Error("No se pudieron copiar los archivos con permisos de administrador."))
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

async function repairSampFiles(
  failedFiles: FileVerification[],
  manifest: LauncherManifest,
  onProgress: InstallProgressCallback,
): Promise<{ stagingDir: string }> {
  const stagingDir = join(app.getPath("temp"), `sarp-launcher-${randomBytes(8).toString("hex")}`)
  await fsp.mkdir(stagingDir, { recursive: true })

  onProgress({ phase: "download", percent: 0, message: "Descargando archivos..." })
  const staged = await downloadFilesToStaging(failedFiles, manifest, stagingDir, onProgress)

  const gameDir = getGameDir()
  if (!gameDir) {
    throw new Error("Elige primero la carpeta de GTA: San Andreas.")
  }
  const writable = await canWriteToGameDir(gameDir)
  if (writable) {
    onProgress({ phase: "install", percent: 0, message: "Reparando archivos..." })
    await copyStagedDirect(staged, gameDir)
  } else {
    onProgress({
      phase: "install",
      percent: 0,
      message: "Acepta el aviso de Windows para reparar archivos en la carpeta protegida.",
    })
    await copyStagedElevated(staged, gameDir)
  }

  return { stagingDir }
}

async function runFullInstall(
  manifest: LauncherManifest,
  onProgress: InstallProgressCallback,
): Promise<{ tempDir: string }> {
  const installer = manifest.samp.installer
  onProgress({ phase: "download", percent: 0, message: "Descargando instalador..." })
  const downloaded = await downloadInstaller(
    installer.url,
    installer.filename,
    installer.size,
    installer.sha256,
    onProgress,
  )
  const gameDir = getGameDir()
  if (!gameDir) {
    throw new Error("Elige primero la carpeta de GTA: San Andreas.")
  }
  await runSilentInstall(downloaded.filePath, installer.silentArgs, gameDir, onProgress)
  return { tempDir: downloaded.dirPath }
}

export async function installSamp(onProgress: InstallProgressCallback): Promise<InstallResult> {
  let tempDir: string | null = null
  try {
    if (!getGameDir()) {
      const message = "Elige primero la carpeta de GTA: San Andreas."
      onProgress({ phase: "error", percent: 0, message })
      return { ok: false, error: message }
    }
    onProgress({ phase: "preflight", percent: 0, message: "Verificando estado del juego..." })
    await ensureGameNotRunning()

    const manifest = await ensureManifest()
    onProgress({ phase: "preflight", percent: 0, message: "Comprobando archivos..." })
    const verification = await verifySampFiles(manifest)
    const failed = verification.files.filter((f) => !f.ok)

    // Virgin install (no files at all) → run the NSIS wizard so we get the
    // full SAMP/ folder, registry keys, etc. Anything else (one missing file,
    // a corrupted DLL, mixed cases) is a repair: we only download the deltas.
    const allMissing =
      failed.length > 0 &&
      failed.length === verification.files.length &&
      failed.every((f) => f.reason === "missing")

    if (allMissing) {
      const { tempDir: dir } = await runFullInstall(manifest, onProgress)
      tempDir = dir
    } else if (failed.length > 0) {
      const { stagingDir } = await repairSampFiles(failed, manifest, onProgress)
      tempDir = stagingDir
    } else {
      // Nothing to do — already healthy. Caller will see ok and re-verify.
    }

    onProgress({ phase: "done", percent: 100 })
    return { ok: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : "La instalación falló."
    onProgress({ phase: "error", percent: 0, message })
    return { ok: false, error: message }
  } finally {
    if (tempDir) await cleanupSafe(tempDir)
  }
}
