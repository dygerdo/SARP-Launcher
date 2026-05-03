<script setup lang="ts">
import { computed } from "vue"
import type { CheckState } from "@/stores/healthCheck"

export type ItemActionVariant = "primary" | "secondary"

export interface ItemAction {
  label: string
  busy?: boolean
  disabled?: boolean
  /** 0-100 — when present, draws a progress bar across the button. */
  progress?: number
  /** Show a UAC shield icon before the label, cueing the user that a UAC prompt will appear. */
  shield?: boolean
  /** Visual treatment. Defaults to "primary" (amber). */
  variant?: ItemActionVariant
  onClick: () => void
}

const props = defineProps<{
  label: string
  state: CheckState
  detail?: string
  meta?: string
  action?: ItemAction
}>()

const icon = computed(() => {
  switch (props.state) {
    case "ok":
      return "pi-check-circle"
    case "warning":
      return "pi-info-circle"
    case "error":
      return "pi-times-circle"
  }
  return "pi-circle"
})

const color = computed(() => {
  switch (props.state) {
    case "checking":
      return "text-white/40"
    case "ok":
      return "text-emerald-400"
    case "warning":
      return "text-amber-400"
    case "error":
      return "text-rose-400"
  }
  return "text-white/40"
})

const subline = computed(() => {
  if (props.detail && props.state !== "ok" && props.state !== "checking") {
    return { text: props.detail, kind: "detail" as const }
  }
  if (props.meta) {
    return { text: props.meta, kind: "meta" as const }
  }
  return null
})

const actionVariant = computed<ItemActionVariant>(() => props.action?.variant ?? "primary")

const actionButtonClass = computed(() => {
  if (actionVariant.value === "secondary") {
    return "bg-white/10 text-white/90 hover:bg-white/15"
  }
  return "bg-amber-500/90 text-black hover:bg-amber-400"
})

const actionProgressTrackClass = computed(() =>
  actionVariant.value === "secondary" ? "bg-white/10" : "bg-black/20",
)

const actionProgressFillClass = computed(() =>
  actionVariant.value === "secondary" ? "bg-white/70" : "bg-black/60",
)
</script>

<template>
  <div class="flex h-14 items-start gap-3 py-2.5">
    <span class="mt-0.5 inline-flex h-4 w-4 items-center justify-center leading-none">
      <span v-if="state === 'checking'" class="state-spinner" aria-label="Verificando" />
      <i v-else class="pi text-base leading-none" :class="[icon, color]" />
    </span>
    <div class="flex min-w-0 flex-1 flex-col gap-1">
      <span class="text-sm leading-none text-white/85">{{ label }}</span>
      <span
        class="block h-4 truncate text-xs leading-none transition-opacity"
        :class="[
          subline ? 'opacity-100' : 'opacity-0',
          subline?.kind === 'detail' ? 'text-white/50' : 'text-white/40',
        ]"
      >
        <template v-if="subline">{{ subline.text }}</template>
        <template v-else>·</template>
      </span>
    </div>
    <button
      v-if="action"
      type="button"
      class="relative mt-0.5 inline-flex h-7 min-w-[88px] items-center justify-center overflow-hidden rounded-md px-2.5 text-xs font-bold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60"
      :class="actionButtonClass"
      :disabled="action.disabled || action.busy"
      @click="action.onClick"
    >
      <span
        class="action-label inline-flex items-center gap-1.5 leading-none transition-opacity duration-150"
        :class="action.busy ? 'opacity-0' : 'opacity-100'"
      >
        <img
          v-if="action.shield"
          src="/images/admin_shield.png"
          class="block h-[14px] w-[14px] flex-shrink-0"
          alt=""
          aria-label="Pedirá permisos de administrador"
          title="Pedirá permisos de administrador"
        />
        <span class="leading-none">{{ action.label }}</span>
      </span>
      <span
        class="action-busy pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-200"
        :class="action.busy ? 'opacity-100' : 'opacity-0'"
        aria-live="polite"
      >
        <span
          class="action-spinner"
          :class="actionVariant === 'secondary' ? 'action-spinner-light' : 'action-spinner-dark'"
        />
        <span
          class="ml-1.5 font-mono font-bold tabular-nums text-[11px] transition-opacity duration-150"
          :class="action.busy && typeof action.progress === 'number' ? 'opacity-100' : 'opacity-0'"
        >
          {{ typeof action.progress === "number" ? `${Math.floor(action.progress)}%` : "" }}
        </span>
      </span>
      <span
        class="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 overflow-hidden transition-opacity duration-150"
        :class="[
          action.busy && typeof action.progress === 'number' ? 'opacity-100' : 'opacity-0',
          actionProgressTrackClass,
        ]"
        aria-hidden="true"
      >
        <span
          class="block h-full transition-[width] duration-150"
          :class="actionProgressFillClass"
          :style="{
            width: `${Math.min(100, Math.max(0, typeof action.progress === 'number' ? action.progress : 0))}%`,
          }"
        />
      </span>
    </button>
  </div>
</template>

<style scoped>
.action-spinner {
  width: 14px;
  height: 14px;
  border-radius: 9999px;
  border-width: 2px;
  border-style: solid;
  animation: action-spinner-rotate 1s linear infinite;
  will-change: transform;
}
.action-spinner-dark {
  border-color: rgba(0, 0, 0, 0.2);
  border-top-color: rgba(0, 0, 0, 0.85);
}
.action-spinner-light {
  border-color: rgba(255, 255, 255, 0.2);
  border-top-color: rgba(255, 255, 255, 0.9);
}

.state-spinner {
  width: 12px;
  height: 12px;
  border-radius: 9999px;
  border: 1.5px solid rgba(255, 255, 255, 0.18);
  border-top-color: rgba(255, 255, 255, 0.7);
  animation: action-spinner-rotate 1s linear infinite;
  will-change: transform;
}

/* Sequenced crossfade: whichever is becoming visible waits for the other to
   finish leaving before fading in. Avoids both layers overlapping at half
   opacity in the middle of the transition. */
.action-label.opacity-0 {
  transition-delay: 0ms;
}
.action-label.opacity-100 {
  transition-delay: 120ms;
}
.action-busy.opacity-0 {
  transition-delay: 0ms;
}
.action-busy.opacity-100 {
  transition-delay: 120ms;
}

@keyframes action-spinner-rotate {
  to {
    transform: rotate(360deg);
  }
}
</style>
