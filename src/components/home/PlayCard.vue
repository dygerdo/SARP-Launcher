<script setup lang="ts">
import { computed } from "vue"
import type { GamePhase } from "@/composables/useGameStatus"

const props = defineProps<{
  phase: GamePhase
  disabled: boolean
  launchMessage?: string
  blockHint: string | null
}>()

defineEmits<{
  play: []
  signup: []
}>()

const interactive = computed(() => props.phase === "idle" && !props.disabled)
const inactive = computed(() => !interactive.value)

const label = computed(() => {
  if (props.phase === "launching") return props.launchMessage ?? "Iniciando..."
  if (props.phase === "in-game") return "Conectado"
  return "Jugar"
})

const cardClasses = computed(() => {
  if (props.phase === "in-game") {
    return "cursor-default bg-emerald-500/[0.06] border border-emerald-400/25 backdrop-blur-sm"
  }
  if (inactive.value) {
    return "cursor-not-allowed bg-white/[0.03] border border-white/10 backdrop-blur-sm"
  }
  return "cursor-pointer bg-white/[0.03] border border-white/10 backdrop-blur-sm shadow-[0_8px_24px_rgba(0,0,0,0.35)] hover:-translate-y-px hover:bg-white/[0.05] hover:border-amber-400/35 hover:shadow-[0_12px_32px_rgba(0,0,0,0.5)] active:translate-y-0 active:shadow-[0_4px_12px_rgba(0,0,0,0.3)]"
})

const labelClasses = computed(() => {
  if (props.phase === "in-game") return "text-emerald-300"
  if (inactive.value) return "text-white/40"
  return "text-white"
})
</script>

<template>
  <div class="relative flex">
    <button
      type="button"
      class="play-card group relative flex flex-1 flex-col items-center justify-center overflow-hidden rounded-xl px-4 pb-12 pt-8 transition-all duration-200"
      :class="cardClasses"
      style="-webkit-app-region: no-drag"
      :disabled="phase !== 'idle' && disabled"
      @click="$emit('play')"
    >
      <span
        v-if="interactive"
        class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/40 to-transparent"
        aria-hidden="true"
      />

      <Transition name="hint">
        <span
          v-if="blockHint"
          class="absolute inset-x-3 top-3 text-center text-[10px] font-medium leading-tight text-rose-200"
        >
          {{ blockHint }}
        </span>
      </Transition>

      <span
        v-if="interactive"
        class="play-halo pointer-events-none absolute left-1/2 top-[42%] h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full"
        aria-hidden="true"
      />

      <div class="relative flex flex-col items-center">
        <svg
          v-if="phase === 'launching'"
          class="play-spinner h-11 w-11 text-orange-400"
          viewBox="0 0 50 50"
          aria-hidden="true"
        >
          <circle
            cx="25"
            cy="25"
            r="20"
            fill="none"
            stroke="currentColor"
            stroke-width="4"
            stroke-linecap="round"
            stroke-dasharray="90 60"
          />
        </svg>
        <span v-else-if="phase === 'in-game'" class="relative flex h-6 w-6">
          <span class="absolute inset-0 animate-ping rounded-full bg-emerald-400/70" />
          <span class="relative inline-flex h-6 w-6 rounded-full bg-emerald-400" />
        </span>
        <svg
          v-else
          class="play-icon h-11 w-11 transition-transform duration-200 group-hover:scale-110"
          :class="inactive ? 'text-white/30' : 'text-orange-400'"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            d="M8.5 5.5 L19 11.13 a1 1 0 0 1 0 1.74 L8.5 18.5 a1 1 0 0 1 -1.5 -.87 V6.37 a1 1 0 0 1 1.5 -.87 z"
            fill="currentColor"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linejoin="round"
          />
        </svg>

        <Transition name="play-label" mode="out-in">
          <span
            :key="label"
            class="mt-3 text-base font-bold uppercase leading-none tracking-wider"
            :class="labelClasses"
          >
            {{ label }}
          </span>
        </Transition>
      </div>
    </button>

    <button
      type="button"
      class="signup-link absolute inset-x-3 bottom-3 z-10 inline-flex flex-col items-center gap-0.5 rounded-md px-2 py-1 text-center text-[10px] leading-tight transition"
      :class="
        interactive
          ? 'text-white/55 hover:bg-white/[0.04] hover:text-white/90'
          : 'text-white/35 hover:bg-white/[0.04] hover:text-white/60'
      "
      style="-webkit-app-region: no-drag"
      @click.stop="$emit('signup')"
    >
      <span>¿Eres nuevo en Los Santos?</span>
      <span class="font-medium text-amber-300/80 underline-offset-2 hover:underline">
        Regístrate aquí 🚀
      </span>
    </button>
  </div>
</template>

<style scoped>
.play-spinner {
  animation: play-spin 0.9s linear infinite;
  transform-origin: center;
}

@keyframes play-spin {
  to {
    transform: rotate(360deg);
  }
}

.play-halo {
  background: radial-gradient(
    circle,
    rgba(251, 146, 60, 0.18) 0%,
    rgba(251, 146, 60, 0.08) 40%,
    transparent 70%
  );
  animation: play-halo-breathe 3.6s ease-in-out infinite;
  filter: blur(2px);
}

@keyframes play-halo-breathe {
  0%,
  100% {
    transform: translate(-50%, -50%) scale(0.95);
    opacity: 0.7;
  }
  50% {
    transform: translate(-50%, -50%) scale(1.05);
    opacity: 1;
  }
}

.play-card:hover .play-halo {
  animation-duration: 1.8s;
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

.hint-enter-active,
.hint-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}
.hint-enter-from,
.hint-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
