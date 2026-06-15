/**
 * Remote Manifest Domain Models
 */

export interface RemoteMod {
  id: string;
  name: string;
  version: string;
  downloadUrl: string;
  sha256: string;
  size: number;
  category: "essentials" | "graphics" | "performance" | "reality" | "audio" | "map" | "misc" | "vehicles";
  dependencies?: string[];
  minimumLauncherVersion?: string;
  releaseDate?: string;
}

export interface RemoteManifest {
  version: string;
  generatedAt: string;
  mods: RemoteMod[];
}

export interface UpdateCheckResult {
  modId: string;
  currentVersion: string;
  remoteVersion: string;
  hasUpdate: boolean;
  remoteMod?: RemoteMod;
}
