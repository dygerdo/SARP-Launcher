import fs from "node:fs"
import crypto from "node:crypto"
import type {
  IVerifierService,
  ModFile,
  ModStatus,
  EssentialsStatus,
} from "../../../src/types/mods"
import { resolveModPath } from "./paths"
import { MOD_CATALOG } from "../../../src/data/mods"
import { SettingsService } from "../SettingsService"

export class VerifierService implements IVerifierService {
  constructor(private readonly settingsService?: SettingsService) {}

  /**
   * Verifies the integrity of a file using SHA-256.
   */
  public async verifyChecksum(filePath: string, expectedSha256: string): Promise<boolean> {
    if (!fs.existsSync(filePath)) return false

    return new Promise((resolve, reject) => {
      const hash = crypto.createHash("sha256")
      const stream = fs.createReadStream(filePath)

      stream.on("data", (data) => hash.update(data))
      stream.on("end", () => {
        const actualSha256 = hash.digest("hex")
        resolve(actualSha256.toLowerCase() === expectedSha256.toLowerCase())
      })
      stream.on("error", (err) => reject(err))
    })
  }

  /**
   * Verifies the size of a file.
   */
  public async verifySize(filePath: string, expectedSize: number): Promise<boolean> {
    if (!fs.existsSync(filePath)) return false
    const stats = fs.statSync(filePath)
    return stats.size === expectedSize
  }

  public async scanEssentials(): Promise<EssentialsStatus> {
    const gameDir = this.settingsService?.getGameDir()
    if (!gameDir) return { cleo: "missing", modloader: "missing", asiloader: "missing" }

    return {
      cleo: this.checkModStatus(gameDir, "cleo"),
      modloader: this.checkModStatus(gameDir, "modloader"),
      asiloader: this.checkModStatus(gameDir, "asiloader"),
    }
  }

  public async scanCatalog(): Promise<Record<string, Record<string, boolean>>> {
    const gameDir = this.settingsService?.getGameDir()
    if (!gameDir) return {}

    const results: Record<string, Record<string, boolean>> = {}
    for (const mod of MOD_CATALOG) {
      const fileStatus: Record<string, boolean> = {}
      for (const file of mod.files) {
        const fullPath = resolveModPath(gameDir, file.destination, file.filename)
        fileStatus[file.filename] = this.exists(fullPath, file.isFolder)
      }
      results[mod.id] = fileStatus
    }
    return results
  }

  public async scanInstalled(files: ModFile[]): Promise<Record<string, boolean>> {
    const gameDir = this.settingsService?.getGameDir()
    if (!gameDir) return {}
    const result: Record<string, boolean> = {}

    for (const file of files) {
      const fullPath = resolveModPath(gameDir, file.destination, file.filename)
      result[file.filename] = this.exists(fullPath, file.isFolder)
    }

    return result
  }

  private checkModStatus(gameDir: string, modId: string): ModStatus {
    const mod = MOD_CATALOG.find((m) => m.id === modId)
    if (!mod) return "missing"

    const results = mod.files.map((file) => {
      const fullPath = resolveModPath(gameDir, file.destination, file.filename)
      return this.exists(fullPath, file.isFolder)
    })

    if (results.every((v) => v)) return "ok"
    if (results.every((v) => !v)) return "missing"
    return "reparar"
  }

  private exists(fullPath: string, isFolder?: boolean): boolean {
    if (!fs.existsSync(fullPath)) return false
    const stat = fs.statSync(fullPath)
    return isFolder ? stat.isDirectory() : stat.isFile()
  }
}
