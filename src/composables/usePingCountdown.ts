import { onUnmounted, ref, watch, type Ref } from "vue"
import { PING_REFRESH_MS } from "./useServerPing"

export function usePingCountdown(lastPingAt: Readonly<Ref<number>>) {
  const progress = ref(0)
  let raf: number | null = null

  function tick() {
    if (lastPingAt.value === 0) {
      progress.value = 0
    } else {
      const elapsed = Date.now() - lastPingAt.value
      progress.value = Math.min(elapsed / PING_REFRESH_MS, 1)
    }
    raf = requestAnimationFrame(tick)
  }

  watch(
    lastPingAt,
    (now) => {
      if (now > 0 && raf === null) {
        raf = requestAnimationFrame(tick)
      }
    },
    { immediate: true },
  )

  onUnmounted(() => {
    if (raf !== null) cancelAnimationFrame(raf)
  })

  return { progress }
}
