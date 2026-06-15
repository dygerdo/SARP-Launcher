import axios from "axios";
import { IManifestService } from "../domain/services/manifest";
import { RemoteManifest } from "../domain/models/manifest";
import { ConfigRepository } from "../repositories/ConfigRepository";
import { AppError, ErrorCode } from "../domain/errors/AppError";

export class ManifestService implements IManifestService {
  private readonly CACHE_KEY = "lastManifest";
  private readonly DEFAULT_MANIFEST_URL = (process.env.VITE_CDN_URL || "https://sarp-public.b-cdn.net") + "/manifest.json";

  constructor(private readonly configRepo: ConfigRepository) {}

  public async fetchManifest(force: boolean = false): Promise<RemoteManifest> {
    if (!force) {
      const cached = this.getCachedManifest();
      if (cached) return cached;
    }

    try {
      const response = await axios.get<RemoteManifest>(this.DEFAULT_MANIFEST_URL, {
        timeout: 10000,
        headers: { "Cache-Control": "no-cache" },
      });

      const manifest = response.data;
      this.validateManifest(manifest);
      this.saveToCache(manifest);
      return manifest;
    } catch (error: any) {
      console.warn("[ManifestService] Fetch failed, falling back to cache if available.", error.message);
      
      const cached = this.getCachedManifest();
      if (cached) return cached;

      throw new AppError(
        ErrorCode.MANIFEST_FETCH_FAILED,
        "Could not fetch manifest and no cache available.",
        error
      );
    }
  }

  public getCachedManifest(): RemoteManifest | null {
    return this.configRepo.get(this.CACHE_KEY) as RemoteManifest | null;
  }

  public saveToCache(manifest: RemoteManifest): void {
    this.configRepo.set(this.CACHE_KEY, manifest);
  }

  private validateManifest(manifest: any): void {
    if (!manifest || typeof manifest !== "object") throw new Error("Invalid manifest format.");
    if (!manifest.version || !Array.isArray(manifest.mods)) throw new Error("Manifest missing critical fields.");
    
    // Future expansion: Digital signature validation would go here
  }
}
