<script setup lang="ts">
import { useUpdater } from "@/composables/useUpdater"

const { phase, version, percent, applyUpdate } = useUpdater()
</script>

<template>
  <Transition name="updater-banner">
    <div
      v-if="phase !== 'idle'"
      class="relative z-20 flex items-center justify-between gap-4 border-b border-white/5 bg-zinc-900/90 px-4 py-1.5 text-[11px] tracking-wide text-white/80"
    >
      <div v-if="phase === 'downloading'" class="flex items-center gap-3 text-white/70">
        <span class="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
        <span>
          Descargando actualización
          <span v-if="version" class="text-white/50">v{{ version }}</span>
          <span v-if="percent > 0" class="ml-1 font-mono text-white/40">{{ percent }}%</span>
        </span>
      </div>

      <div v-else-if="phase === 'ready'" class="flex items-center gap-3">
        <span class="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
        <span class="text-white/80">
          Versión <span v-if="version">v{{ version }}</span> lista para instalar.
        </span>
      </div>

      <button
        v-if="phase === 'ready'"
        type="button"
        class="rounded bg-emerald-500/90 px-3 py-1 text-[10px] font-medium uppercase tracking-widest text-white shadow transition-colors hover:bg-emerald-400"
        @click="applyUpdate"
      >
        Reiniciar para aplicar
      </button>
    </div>
  </Transition>
</template>

<style scoped>
.updater-banner-enter-active,
.updater-banner-leave-active {
  transition:
    opacity 0.25s ease,
    max-height 0.25s ease;
}
.updater-banner-enter-from,
.updater-banner-leave-to {
  opacity: 0;
  max-height: 0;
}
.updater-banner-enter-to,
.updater-banner-leave-from {
  opacity: 1;
  max-height: 40px;
}
</style>
