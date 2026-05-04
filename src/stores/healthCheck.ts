import { defineStore } from "pinia"
import { computed, ref, watch } from "vue"
import { useServerPing } from "@/composables/useServerPing"
import type { SampVerificationResult } from "../../electron/services/sampVerify"
import type { InstallProgress } from "../../electron/services/sampInstall"
import type { DetectedMod } from "../../electron/services/gtaMods"
import type { GtaInstallProgress } from "../../electron/services/gtaInstall"
import { useDialogStore } from "@/stores/dialog"

export type GtaActionType = "install" | null

export type SampActionType = "install" | "repair" | null

export type CheckState = "checking" | "ok" | "warning" | "error"

export interface HealthEntry {
  id: "gta" | "samp" | "cache" | "server"
  label: string
  state: CheckState
  detail?: string
  meta?: string
}

const INITIAL: HealthEntry[] = [
  { id: "gta", label: "GTA: San Andreas", state: "checking" },
  { id: "samp", label: "SA:MP", state: "checking" },
  { id: "cache", label: "Cache del servidor", state: "checking" },
  { id: "server", label: "Conexión con el servidor", state: "checking" },
]

function describeSamp(result: SampVerificationResult): string | undefined {
  if (result.error) {
    return "No se pudo verificar tu instalación de SA:MP. Vuelve a abrir el launcher para reintentar."
  }
  const failed = result.files.filter((f) => !f.ok)
  if (failed.length === 0) return undefined

  const missing = failed.filter((f) => f.reason === "missing")
  const corrupted = failed.filter(
    (f) => f.reason === "size-mismatch" || f.reason === "hash-mismatch",
  )

  if (missing.length > 0 && corrupted.length === 0) {
    return missing.length === failed.length && failed.length === result.files.length
      ? "No está instalado en esta carpeta."
      : `Falta ${joinFileList(missing.map((f) => f.path))}.`
  }

  if (corrupted.length > 0 && missing.length === 0) {
    return `${joinFileList(corrupted.map((f) => f.path))} ${corrupted.length === 1 ? "está dañado" : "están dañados"}.`
  }

  return "Tu instalación de SA:MP está incompleta o dañada."
}

function joinFileList(files: string[]): string {
  if (files.length === 0) return ""
  if (files.length === 1) return files[0]
  if (files.length === 2) return `${files[0]} y ${files[1]}`
  return `${files.slice(0, -1).join(", ")} y ${files[files.length - 1]}`
}

function deriveSampAction(result: SampVerificationResult | null): SampActionType {
  if (!result || result.ok || result.error) return null
  const failed = result.files.filter((f) => !f.ok)
  if (failed.length === 0) return null
  // "Install" only applies when nothing exists yet (virgin state — every file
  // is missing). Any partial failure — a single missing file, a corrupted one,
  // or a mix — is a repair on top of an existing installation.
  const allMissing =
    failed.length === result.files.length && failed.every((f) => f.reason === "missing")
  return allMissing ? "install" : "repair"
}

