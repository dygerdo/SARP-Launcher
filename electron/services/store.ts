import Store from "electron-store"

export interface LauncherStoreSchema {
  sampVersion: number | null
  cacheVersion: number | null
  gtaPath: string | null
  gtaInstallTempDir: string | null
  cacheInstallTempDir: string | null
  /** Size in bytes of the last successfully installed server cache zip.
   *  Compared against the manifest's cache.zip.size to decide whether the
   *  local cache is current — different size means a new upload happened. */
  installedCacheSize: number | null
}

const store = new Store<LauncherStoreSchema>({
  defaults: {
    sampVersion: null,
    cacheVersion: null,
    gtaPath: null,
    gtaInstallTempDir: null,
    cacheInstallTempDir: null,
    installedCacheSize: null,
  },
})

export default store
