// ─── Essential IDs ────────────────────────────────────────────────────────────
export type EssentialId = "cleo" | "modloader" | "asiloader"

// ─── Mod Status ───────────────────────────────────────────────────────────────
export type ModStatus = "ok" | "reparar" | "missing"

export interface EssentialsStatus {
  cleo: ModStatus
  modloader: ModStatus
  asiloader: ModStatus
}

// ─── Mod Categories & Types ───────────────────────────────────────────────────
export type ModCategory =
  | "vehicles"
  | "cleo"
  | "graphics"
  | "reality"
  | "performance"
  | "audio"
  | "map"
  | "misc"

export type ModType = "cleo" | "asi" | "modloader"

// ─── Mod Files ────────────────────────────────────────────────────────────────
export type ModFileDestination = "gta_root" | "cleo_folder" | "modloader_folder" | "documents_samp"

export interface ModFile {
  filename: string
  destination: ModFileDestination
  isFolder: boolean
}

// ─── Mod Definition (Catalog Entry) ───────────────────────────────────────────
export interface ModDefinition {
  id: string
  name: string
  description: string
  category: ModCategory
  type: ModType
  requiresEssentials: EssentialId[]
  dependsOn?: string[]
  files: ModFile[]
  downloadUrl: string
  version: string
  imageUrl?: string
  sha256?: string
  size?: number
}

// ─── Installed Mod Info ───────────────────────────────────────────────────────
export interface InstalledModInfo {
  installedAt: string
  files: ModFile[]
  version: string
  status: ModStatus
  missingFiles?: string[]
}

// ─── Install Progress ─────────────────────────────────────────────────────────
export type InstallPhase = "downloading" | "extracting" | "copying" | "done" | "error"

export interface InstallProgressEvent {
  modId: string
  progress: number
  status: InstallPhase
  error?: string
}

// ─── Download & Installation (Electron Main Process) ──────────────────────────
export interface DownloadMetadata {
  url: string
  savePath: string
  expectedSize?: number
  expectedSha256?: string
}

export interface ProgressReport {
  transferred: number
  total: number
  percentage: number
  speed: number
}

export interface InstallationResult {
  success: boolean
  modId: string
  error?: string
  details?: string
}

// ─── System Dependencies ──────────────────────────────────────────────────────
export type DepStatus = "installed" | "missing" | "unverifiable"

export type DepGroup = "vcredist" | "directx" | "openal" | "dotnet"

export interface SystemDependency {
  id: string
  group: DepGroup
  name: string
  recommended: boolean
  critical: boolean
  downloadUrl: string
  registryKey?: string | string[]
}

export interface SystemDepStatus {
  id: string
  status: DepStatus
}

// ─── Backward-compatible aliases (Electron main process) ──────────────────────
export type Mod = ModDefinition
export type InstalledMod = InstalledModInfo

// ─── Remote Manifest ──────────────────────────────────────────────────────────
export interface RemoteMod {
  id: string
  name: string
  description?: string
  version: string
  downloadUrl: string
  sha256: string
  size: number
  category: ModCategory
  type: ModType
  requiresEssentials: EssentialId[]
  dependsOn?: string[]
  files: ModFile[]
  minimumLauncherVersion?: string
  releaseDate?: string
}

export interface RemoteManifest {
  version: string
  generatedAt: string
  mods: RemoteMod[]
}

export interface UpdateCheckResult {
  modId: string
  currentVersion: string
  remoteVersion: string
  hasUpdate: boolean
  remoteMod?: RemoteMod
}

// ─── Service Interfaces (Electron) ────────────────────────────────────────────
export interface IDownloaderService {
  download(
    metadata: DownloadMetadata,
    onProgress?: (progress: ProgressReport) => void,
    signal?: AbortSignal,
  ): Promise<string>
}

export interface IVerifierService {
  verifyChecksum(filePath: string, expectedSha256: string): Promise<boolean>
  verifySize(filePath: string, expectedSize: number): Promise<boolean>
}

export interface IExtractorService {
  extract(zipPath: string, destination: string): Promise<void>
}

export interface IInstallerService {
  install(
    mod: ModDefinition,
    onProgress?: (progress: ProgressReport) => void,
    signal?: AbortSignal,
  ): Promise<InstallationResult>
}

export interface IUninstallerService {
  uninstall(modId: string): Promise<InstallationResult>
}

export interface IManifestService {
  fetchManifest(force?: boolean): Promise<RemoteManifest>
  getCachedManifest(): RemoteManifest | null
  saveToCache(manifest: RemoteManifest): void
}

export interface IUpdateService {
  checkForUpdates(): Promise<UpdateCheckResult[]>
  checkModUpdate(modId: string): Promise<UpdateCheckResult | null>
}
