import { defineStore } from "pinia"
import { ref, computed } from "vue"

export interface WebTab {
  id: string
  url: string
  title: string
  isLoading: boolean
  hasError: boolean
}

let tabCounter = 0

function createTab(url: string, title?: string): WebTab {
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

export const useWebTabsStore = defineStore("webTabs", () => {
  const tabs = ref<WebTab[]>([])
  const activeTabId = ref<string | null>(null)

  const hasOpenTabs = computed(() => tabs.value.length > 0)

  const activeTab = computed(() => tabs.value.find((t) => t.id === activeTabId.value) ?? null)

  function openTab(url: string, title?: string): WebTab {
    const existing = tabs.value.find((t) => t.url === url)
    if (existing) {
      activeTabId.value = existing.id
      return existing
    }
    const tab = createTab(url, title)
    tabs.value.push(tab)
    activeTabId.value = tab.id
    return tab
  }

  function closeTab(id: string): void {
    const idx = tabs.value.findIndex((t) => t.id === id)
    if (idx === -1) return
    tabs.value.splice(idx, 1)
    if (activeTabId.value === id) {
      if (tabs.value.length === 0) {
        activeTabId.value = null
      } else {
        const newIdx = Math.min(idx, tabs.value.length - 1)
        activeTabId.value = tabs.value[newIdx].id
      }
    }
  }

  function setActiveTab(id: string): void {
    activeTabId.value = id
  }

  function updateTab(
    id: string,
    patch: Partial<Pick<WebTab, "isLoading" | "hasError" | "title" | "url">>,
  ): void {
    const tab = tabs.value.find((t) => t.id === id)
    if (tab) Object.assign(tab, patch)
  }

  return {
    tabs,
    activeTabId,
    hasOpenTabs,
    activeTab,
    openTab,
    closeTab,
    setActiveTab,
    updateTab,
  }
})
