import DiscordRPC from "discord-rpc"
import log from "electron-log"
import { pingServer } from "./sampQuery"

const CLIENT_ID = "1257479137002786818"
const DISCORD_URL = "https://discord.gg/FEG5R797xJ"
const WEBSITE_URL = "https://sarp.es"
const LAUNCHER_PROTOCOL = "sarp-launcher://open"

const rpc = new DiscordRPC.Client({ transport: "ipc" })

let isReady = false
let updateInterval: ReturnType<typeof setInterval> | null = null

export async function initDiscordRPC() {
  try {
    rpc.on("ready", () => {
      isReady = true
      log.info("Discord RPC connected")
      setLauncherActivity()
    })

    // No await here or the app won't start if Discord isn't open
    rpc.login({ clientId: CLIENT_ID }).catch((err: unknown) => {
      log.warn(
        "Discord RPC login failed (likely Discord not running):",
        err instanceof Error ? err.message : String(err),
      )
    })
  } catch (err) {
    log.error("Failed to init Discord RPC:", err)
  }
}

export function setLauncherActivity() {
  if (!isReady) return
  if (updateInterval) {
    clearInterval(updateInterval)
    updateInterval = null
  }

  rpc
    .setActivity({
      details: "En el menú principal",
      state: "Explorando el launcher",
      largeImageKey: "logo_large",
      largeImageText: "San Andreas Roleplay",
      instance: false,
      buttons: [
        { label: "Página Web", url: WEBSITE_URL },
        { label: "Discord", url: DISCORD_URL },
      ],
    })
    .catch(() => {})
}

export function setPlayingActivity(ip: string, port: number) {
  if (!isReady) return
  const startTime = Date.now()

  const update = async () => {
    const response = await pingServer(ip, port)
    const playerCount = response.info
      ? `${response.info.players}/${response.info.maxPlayers}`
      : "Conectando..."

    rpc
      .setActivity({
        details: "Jugando en San Andreas Roleplay",
        state: `Online: ${playerCount}`,
        startTimestamp: startTime,
        largeImageKey: "logo_game",
        largeImageText: "San Andreas Roleplay",
        smallImageKey: "playing",
        smallImageText: "Activo",
        instance: false,
        buttons: [
          { label: "¡Unirse ahora!", url: LAUNCHER_PROTOCOL },
          { label: "Discord", url: DISCORD_URL },
        ],
      })
      .catch(() => {})
  }

  // Initial update
  update()

  // Periodic update every 30 seconds
  if (updateInterval) clearInterval(updateInterval)
  updateInterval = setInterval(update, 30_000)
}

export function clearActivity() {
  if (updateInterval) {
    clearInterval(updateInterval)
    updateInterval = null
  }
  if (!isReady) return
  rpc.clearActivity().catch(() => {})
}
