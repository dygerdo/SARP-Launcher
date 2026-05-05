<script setup lang="ts">
import { onMounted, ref } from "vue"
import TitleBar from "@/components/brand/TitleBar.vue"
import UpdaterBanner from "@/components/brand/UpdaterBanner.vue"
import GraffitiSpot from "@/components/home/GraffitiSpot.vue"

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

    <TitleBar />
    <UpdaterBanner />

    <slot v-if="$slots.belowHeader" name="belowHeader" />

    <main class="relative z-10 flex flex-1 flex-col items-center justify-center px-10">
      <Transition name="shell-fade" mode="out-in">
        <div
          v-if="loading && $slots.skeleton"
          key="skeleton"
          class="flex w-full flex-col items-center justify-center"
        >
          <slot name="skeleton" />
        </div>
        <div v-else key="content" class="flex w-full flex-col items-center justify-center">
          <slot />
        </div>
      </Transition>
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
      <span class="font-mono normal-case">v{{ version }} ({{ buildId }})</span>
    </footer>
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
