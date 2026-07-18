import extract from "extract-zip"
import path from "node:path"
import fs from "node:fs"
import type { IExtractorService } from "../../../src/types/mods"
import { AppError, ErrorCode } from "../../domain/errors/AppError"

export class ExtractorService implements IExtractorService {
  /**
   * Safe extraction of zip files.
   */
  public async extract(zipPath: string, destination: string): Promise<void> {
    if (!fs.existsSync(zipPath)) {
      throw new AppError(ErrorCode.FILE_NOT_FOUND, `Zip file not found: ${zipPath}`)
    }

    // Ensure destination exists
    if (!fs.existsSync(destination)) {
      fs.mkdirSync(destination, { recursive: true })
    }

    try {
      await extract(zipPath, {
        dir: destination,
        onEntry: (entry) => {
          // Path Traversal Protection
          const entryPath = entry.fileName
          if (entryPath.includes("..") || entryPath.startsWith("/") || entryPath.includes(":\\")) {
            throw new Error(`Insecure entry path detected: ${entryPath}`)
          }
        },
      })
    } catch (error: any) {
      throw new AppError(
        ErrorCode.EXTRACTION_FAILED,
        `Failed to extract zip: ${error.message}`,
        error,
      )
    }
  }
}
