import { onMounted, onUnmounted, ref } from "vue"
import { randomTagline } from "@/utils/randomTagline"

interface Options {
  intervalMs?: number
}

export function useRotatingTagline(options: Options = {}) {
  const { intervalMs = 8000 } = options
  const tagline = ref(randomTagline())
  let timer: ReturnType<typeof setInterval> | null = null

  function rotate() {
    let next = randomTagline()
    let attempts = 0
    while (next === tagline.value && attempts < 5) {
      next = randomTagline()
      attempts += 1
    }
    tagline.value = next
  }

  onMounted(() => {
    timer = setInterval(rotate, intervalMs)
  })

  onUnmounted(() => {
    if (timer) clearInterval(timer)
  })

  return { tagline }
}
