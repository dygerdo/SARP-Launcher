import { defineStore } from "pinia"
import { ref } from "vue"

export type DialogType = "info" | "success" | "warning" | "error"

export interface DialogPayload {
  id: number
  type: DialogType
  title: string
  message: string
  /** Label for the confirm button. Defaults to "Aceptar". */
  okLabel?: string
}

interface PendingDialog extends DialogPayload {
  resolve: () => void
}

export const useDialogStore = defineStore("dialog", () => {
  const queue = ref<PendingDialog[]>([])
  let nextId = 1

  function show(type: DialogType, title: string, message: string, okLabel?: string): Promise<void> {
    return new Promise<void>((resolve) => {
      queue.value.push({
        id: nextId++,
        type,
        title,
        message,
        okLabel,
        resolve,
      })
    })
  }

  function dismiss(id: number): void {
    const idx = queue.value.findIndex((d) => d.id === id)
    if (idx === -1) return
    const [removed] = queue.value.splice(idx, 1)
    removed.resolve()
  }

  return {
    queue,
    info: (title: string, message: string, okLabel?: string) =>
      show("info", title, message, okLabel),
    success: (title: string, message: string, okLabel?: string) =>
      show("success", title, message, okLabel),
    warning: (title: string, message: string, okLabel?: string) =>
      show("warning", title, message, okLabel),
    error: (title: string, message: string, okLabel?: string) =>
      show("error", title, message, okLabel),
    dismiss,
  }
})
