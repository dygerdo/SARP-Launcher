import { BrowserWindow, screen } from "electron"
import store from "./store"
import type { WindowStateSchema } from "./store"

export const DEFAULT_WIDTH = 1100
export const DEFAULT_HEIGHT = 980
export const MIN_WIDTH = 880
// 720 covers 1366×768 minus the Windows taskbar — the floor of mainstream
// laptops. The HomePage layout has to fit inside this without scrollbars,
// which means compact gaps/paddings and (if needed) hiding optional blocks
// at low heights via container queries. Don't bump this back up without
// checking the smallest target resolution still works.
export const MIN_HEIGHT = 720

const PERSIST_DEBOUNCE_MS = 300

export interface InitialBounds {
  width: number
  height: number
  x?: number
  y?: number
  isMaximized: boolean
  isFullscreen: boolean
}

/** Reads the saved window state and validates it against the current display
 *  layout. If the saved bounds fall on a monitor that no longer exists (user
 *  unplugged a screen) we fall back to a centred default — never open the
 *  window where the user can't see it. */
export function loadInitialBounds(): InitialBounds {
  const saved = store.get("windowState")
  if (!saved) return defaultBounds()

  const width = clamp(saved.width, MIN_WIDTH, 10_000)
  const height = clamp(saved.height, MIN_HEIGHT, 10_000)

  // Position is optional — if missing we let Electron centre the window on
  // the primary display. If present, verify it intersects a real display.
  if (typeof saved.x === "number" && typeof saved.y === "number") {
    const visible = isPointVisible(saved.x, saved.y, width, height)
    if (!visible)
      return {
        ...defaultBounds(),
        isMaximized: saved.isMaximized,
        isFullscreen: saved.isFullscreen,
      }
    return {
      width,
      height,
      x: saved.x,
      y: saved.y,
      isMaximized: saved.isMaximized,
      isFullscreen: saved.isFullscreen,
    }
  }

  return {
    width,
    height,
    isMaximized: saved.isMaximized,
    isFullscreen: saved.isFullscreen,
  }
}

/** Wires resize/move/state events on `win` and persists the window state to
 *  electron-store. Resize/move are debounced so we don't write the file on
 *  every pixel of drag. Maximised / fullscreen states are saved alongside the
 *  *normal* bounds returned by `getNormalBounds()` — that way restoring after
 *  a maximise gives the user a sane window size, not a zero-area rect. */
export function attachWindowStatePersistence(win: BrowserWindow): void {
  let timer: ReturnType<typeof setTimeout> | null = null

  const persist = () => {
    if (win.isDestroyed()) return
    const isMaximized = win.isMaximized()
    const isFullscreen = win.isFullScreen()
    // Always store the *normal* (unmaximised, non-fullscreen) bounds. When
    // the user un-maximises later, this is what we want them back at.
    const bounds = win.getNormalBounds()
    const next: WindowStateSchema = {
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y,
      isMaximized,
      isFullscreen,
    }
    store.set("windowState", next)
  }

  const schedule = () => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(persist, PERSIST_DEBOUNCE_MS)
  }

  win.on("resize", schedule)
  win.on("move", schedule)
  // State changes are rare and discrete — persist immediately so a quick
  // close right after maximising still records the new state.
  win.on("maximize", persist)
  win.on("unmaximize", persist)
  win.on("enter-full-screen", persist)
  win.on("leave-full-screen", persist)
  win.on("close", () => {
    if (timer) clearTimeout(timer)
    persist()
  })
}

function defaultBounds(): InitialBounds {
  return {
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
    isMaximized: false,
    isFullscreen: false,
  }
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(Math.max(value, min), max)
}

/** A window rect is "visible" if at least a reasonable chunk of it overlaps
 *  some display work area. We don't require full containment — many users
 *  legitimately leave windows half off-screen. */
function isPointVisible(x: number, y: number, width: number, height: number): boolean {
  const displays = screen.getAllDisplays()
  const MIN_VISIBLE = 100 // require at least this many pixels visible
  for (const d of displays) {
    const a = d.workArea
    const overlapW = Math.min(x + width, a.x + a.width) - Math.max(x, a.x)
    const overlapH = Math.min(y + height, a.y + a.height) - Math.max(y, a.y)
    if (overlapW >= MIN_VISIBLE && overlapH >= MIN_VISIBLE) return true
  }
  return false
}
