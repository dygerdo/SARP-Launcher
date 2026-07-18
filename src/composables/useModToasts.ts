import { ref } from "vue"
import type { ToastType } from "@/stores/mods"

export interface ToastItem {
  id: number
  text: string
  type: ToastType
}

let _toastId = 0

export function useModToasts() {
  const toastItems = ref<ToastItem[]>([])

  function pushToast(text: string, type: ToastType): void {
    if (toastItems.value.length >= 3) {
      toastItems.value.shift()
    }
    const id = ++_toastId
    toastItems.value.push({ id, text, type })
    const timeout = type === "error" ? 2200 : 1800
    window.setTimeout(() => {
      const idx = toastItems.value.findIndex((t) => t.id === id)
      if (idx !== -1) toastItems.value.splice(idx, 1)
    }, timeout)
  }

  function pushErrorToast(message: string): void {
    pushToast(message, "error")
  }

  return { toastItems, pushToast, pushErrorToast }
}
