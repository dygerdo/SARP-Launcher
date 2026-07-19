<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from "vue"
import { useRoute, useRouter } from "vue-router"
import { useWindowState } from "@/composables/useWindowState"

const route = useRoute()
const router = useRouter()
const { isFullscreen, toggleFullscreen } = useWindowState()

const url = computed(() => (route.query.url as string) || "")
const pageTitle = computed(() => (route.query.title as string) || "Navegador")
const isLoading = ref(true)
const loadError = ref(false)
const webviewRef = ref<Electron.WebviewTag | null>(null)

function goBack() {
  router.push("/")
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === "Escape") goBack()
}

onMounted(async () => {
  window.addEventListener("keydown", handleKeydown)
  await nextTick()
  const wv = webviewRef.value
  if (!wv) return
  wv.addEventListener("did-finish-load", onWebviewLoad)
  wv.addEventListener("did-fail-load", onWebviewFailLoad)
})

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeydown)
  const wv = webviewRef.value
  if (wv) {
    wv.removeEventListener("did-finish-load", onWebviewLoad)
    wv.removeEventListener("did-fail-load", onWebviewFailLoad)
  }
})

function onWebviewLoad() {
  isLoading.value = false
}

function onWebviewFailLoad(e: Electron.DidFailLoadEvent) {
  if (e.errorCode === -3) return
  isLoading.value = false
  loadError.value = true
}

function openInBrowser() {
  window.launcher.openExternal(url.value)
}
</script>

<template>
  <div class="flex h-screen w-screen flex-col overflow-hidden bg-zinc-950">
    <!-- Top Bar -->
    <div
      class="flex shrink-0 items-center gap-3 border-b border-white/5 bg-black/40 px-4 py-2.5"
      style="-webkit-app-region: drag"
    >
      <button
        type="button"
        class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/5 text-white/50 transition hover:bg-white/10 hover:text-white"
        style="-webkit-app-region: no-drag"
        title="Volver al launcher"
        @click="goBack"
      >
        <i class="pi pi-arrow-left text-xs" />
      </button>

      <div class="flex min-w-0 flex-1 items-center gap-2" style="-webkit-app-region: no-drag">
        <i class="pi pi-link shrink-0 text-[10px] text-white/30" />
        <span class="truncate text-[11px] font-medium text-white/60">{{ pageTitle }}</span>
        <span class="shrink-0 text-[10px] text-white/20">·</span>
        <span class="truncate text-[10px] text-white/30">{{ url }}</span>
      </div>

      <div class="flex shrink-0 items-center gap-1.5" style="-webkit-app-region: no-drag">
        <button
          type="button"
          class="flex h-7 items-center gap-1.5 rounded-lg bg-white/5 px-2.5 text-[10px] font-medium text-white/50 transition hover:bg-white/10 hover:text-white"
          title="Abrir en navegador externo"
          @click="openInBrowser"
        >
          <i class="pi pi-external-link text-[9px]" />
          <span>Navegador</span>
        </button>

        <button
          v-if="isFullscreen"
          type="button"
          class="flex h-7 items-center gap-1.5 rounded-lg bg-white/5 px-2.5 text-[10px] font-medium text-white/50 transition hover:bg-white/10 hover:text-white"
          title="Salir de pantalla completa"
          @click="toggleFullscreen"
        >
          <i class="pi pi-window-minimize text-[9px]" />
        </button>
      </div>
    </div>

    <!-- Content -->
    <div class="relative min-h-0 flex-1 bg-zinc-950">
      <!-- Loading -->
      <Transition name="fade">
        <div
          v-if="isLoading"
          class="absolute inset-0 z-10 flex items-center justify-center bg-zinc-950"
        >
          <div class="flex flex-col items-center gap-3">
            <i class="pi pi-spinner animate-spin text-2xl text-orange-500" />
            <span class="text-xs text-white/40">Cargando...</span>
          </div>
        </div>
      </Transition>

      <!-- Error -->
      <div
        v-if="loadError"
        class="absolute inset-0 z-10 flex items-center justify-center bg-zinc-950"
      >
        <div class="flex flex-col items-center gap-4 text-center">
          <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5">
            <i class="pi pi-exclamation-triangle text-2xl text-white/30" />
          </div>
          <div class="flex flex-col gap-1">
            <p class="text-sm font-medium text-white/70">No se pudo cargar la página</p>
            <p class="text-xs text-white/40">Intenta abrirla en el navegador externo</p>
          </div>
          <div class="flex gap-2">
            <button
              type="button"
              class="flex items-center gap-1.5 rounded-lg bg-white/5 px-3.5 py-2 text-xs font-medium text-white/60 transition hover:bg-white/10 hover:text-white"
              @click="openInBrowser"
            >
              <i class="pi pi-external-link text-[10px]" />
              Abrir en navegador
            </button>
            <button
              type="button"
              class="flex items-center gap-1.5 rounded-lg bg-white/5 px-3.5 py-2 text-xs font-medium text-white/60 transition hover:bg-white/10 hover:text-white"
              @click="goBack"
            >
              <i class="pi pi-arrow-left text-[10px]" />
              Volver
            </button>
          </div>
        </div>
      </div>

      <!-- Webview -->
      <webview
        v-if="url && !loadError"
        ref="webviewRef"
        :src="url"
        style="position: absolute; inset: 0; width: 100%; height: 100%; border: none"
        allowpopups
      />
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
