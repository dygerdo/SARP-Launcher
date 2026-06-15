import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { IUninstallerService } from "../../domain/services/interfaces";
import { InstallationResult, ModFileDestination } from "../../domain/models/mod";
import { ModRepository } from "../../repositories/ModRepository";
import { ConfigRepository } from "../../repositories/ConfigRepository";
import log from "electron-log";

export class UninstallerService implements IUninstallerService {
  constructor(
    private readonly modRepo: ModRepository,
    private readonly configRepo: ConfigRepository
  ) {}

  public async uninstall(modId: string): Promise<InstallationResult> {
    log.info(`[Uninstaller] Starting uninstallation for mod: ${modId}`);
    const modInfo = this.modRepo.getMod(modId);

    if (!modInfo) {
      log.warn(`[Uninstaller] Mod ${modId} not found in repository.`);
      return { success: false, modId, error: "Mod not found in installed database." };
    }

    const gameDir = this.configRepo.get("gtaPath") as string;
    if (!gameDir) {
      return { success: false, modId, error: "Game directory not configured." };
    }

    try {
      // 1. Delete files
      for (const file of modInfo.files) {
        const fullPath = this.resolveModPath(gameDir, file.destination, file.filename);
        
        if (fs.existsSync(fullPath)) {
          if (file.isFolder) {
            fs.rmSync(fullPath, { recursive: true, force: true });
          } else {
            fs.unlinkSync(fullPath);
          }
          log.info(`[Uninstaller] Removed: ${fullPath}`);
        } else {
          log.warn(`[Uninstaller] File not found for removal: ${fullPath}`);
        }
      }

      // 2. Remove from repository
      this.modRepo.deleteMod(modId);
      log.info(`[Uninstaller] Uninstalled successfully: ${modId}`);

      return { success: true, modId };
    } catch (error: any) {
      log.error(`[Uninstaller] Failed to uninstall ${modId}:`, error);
      return {
        success: false,
        modId,
        error: error.message,
      };
    }
  }

  private resolveModPath(gameDir: string, destination: ModFileDestination, filename: string): string {
    switch (destination) {
      case "gta_root": return path.join(gameDir, filename);
      case "cleo_folder": return path.join(gameDir, "cleo", filename);
      case "modloader_folder": return path.join(gameDir, "modloader", filename);
      case "documents_samp": 
        return path.join(os.homedir(), "Documents", "GTA San Andreas User Files", "SAMP", filename);
      default: return path.join(gameDir, filename);
    }
  }
}
