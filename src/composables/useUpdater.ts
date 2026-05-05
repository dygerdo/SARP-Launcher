import { onMounted, onUnmounted, ref } from "vue"

export type UpdaterPhase = "idle" | "downloading" | "ready"

export function useUpdater() {
  const phase = ref<UpdaterPhase>("idle")
  const version = ref<string | null>(null)
  const percent = ref<number>(0)

  const unsubs: Array<() => void> = []

  onMounted(() => {
    unsubs.push(
      window.launcher.onUpdaterAvailable((info) => {
        version.value = info.version
        percent.value = 0
        // Skip "downloading" if a progress event hasn't kicked in yet — small
        // updates over a fast connection can finish before any progress fires.
        if (phase.value !== "ready") phase.value = "downloading"
      }),
    )
    unsubs.push(
      window.launcher.onUpdaterProgress((p) => {
        percent.value = Math.min(100, Math.max(0, Math.round(p.percent)))
        if (phase.value !== "ready") phase.value = "downloading"
      }),
    )
    unsubs.push(
      window.launcher.onUpdaterDownloaded((info) => {
        version.value = info.version
        percent.value = 100
        phase.value = "ready"
      }),
    )
    unsubs.push(
      // Errors are intentionally swallowed in the UI — a transient network
      // hiccup should not pop a scary banner. Full traces live in main.log.
      window.launcher.onUpdaterError(() => undefined),
    )
  })

  onUnmounted(() => {
    unsubs.forEach((u) => u())
    unsubs.length = 0
  })

  async function applyUpdate() {
    if (phase.value !== "ready") return
    await window.launcher.quitAndInstall()
  }

  return { phase, version, percent, applyUpdate }
}
