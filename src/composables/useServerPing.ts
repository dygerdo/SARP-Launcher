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

// Schedule of retry delays inside a single tick. The SAMP query protocol is
// UDP and packets get dropped enough that a one-shot failure usually clears
// up on the very next attempt — three tries with short backoff hide all
// the blips without ever surfacing a flapping "server down" state.
const PING_RETRY_DELAYS_MS = [800, 2000]
// When the entire retry burst still fails, we don't want to wait 15 s for
// the next try — schedule a fast retry instead, then fall back to the
// normal cadence.
const PING_FAST_RETRY_MS = 5_000

const _result = ref<PingResult | null>(null)
const _loading = ref(true)
const _lastPingAt = ref<number>(0)
let _timer: ReturnType<typeof setTimeout> | null = null
let _refCount = 0
let _inFlight: Promise<void> | null = null

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

function isHealthy(result: PingResult): boolean {
  return result.alive && result.info !== null && result.ms !== null
}

async function _ping() {
  if (_inFlight) return _inFlight

  const ip = import.meta.env.VITE_GAME_SERVER_IP
  const port = Number(import.meta.env.VITE_GAME_SERVER_PORT)

  _inFlight = (async () => {
    try {
      // Try up to (1 + retryDelays.length) times. As soon as one attempt
      // returns a healthy result we publish it; only the final failure is
      // ever shown to the user.
      let last: PingResult | null = null
      for (let attempt = 0; attempt <= PING_RETRY_DELAYS_MS.length; attempt++) {
        last = await window.launcher.pingServer(ip, port)
        if (isHealthy(last)) break
        if (attempt < PING_RETRY_DELAYS_MS.length) {
          await sleep(PING_RETRY_DELAYS_MS[attempt])
        }
      }
      _result.value = last

      // If we still failed after all retries, schedule a fast retry instead
      // of waiting for the regular 15 s tick — gets the user back to a green
      // state quickly when the network blip clears.
      if (last && !isHealthy(last)) {
        scheduleNext(PING_FAST_RETRY_MS)
      } else {
        scheduleNext(PING_REFRESH_MS)
      }
    } finally {
      _loading.value = false
      _lastPingAt.value = Date.now()
      _inFlight = null
    }
  })()

  return _inFlight
}

function scheduleNext(delayMs: number) {
  if (_timer) clearTimeout(_timer)
  _timer = setTimeout(() => {
    _timer = null
    if (_refCount > 0) void _ping()
  }, delayMs)
}

function startTimer() {
  if (_timer || _inFlight) return
  void _ping()
}

function stopTimer() {
  if (_timer) {
    clearTimeout(_timer)
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
