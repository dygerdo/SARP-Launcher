<script setup lang="ts">
const version = "v1.0.0"
const buildId = "dev"
const currentYear = new Date().getFullYear()

defineSlots<{
  default(): unknown
  belowHeader?(): unknown
}>()
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

    <header
      class="relative z-10 flex items-center justify-between px-5 py-3 text-[11px] tracking-widest text-white/50"
      style="-webkit-app-region: drag"
    >
      <span class="font-medium normal-case">{{ version }}</span>
      <span class="font-medium uppercase">Launcher</span>
    </header>

    <slot v-if="$slots.belowHeader" name="belowHeader" />

    <main
      class="relative z-10 flex h-[calc(100%-110px)] flex-col items-center justify-center px-10"
    >
      <slot />
    </main>

    <footer
      class="relative z-10 flex items-center justify-between px-5 py-3 text-[10px] uppercase tracking-widest text-white/30"
    >
      <span>© 2023 - {{ currentYear }} San Andreas Roleplay</span>
      <span class="font-mono">build {{ buildId }}</span>
    </footer>
  </div>
</template>
