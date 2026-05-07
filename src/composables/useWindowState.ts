import { onMounted, onUnmounted, ref } from "vue"

/** Mirrors the BrowserWindow's maximise/fullscreen state in the renderer.
 *  Used by the title bar to swap maximise/restore icons and to hide itself
 *  when the user enters fullscreen. */
export function useWindowState() {
  const isMaximized = ref(false)
  const isFullscreen = ref(false)

  let detach: (() => void) | null = null

  onMounted(async () => {
    const initial = await window.launcher.getWindowState()
    isMaximized.value = initial.isMaximized
    isFullscreen.value = initial.isFullscreen
    detach = window.launcher.onWindowStateChange((state) => {
      isMaximized.value = state.isMaximized
      isFullscreen.value = state.isFullscreen
    })
  })

  onUnmounted(() => {
    detach?.()
  })

  return {
    isMaximized,
    isFullscreen,
    toggleMaximize: () => window.launcher.toggleMaximize(),
    toggleFullscreen: () => window.launcher.toggleFullscreen(),
  }
}
