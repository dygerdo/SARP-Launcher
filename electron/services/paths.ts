import { app, dialog } from "electron"
import { existsSync, statSync } from "node:fs"
import { readdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import store from "./store"

// OS-generated metadata files we treat as if the folder were empty. Without
// this, "carpeta vacía" rejects folders the user perceives as empty just
// because Windows/macOS dropped a hidden index file inside them.
const OS_NOISE_FILES = new Set(["desktop.ini", "thumbs.db", ".ds_store"])

export async function isEffectivelyEmpty(path: string): Promise<boolean> {
  try {
    const entries = await readdir(path)
    return entries.every((name) => OS_NOISE_FILES.has(name.toLowerCase()))
  } catch {
    return false
  }
}

const DEV_FALLBACK = "C:\\Program Files (x86)\\Rockstar Games\\GTA San Andreas"

// Files and folders that must all exist for a path to count as a real GTA SA
// install. vorbis*.dll are part of the original 1.0 release; SA-MP expects
// them alongside gta_sa.exe. The folders are part of any vanilla install —
// missing any is a strong signal the path is not GTA SA at all.
export const REQUIRED_GTA_FILES = [
  "gta_sa.exe",
  "vorbis.dll",
  "vorbisFile.dll",
  "vorbisHooked.dll",
] as const

export const REQUIRED_GTA_DIRS = ["anim", "audio", "data", "models"] as const

function defaultGameDir(): string {
  if (!app.isPackaged) {
    return process.env.DEV_GTA_PATH ?? DEV_FALLBACK
  }
  return dirname(app.getPath("exe"))
}

function isFile(path: string): boolean {
  try {
    return statSync(path).isFile()
  } catch {
    return false
  }
}

function isDir(path: string): boolean {
  try {
    return statSync(path).isDirectory()
  } catch {
    return false
  }
}

export interface MissingGtaItems {
  files: string[]
  dirs: string[]
}

export function findMissingGtaItems(path: string): MissingGtaItems {
  if (!existsSync(path)) {
    return { files: [...REQUIRED_GTA_FILES], dirs: [...REQUIRED_GTA_DIRS] }
  }
  return {
    files: REQUIRED_GTA_FILES.filter((name) => !isFile(join(path, name))),
    dirs: REQUIRED_GTA_DIRS.filter((name) => !isDir(join(path, name))),
  }
}

function isValidGameDir(path: string): boolean {
  const missing = findMissingGtaItems(path)
  return missing.files.length === 0 && missing.dirs.length === 0
}

export function getGameDir(): string {
  // Manual override wins over the launcher's own location, but only while the
  // override still points at a valid install. If the user moves or deletes
  // the folder we silently fall back instead of leaving the launcher pinned
  // to a broken path.
  const override = store.get("gtaPath")
  if (override && isValidGameDir(override)) {
    return override
  }
  return defaultGameDir()
}

export interface PickGameDirResult {
  ok: boolean
  path?: string
  error?: string
  cancelled?: boolean
}

export async function pickGameDir(): Promise<PickGameDirResult> {
  const result = await dialog.showOpenDialog({
    title: "Selecciona la carpeta de GTA: San Andreas",
    properties: ["openDirectory"],
    defaultPath: store.get("gtaPath") ?? defaultGameDir(),
  })

  if (result.canceled || result.filePaths.length === 0) {
    return { ok: false, cancelled: true }
  }

  const selected = result.filePaths[0]
  const missing = findMissingGtaItems(selected)
  const missingNames = [...missing.files, ...missing.dirs]
  if (missingNames.length > 0) {
    return {
      ok: false,
      error: `La carpeta seleccionada no es una instalación válida de GTA: San Andreas. Falta ${missingNames.join(", ")}.`,
    }
  }

  store.set("gtaPath", selected)
  return { ok: true, path: selected }
}

export async function pickEmptyInstallDir(): Promise<PickGameDirResult> {
  const result = await dialog.showOpenDialog({
    title: "Selecciona una carpeta vacía donde instalar GTA: San Andreas",
    properties: ["openDirectory", "createDirectory"],
    defaultPath: store.get("gtaPath") ?? defaultGameDir(),
  })

  if (result.canceled || result.filePaths.length === 0) {
    return { ok: false, cancelled: true }
  }

  const selected = result.filePaths[0]
  if (!(await isEffectivelyEmpty(selected))) {
    return {
      ok: false,
      error: "La carpeta debe estar vacía. Crea una nueva o elige otra.",
    }
  }
  return { ok: true, path: selected }
}