export const useHealthCheckStore = defineStore("healthCheck", () => {
  const entries = ref<HealthEntry[]>(INITIAL.map((e) => ({ ...e })))
  const running = ref(false)
  const installing = ref(false)
  const installProgress = ref<InstallProgress | null>(null)
  const lastSampVerification = ref<SampVerificationResult | null>(null)
  const requiresElevation = ref<boolean>(false)
  const gtaMods = ref<DetectedMod[]>([])
  const gtaMissingAll = ref<boolean>(false)
  const gtaInstalling = ref<boolean>(false)
  const gtaInstallProgress = ref<GtaInstallProgress | null>(null)
  const serverPing = useServerPing()
  const dialog = useDialogStore()

  const allOk = computed(() =>
    entries.value.filter((e) => e.id !== "server").every((e) => e.state === "ok"),
  )

  const sampActionType = computed<SampActionType>(() =>
    deriveSampAction(lastSampVerification.value),
  )

  function update(id: HealthEntry["id"], patch: Partial<HealthEntry>) {
    const target = entries.value.find((e) => e.id === id)
    if (!target) return
    Object.assign(target, patch)
  }

  const gtaActionType = computed<GtaActionType>(() => (gtaMissingAll.value ? "install" : null))

  function reset() {
    entries.value = INITIAL.map((e) => ({ ...e }))
    gtaMods.value = []
    gtaMissingAll.value = false
  }

  function syncServerEntry() {
    const result = serverPing.result.value
    if (!result) {
      update("server", { state: "checking", detail: undefined, meta: undefined })
      return
    }
    if (!result.alive) {
      update("server", {
        state: "error",
        detail: "El servidor no responde.",
        meta: undefined,
      })
      return
    }
    if (!result.info || result.ms === null) {
      update("server", {
        state: "error",
        detail: "Respuesta incompleta del servidor.",
        meta: undefined,
      })
      return
    }
    update("server", {
      state: "ok",
      detail: undefined,
      meta: `${result.ms} ms · ${result.info.players}/${result.info.maxPlayers} jugadores`,
    })
  }

  watch(() => serverPing.result.value, syncServerEntry, { immediate: true })

  async function checkGta(): Promise<void> {
    const health = await window.launcher.healthCheck()
    update("gta", {
      state: health.gta.ok ? "ok" : "error",
      detail: health.gta.detail,
    })
    gtaMissingAll.value = health.gta.missingAll
    if (health.gta.ok) {
      try {
        gtaMods.value = await window.launcher.detectGtaMods()
      } catch {
        gtaMods.value = []
      }
    } else {
      gtaMods.value = []
    }
  }

  async function checkSamp(): Promise<void> {
    try {
      await window.launcher.fetchManifest({ force: false })
    } catch {
      update("samp", {
        state: "error",
        detail: "No se pudo contactar al servidor. Revisa tu conexión a Internet.",
      })
      return
    }

    const result = await window.launcher.verifySamp()
    lastSampVerification.value = result
    if (result.ok) {
      update("samp", { state: "ok", detail: undefined })
      return
    }
    update("samp", {
      state: "error",
      detail: describeSamp(result) ?? "Tu instalación de SA:MP necesita ser reparada.",
    })
  }

  async function checkCache(): Promise<void> {
    const health = await window.launcher.healthCheck()
    update("cache", {
      state: health.cache.ok ? "ok" : "error",
      detail: health.cache.detail,
    })
  }

  async function checkElevation(): Promise<void> {
    try {
      requiresElevation.value = await window.launcher.sampInstallRequiresElevation()
    } catch {
      requiresElevation.value = false
    }
  }

  async function run(): Promise<void> {
    running.value = true
    reset()
    await Promise.all([checkGta(), checkSamp(), checkCache(), checkElevation()])
    await serverPing.ping()
    syncServerEntry()
    running.value = false
  }

  function describeInstallProgress(progress: InstallProgress): string {
    switch (progress.phase) {
      case "preflight":
        return progress.message ?? "Preparando instalación..."
      case "download":
        return `Descargando... ${Math.floor(progress.percent)}%`
      case "install":
        return progress.message ?? "Instalando SA:MP..."
      case "verify":
        return "Verificando..."
      case "done":
        return "Instalación completada."
      case "error":
        return progress.message ?? "La instalación falló."
    }
  }

  async function installSamp(): Promise<void> {
    if (installing.value) return
    installing.value = true
    installProgress.value = { phase: "preflight", percent: 0 }

    const detach = window.launcher.onSampInstallProgress((progress) => {
      installProgress.value = progress
      update("samp", {
        state: progress.phase === "error" ? "error" : "checking",
        detail: describeInstallProgress(progress),
      })
    })

    try {
      const result = await window.launcher.installSamp()
      if (!result.ok) {
        update("samp", {
          state: "error",
          detail: result.error ?? "La instalación falló.",
        })
        return
      }
      await run()
    } finally {
      detach()
      installing.value = false
      installProgress.value = null
    }
  }

  async function pickGameDir(): Promise<{ ok: boolean; cancelled?: boolean; error?: string }> {
    const result = await window.launcher.pickGameDir()
    if (result.ok) {
      await run()
      return { ok: true }
    }
    if (result.cancelled) return { ok: false, cancelled: true }
    if (result.error) {
      void dialog.error("Carpeta inválida", result.error)
    }
    return { ok: false, error: result.error }
  }

  async function installGta(): Promise<{ ok: boolean; cancelled?: boolean; error?: string }> {
    if (gtaInstalling.value) return { ok: false, error: "Ya hay una instalación en curso." }

    const pick = await window.launcher.pickEmptyInstallDir()
    if (!pick.ok || !pick.path) {
      if (pick.cancelled) return { ok: false, cancelled: true }
      const error = pick.error ?? "No se pudo seleccionar la carpeta."
      void dialog.error("Carpeta no válida", error)
      return { ok: false, error }
    }

    gtaInstalling.value = true
    gtaInstallProgress.value = { phase: "preflight", percent: 0 }

    const detach = window.launcher.onGtaInstallProgress((progress) => {
      gtaInstallProgress.value = progress
    })

    try {
      const result = await window.launcher.installGta(pick.path)
      if (!result.ok) {
        const error = result.error ?? "La instalación falló."
        void dialog.error("Error al instalar", error)
        return { ok: false, error }
      }
      await run()
      void dialog.success("Listo", "GTA: San Andreas se instaló correctamente.")
      return { ok: true }
    } finally {
      detach()
      gtaInstalling.value = false
      gtaInstallProgress.value = null
    }
  }

  return {
    entries,
    allOk,
    running,
    installing,
    installProgress,
    sampActionType,
    requiresElevation,
    gtaMods,
    gtaActionType,
    gtaInstalling,
    gtaInstallProgress,
    run,
    installSamp,
    pickGameDir,
    installGta,
  }
})
