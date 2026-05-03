<script setup lang="ts">
import { onMounted, ref } from "vue"
import LogoMark from "@/components/loading/LogoMark.vue"
import ProgressBar from "@/components/loading/ProgressBar.vue"
import { useProgressBar } from "@/composables/useProgressBar"

const { progress, start } = useProgressBar({ duration: 12000, cap: 99 })

const status = ref("Inicializando launcher...")
const version = "v1.0.0"
const currentYear = new Date().getFullYear()

onMounted(() => {
  start()
})
</script>

<template>
  <div
    class="relative h-screen w-screen overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-950 to-black"
  >
    <div
      class="pointer-events-none absolute inset-0 bg-[url('/background.png')] bg-cover bg-top opacity-[0.18] mix-blend-screen"
    />

    <div
      class="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/70"
    />

    <header
      class="relative z-10 flex items-center justify-between px-5 py-3 text-[11px] tracking-widest text-white/50"
      style="-webkit-app-region: drag"
    >
      <span class="font-medium normal-case">{{ version }}</span>
      <span class="font-medium uppercase">Launcher</span>
    </header>

    <main
      class="relative z-10 flex h-[calc(100%-110px)] flex-col items-center justify-center px-10"
    >
      <LogoMark />

      <div class="mt-16 w-full max-w-md">
        <ProgressBar :value="progress" />

        <div class="mt-3 flex items-center justify-between text-xs text-white/70">
          <span class="truncate">{{ status }}</span>
          <span class="font-mono tabular-nums text-white/50">{{ Math.floor(progress) }}%</span>
        </div>
      </div>
    </main>

    <footer
      class="relative z-10 flex items-center justify-between px-5 py-3 text-[10px] uppercase tracking-widest text-white/30"
    >
      <span>© 2023 - {{ currentYear }} San Andreas Roleplay</span>
      <span class="font-mono">build dev</span>
    </footer>
  </div>
</template>
