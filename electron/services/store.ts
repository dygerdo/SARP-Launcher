import Store from "electron-store"

export interface LauncherStoreSchema {
  sampVersion: number | null
  cacheVersion: number | null
  gtaPath: string | null
  gtaInstallTempDir: string | null
}

const store = new Store<LauncherStoreSchema>({
  defaults: {
    sampVersion: null,
    cacheVersion: null,
    gtaPath: null,
    gtaInstallTempDir: null,
  },
})

export default store
