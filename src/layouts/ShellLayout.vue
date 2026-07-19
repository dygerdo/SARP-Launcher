<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue"
import TitleBar from "@/components/brand/TitleBar.vue"
import UpdaterBanner from "@/components/brand/UpdaterBanner.vue"
import GraffitiSpot from "@/components/home/GraffitiSpot.vue"
import WebTabBar from "@/components/web/WebTabBar.vue"
import TabWebview from "@/components/web/TabWebview.vue"
import { useWindowState } from "@/composables/useWindowState"
import { useWebTabsStore } from "@/stores/webTabs"
import { useToast } from "primevue/usetoast"

withDefaults(
  defineProps<{
    loading?: boolean
  }>(),
  {
    loading: false,
  },
)

const version = ref<string>("")
const buildId = __GIT_COMMIT__
const currentYear = new Date().getFullYear()

const { isFullscreen, toggleFullscreen } = useWindowState()
const toast = useToast()
const webTabs = useWebTabsStore()

let cleanupSecurity: (() => void) | null = null
let cleanupWebviewNav: (() => void) | null = null
let cleanupKeydown: (() => void) | null = null

const chooserOpen = ref(false)
const chooserUrl = ref("")
const chooserTitle = ref("")

onMounted(async () => {
  version.value = await window.launcher.getAppVersion()

  cleanupSecurity = window.launcher.mods.onSecurityAlert((bannedProc) => {
    toast.add({
      severity: "error",
      summary: "Amenaza Detectada",
      detail: `Big Smoke dice: "¡Eh! Quita ese '${bannedProc}' antes de entrar." El juego se ha cerrado por seguridad.`,
      life: 8000,
    })
  })

  cleanupWebviewNav = window.launcher.onWebviewNavigate((url) => {
    webTabs.openTab(url)
  })

  const handleKeydown = (e: KeyboardEvent) => {
    if (!webTabs.hasOpenTabs) return
    if (e.key === "Escape") {
      e.preventDefault()
      webTabs.closeTab(webTabs.activeTabId!)
    }
    if (e.ctrlKey && e.key === "w") {
      e.preventDefault()
      webTabs.closeTab(webTabs.activeTabId!)
    }
  }
  window.addEventListener("keydown", handleKeydown)
  cleanupKeydown = () => window.removeEventListener("keydown", handleKeydown)
})

onUnmounted(() => {
  if (cleanupSecurity) cleanupSecurity()
  if (cleanupWebviewNav) cleanupWebviewNav()
  if (cleanupKeydown) cleanupKeydown()
})

defineSlots<{
  default(): unknown
  belowHeader?(): unknown
  skeleton?(): unknown
}>()

function openChooser(url: string, title: string) {
  chooserUrl.value = url
  chooserTitle.value = title
  chooserOpen.value = true
}

function openInBrowser() {
  chooserOpen.value = false
  window.launcher.openExternal(chooserUrl.value)
}

function openInLauncher() {
  const url = chooserUrl.value
  const title = chooserTitle.value
  chooserOpen.value = false
  webTabs.openTab(url, title)
}

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

    <!-- Tab bar when web tabs are open, normal nav otherwise -->
    <WebTabBar v-if="webTabs.hasOpenTabs" />
    <nav
      v-else
      class="relative z-10 flex items-center justify-center gap-10 border-b border-white/5 bg-black/20 py-3.5"
      style="-webkit-app-region: no-drag"
    >
      <router-link
        to="/"
        class="text-[11px] uppercase tracking-[0.25em] transition-all hover:text-white"
        active-class="text-orange-400 font-bold"
        :class="$route.name === 'home' ? 'text-orange-400' : 'text-white/40'"
      >
        Inicio
      </router-link>
      <router-link
        to="/mods"
        class="text-[11px] uppercase tracking-[0.25em] transition-all hover:text-white"
        active-class="text-orange-400 font-bold"
        :class="$route.name === 'mods' ? 'text-orange-400' : 'text-white/40'"
      >
        Mods
      </router-link>

      <div class="absolute right-6 flex items-center gap-3">
        <button
          type="button"
          class="flex items-center gap-1.5 rounded border border-white/10 bg-white/5 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-white/50 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
          @click="openChooser('https://ucp.sarp.es/app/ucp/home', 'UCP')"
        >
          <i class="pi pi-link text-[8px]" />
          UCP
        </button>
        <button
          type="button"
          class="flex items-center gap-1.5 rounded border border-white/10 bg-white/5 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-white/50 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
          @click="openChooser('https://forum.sarp.es/', 'Foro')"
        >
          <i class="pi pi-link text-[8px]" />
          Foro
        </button>
      </div>
    </nav>

    <slot v-if="$slots.belowHeader && !webTabs.hasOpenTabs" name="belowHeader" />

    <!-- Web tabs content: render active tab's webview -->
    <main v-if="webTabs.hasOpenTabs" class="relative z-10 min-h-0 flex-1 overflow-hidden">
      <TabWebview
        v-for="tab in webTabs.tabs"
        v-show="tab.id === webTabs.activeTabId"
        :key="tab.id"
        :tab="tab"
        class="h-full w-full"
      />
    </main>

    <!-- Normal launcher content -->
    <main
      v-else
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
        v-if="!isFullscreen && !webTabs.hasOpenTabs"
        class="absolute bottom-full right-5 hidden md:block"
      >
        <GraffitiSpot />
      </div>

      <footer
        v-if="!loading"
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

    <!-- Open chooser dialog -->
    <Teleport to="body">
      <Transition name="chooser-fade">
        <div
          v-if="chooserOpen"
          class="fixed inset-0 z-[99999] flex items-center justify-center"
          style="-webkit-app-region: no-drag"
        >
          <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="chooserOpen = false" />
          <div
            class="relative z-10 flex w-72 flex-col overflow-hidden rounded-xl border border-white/10 bg-zinc-900/95 shadow-2xl backdrop-blur-xl"
          >
            <div class="flex items-center justify-between px-4 pt-4 pb-2">
              <h3 class="text-xs font-bold uppercase tracking-wider text-white/70">
                {{ chooserTitle }}
              </h3>
              <button
                type="button"
                class="flex h-6 w-6 items-center justify-center rounded-md text-white/30 transition hover:bg-white/10 hover:text-white/60"
                @click="chooserOpen = false"
              >
                <i class="pi pi-times text-[10px]" />
              </button>
            </div>
            <div class="flex flex-col gap-1.5 px-3 pb-3">
              <button
                type="button"
                class="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[11px] text-white/60 transition hover:bg-white/5 hover:text-white"
                @click="openInBrowser"
              >
                <i class="pi pi-external-link text-[10px] text-white/40" />
                <span>Abrir en el navegador</span>
              </button>
              <button
                type="button"
                class="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[11px] text-white/60 transition hover:bg-white/5 hover:text-white"
                @click="openInLauncher"
              >
                <i class="pi pi-window-maximize text-[10px] text-white/40" />
                <span>Abrir en el launcher</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
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

<style>
.chooser-fade-enter-active {
  transition: opacity 0.15s ease;
}
.chooser-fade-leave-active {
  transition: opacity 0.1s ease;
}
.chooser-fade-enter-from,
.chooser-fade-leave-to {
  opacity: 0;
}
</style>
