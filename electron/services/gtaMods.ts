import { existsSync, statSync } from "node:fs"
import { join } from "node:path"
import { getGameDir } from "./paths"

export type ModId = "modloader" | "asi-loader" | "cleo"

export interface DetectedMod {
  id: ModId
  label: string
}

interface ModDescriptor {
  id: ModId
  label: string
  detect: (gameDir: string) => boolean
}

function dirExists(path: string): boolean {
  try {
    return statSync(path).isDirectory()
  } catch {
    return false
  }
}

const MODS: ModDescriptor[] = [
  {
    id: "cleo",
    label: "CLEO 4",
    detect: (gameDir) => existsSync(join(gameDir, "cleo.asi")) && dirExists(join(gameDir, "cleo")),
  },
  {
    id: "modloader",
    label: "ModLoader",
    detect: (gameDir) =>
      existsSync(join(gameDir, "modloader.asi")) && dirExists(join(gameDir, "modloader")),
  },
  {
    id: "asi-loader",
    label: "ASI Loader",
    detect: (gameDir) =>
      existsSync(join(gameDir, "vorbisFile.dll")) || existsSync(join(gameDir, "dinput8.dll")),
  },
]

export function detectGtaMods(): DetectedMod[] {
  const gameDir = getGameDir()
  if (!gameDir) return []
  return MODS.filter((m) => m.detect(gameDir)).map(({ id, label }) => ({ id, label }))
}
