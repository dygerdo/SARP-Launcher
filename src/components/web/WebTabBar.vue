<script setup lang="ts">
import { useWebTabsStore } from "@/stores/webTabs"

const webTabs = useWebTabsStore()

function openInExternalBrowser() {
  if (webTabs.activeTab) window.launcher.openExternal(webTabs.activeTab.url)
}

function closeAll() {
  webTabs.tabs.splice(0)
}
</script>

<template>
  <div
    class="flex items-center gap-1 border-b border-white/5 bg-black/30 px-2 py-1"
    style="-webkit-app-region: no-drag"
  >
    <button
      type="button"
      class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white/40 transition hover:bg-white/5 hover:text-white/70"
      title="Volver al launcher"
      @click="closeAll"
    >
      <i class="pi pi-arrow-left text-[10px]" />
    </button>

    <div class="mx-1 h-4 w-px bg-white/5" />

    <div class="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto custom-scroll">
      <button
        v-for="tab in webTabs.tabs"
        :key="tab.id"
        type="button"
        class="group flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-[10px] transition-colors"
        :class="
          webTabs.activeTabId === tab.id
            ? 'bg-white/[0.07] text-white/80'
            : 'text-white/35 hover:bg-white/[0.04] hover:text-white/55'
        "
        @click="webTabs.setActiveTab(tab.id)"
      >
        <i v-if="tab.isLoading" class="pi pi-spinner animate-spin text-[7px]" />
        <i v-else-if="tab.hasError" class="pi pi-exclamation-triangle text-[7px] text-rose-400" />
        <i v-else class="pi pi-globe text-[7px] text-white/25" />
        <span class="max-w-[140px] truncate">{{ tab.title }}</span>
        <span
          class="ml-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded text-white/20 opacity-0 transition-all hover:bg-white/10 hover:text-white/60 group-hover:opacity-100"
          title="Cerrar pestaña"
          @click.stop="webTabs.closeTab(tab.id)"
        >
          <i class="pi pi-times text-[6px]" />
        </span>
      </button>
    </div>

    <div class="mx-1 h-4 w-px bg-white/5" />

    <button
      type="button"
      class="flex h-7 items-center gap-1.5 rounded-md bg-white/5 px-2.5 text-[9px] font-bold uppercase tracking-wider text-white/40 transition hover:bg-white/10 hover:text-white/60"
      title="Abrir en navegador externo"
      @click="openInExternalBrowser"
    >
      <i class="pi pi-external-link text-[8px]" />
      <span>Navegador</span>
    </button>
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
