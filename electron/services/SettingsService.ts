import { ConfigRepository } from "../repositories/ConfigRepository";
import { LauncherStoreSchema } from "./store";

export class SettingsService {
  constructor(private readonly configRepo: ConfigRepository) {}

  public get<K extends keyof LauncherStoreSchema>(key: K): LauncherStoreSchema[K] {
    return this.configRepo.get(key);
  }

  public set<K extends keyof LauncherStoreSchema>(key: K, value: LauncherStoreSchema[K]): void {
    this.configRepo.set(key, value);
  }

  public getGameDir(): string | null {
    // Porting logic from electron/services/paths.ts later, 
    // for now just a direct proxy to the store get if that's what it was.
    return this.configRepo.get("gtaPath") as string | null;
  }
}
