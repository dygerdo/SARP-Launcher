/**
 * Core Domain Models for the Mod System
 */

export interface ModFile {
  filename: string;
  destination: "gta_root" | "cleo_folder" | "modloader_folder" | "documents_samp";
  isFolder: boolean;
}

export interface Mod {
  id: string;
  name: string;
  description: string;
  version: string;
  category: "essentials" | "graphics" | "performance" | "reality" | "audio" | "map" | "misc" | "vehicles";
  downloadUrl: string;
  files: ModFile[];
  dependencies?: string[];
  sha256?: string; // Optional checksum for the entire zip/package
  size?: number;   // Expected size in bytes
}

export interface InstalledMod extends Mod {
  installedAt: string;
  localPath?: string;
  status: "ok" | "reparar" | "missing";
}

export interface ModManifest {
  version: string;
  mods: Mod[];
}

export interface DownloadMetadata {
  url: string;
  savePath: string;
  expectedSize?: number;
  expectedSha256?: string;
}

export interface ProgressReport {
  transferred: number;
  total: number;
  percentage: number;
  speed: number; // bytes per second
}

export interface InstallationResult {
  success: boolean;
  modId: string;
  error?: string;
  details?: any;
}
