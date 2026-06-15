import { ConfigRepository } from "./ConfigRepository";
import { InstalledMod } from "../domain/models/mod";

export class ModRepository {
  private readonly KEY = "installedMods";

  constructor(private readonly configRepo: ConfigRepository) {}

  public getInstalledMods(): Record<string, any> {
    return this.configRepo.get(this.KEY) || {};
  }

  public getMod(id: string): any | null {
    const mods = this.getInstalledMods();
    return mods[id] || null;
  }

  public saveMod(id: string, modInfo: any): void {
    const mods = this.getInstalledMods();
    mods[id] = modInfo;
    this.configRepo.set(this.KEY, mods);
  }

  public deleteMod(id: string): void {
    const mods = this.getInstalledMods();
    delete mods[id];
    this.configRepo.set(this.KEY, mods);
  }

  public updateStatus(id: string, status: string): void {
    const mod = this.getMod(id);
    if (mod) {
      mod.status = status;
      this.saveMod(id, mod);
    }
  }
}
