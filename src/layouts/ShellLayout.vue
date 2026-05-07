<script setup lang="ts">
import { onMounted, ref } from "vue"
import TitleBar from "@/components/brand/TitleBar.vue"
import UpdaterBanner from "@/components/brand/UpdaterBanner.vue"
import GraffitiSpot from "@/components/home/GraffitiSpot.vue"
import { useWindowState } from "@/composables/useWindowState"

withDefaults(
  defineProps<{
    loading?: boolean
  }>(),
  {
    loading: false,
  },
)

// Version is read from app.getVersion() so package.json is the single source
// of truth — no hardcoded "v1.0.0" to forget on each release bump.
const version = ref<string>("")
const buildId = "dev"
const currentYear = new Date().getFullYear()

const { isFullscreen, toggleFullscreen } = useWindowState()

onMounted(async () => {
  version.value = await window.launcher.getAppVersion()
})

defineSlots<{
  default(): unknown
  belowHeader?(): unknown
  skeleton?(): unknown
}>()

function openSite() {
  window.launcher.openExternal("https://sarp.es")
}
</script>

<template>
  <div
    class="relative flex h-screen w-screen flex-col overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-950 to-black"
  >
    <div
      class="pointer-events-none absolute inset-0 bg-[url('/background.png')] bg-cover bg-top opacity-[0.35] mix-blend-screen"
    />

    <div
      class="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/70"
    />

    <TitleBar v-if="!isFullscreen" />
    <UpdaterBanner />

    <slot v-if="$slots.belowHeader" name="belowHeader" />

    <main
      class="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden px-6 py-6 md:px-10 md:py-8"
    >
      <Transition name="shell-fade" mode="out-in">
        <div
          v-if="loading && $slots.skeleton"
          key="skeleton"
          class="m-auto flex w-full max-w-2xl flex-col items-center"
        >
          <slot name="skeleton" />
        </div>
        <div v-else key="content" class="m-auto flex w-full max-w-2xl flex-col items-center">
          <slot />
        </div>
      </Transition>
    </main>

    <div class="relative z-10 flex-shrink-0">
      <div
        v-if="!isFullscreen"
        class="absolute bottom-full right-5 hidden md:block"
      >
        <GraffitiSpot />
      </div>

      <footer
        class="flex items-center justify-between gap-4 px-5 py-2 text-[10px] uppercase tracking-widest text-white/30"
      >
        <div class="flex min-w-0 items-center gap-3">
          <span class="truncate">Copyright © San Andreas Roleplay {{ currentYear }}</span>
          <span class="text-white/20">·</span>
          <button
            type="button"
            class="transition-colors hover:text-white/60"
            style="-webkit-app-region: no-drag"
            @click="openSite"
          >
            sarp.es
          </button>
        </div>
        <span class="font-mono normal-case">v{{ version }} ({{ buildId }})</span>
      </footer>
    </div>

    <button
      v-if="isFullscreen"
      type="button"
      class="fixed right-3 top-3 z-50 flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1.5 text-[10px] font-medium uppercase tracking-widest text-white/80 backdrop-blur-sm transition hover:bg-black/90 hover:text-white"
      style="-webkit-app-region: no-drag"
      title="Salir de pantalla completa"
      @click="toggleFullscreen"
    >
      <i class="pi pi-window-minimize text-[10px]" />
      <span>Salir de pantalla completa</span>
    </button>
  </div>
</template>

<style scoped>
.shell-fade-enter-active,
.shell-fade-leave-active {
  transition:
    opacity 0.25s ease,
    filter 0.25s ease;
}
.shell-fade-enter-from {
  opacity: 0;
  filter: blur(4px);
}
.shell-fade-leave-to {
  opacity: 0;
  filter: blur(2px);
}
</style>
