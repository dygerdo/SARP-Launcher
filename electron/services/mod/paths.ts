import path from "node:path"
import os from "node:os"
import type { ModFileDestination } from "../../../src/types/mods"

export function resolveModPath(
  gameDir: string,
  destination: ModFileDestination,
  filename: string,
): string {
  switch (destination) {
    case "gta_root":
      return path.join(gameDir, filename)
    case "cleo_folder":
      return path.join(gameDir, "cleo", filename)
    case "modloader_folder":
      return path.join(gameDir, "modloader", filename)
    case "documents_samp":
      return path.join(os.homedir(), "Documents", "GTA San Andreas User Files", "SAMP", filename)
    default:
      return path.join(gameDir, filename)
  }
}
