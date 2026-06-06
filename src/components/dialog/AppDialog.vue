<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, watch } from "vue"
import type { DialogType } from "@/stores/dialog"
import { useDialogStore } from "@/stores/dialog"

const dialog = useDialogStore()

// Render only the head of the queue. Subsequent dialogs surface in order as
// the user dismisses each one — matches users' expectation that the modal
// "comes back" if multiple errors stacked up.
const current = computed(() => dialog.queue[0] ?? null)

interface Look {
  icon: string
  iconColor: string
  ringColor: string
  buttonClass: string
}

const LOOKS: Record<DialogType, Look> = {
  info: {
    icon: "pi-info-circle",
    iconColor: "text-sky-300",
    ringColor: "ring-sky-400/20",
    buttonClass: "bg-sky-500/90 text-white hover:bg-sky-400",
  },
  success: {
    icon: "pi-check-circle",
    iconColor: "text-emerald-300",
    ringColor: "ring-emerald-400/20",
    buttonClass: "bg-emerald-500/90 text-black hover:bg-emerald-400",
  },
  warning: {
    icon: "pi-exclamation-triangle",
    iconColor: "text-amber-300",
    ringColor: "ring-amber-400/20",
    buttonClass: "bg-amber-500/90 text-black hover:bg-amber-400",
  },
  error: {
    icon: "pi-times-circle",
    iconColor: "text-rose-300",
    ringColor: "ring-rose-400/20",
    buttonClass: "bg-rose-500/90 text-white hover:bg-rose-400",
  },
}

const look = computed<Look>(() => (current.value ? LOOKS[current.value.type] : LOOKS.info))

function accept(): void {
  if (current.value) dialog.dismiss(current.value.id, true)
}

function cancel(): void {
  if (current.value) dialog.dismiss(current.value.id, false)
}

function onKeydown(e: KeyboardEvent): void {
  if (!current.value) return
  if (e.key === "Escape") {
    e.preventDefault()
    cancel()
  } else if (e.key === "Enter") {
    e.preventDefault()
    accept()
  }
}

onMounted(() => window.addEventListener("keydown", onKeydown))
onBeforeUnmount(() => window.removeEventListener("keydown", onKeydown))

// Keep window scroll locked while a dialog is up so the backdrop never
// reveals a scrolled background underneath.
watch(current, (open) => {
  if (open) document.body.style.overflow = "hidden"
  else document.body.style.overflow = ""
})
</script>

<template>
  <Transition name="dialog">
    <div
      v-if="current"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6 backdrop-blur-sm"
      style="-webkit-app-region: no-drag"
      @click.self="cancel"
    >
      <div
        role="dialog"
        aria-modal="true"
        :aria-labelledby="`dialog-title-${current.id}`"
        :aria-describedby="`dialog-message-${current.id}`"
        class="dialog-card w-full max-w-md overflow-hidden rounded-xl border border-white/10 bg-neutral-900/95 shadow-2xl ring-1 backdrop-blur-md"
        :class="look.ringColor"
      >
        <div class="flex items-start gap-3 px-5 pt-5">
          <i class="pi mt-0.5 text-xl" :class="[look.icon, look.iconColor]" />
          <div class="min-w-0 flex-1">
            <h3 :id="`dialog-title-${current.id}`" class="text-sm font-semibold text-white">
              {{ current.title }}
            </h3>
            <p
              :id="`dialog-message-${current.id}`"
              class="mt-1 whitespace-pre-line break-words text-sm leading-relaxed text-white/70"
            >
              {{ current.message }}
            </p>
          </div>
        </div>
        <div class="mt-5 flex justify-end gap-2 border-t border-white/5 bg-white/[0.02] px-5 py-3">
          <button
            v-if="current.cancelLabel"
            type="button"
            class="inline-flex h-8 min-w-[80px] items-center justify-center rounded-md border border-white/10 bg-white/5 px-3 text-xs font-bold text-white/70 transition-colors duration-150 hover:bg-white/10 hover:text-white"
            @click="cancel"
          >
            {{ current.cancelLabel }}
          </button>
          <button
            type="button"
            class="inline-flex h-8 min-w-[80px] items-center justify-center rounded-md px-3 text-xs font-bold transition-colors duration-150"
            :class="look.buttonClass"
            autofocus
            @click="accept"
          >
            {{ current.okLabel ?? "Aceptar" }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.dialog-enter-active,
.dialog-leave-active {
  transition:
    opacity 0.18s ease,
    backdrop-filter 0.18s ease;
}
.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
}
.dialog-enter-active .dialog-card,
.dialog-leave-active .dialog-card {
  transition:
    transform 0.18s ease,
    opacity 0.18s ease;
}
.dialog-enter-from .dialog-card,
.dialog-leave-to .dialog-card {
  transform: scale(0.96) translateY(4px);
  opacity: 0;
}
</style>
