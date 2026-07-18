import type {
  IUpdateService,
  IManifestService,
  UpdateCheckResult,
  RemoteMod,
} from "../../src/types/mods"
import { ModRepository } from "../repositories/ModRepository"

export class UpdateService implements IUpdateService {
  constructor(
    private readonly manifestService: IManifestService,
    private readonly modRepo: ModRepository,
  ) {}

  public async checkForUpdates(): Promise<UpdateCheckResult[]> {
    const manifest = await this.manifestService.fetchManifest()
    const installedMods = this.modRepo.getInstalledMods()
    const results: UpdateCheckResult[] = []

    for (const remoteMod of manifest.mods) {
      const localMod = installedMods[remoteMod.id]
      const hasUpdate = localMod ? this.isNewer(remoteMod.version, localMod.version) : false

      results.push({
        modId: remoteMod.id,
        currentVersion: localMod?.version || "0.0.0",
        remoteVersion: remoteMod.version,
        hasUpdate,
        remoteMod,
      })
    }

    return results
  }

  public async checkModUpdate(modId: string): Promise<UpdateCheckResult | null> {
    const manifest = await this.manifestService.fetchManifest()
    const remoteMod = manifest.mods.find((m) => m.id === modId)
    if (!remoteMod) return null

    const localMod = this.modRepo.getMod(modId)
    const hasUpdate = localMod ? this.isNewer(remoteMod.version, localMod.version) : false

    return {
      modId: remoteMod.id,
      currentVersion: localMod?.version || "0.0.0",
      remoteVersion: remoteMod.version,
      hasUpdate,
      remoteMod,
    }
  }

  private isNewer(remote: string, local: string): boolean {
    // Simple semver comparison or direct string equality if format is consistent
    // For now, simple inequality to trigger updates
    return remote !== local
  }
}
