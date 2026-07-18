import axios from "axios"
import fs from "node:fs"
import path from "node:path"
import type { IDownloaderService, DownloadMetadata, ProgressReport } from "../../src/types/mods"
import { AppError, ErrorCode } from "../domain/errors/AppError"

export class DownloaderService implements IDownloaderService {
  private readonly TIMEOUT = 30000 // 30 seconds
  private readonly MAX_RETRIES = 3

  public async download(
    metadata: DownloadMetadata,
    onProgress?: (progress: ProgressReport) => void,
    signal?: AbortSignal,
  ): Promise<string> {
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        return await this.performDownload(metadata, onProgress, signal)
      } catch (error: any) {
        if (axios.isCancel(error) || error.name === "AbortError") throw error
        lastError = error
        console.warn(`[Downloader] Attempt ${attempt} failed: ${error.message}`)
        if (attempt < this.MAX_RETRIES) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt))
        }
      }
    }

    throw new AppError(
      ErrorCode.DOWNLOAD_FAILED,
      `Failed to download after ${this.MAX_RETRIES} attempts.`,
      lastError,
    )
  }

  private async performDownload(
    metadata: DownloadMetadata,
    onProgress?: (progress: ProgressReport) => void,
    signal?: AbortSignal,
  ): Promise<string> {
    const { url, savePath } = metadata

    // Ensure directory exists
    const dir = path.dirname(savePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    const response = await axios({
      url,
      method: "GET",
      responseType: "stream",
      timeout: this.TIMEOUT,
      signal,
    })

    const totalBytes = parseInt(String(response.headers["content-length"] || "0"), 10)
    let downloadedBytes = 0
    const startTime = Date.now()

    const writer = fs.createWriteStream(savePath)

    return new Promise((resolve, reject) => {
      response.data.on("data", (chunk: Buffer) => {
        downloadedBytes += chunk.length
        if (onProgress && totalBytes > 0) {
          const elapsed = (Date.now() - startTime) / 1000
          const speed = elapsed > 0 ? downloadedBytes / elapsed : 0
          onProgress({
            transferred: downloadedBytes,
            total: totalBytes,
            percentage: Math.round((downloadedBytes / totalBytes) * 100),
            speed,
          })
        }
      })

      response.data.pipe(writer)

      writer.on("finish", () => resolve(savePath))
      writer.on("error", (err) => {
        writer.close()
        if (fs.existsSync(savePath)) fs.unlinkSync(savePath)
        reject(err)
      })

      response.data.on("error", (err: any) => {
        writer.close()
        if (fs.existsSync(savePath)) fs.unlinkSync(savePath)
        reject(err)
      })
    })
  }
}
