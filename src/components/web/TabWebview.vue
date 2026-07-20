<script setup lang="ts">
import { onUnmounted } from "vue"
import { useWebTabsStore, type WebTab } from "@/stores/webTabs"

const props = defineProps<{ tab: WebTab }>()

const webTabs = useWebTabsStore()

interface WebviewEl {
  src: string
  addEventListener: (event: string, handler: (...args: unknown[]) => void) => void
  removeEventListener: (event: string, handler: (...args: unknown[]) => void) => void
}

type Handler = (...args: unknown[]) => void

let webviewEl: WebviewEl | null = null
let handlers: Record<string, Handler> | null = null

function onLoad() {
  webTabs.updateTab(props.tab.id, { isLoading: false, hasError: false })
}

function onFailLoad(e: unknown) {
  const evt = e as { errorCode: number }
  if (evt.errorCode === -3 || evt.errorCode === -2) return
  webTabs.updateTab(props.tab.id, { isLoading: false, hasError: true })
}

function onNav(e: unknown) {
  const evt = e as { url: string }
  webTabs.updateTab(props.tab.id, { url: evt.url })
}

function onNavInPage(e: unknown) {
  const evt = e as { url: string; isMainFrame: boolean }
  if (evt.isMainFrame) webTabs.updateTab(props.tab.id, { url: evt.url })
}

function onTitleUpdate(e: unknown) {
  const evt = e as { title: string }
  if (evt.title) webTabs.updateTab(props.tab.id, { title: evt.title })
}

function onNewWindow(e: unknown) {
  const evt = e as { url: string; preventDefault: () => void }
  evt.preventDefault()
  const url = evt.url
  if (!url || url === "about:blank") return
  webTabs.openTab(url)
}

function attachListeners(wv: WebviewEl) {
  const hOnLoad = () => onLoad()
  const hOnFail = (e: unknown) => onFailLoad(e)
  const hOnNav = (e: unknown) => onNav(e)
  const hOnNavInPage = (e: unknown) => onNavInPage(e)
  const hOnTitle = (e: unknown) => onTitleUpdate(e)
  const hOnNewWin = (e: unknown) => onNewWindow(e)

  wv.addEventListener("did-finish-load", hOnLoad)
  wv.addEventListener("did-fail-load", hOnFail)
  wv.addEventListener("did-navigate", hOnNav)
  wv.addEventListener("did-navigate-in-page", hOnNavInPage)
  wv.addEventListener("page-title-updated", hOnTitle)
  wv.addEventListener("new-window", hOnNewWin)

  handlers = {
    onLoad: hOnLoad,
    onFail: hOnFail,
    onNav: hOnNav,
    onNavInPage: hOnNavInPage,
    onTitle: hOnTitle,
    onNewWin: hOnNewWin,
  }
}

function detachListeners(wv: WebviewEl) {
  if (!handlers) return
  wv.removeEventListener("did-finish-load", handlers.onLoad)
  wv.removeEventListener("did-fail-load", handlers.onFail)
  wv.removeEventListener("did-navigate", handlers.onNav)
  wv.removeEventListener("did-navigate-in-page", handlers.onNavInPage)
  wv.removeEventListener("page-title-updated", handlers.onTitle)
  wv.removeEventListener("new-window", handlers.onNewWin)
  handlers = null
}

function onRef(el: WebviewEl | Element | null) {
  if (el && "src" in el) {
    const wv = el as WebviewEl
    webviewEl = wv
    if (!(wv as any).__bound) {
      attachListeners(wv)
      ;(wv as any).__bound = true
    }
  }
}

function openInExternalBrowser() {
  window.launcher.openExternal(props.tab.url)
}

onUnmounted(() => {
  if (webviewEl) detachListeners(webviewEl)
})
</script>

<template>
  <div class="relative h-full w-full">
    <!-- Loading overlay -->
    <div
      v-if="tab.isLoading"
      class="absolute inset-0 z-10 flex items-center justify-center bg-zinc-950"
    >
      <div class="flex flex-col items-center gap-3">
        <i class="pi pi-spinner animate-spin text-2xl text-orange-500" />
        <span class="text-xs text-white/40">{{ tab.title }}</span>
      </div>
    </div>

    <!-- Error overlay -->
    <div
      v-if="tab.hasError"
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
            @click="openInExternalBrowser"
          >
            <i class="pi pi-external-link text-[10px]" />
            Abrir en navegador
          </button>
          <button
            type="button"
            class="flex items-center gap-1.5 rounded-lg bg-white/5 px-3.5 py-2 text-xs font-medium text-white/60 transition hover:bg-white/10 hover:text-white"
            @click="webTabs.closeTab(tab.id)"
          >
            <i class="pi pi-times text-[10px]" />
            Cerrar pestaña
          </button>
        </div>
      </div>
    </div>

    <!-- Webview -->
    <webview
      v-show="!tab.isLoading && !tab.hasError"
      :ref="onRef"
      :src="tab.url"
      useragent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36"
      style="position: absolute; inset: 0; width: 100%; height: 100%; border: none"
      allowpopups
    />
  </div>
</template>
