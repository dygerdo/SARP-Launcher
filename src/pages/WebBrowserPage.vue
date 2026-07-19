<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from "vue"
import { useRoute, useRouter } from "vue-router"
import { useWindowState } from "@/composables/useWindowState"

const route = useRoute()
const router = useRouter()
const { isFullscreen, toggleFullscreen } = useWindowState()

interface BrowserTab {
  id: string
  url: string
  title: string
  isLoading: boolean
  hasError: boolean
}

// Minimal webview interface for event listener management
interface WebviewEl {
  src: string
  style: CSSStyleDeclaration
  addEventListener: (event: string, handler: (...args: _Arg[]) => void) => void
  removeEventListener: (event: string, handler: (...args: _Arg[]) => void) => void
}

type _Arg = any  
type Handler = (...args: _Arg[]) => void

let tabCounter = 0

function createTab(url: string, title?: string): BrowserTab {
  tabCounter++
  return {
    id: `tab-${tabCounter}-${Date.now()}`,
    url,
    title: title || extractDomain(url),
    isLoading: true,
    hasError: false,
  }
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

const initialUrl = computed(() => (route.query.url as string) || "")
const initialTitle = computed(() => (route.query.title as string) || "")

const tabs = reactive<BrowserTab[]>([])
const activeTabId = ref("")
const webviewEls = ref<Record<string, WebviewEl>>({})

function getActiveTab(): BrowserTab | undefined {
  return tabs.find((t) => t.id === activeTabId.value)
}

function setActiveTab(id: string) {
  activeTabId.value = id
}

function closeTab(id: string) {
  const idx = tabs.findIndex((t) => t.id === id)
  if (idx === -1) return

  // Detach listeners before Vue removes the element from DOM
  const wv = webviewEls.value[id]
  if (wv) {
    detachWebviewListeners(wv)
    delete webviewEls.value[id]
  }

  tabs.splice(idx, 1)

  if (tabs.length === 0) {
    router.push("/")
    return
  }

  if (activeTabId.value === id) {
    const newIdx = Math.min(idx, tabs.length - 1)
    activeTabId.value = tabs[newIdx].id
  }
}

function goBack() {
  if (tabs.length <= 1) {
    router.push("/")
    return
  }
  closeTab(activeTabId.value)
}

function openInBrowser() {
  const tab = getActiveTab()
  if (tab) window.launcher.openExternal(tab.url)
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === "Escape") goBack()
  if (e.ctrlKey && e.key === "w") {
    e.preventDefault()
    closeTab(activeTabId.value)
  }
}

// -- Webview ref callback --

function onWebviewRef(id: string, el: WebviewEl | Element | null) {
  if (el && "src" in el) {
    const wv = el as WebviewEl
    webviewEls.value[id] = wv
    const tab = tabs.find((t) => t.id === id)
    if (tab && !(wv as any).__tabHandlers) {
      attachWebviewListeners(tab, wv)
    }
  }
}

// -- New-tab interception (target="_blank") --

function onNewWindow(e: unknown) {
  const evt = e as { url: string; preventDefault: () => void }
  evt.preventDefault()
  const url = evt.url
  if (!url || url === "about:blank") return

  const newTab = createTab(url)
  tabs.push(newTab)
  activeTabId.value = newTab.id
}

// -- Webview event handlers --

function onTabLoad(tab: BrowserTab) {
  tab.isLoading = false
  tab.hasError = false
}

function onTabFailLoad(tab: BrowserTab, e: { errorCode: number }) {
  // -3 = ERR_ABORTED (navigation cancelled), -2 = ERR_FAILED (about:blank, etc.)
  if (e.errorCode === -3 || e.errorCode === -2) return
  tab.isLoading = false
  tab.hasError = true
}

function onTabNavigate(tab: BrowserTab, e: { url: string }) {
  tab.url = e.url
}

function onTabTitleUpdate(tab: BrowserTab, e: { title: string }) {
  if (e.title) tab.title = e.title
}

function attachWebviewListeners(tab: BrowserTab, wv: WebviewEl) {
  const onLoad = () => onTabLoad(tab)
  const onFail = (e: _Arg) => onTabFailLoad(tab, e)
  const onNav = (e: _Arg) => onTabNavigate(tab, e)
  const onNavInPage = (e: _Arg) => {
    if (e.isMainFrame) onTabNavigate(tab, e)
  }
  const onTitle = (e: _Arg) => onTabTitleUpdate(tab, e)
  const onNewWin = (e: _Arg) => onNewWindow(e)

  wv.addEventListener("did-finish-load", onLoad)
  wv.addEventListener("did-fail-load", onFail)
  wv.addEventListener("did-navigate", onNav)
  wv.addEventListener("did-navigate-in-page", onNavInPage)
  wv.addEventListener("page-title-updated", onTitle)
  wv.addEventListener("new-window", onNewWin)

  // Store for cleanup
  ;(wv as any).__tabHandlers = { onLoad, onFail, onNav, onNavInPage, onTitle, onNewWin }
}

function detachWebviewListeners(wv: WebviewEl) {
  const h = (wv as any).__tabHandlers as Record<string, Handler> | undefined
  if (!h) return
  wv.removeEventListener("did-finish-load", h.onLoad)
  wv.removeEventListener("did-fail-load", h.onFail)
  wv.removeEventListener("did-navigate", h.onNav)
  wv.removeEventListener("did-navigate-in-page", h.onNavInPage)
  wv.removeEventListener("page-title-updated", h.onTitle)
  wv.removeEventListener("new-window", h.onNewWin)
  delete (wv as any).__tabHandlers
}

