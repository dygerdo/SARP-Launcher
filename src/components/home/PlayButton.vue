<script setup lang="ts">
import { computed } from "vue"
import type { GamePhase } from "@/composables/useGameStatus"

const props = defineProps<{
  phase: GamePhase
  disabled?: boolean
  launchMessage?: string
}>()

defineEmits<{
  click: []
}>()

const interactive = computed(() => props.phase === "idle" && !props.disabled)

const inactive = computed(() => !interactive.value)

const label = computed(() => {
  if (props.phase === "launching") return props.launchMessage ?? "Iniciando..."
  if (props.phase === "in-game") return "Conectado"
  return "Jugar"
})

const buttonClasses = computed(() => {
  if (props.phase === "in-game") {
    return "cursor-default bg-emerald-500/15 font-extrabold text-emerald-300 ring-1 ring-inset ring-emerald-400/30"
  }
  if (inactive.value) {
    return "cursor-not-allowed bg-white/[0.06] font-semibold text-white/40 shadow-none"
  }
  return "bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 font-extrabold text-white shadow-[0_8px_24px_rgba(251,146,60,0.25)] hover:brightness-110 active:brightness-95"
})
</script>

<template>
  <button
    type="button"
    class="play-button group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl px-4 py-3 text-sm uppercase tracking-wider transition-all"
    :class="buttonClasses"
    style="-webkit-app-region: no-drag"
    :disabled="phase !== 'idle' && disabled"
    @click="$emit('click')"
  >
    <i v-if="phase === 'launching'" class="pi pi-spin pi-spinner text-lg" />
    <span v-else-if="phase === 'in-game'" class="relative flex h-2.5 w-2.5">
      <span class="absolute inset-0 animate-ping rounded-full bg-emerald-400/70" />
      <span class="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
    </span>
    <i v-else class="pi pi-play-circle text-lg" />

    <Transition name="play-label" mode="out-in">
      <span :key="label">{{ label }}</span>
    </Transition>
  </button>
</template>

<style scoped>
.play-button:not([class*="cursor-not-allowed"]):not([class*="cursor-default"])::before {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(
    115deg,
    transparent 35%,
    rgba(255, 255, 255, 0.35) 50%,
    transparent 65%
  );
  background-size: 250% 100%;
  background-repeat: no-repeat;
  pointer-events: none;
  animation: play-shimmer 3.5s ease-in-out infinite;
}

@keyframes play-shimmer {
  0% {
    background-position: 200% 0;
    opacity: 0;
  }
  20% {
    opacity: 1;
  }
  80% {
    background-position: -100% 0;
    opacity: 1;
  }
  100% {
    background-position: -100% 0;
    opacity: 0;
  }
}

.play-label-enter-active,
.play-label-leave-active {
  transition:
    opacity 0.22s ease,
    transform 0.22s ease;
}
.play-label-enter-from {
  opacity: 0;
  transform: translateY(4px);
}
.play-label-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
