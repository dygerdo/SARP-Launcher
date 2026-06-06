import { defineStore } from "pinia"
import { ref, computed } from "vue"
import type { UpdaterAvailable, UpdaterProgress } from "../../electron/services/updater"

export type UpdaterStatus =
  | "checking"
  | "available"
  | "downloading"
  | "downloaded"
  | "none"
  | "error"

export const useUpdaterStore = defineStore("updater", () => {
  const status = ref<UpdaterStatus>("checking")
  const percent = ref(0)
  const version = ref("")
  const error = ref("")

  // True while the AppLoader must be shown: blocks the main UI from rendering
  const isBlocking = computed(
    () =>
      status.value === "checking" || status.value === "available" || status.value === "downloading",
  )

  // Safety net: if no updater signal arrives within 8 s, unblock the UI anyway
  // so a network error or missing app-update.yml never freezes the launcher.
  let fallbackTimer: ReturnType<typeof setTimeout> | null = null

  function armFallback(): void {
    fallbackTimer = setTimeout(() => {
      if (isBlocking.value) {
        console.warn("[updater-store] no signal in 8 s — releasing loader")
        status.value = "none"
      }
    }, 8000)
  }

  function clearFallback(): void {
    if (fallbackTimer !== null) {
      clearTimeout(fallbackTimer)
      fallbackTimer = null
    }
  }

  function setupListeners(): void {
    // Register IPC callbacks as early as possible so no message is missed
    window.updater.onNoUpdate(() => {
      clearFallback()
      status.value = "none"
    })

    window.updater.onAvailable((info: UpdaterAvailable) => {
      clearFallback()
      version.value = info.version
      status.value = "available"
    })

    window.updater.onProgress((p: UpdaterProgress) => {
      percent.value = p.percent
      status.value = "downloading"
    })

    window.updater.onDownloaded(() => {
      status.value = "downloaded"
    })

    window.updater.onError((msg: string) => {
      clearFallback()
      error.value = msg
      // Show the error briefly in the loader, then let the app continue
      status.value = "error"
      window.setTimeout(() => {
        status.value = "none"
      }, 2000)
    })

    // Start the safety-net timer AFTER listeners are wired
    armFallback()
  }

  function cleanup(): void {
    clearFallback()
    window.updater.removeAll()
  }

  return {
    status,
    percent,
    version,
    error,
    isBlocking,
    setupListeners,
    cleanup,
  }
})
