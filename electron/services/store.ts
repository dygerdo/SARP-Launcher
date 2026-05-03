import Store from "electron-store"

export interface LauncherStoreSchema {
  sampVersion: number | null
  cacheVersion: number | null
}

const store = new Store<LauncherStoreSchema>({
  defaults: {
    sampVersion: null,
    cacheVersion: null,
  },
})

export default store
