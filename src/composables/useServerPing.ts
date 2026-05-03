import { computed, onMounted, onUnmounted, readonly, ref } from "vue"

interface ServerInfo {
  hostname: string
  players: number
  maxPlayers: number
  gamemode: string
  language: string
  hasPassword: boolean
}

interface PingResult {
  alive: boolean
  ms: number | null
  info: ServerInfo | null
  error?: string
}

export const PING_REFRESH_MS = 15_000

const _result = ref<PingResult | null>(null)
const _loading = ref(true)
const _lastPingAt = ref<number>(0)
let _timer: ReturnType<typeof setInterval> | null = null
let _refCount = 0
let _inFlight: Promise<void> | null = null

async function _ping() {
  if (_inFlight) return _inFlight

  const ip = import.meta.env.VITE_GAME_SERVER_IP
  const port = Number(import.meta.env.VITE_GAME_SERVER_PORT)

  _inFlight = (async () => {
    try {
      _result.value = await window.launcher.pingServer(ip, port)
    } finally {
      _loading.value = false
      _lastPingAt.value = Date.now()
      _inFlight = null
    }
  })()

  return _inFlight
}

function startTimer() {
  if (_timer) return
  _ping()
  _timer = setInterval(_ping, PING_REFRESH_MS)
}

function stopTimer() {
  if (_timer) {
    clearInterval(_timer)
    _timer = null
  }
}

export function useServerPing() {
  onMounted(() => {
    _refCount += 1
    if (_refCount === 1) startTimer()
  })

  onUnmounted(() => {
    _refCount -= 1
    if (_refCount === 0) stopTimer()
  })

  return {
    result: readonly(_result),
    loading: readonly(_loading),
    lastPingAt: readonly(_lastPingAt),
    alive: computed(() => _result.value?.alive ?? false),
    ms: computed(() => _result.value?.ms ?? null),
    players: computed(() => _result.value?.info?.players ?? null),
    maxPlayers: computed(() => _result.value?.info?.maxPlayers ?? null),
    ping: _ping,
  }
}
