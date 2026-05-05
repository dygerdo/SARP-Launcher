import { app, shell } from "electron"
import { join } from "node:path"

const SHORTCUT_FILENAME = "SARP Launcher.lnk"

// Drops a .lnk pointing at this launcher into the user's GTA folder so they
// can launch SARP straight from the same place they already launch the game.
// "create" overwrites if the shortcut already exists, so this is naturally
// idempotent: re-running with the same target is a no-op-ish refresh, and if
// the portable .exe moved between picks the shortcut is repointed in place.
// We avoid touching anything outside `gameDir`, so there is no way to leave
// duplicate shortcuts in the same folder. Best-effort: shortcut creation is
// a nicety, never a blocker for folder selection or installation.
export async function ensureGameFolderShortcut(gameDir: string): Promise<void> {
  if (!app.isPackaged) return // dev mode: don't litter shortcuts
  if (process.platform !== "win32") return
  try {
    // NSIS installs the launcher to a stable per-user path
    // (%LOCALAPPDATA%\Programs\<app>\<app>.exe), so app.getPath("exe") is the
    // right target for the shortcut.
    const target = app.getPath("exe")
    const shortcutPath = join(gameDir, SHORTCUT_FILENAME)
    shell.writeShortcutLink(shortcutPath, "create", {
      target,
      cwd: gameDir,
      description: "San Andreas Roleplay Launcher",
      icon: target,
      iconIndex: 0,
    })
  } catch {
    // best-effort: shortcut is a nice-to-have, not a blocker
  }
}