// -- Lifecycle --

onMounted(() => {
  window.addEventListener("keydown", handleKeydown)

  if (initialUrl.value) {
    const firstTab = createTab(initialUrl.value, initialTitle.value)
    tabs.push(firstTab)
    activeTabId.value = firstTab.id
  }
})

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeydown)
  // Detach listeners from all remaining webviews — Vue will destroy the DOM elements
  for (const tab of tabs) {
    const wv = webviewEls.value[tab.id]
    if (wv) detachWebviewListeners(wv)
  }
})
</script>

<template>
  <div class="flex h-screen w-screen flex-col overflow-hidden bg-zinc-950">
    <!-- Top bar -->
    <div
      class="flex shrink-0 flex-col border-b border-white/5 bg-black/40"
      style="-webkit-app-region: drag"
    >
      <div class="flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          class="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/5 text-white/50 transition hover:bg-white/10 hover:text-white"
          style="-webkit-app-region: no-drag"
          title="Volver al launcher"
          @click="goBack"
        >
          <i class="pi pi-arrow-left text-[10px]" />
        </button>

        <div class="flex-1" />

        <div class="flex shrink-0 items-center gap-1.5" style="-webkit-app-region: no-drag">
          <button
            type="button"
            class="flex h-6 items-center gap-1.5 rounded-md bg-white/5 px-2.5 text-[10px] font-medium text-white/50 transition hover:bg-white/10 hover:text-white"
            title="Abrir en navegador externo"
            @click="openInBrowser"
          >
            <i class="pi pi-external-link text-[9px]" />
            <span>Navegador</span>
          </button>

          <button
            v-if="isFullscreen"
            type="button"
            class="flex h-6 items-center gap-1.5 rounded-md bg-white/5 px-2.5 text-[10px] font-medium text-white/50 transition hover:bg-white/10 hover:text-white"
            title="Salir de pantalla completa"
            @click="toggleFullscreen"
          >
            <i class="pi pi-window-minimize text-[9px]" />
          </button>
        </div>
      </div>

      <!-- Tabs row -->
      <div
        v-if="tabs.length > 1"
        class="flex items-center gap-1 overflow-x-auto px-3 pb-1.5 custom-scroll"
        style="-webkit-app-region: no-drag"
      >
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          class="group flex shrink-0 items-center gap-2 rounded-t-md px-3 py-1.5 text-[10px] transition-colors"
          :class="
            activeTabId === tab.id
              ? 'bg-white/[0.07] text-white/80'
              : 'text-white/35 hover:bg-white/[0.04] hover:text-white/55'
          "
          @click="setActiveTab(tab.id)"
        >
          <i v-if="tab.isLoading" class="pi pi-spinner animate-spin text-[8px]" />
          <i v-else-if="tab.hasError" class="pi pi-exclamation-triangle text-[8px] text-rose-400" />
          <i v-else class="pi pi-globe text-[8px] text-white/25" />
          <span class="max-w-[140px] truncate">{{ tab.title }}</span>
          <span
            class="ml-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded text-white/20 opacity-0 transition-all hover:bg-white/10 hover:text-white/60 group-hover:opacity-100"
            title="Cerrar pestaña"
            @click.stop="closeTab(tab.id)"
          >
            <i class="pi pi-times text-[7px]" />
          </span>
        </button>
      </div>
    </div>

    <!-- Webview Content -->
    <div class="relative flex-1 min-h-0">
      <template v-for="tab in tabs" :key="tab.id">
        <!-- Loading overlay -->
        <div
          v-if="tab.id === activeTabId && tab.isLoading"
          class="absolute inset-0 z-10 flex items-center justify-center bg-zinc-950"
        >
          <div class="flex flex-col items-center gap-3">
            <i class="pi pi-spinner animate-spin text-2xl text-orange-500" />
            <span class="text-xs text-white/40">{{ tab.title }}</span>
          </div>
        </div>

        <!-- Error overlay -->
        <div
          v-if="tab.id === activeTabId && tab.hasError"
          class="absolute inset-0 z-10 flex items-center justify-center bg-zinc-950"
        >
          <div class="flex flex-col items-center gap-4 text-center">
            <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5">
              <i class="pi pi-exclamation-triangle text-2xl text-white/30" />
            </div>
            <div class="flex flex-col gap-1">
              <p class="text-sm font-medium text-white/70">No se pudo cargar la página</p>
              <p class="text-xs text-white/40">{{ tab.url }}</p>
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
                @click="closeTab(tab.id)"
              >
                <i class="pi pi-times text-[10px]" />
                Cerrar pestaña
              </button>
            </div>
          </div>
        </div>

        <!-- Webview -->
        <webview
          v-show="tab.id === activeTabId"
          :ref="(el: any) => onWebviewRef(tab.id, el)"
          :src="tab.url"
          style="position: absolute; inset: 0; width: 100%; height: 100%; border: none"
          allowpopups
        />
      </template>
    </div>
  </div>
</template>

<style scoped>
.custom-scroll::-webkit-scrollbar {
  height: 2px;
}
.custom-scroll::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scroll::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.08);
  border-radius: 999px;
}
.custom-scroll::-webkit-scrollbar-thumb:hover {
  background-color: rgba(255, 255, 255, 0.15);
}
</style>
