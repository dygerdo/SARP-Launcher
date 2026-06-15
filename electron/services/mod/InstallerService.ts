import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { app } from "electron";
import { IInstallerService, IDownloaderService, IVerifierService, IExtractorService } from "../../domain/services/interfaces";
import { Mod, ProgressReport, InstallationResult } from "../../domain/models/mod";
import { AppError, ErrorCode } from "../../domain/errors/AppError";
import { ConfigRepository } from "../../repositories/ConfigRepository";
import { ModRepository } from "../../repositories/ModRepository";

export class InstallerService implements IInstallerService {
  constructor(
    private readonly downloader: IDownloaderService,
    private readonly verifier: IVerifierService,
    private readonly extractor: IExtractorService,
    private readonly modRepo: ModRepository,
    private readonly configRepo: ConfigRepository // Still needed for gtaPath
  ) {}

  public async install(
    mod: Mod,
    onProgress?: (progress: ProgressReport) => void,
    signal?: AbortSignal
  ): Promise<InstallationResult> {
    const tempRoot = path.join(app.getPath("temp"), "sarp-launcher-mods");
    const modTempDir = path.join(tempRoot, mod.id);
    const zipPath = path.join(tempRoot, `${mod.id}.zip`);
    const extractDir = path.join(modTempDir, "extracted");

    try {
      // Ensure temp directories exist
      if (!fs.existsSync(tempRoot)) fs.mkdirSync(tempRoot, { recursive: true });
      if (fs.existsSync(modTempDir)) fs.rmSync(modTempDir, { recursive: true, force: true });
      fs.mkdirSync(extractDir, { recursive: true });

      // 1. Download to temp zip
      await this.downloader.download(
        {
          url: mod.downloadUrl,
          savePath: zipPath,
          expectedSize: mod.size,
          expectedSha256: mod.sha256,
        },
        onProgress,
        signal
      );

      // 2. Verify Checksum
      if (mod.sha256) {
        const isValid = await this.verifier.verifyChecksum(zipPath, mod.sha256);
        if (!isValid) {
          throw new AppError(ErrorCode.VERIFICATION_FAILED, `Checksum mismatch for mod ${mod.id}`);
        }
      }

      // 3. Extract to temp folder
      await this.extractor.extract(zipPath, extractDir);

      // 4. Move to final destination (Atomic commit)
      const gameDir = this.configRepo.get("gtaPath") as string;
      if (!gameDir) {
        throw new AppError(ErrorCode.INVALID_GAME_PATH, "Game directory not configured.");
      }

      this.moveFilesToDestination(extractDir, gameDir, mod);

      // 5. Update Repository
      this.modRepo.saveMod(mod.id, {
        installedAt: new Date().toISOString(),
        files: mod.files.map(f => ({
          filename: f.filename,
          destination: f.destination,
          isFolder: f.isFolder
        })),
        version: mod.version,
        status: "ok",
      });

      // Cleanup
      this.cleanup(zipPath, modTempDir);

      return { success: true, modId: mod.id };
    } catch (error: any) {
      this.cleanup(zipPath, modTempDir);
      
      if (error.name === "AbortError") {
        return { success: false, modId: mod.id, error: "Installation cancelled by user." };
      }

      return {
        success: false,
        modId: mod.id,
        error: error.message,
        details: error instanceof AppError ? error.toJSON() : error,
      };
    }
  }

  private moveFilesToDestination(sourceBase: string, gameDir: string, mod: Mod): void {
    for (const file of mod.files) {
      const srcPath = path.join(sourceBase, file.filename);
      const destPath = this.resolveModPath(gameDir, file.destination, file.filename);

      if (!fs.existsSync(srcPath)) {
        console.warn(`[Installer] Expected file not found in zip: ${file.filename}`);
        continue;
      }

      const destDir = path.dirname(destPath);
      if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

      // Using rename or copy+unlink for cross-device support
      fs.cpSync(srcPath, destPath, { recursive: true });
    }
  }

  private resolveModPath(gameDir: string, destination: string, filename: string): string {
    switch (destination) {
      case "gta_root": return path.join(gameDir, filename);
      case "cleo_folder": return path.join(gameDir, "cleo", filename);
      case "modloader_folder": return path.join(gameDir, "modloader", filename);
      case "documents_samp": 
        return path.join(os.homedir(), "Documents", "GTA San Andreas User Files", "SAMP", filename);
      default: return path.join(gameDir, filename);
    }
  }

  private cleanup(zipPath: string, tempDir: string): void {
    try {
      if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
      if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (err) {
      console.error("[Installer] Cleanup failed:", err);
    }
  }
}
