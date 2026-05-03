import { ref, onUnmounted } from "vue"

interface Options {
  duration?: number
  cap?: number
  finishDuration?: number
}

export function useProgressBar(options: Options = {}) {
  const { duration = 9000, cap = 99, finishDuration = 400 } = options

  const progress = ref(0)
  let raf: number | null = null
  let startTime: number | null = null
  let finishing = false
  let finishStart: number | null = null
  let finishFrom = 0
  let onDoneCb: (() => void) | null = null

  const ease = (t: number) => 1 - Math.pow(1 - t, 3)

  const tick = (now: number) => {
    if (finishing) {
      if (finishStart === null) finishStart = now
      const elapsed = now - finishStart
      const t = Math.min(elapsed / finishDuration, 1)
      progress.value = finishFrom + (100 - finishFrom) * ease(t)
      if (t >= 1) {
        progress.value = 100
        if (onDoneCb) onDoneCb()
        return
      }
    } else {
      if (startTime === null) startTime = now
      const elapsed = now - startTime
      const t = Math.min(elapsed / duration, 1)
      progress.value = cap * ease(t)
    }
    raf = requestAnimationFrame(tick)
  }

  const start = () => {
    if (raf !== null) return
    raf = requestAnimationFrame(tick)
  }

  const finish = (onDone?: () => void) => {
    finishing = true
    finishFrom = progress.value
    onDoneCb = onDone ?? null
  }

  const stop = () => {
    if (raf !== null) {
      cancelAnimationFrame(raf)
      raf = null
    }
  }

  onUnmounted(stop)

  return { progress, start, finish, stop }
}
