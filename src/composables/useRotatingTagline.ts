import { onMounted, onUnmounted, ref } from "vue"
import { randomTagline } from "@/utils/randomTagline"

interface Options {
  intervalMs?: number
}

const DEFAULT_INTERVAL_MS = 60_000

export function useRotatingTagline(options: Options = {}) {
  const { intervalMs = DEFAULT_INTERVAL_MS } = options
  const tagline = ref(randomTagline())
  let timer: ReturnType<typeof setInterval> | null = null

  // The bag in randomTagline already guarantees we won't see the same
  // line twice in a row, so a single call per tick is enough.
  function rotate() {
    tagline.value = randomTagline()
  }

  onMounted(() => {
    timer = setInterval(rotate, intervalMs)
  })

  onUnmounted(() => {
    if (timer) clearInterval(timer)
  })

  return { tagline }
}
