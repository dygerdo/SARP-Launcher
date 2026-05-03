<script setup lang="ts">
import TitleBar from "@/components/brand/TitleBar.vue"
import GraffitiSpot from "@/components/home/GraffitiSpot.vue"

const version = "v1.0.0"
const buildId = "dev"
const currentYear = new Date().getFullYear()

defineSlots<{
  default(): unknown
  belowHeader?(): unknown
}>()

function openSite() {
  window.launcher.openExternal("https://sarp.es")
}
</script>

<template>
  <div
    class="relative h-screen w-screen overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-950 to-black"
  >
    <div
      class="pointer-events-none absolute inset-0 bg-[url('/background.png')] bg-cover bg-top opacity-[0.35] mix-blend-screen"
    />

    <div
      class="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/70"
    />

    <TitleBar />

    <slot v-if="$slots.belowHeader" name="belowHeader" />

    <main class="relative z-10 flex h-[calc(100%-64px)] flex-col items-center justify-center px-10">
      <slot />
    </main>

    <div class="absolute bottom-10 right-5 z-10">
      <GraffitiSpot />
    </div>

    <footer
      class="absolute inset-x-0 bottom-0 z-10 flex items-center justify-between px-5 py-2 text-[10px] uppercase tracking-widest text-white/30"
    >
      <div class="flex items-center gap-3">
        <span>Copyright © San Andreas Roleplay {{ currentYear }}</span>
        <span class="text-white/20">·</span>
        <button type="button" class="transition-colors hover:text-white/60" @click="openSite">
          sarp.es
        </button>
      </div>
      <span class="font-mono normal-case">{{ version }} ({{ buildId }})</span>
    </footer>
  </div>
</template>
