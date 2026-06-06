export type EssentialId = "cleo" | "modloader" | "asiloader"

export type ModStatus = "ok" | "reparar" | "missing"

export interface EssentialsStatus {
  cleo: ModStatus
  modloader: ModStatus
  asiloader: ModStatus
}

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

export type ModFileDestination = "gta_root" | "cleo_folder" | "modloader_folder" | "documents_samp"

export interface ModFile {
  filename: string
  destination: ModFileDestination
  isFolder: boolean
}

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
}

export interface InstalledModInfo {
  installedAt: string
  files: ModFile[]
  version: string
  status: "ok" | "reparar"
  missingFiles?: string[]
}

export interface InstallProgressEvent {
  modId: string
  progress: number
  status: "downloading" | "extracting" | "copying" | "done" | "error"
  error?: string
}

// ─── System Dependencies ──────────────────────────────────────────────────────

export type DepStatus = "installed" | "missing" | "unverifiable"

export type DepGroup = "vcredist" | "directx" | "openal" | "dotnet"

export interface SystemDependency {
  id: string // slug único, ej: "vcredist-2022-x86"
  group: DepGroup
  name: string // nombre legible
  recommended: boolean // si se muestra el badge RECOMENDADO
  critical: boolean // si su ausencia activa el banner de advertencia
  downloadUrl: string // URL oficial para descargar
  registryKey?: string | string[] // clave(s) de registro para detectar instalación
  // Si registryKey está vacío → status siempre "unverifiable"
}

export interface SystemDepStatus {
  id: string
  status: DepStatus
}
