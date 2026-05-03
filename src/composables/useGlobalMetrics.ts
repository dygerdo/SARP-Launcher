import { onMounted, onUnmounted, ref } from "vue"
import { fetchGlobalMetrics, type GlobalMetrics } from "@/api/public"

interface NormalizedMetrics {
  online: number | null
  weeklyPeak: number | null
  totalAccounts: number | null
}

interface Options {
  refreshMs?: number
}

function pickNumber(source: GlobalMetrics, key: string): number | null {
  const value = source[key]
  return typeof value === "number" ? value : null
}

function normalize(raw: GlobalMetrics): NormalizedMetrics {
  return {
    online: pickNumber(raw, "onlineAccountCounter"),
    weeklyPeak: pickNumber(raw, "weeklyPeakPlayers"),
    totalAccounts: pickNumber(raw, "accountCounter"),
  }
}

export function useGlobalMetrics(options: Options = {}) {
  const { refreshMs = 60_000 } = options

  const metrics = ref<NormalizedMetrics>({
    online: null,
    weeklyPeak: null,
    totalAccounts: null,
  })
  const loading = ref(true)
  const error = ref<string | null>(null)
  let timer: ReturnType<typeof setInterval> | null = null

  async function load() {
    try {
      const raw = await fetchGlobalMetrics()
      metrics.value = normalize(raw)
      error.value = null
    } catch (err) {
      error.value = err instanceof Error ? err.message : "fetch failed"
    } finally {
      loading.value = false
    }
  }

  onMounted(() => {
    load()
    timer = setInterval(load, refreshMs)
  })

  onUnmounted(() => {
    if (timer) clearInterval(timer)
  })

  return { metrics, loading, error, reload: load }
}
