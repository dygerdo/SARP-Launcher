import { existsSync, readdirSync, statSync } from "node:fs"
import { execSync } from "node:child_process"
import { join, extname, basename } from "node:path"
import { MOD_CATALOG } from "../../src/data/mods"

// Extensions that can execute code and must be whitelisted
const DANGEROUS_EXTENSIONS = [".asi", ".cs", ".sf", ".dll", ".lua"]

// Filenames that are always banned regardless of whitelist
const ALWAYS_BLOCKED_FILES = ["moonloader.asi", "moonloader", "sampfuncs.asi", "sampfuncs"].map(
  (f) => f.toLowerCase(),
)

// Processes that are NOT allowed to be running alongside the game
const BANNED_PROCESSES = [
  "cheatengine",
  "cheat engine",
  "s0beit",
  "sampfuncs",
  "artmoney",
  "wireshark",
  "fiddler",
  "processhacker",
].map((p) => p.toLowerCase())

// Known safe/native game and SA-MP core DLLs
const NATIVE_WHITELIST = [
  "eax.dll",
  "ogg.dll",
  "vorbis.dll",
  "samp.dll",
  "bass.dll",
  "d3dx9_25.dll",
  "DINPUT8.dll",
  "vorbisfile.dll",
  "vorbis.dll",
  "winmm.dll",
  "vorbisHooked.dll",
  "std.asi.dll",
  "std.bank.dll",
  "std.data.dll",
  "std.fx.dll",
  "std.movies.dll",
  "std.scm.dll",
  "std.sprites.dll",
  "std.stream.dll",
  "std.text.dll",
  "std.tracks.dll",
].map((name) => name.toLowerCase())

// Directories owned by the launcher or the game that should not be scanned
const SKIP_DIRS = [
  "launcher_mods",
  "gtasa_samp_cache",
  "readme",
  "docs",
  "__macosx",
  ".git",
  "node_modules",
].map((d) => d.toLowerCase())

export interface AnticheatResult {
  ok: boolean
  error?: "big_smoke"
  detail?: string
  violatingFile?: string
}

function getWhitelist(): Set<string> {
  const allowed = new Set<string>()
  NATIVE_WHITELIST.forEach((f) => allowed.add(f))

  for (const mod of MOD_CATALOG) {
    for (const file of mod.files) {
      if (!file.isFolder) {
        allowed.add(basename(file.filename).toLowerCase())
      }
    }
  }

  return allowed
}

/**
 * Recursively scan a directory for unauthorized mod files.
 * Returns the first violating relative path found, or null if clean.
 * @param dir       Absolute path to scan
 * @param whitelist Set of allowed lowercase filenames
 * @param relBase   Relative prefix for display (e.g. "modloader/VehiclePack/")
 * @param depth     Current recursion depth (max 6)
 */
function scanRecursive(
  dir: string,
  whitelist: Set<string>,
  relBase: string,
  depth: number,
): string | null {
  if (depth > 6 || !existsSync(dir)) return null

  let items: string[]
  try {
    items = readdirSync(dir)
  } catch {
    return null // unreadable directory — skip silently
  }

  for (const item of items) {
    const itemLower = item.toLowerCase()

    // Always block moonloader regardless of location
    if (ALWAYS_BLOCKED_FILES.includes(itemLower)) {
      return `${relBase}${item}`
    }

    const fullPath = join(dir, item)
    let stat: ReturnType<typeof statSync>
    try {
      stat = statSync(fullPath)
    } catch {
      continue // broken symlink or permission error — skip
    }

    if (stat.isDirectory()) {
      if (SKIP_DIRS.includes(itemLower)) continue
      const sub = scanRecursive(fullPath, whitelist, `${relBase}${item}/`, depth + 1)
      if (sub) return sub
    } else {
      const ext = extname(item).toLowerCase()
      if (DANGEROUS_EXTENSIONS.includes(ext) && !whitelist.has(itemLower)) {
        return `${relBase}${item}`
      }
    }
  }

  return null
}

const SMOKE_QUOTES = [
  "You picked the wrong mod, fool!",
  "All we had to do, was follow the damn rules, CJ!",
  "I'll have two number nines, a number nine large, and a clean GTA folder!",
  "You're walking into the wrong house with that mod, my friend.",
  "Like it says in the book, we are blessed and cursed... but mostly cursed with that file.",
]

export function checkRunningProcesses(): string | null {
  if (process.platform !== "win32") return null
  try {
    // Get all running processes titles/names
    const stdout = execSync("tasklist /NH /FO CSV").toString().toLowerCase()
    for (const banned of BANNED_PROCESSES) {
      if (stdout.includes(banned)) {
        return banned
      }
    }
    return null
  } catch {
    return null
  }
}

export function runAnticheatCheck(gameDir: string): AnticheatResult {
  const bannedProc = checkRunningProcesses()
  if (bannedProc) {
    return {
      ok: false,
      error: "big_smoke",
      detail: `Big Smoke dice: "¡Eh! Quita ese '${bannedProc}' antes de entrar a San Andreas Roleplay."\n\nNo se permiten herramientas de hackeo o monitoreo externas.`,
    }
  }

  if (!gameDir || !existsSync(gameDir)) {
    return { ok: true } // If game doesn't exist, healthCheck handles it elsewhere
  }

  const whitelist = getWhitelist()

  // Scan the entire game directory recursively (starts at depth 0, gameDir root = relBase "")
  const violation = scanRecursive(gameDir, whitelist, "", 0)
  if (violation) {
    return buildViolation(violation)
  }

  return { ok: true }
}

function buildViolation(violatingFile: string): AnticheatResult {
  const randomQuote = SMOKE_QUOTES[Math.floor(Math.random() * SMOKE_QUOTES.length)]
  return {
    ok: false,
    error: "big_smoke",
    violatingFile,
    detail: `Big Smoke dice: "${randomQuote}"\n\nEl archivo "${violatingFile}" no está autorizado en este servidor.\n\nEliminalo de tu carpeta de GTA SA u obtén mods aprobados desde el catálogo oficial del launcher.`,
  }
}
