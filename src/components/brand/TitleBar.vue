<script setup lang="ts">
function onMinimize() {
  window.launcher.minimize()
}

function onClose() {
  window.launcher.close()
}
</script>

<template>
  <header
    class="relative z-20 flex h-8 items-center justify-between border-b border-white/5 bg-zinc-950/80 pl-3 text-white/80"
    style="-webkit-app-region: drag"
  >
    <div class="flex items-center gap-2">
      <img src="/logo-squared.png" alt="SARP" class="h-4 w-4 select-none" draggable="false" />
      <span class="text-[11px] font-medium tracking-wider text-white/70">
        San Andreas Roleplay · Launcher
      </span>
    </div>

    <div class="flex h-full" style="-webkit-app-region: no-drag">
      <button
        type="button"
        aria-label="Minimizar"
        class="flex h-full w-11 items-center justify-center text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        @click="onMinimize"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
          <rect x="0" y="4.5" width="10" height="1" fill="currentColor" />
        </svg>
      </button>
      <button
        type="button"
        aria-label="Cerrar"
        class="flex h-full w-11 items-center justify-center text-white/70 transition-colors hover:bg-red-600 hover:text-white"
        @click="onClose"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
          <path
            d="M1 1 L9 9 M9 1 L1 9"
            stroke="currentColor"
            stroke-width="1"
            stroke-linecap="square"
            fill="none"
          />
        </svg>
      </button>
    </div>
  </header>
</template>
