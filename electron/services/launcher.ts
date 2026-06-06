import { spawn, exec, execSync } from "node:child_process"
import { existsSync } from "node:fs"
import { join } from "node:path"
import { promisify } from "node:util"
import { BrowserWindow } from "electron"
import log from "electron-log"
import { IPC, type GameStatus } from "../ipc/channels"
import { getGameDir } from "./paths"
import { runAnticheatCheck, checkRunningProcesses } from "./anticheat"
import { setPlayingActivity, setLauncherActivity } from "./discord"
import store from "./store"

const execAsync = promisify(exec)

function updateWindowVisibility(isGameRunning: boolean) {
  const minimizeToTray = store.get("minimizeToTray")
  if (!minimizeToTray) return

  for (const win of BrowserWindow.getAllWindows()) {
    if (isGameRunning) {
      win.hide()
    } else {
      win.show()
      win.focus()
    }
  }
}

const TARGET_PROCESS = "gta_sa.exe"
const POLL_INTERVAL_MS = 2500
const SPAWN_GRACE_MS = 30_000

export interface LaunchResult {
  ok: boolean
  error?: string
}

let activePid: number | null = null
let pollInterval: ReturnType<typeof setInterval> | null = null
let spawnWatchdog: ReturnType<typeof setTimeout> | null = null

function broadcastStatus() {
  const payload: GameStatus = {
    running: activePid !== null,
    pid: activePid,
  }
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(IPC.GAME_STATUS_CHANGED, payload)
  }
}

function stopPoll() {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
}

function clearWatchdog() {
  if (spawnWatchdog) {
    clearTimeout(spawnWatchdog)
    spawnWatchdog = null
  }
}

function setActivePid(pid: number | null) {
  if (activePid === pid) return
  activePid = pid

  updateWindowVisibility(pid !== null)

  if (pid === null) {
    setLauncherActivity()
  }
  broadcastStatus()
}

export async function findGameProcess(): Promise<number | null> {
  if (process.platform !== "win32") return null
  try {
    const { stdout } = await execAsync(`tasklist /FI "IMAGENAME eq ${TARGET_PROCESS}" /FO CSV /NH`)
    const match = stdout.match(/"gta_sa\.exe","(\d+)"/)
    return match ? Number(match[1]) : null
  } catch {
    return null
  }
}

function startPolling() {
  stopPoll()
  pollInterval = setInterval(async () => {
    // --- RUNTIME SECURITY CHECK ---
    const bannedProc = checkRunningProcesses()
    if (bannedProc) {
      log.warn(`Security violation detected while playing: ${bannedProc}. Killing game.`)

      const appWin = BrowserWindow.getAllWindows()[0]
      if (appWin) {
        appWin.webContents.send(IPC.SECURITY_ALERT, bannedProc)
      }

      try {
        execSync(`taskkill /F /IM ${TARGET_PROCESS}`)
      } catch (e) {
        log.error("Failed to kill game on violation:", e)
      }
      stopPoll()
      setActivePid(null)
      return
    }
    // ------------------------------

    const pid = await findGameProcess()
    if (pid === null) {
      stopPoll()
      setActivePid(null)
    } else if (pid !== activePid) {
      setActivePid(pid)
    }
  }, POLL_INTERVAL_MS)
}

export function getGameStatus(): GameStatus {
  return { running: activePid !== null, pid: activePid }
}

export function launchGame(host: string, port: number): LaunchResult {
  if (activePid !== null) {
    return { ok: false, error: "already running" }
  }

  const gameDir = getGameDir()
  if (!gameDir) {
    return { ok: false, error: "Elige primero la carpeta de GTA: San Andreas" }
  }
  const sampExe = join(gameDir, "samp.exe")
  if (!existsSync(sampExe)) {
    return { ok: false, error: "samp.exe no está instalado" }
  }

  // --- BIG SMOKE ANTICHEAT ---
  const acResult = runAnticheatCheck(gameDir)
  if (!acResult.ok) {
    return {
      ok: false,
      error: acResult.detail ?? "Mod no autorizado detectado.",
    }
  }
  // ----------------------------

  try {
    const child = spawn(sampExe, [`${host}:${port}`], {
      cwd: gameDir,
      detached: true,
      stdio: "ignore",
    })
    child.unref()
    setPlayingActivity(host, port)
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "spawn failed" }
  }

  clearWatchdog()
  spawnWatchdog = setTimeout(async () => {
    spawnWatchdog = null
    const pid = await findGameProcess()
    if (pid === null) {
      stopPoll()
      setActivePid(null)
    }
  }, SPAWN_GRACE_MS)

  startPolling()
  return { ok: true }
}

export async function detectRunningGame(): Promise<void> {
  const pid = await findGameProcess()
  if (pid !== null) {
    setActivePid(pid)
    startPolling()
  }
}
