import { ref, computed } from "vue"
import type { DepStatus } from "@/types/mods"
import { SYSTEM_DEPENDENCIES } from "@/data/mods"

export function useModDeps() {
  const depStatuses = ref<Record<string, DepStatus>>({})
  const depsLoading = ref(false)

  const hasCriticalMissing = computed(() =>
    SYSTEM_DEPENDENCIES.filter((d) => d.critical).some(
      (d) => depStatuses.value[d.id] === "missing",
    ),
  )

  async function scanDeps(): Promise<void> {
    depsLoading.value = true
    try {
      const results = await window.launcher.deps.scan(SYSTEM_DEPENDENCIES)
      for (const r of results) {
        depStatuses.value[r.id] = r.status
      }
    } catch (err) {
      console.error("Error scanning system dependencies:", err)
    } finally {
      depsLoading.value = false
    }
  }

  async function openDepUrl(url: string): Promise<void> {
    await window.launcher.deps.openUrl(url)
  }

  return { depStatuses, depsLoading, hasCriticalMissing, scanDeps, openDepUrl }
}
