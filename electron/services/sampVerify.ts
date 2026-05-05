import { createHash } from "node:crypto"
import { createReadStream, existsSync, statSync } from "node:fs"
import { join } from "node:path"
import { getGameDir } from "./paths"
import type { LauncherManifest, ManifestFileEntry } from "./manifest"

export type FileVerificationReason = "missing" | "size-mismatch" | "hash-mismatch"

export interface FileVerification {
  path: string
  expected: { sha256: string; size: number }
  actual: { exists: boolean; size: number | null; sha256: string | null }
  ok: boolean
  reason?: FileVerificationReason
}

export interface SampVerificationResult {
  ok: boolean
  files: FileVerification[]
  error?: string
}

async function sha256OfFile(absPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256")
    const stream = createReadStream(absPath)
    stream.on("data", (chunk) => hash.update(chunk))
    stream.on("end", () => resolve(hash.digest("hex")))
    stream.on("error", reject)
  })
}

async function verifyFile(gameDir: string, expected: ManifestFileEntry): Promise<FileVerification> {
  const absPath = join(gameDir, expected.path)
  const result: FileVerification = {
    path: expected.path,
    expected: { sha256: expected.sha256, size: expected.size },
    actual: { exists: false, size: null, sha256: null },
    ok: false,
  }

  if (!existsSync(absPath)) {
    result.reason = "missing"
    return result
  }

  const stat = statSync(absPath)
  result.actual.exists = true
  result.actual.size = stat.size

  if (stat.size !== expected.size) {
    result.reason = "size-mismatch"
    return result
  }

  const sha = await sha256OfFile(absPath)
  result.actual.sha256 = sha
  if (sha !== expected.sha256) {
    result.reason = "hash-mismatch"
    return result
  }

  result.ok = true
  return result
}

export async function verifySampFiles(manifest: LauncherManifest): Promise<SampVerificationResult> {
  try {
    const gameDir = getGameDir()
    if (!gameDir) {
      return {
        ok: false,
        files: [],
        error: "Elige primero la carpeta de GTA: San Andreas.",
      }
    }
    const files: FileVerification[] = []
    for (const entry of manifest.samp.files) {
      files.push(await verifyFile(gameDir, entry))
    }
    return {
      ok: files.every((f) => f.ok),
      files,
    }
  } catch (error) {
    return {
      ok: false,
      files: [],
      error: error instanceof Error ? error.message : "verification failed",
    }
  }
}
