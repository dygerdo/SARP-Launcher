import { defineStore } from "pinia"
import { ref, computed, watch } from "vue"
import { useHealthCheckStore } from "@/stores/healthCheck"
import type {
  ModDefinition,
  ModCategory,
  ModType,
  EssentialsStatus,
  InstalledModInfo,
  InstallProgressEvent,
  EssentialId,
  DepStatus,
} from "@/types/mods"
import { MOD_CATALOG, SYSTEM_DEPENDENCIES } from "@/data/mods"

export type ToastType = "install" | "uninstall" | "repair" | "error"

export interface ToastItem {
  id: number
  text: string
  type: ToastType
}

let _toastId = 0

/**
 * Safely serialize a complex object to avoid circular references.
 * Used for electron-store persistence which requires plain JSON.
 */
function serializeForStore<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

export const useModsStore = defineStore("mods", () => {
  const installedMods = ref<Record<string, InstalledModInfo>>({})
  const essentials = ref<EssentialsStatus>({
    cleo: "missing",
    modloader: "missing",
    asiloader: "missing",
  })
  const installing = ref<Record<string, number>>({})
  const installStatus = ref<Record<string, InstallProgressEvent["status"]>>({})
  const uninstalling = ref<Set<string>>(new Set())
  const errors = ref<Record<string, string>>({})
  const searchQuery = ref("")
  const selectedCategory = ref<ModCategory | "all">("all")
  const selectedType = ref<ModType | "all">("all")
  const ready = ref(false)
  const selectedMod = ref<ModDefinition | null>(null)
  const toastItems = ref<ToastItem[]>([])

  const filteredMods = computed(() => {
    const query = searchQuery.value.toLowerCase().trim()
    const coreIds = ["cleo", "modloader", "asiloader"]

    return MOD_CATALOG.filter((mod) => {
      // Excluir esenciales del catálogo general
      if (coreIds.includes(mod.id)) return false

      const matchesSearch =
        mod.name.toLowerCase().includes(query) || mod.description.toLowerCase().includes(query)
      const matchesCategory =
        selectedCategory.value === "all" || mod.category === selectedCategory.value
      const matchesType = selectedType.value === "all" || mod.type === selectedType.value
      return matchesSearch && matchesCategory && matchesType
    })
  })

  async function loadState(): Promise<void> {
    try {
      // 1. Scan essentials
      essentials.value = await window.launcher.mods.scanEssentials()

      // 2. Load installed mods from store
      const saved = await window.launcher.getStore("installedMods")
      if (saved && typeof saved === "object") {
        installedMods.value = saved as Record<string, InstalledModInfo>
      }

      // 3. Verify files on disk for all catalog mods
      await verifyFiles()
    } catch (e) {
      console.error("Error loading mods state:", e)
      // On critical error, clear installed mods to prevent stale data from old GTA folder
      installedMods.value = {}
      essentials.value = { cleo: "missing", modloader: "missing", asiloader: "missing" }
    } finally {
      ready.value = true
    }
  }

  async function verifyFiles(): Promise<void> {
    try {
      const catalogStatus = await window.launcher.mods.scanCatalog()

      for (const mod of MOD_CATALOG) {
        const fileStatus = catalogStatus[mod.id] || {}
        const results = Object.values(fileStatus)

        // Skip empty results (unverifiable)
        if (results.length === 0) continue

        const allExist = results.every((exists) => exists)
        const noneExist = results.every((exists) => !exists)

        if (allExist) {
          if (!installedMods.value[mod.id]) {
            installedMods.value[mod.id] = {
              installedAt: new Date().toISOString(),
              files: mod.files,
              version: mod.version,
              status: "ok",
            }
          } else {
            installedMods.value[mod.id].status = "ok"
            delete installedMods.value[mod.id].missingFiles
          }
        } else if (noneExist) {
          // No hay rastro del mod, lo quitamos del store si estaba
          delete installedMods.value[mod.id]
        } else {
          const missingFiles = Object.entries(fileStatus)
            .filter(([, exists]) => !exists)
            .map(([filename]) => filename)

          // Instalación parcial -> Reparar
          if (installedMods.value[mod.id]) {
            installedMods.value[mod.id].status = "reparar"
            installedMods.value[mod.id].missingFiles = missingFiles
          } else {
            // Si no estaba en el store pero hay archivos sueltos, lo añadimos como parcial
            installedMods.value[mod.id] = {
              installedAt: new Date().toISOString(),
              files: mod.files,
              version: mod.version,
              status: "reparar",
              missingFiles,
            }
          }
        }
      }
      // Update store with current state
      await window.launcher.setStore("installedMods", serializeForStore(installedMods.value))
    } catch (err) {
      console.error("Error verifying mod files:", err)
      // On scan error, keep current state but log the problem
      throw new Error("No se pudieron verificar los archivos de los mods", { cause: err })
    }
  }

  function pushToast(text: string, type: ToastType): void {
    // Max 3 messages: drop the oldest if needed to allow brief burst visibility
    if (toastItems.value.length >= 3) {
      toastItems.value.shift()
    }
    const id = ++_toastId
    toastItems.value.push({ id, text, type })
    // Extended timeout for errors so they don't disappear too quickly
    const timeout = type === "error" ? 2200 : 1800
    window.setTimeout(() => {
      const idx = toastItems.value.findIndex((t) => t.id === id)
      if (idx !== -1) toastItems.value.splice(idx, 1)
    }, timeout)
  }

  function mapModError(error: unknown, modName?: string): string {
    const technical = error instanceof Error ? error.message : String(error)
    console.error("Mod error:", technical)

    const lower = technical.toLowerCase()
    const title = modName ? `El mod ${modName}` : "El mod"

    if (lower.includes("404") || lower.includes("not found") || lower.includes("axioserror")) {
      return `${title} no está disponible por el momento.`
    }
    if (
      lower.includes("network") ||
      lower.includes("timeout") ||
      lower.includes("failed to fetch")
    ) {
      return `${title} no se pudo descargar. Comprueba tu conexión e inténtalo de nuevo.`
    }
    if (lower.includes("permission") || lower.includes("eacces") || lower.includes("enospc")) {
      return `${title} no se pudo guardar en disco. Comprueba que tengas espacio y permisos.`
    }
    if (lower.includes("parse") || lower.includes("invalid")) {
      return `${title} tiene un paquete inválido o corrupto.`
    }
    return `${title} no se pudo instalar en este momento. Intenta de nuevo más tarde.`
  }

  function pushErrorToast(message: string): void {
    pushToast(message, "error")
  }

  async function installMod(mod: ModDefinition): Promise<void> {
    // Double-check to prevent race condition: must be checked again inside
    // the function before we commit to the install. This prevents two rapid
    // clicks from both passing canInstall and both initiating downloads.
    if (!canInstall(mod)) return

    // Acquire lock immediately: mark as installing before any async operation
    if (installing.value[mod.id] || uninstalling.value.has(mod.id)) return

    errors.value[mod.id] = ""
    const wasPartial = isPartial(mod.id)
    // Pre-initialize progress so the spinner appears immediately (before first IPC event)
    installing.value[mod.id] = 0
    installStatus.value[mod.id] = "downloading"
    try {
      const result = await window.launcher.mods.install(mod)
      
      if (!result.success) {
        throw new Error(result.error ?? "No se ha podido descargar e instalar correctamente.")
      }

      // Mark as installed in our state
      installedMods.value[mod.id] = {
        installedAt: new Date().toISOString(),
        files: mod.files,
        version: mod.version,
        status: "ok",
      }
      // Persist to electron-store immediately
      await window.launcher.setStore("installedMods", serializeForStore(installedMods.value))
      // Toast after state is refreshed
      pushToast(
        wasPartial ? `${mod.name} reparado` : `${mod.name} instalado`,
        wasPartial ? "repair" : "install",
      )
    } catch (e: unknown) {
      const message = mapModError(e, mod.name)
      errors.value[mod.id] = message
      installStatus.value = { ...installStatus.value, [mod.id]: "error" }
      pushErrorToast(message)
    } finally {
      // Ensure cleanup always happens
      window.setTimeout(() => {
        delete installing.value[mod.id]
        delete installStatus.value[mod.id]
      }, 1500)
    }
  }

  async function uninstallMod(mod: ModDefinition): Promise<boolean> {
    errors.value[mod.id] = ""
    if (mod.id === "asiloader") {
      errors.value[mod.id] = "No se puede desinstalar el ASI Loader: es vital para el juego."
      return false
    }

    // Check for mods that require this essential
    const essentialDependents = MOD_CATALOG.filter(
      (m) => m.requiresEssentials.includes(mod.id as EssentialId) && isInstalled(m.id),
    )
    if (essentialDependents.length > 0) {
      errors.value[mod.id] =
        `No se puede desinstalar ${mod.name} hasta desinstalar los siguientes mods: ${essentialDependents.map((m) => m.name).join(", ")}`
      return false
    }

    const dependents = getDependentMods(mod.id)
    if (dependents.length > 0) {
      errors.value[mod.id] =
        `No se puede desinstalar: es requerido por ${dependents.map((m) => m.name).join(", ")}`
      return false
    }

    uninstalling.value.add(mod.id)
    try {
      const result = await window.launcher.mods.uninstall(mod)
      if (result.success) {
        delete installedMods.value[mod.id]
        errors.value[mod.id] = ""
        await window.launcher.setStore("installedMods", serializeForStore(installedMods.value))
        pushToast(`${mod.name} desinstalado`, "uninstall")
        return true
      } else {
        const message = result.error
          ? mapModError(result.error, mod.name)
          : `No se pudo desinstalar ${mod.name}. Intenta de nuevo más tarde.`
        errors.value[mod.id] = message
        pushErrorToast(message)
        return false
      }
    } catch (e: unknown) {
      const message = mapModError(e, mod.name)
      errors.value[mod.id] = message
      pushErrorToast(message)
      return false
    } finally {
      uninstalling.value.delete(mod.id)
      await loadState()
    }
  }

  function isInstalled(modId: string): boolean {
    return installedMods.value[modId]?.status === "ok"
  }

  function isPartial(modId: string): boolean {
    return installedMods.value[modId]?.status === "reparar"
  }

  function canInstall(mod: ModDefinition): boolean {
    const coreIds = ["cleo", "modloader", "asiloader"]

    // Prevent concurrent operations on any mod
    if (installing.value[mod.id] || uninstalling.value.has(mod.id)) {
      return false
    }

    // For essential mods, allow install only if not already installed (status !== "ok")
    // or if it's in repair state (partial install)
    if (coreIds.includes(mod.id)) {
      const isOk = essentials.value[mod.id as EssentialId] === "ok"
      const isPartiallyInstalled = isPartial(mod.id)
      // Allow re-repair if broken, but don't allow fresh install if already ok
      return !isOk || isPartiallyInstalled
    }

    const essentialsOk = mod.requiresEssentials.every((id) => essentials.value[id] === "ok")
    const dependenciesOk = mod.dependsOn?.every((id) => isInstalled(id) && !isPartial(id)) ?? true
    return essentialsOk && dependenciesOk
  }

  function getMissingEssentials(mod: ModDefinition): string[] {
    const names: Record<string, string> = {
      cleo: "CLEO 4",
      modloader: "ModLoader",
      asiloader: "ASI Loader",
    }
    const missing = mod.requiresEssentials
      .filter((id) => essentials.value[id] !== "ok")
      .map((id) => names[id])

    if (mod.dependsOn) {
      for (const depId of mod.dependsOn) {
        if (!isInstalled(depId) || isPartial(depId)) {
          const depMod = MOD_CATALOG.find((m) => m.id === depId)
          missing.push(depMod?.name || depId)
        }
      }
    }

    return missing
  }

  function getDependentMods(modId: string): ModDefinition[] {
    return MOD_CATALOG.filter((m) => m.dependsOn?.includes(modId) && isInstalled(m.id))
  }

  /**
   * Reinitialize mods state when GTA folder changes.
   * Called by healthCheck after pickGameDir succeeds to ensure
   * we don't carry stale data from the previous GTA installation.
   */
  async function resetOnGameDirChange(): Promise<void> {
    installedMods.value = {}
    essentials.value = { cleo: "missing", modloader: "missing", asiloader: "missing" }
    errors.value = {}
    installing.value = {}
    installStatus.value = {}
    // Reload with the new game directory
    await loadState()
  }

  const incompleteMods = computed(() => {
    return Object.entries(installedMods.value)
      .filter(([, info]) => info.status === "reparar")
      .map(([id, info]) => {
        const mod = MOD_CATALOG.find((m) => m.id === id)
        return mod
          ? {
              mod,
              missingFiles: info.missingFiles ?? [],
            }
          : null
      })
      .filter((item): item is { mod: ModDefinition; missingFiles: string[] } => item !== null)
  })

  // ── System Dependencies state ──────────────────────────────────────────────
  const depStatuses = ref<Record<string, DepStatus>>({})
  const depsLoading = ref(false)

  // Banner visible si hay alguna dep crítica con status "missing" o "unverifiable"
  const hasCriticalMissing = computed(() =>
    SYSTEM_DEPENDENCIES.filter((d) => d.critical).some(
      (d) => depStatuses.value[d.id] === "missing",
    ),
  )

  // ASI Loader no está instalado correctamente → bloquear TODO el catálogo
  const asiloaderMissing = computed(() => essentials.value.asiloader !== "ok")

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

  const handleProgress = (_: unknown, data: InstallProgressEvent) => {
    installing.value[data.modId] = data.progress
    installStatus.value[data.modId] = data.status
    if (data.status === "error") {
      const message = data.error
        ? mapModError(data.error, MOD_CATALOG.find((m) => m.id === data.modId)?.name)
        : `Ha habido un problema con el mod. Intenta de nuevo más tarde.`
      errors.value[data.modId] = message
      pushErrorToast(message)
    }
    // Clean up progress indicators after done/error with a small delay so
    // the user can see the final 100% state before it disappears
    if (data.status === "done" || data.status === "error") {
      window.setTimeout(() => {
        delete installing.value[data.modId]
        delete installStatus.value[data.modId]
      }, 1500)
    }
  }

  let stopProgress: (() => void) | null = null

  // Setup IPC listeners and health check watcher immediately (not on component mount)
  // so that progress events are received even if no component has mounted yet.
  function setupListeners(): void {
    if (stopProgress) return // Already setup
    stopProgress = window.launcher.mods.onInstallProgress(handleProgress)

    const healthStore = useHealthCheckStore()
    // Watch health check completion and refresh mods when it finishes
    // (this watch will clean up when the store is destroyed)
    watch(
      () => healthStore.running,
      (isRunning, wasRunning) => {
        // When a health check pass finishes (running: true -> false), refresh mods
        if (wasRunning && !isRunning) {
          loadState()
        }
      },
    )
  }

  function cleanup(): void {
    if (stopProgress) {
      stopProgress()
      stopProgress = null
    }
  }

  // Initialize listeners when store is first used (lazy initialization)
  let listenersSetup = false

  // Helper to ensure listeners are setup before any operation that needs them
  function ensureListeners(): void {
    if (!listenersSetup) {
      listenersSetup = true
      setupListeners()
    }
  }

  // Also initialize state from disk on first access
  // This is called by components or when needed
  setupListeners()
  void loadState()


  return {
    installedMods,
    essentials,
    installing,
    installStatus,
    uninstalling,
    errors,
    searchQuery,
    selectedCategory,
    selectedType,
    filteredMods,
    ready,
    selectedMod,
    toastItems,
    pushToast,
    loadState,
    verifyFiles,
    installMod,
    uninstallMod,
    isInstalled,
    isPartial,
    canInstall,
    getMissingEssentials,
    incompleteMods,
    depStatuses,
    depsLoading,
    hasCriticalMissing,
    asiloaderMissing,
    scanDeps,
    openDepUrl,
    resetOnGameDirChange,
    cleanup,
    ensureListeners,
  }
})
