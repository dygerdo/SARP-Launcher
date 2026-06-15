import { DownloadMetadata, ProgressReport, InstallationResult, Mod } from "../models/mod";

export interface IDownloaderService {
  /**
   * Downloads a file from a URL to a local destination.
   * @param metadata Download details
   * @param onProgress Callback for progress updates
   * @returns Path to the downloaded file
   */
  download(
    metadata: DownloadMetadata,
    onProgress?: (progress: ProgressReport) => void,
    signal?: AbortSignal
  ): Promise<string>;
}

export interface IVerifierService {
  /**
   * Verifies the integrity of a file using SHA-256.
   * @param filePath Local file path
   * @param expectedSha256 Expected checksum
   */
  verifyChecksum(filePath: string, expectedSha256: string): Promise<boolean>;

  /**
   * Verifies the size of a file.
   * @param filePath Local file path
   * @param expectedSize Expected size in bytes
   */
  verifySize(filePath: string, expectedSize: number): Promise<boolean>;
}

export interface IExtractorService {
  /**
   * Extracts a zip file to a destination folder safely.
   * @param zipPath Path to the zip file
   * @param destination Destination directory
   */
  extract(zipPath: string, destination: string): Promise<void>;
}

export interface IInstallerService {
  /**
   * High-level orchestration of mod installation.
   * @param mod Mod definition to install
   * @param onProgress Progress reporter for the UI
   */
  install(
    mod: Mod,
    onProgress?: (progress: ProgressReport) => void,
    signal?: AbortSignal
  ): Promise<InstallationResult>;
}

export interface IUninstallerService {
  /**
   * Removes a previously installed mod.
   * @param modId ID of the mod to remove
   */
  uninstall(modId: string): Promise<InstallationResult>;
}
