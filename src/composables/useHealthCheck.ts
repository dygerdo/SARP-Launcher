import { computed, ref, watch } from "vue"
import { useServerPing } from "@/composables/useServerPing"

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

export function useHealthCheck() {
  const entries = ref<HealthEntry[]>(INITIAL.map((e) => ({ ...e })))
  const running = ref(false)
  const serverPing = useServerPing()

  const allOk = computed(() =>
    entries.value.filter((e) => e.id !== "server").every((e) => e.state === "ok"),
  )

  function update(id: HealthEntry["id"], patch: Partial<HealthEntry>) {
    const target = entries.value.find((e) => e.id === id)
    if (!target) return
    Object.assign(target, patch)
  }

  function reset() {
    entries.value = INITIAL.map((e) => ({ ...e }))
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

  async function run() {
    running.value = true
    reset()
    const local = await window.launcher.healthCheck()
    update("gta", {
      state: local.gta.ok ? "ok" : "error",
      detail: local.gta.detail,
    })
    update("samp", {
      state: local.samp.ok ? "ok" : "error",
      detail: local.samp.detail,
    })
    update("cache", {
      state: local.cache.ok ? "ok" : "error",
      detail: local.cache.detail,
    })

    await serverPing.ping()
    syncServerEntry()

    running.value = false
  }

  return { entries, allOk, running, run }
}
