import store from "../services/store";
import type { LauncherStoreSchema } from "../services/store";

/**
 * ConfigRepository handles persistence logic.
 * It provides a clean interface for the rest of the application
 * while hiding the implementation details of electron-store.
 */
export class ConfigRepository {
  public get<K extends keyof LauncherStoreSchema>(key: K): LauncherStoreSchema[K] {
    return store.get(key);
  }

  public set<K extends keyof LauncherStoreSchema>(key: K, value: LauncherStoreSchema[K]): void {
    store.set(key, value as any);
  }

  public has(key: string): boolean {
    return store.has(key as any);
  }

  /**
   * Returns a copy of the entire store for migration or inspection.
   */
  public getAll(): LauncherStoreSchema {
    return store.store as LauncherStoreSchema;
  }
}
