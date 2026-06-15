import { RemoteManifest, UpdateCheckResult } from "../models/manifest";

export interface IManifestService {
  /**
   * Fetches the manifest from the remote server.
   * @param force Force refresh ignoring cache
   */
  fetchManifest(force?: boolean): Promise<RemoteManifest>;

  /**
   * Returns the last cached manifest (sync).
   */
  getCachedManifest(): RemoteManifest | null;

  /**
   * Saves/Caches a specific manifest.
   */
  saveToCache(manifest: RemoteManifest): void;
}

export interface IUpdateService {
  /**
   * Checks for updates by comparing local state with remote manifest.
   */
  checkForUpdates(): Promise<UpdateCheckResult[]>;

  /**
   * Checks if a specific mod has an update.
   */
  checkModUpdate(modId: string): Promise<UpdateCheckResult | null>;
}
