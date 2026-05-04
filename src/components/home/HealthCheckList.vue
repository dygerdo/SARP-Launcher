<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue"
import HealthCheckItem from "./HealthCheckItem.vue"
import type { ItemAction, InlineAction } from "./HealthCheckItem.vue"
import ModChip from "./ModChip.vue"
import GtaInstallRow from "./GtaInstallRow.vue"
import type { HealthEntry } from "@/stores/healthCheck"
import { useHealthCheckStore } from "@/stores/healthCheck"
import { useServerPing } from "@/composables/useServerPing"
import { usePingCountdown } from "@/composables/usePingCountdown"

const health = useHealthCheckStore()

const COOLDOWN_MS = 1000
const onCooldown = ref(false)
let cooldownTimer: ReturnType<typeof setTimeout> | null = null

watch(
  () => health.running,
  (isRunning, wasRunning) => {
    if (wasRunning && !isRunning) {
      onCooldown.value = true
      if (cooldownTimer) clearTimeout(cooldownTimer)
      cooldownTimer = setTimeout(() => {
        onCooldown.value = false
      }, COOLDOWN_MS)
    }
  },
)

const disabled = computed(
  () =>
    health.running ||
    onCooldown.value ||
    health.installing ||
    health.gtaInstalling ||
    health.cacheInstalling,
)

function handleRecheck() {
  if (disabled.value) return
  // Manual refresh runs even while the game is open — the user is
  // explicitly asking for it, and it skips the auto-install branch anyway
  // unless the game has already been closed.
  health.run({ force: true })
}

function inlineActionFor(entry: HealthEntry): InlineAction | undefined {
  if (entry.id !== "gta") return undefined
  if (entry.state === "checking") return undefined
  if (health.gtaInstalling) return undefined
  return {
    label: "Cambiar ubicación",
    icon: "pi-folder-open",
    title: "Selecciona la carpeta donde está instalado GTA: San Andreas",
    onClick: () => health.pickGameDir(),
  }
}

function actionFor(entry: HealthEntry): ItemAction | undefined {
  if (entry.id === "gta") {
    if (health.gtaInstalling) return undefined // GtaInstallRow takes over
    if (health.gtaActionType === "install") {
      return {
        label: "Instalar",
        variant: "primary",
        onClick: () => health.installGta(),
      }
    }
    return undefined
  }

  if (entry.id !== "samp") return undefined
  // No GTA → no destination folder we can install or repair into. Suppress
  // the action entirely; the GTA item's own error message tells the user
  // what to fix first.
  const gtaEntry = health.entries.find((e) => e.id === "gta")
  if (gtaEntry?.state !== "ok") return undefined
  if (health.installing) {
    const phase = health.installProgress?.phase
    const showProgress = phase === "download"
    const isRepair = health.sampActionType === "repair"
    return {
      label: isRepair ? "Reparando..." : "Instalando...",
      busy: true,
      progress: showProgress ? health.installProgress?.percent : undefined,
      variant: isRepair ? "secondary" : "primary",
      onClick: () => {},
    }
  }
  if (health.sampActionType === "install") {
    return {
      label: "Instalar",
      shield: health.requiresElevation,
      variant: "primary",
      onClick: () => health.installSamp(),
    }
  }
  if (health.sampActionType === "repair") {
    return {
      label: "Reparar",
      shield: health.requiresElevation,
      variant: "secondary",
      onClick: () => health.installSamp(),
    }
  }
  return undefined
}

const { lastPingAt, loading: pinging } = useServerPing()
const { progress } = usePingCountdown(lastPingAt)

onMounted(() => {
  health.run()
})
</script>

<template>
  <section
    class="relative w-full overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4 backdrop-blur-sm"
  >
    <div
      class="pointer-events-none absolute inset-x-0 top-0 h-px overflow-hidden bg-white/5"
      aria-hidden="true"
    >
      <div
        class="h-full origin-left bg-gradient-to-r from-amber-400/70 via-orange-400/70 to-red-400/70 transition-opacity duration-200 will-change-transform"
        :class="pinging ? 'opacity-100' : 'opacity-80'"
        :style="{ transform: `scaleX(${progress})`, width: '100%' }"
      />
    </div>
    <header class="mb-2 flex items-center justify-between">
      <h2 class="text-xs font-medium uppercase tracking-widest text-white/50">
        Estado de tu instalación
      </h2>
      <button
        type="button"
        class="flex h-6 w-6 items-center justify-center rounded-md text-white/40 transition-colors duration-150 hover:bg-white/[0.06] hover:text-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        title="Verificar de nuevo"
        :disabled="disabled"
        @click="handleRecheck"
      >
        <i
          class="pi pi-refresh text-xs"
          :class="health.running ? 'recheck-spin' : 'recheck-idle'"
        />
      </button>
    </header>
    <div class="divide-y divide-white/5">
      <template v-for="entry in health.entries" :key="entry.id">
        <GtaInstallRow
          v-if="entry.id === 'gta' && health.gtaInstalling"
          :progress="health.gtaInstallProgress"
        />
        <GtaInstallRow
          v-else-if="entry.id === 'cache' && health.cacheInstalling"
          :progress="health.cacheInstallProgress"
          download-title="Descargando caché del servidor"
        />
        <HealthCheckItem
          v-else
          :label="entry.label"
          :state="entry.state"
          :detail="entry.detail"
          :meta="entry.meta"
          :action="actionFor(entry)"
          :inline-action="inlineActionFor(entry)"
        >
          <template
            v-if="entry.id === 'gta' && entry.state === 'ok' && health.gtaMods.length > 0"
            #extras
          >
            <div class="flex flex-shrink-0 flex-wrap items-center gap-1.5">
              <ModChip
                v-for="mod in health.gtaMods"
                :id="mod.id"
                :key="mod.id"
                :label="mod.label"
              />
            </div>
          </template>
        </HealthCheckItem>
      </template>
    </div>
  </section>
</template>

<style scoped>
/* Self-contained refresh animation. We don't reuse PrimeIcons' .pi-spin
   because it gets neutralised by prefers-reduced-motion on Windows, leaving
   the button frozen. The "idle" state has a transition so when running
   stops, the icon eases back to 0deg instead of jumping. */
.recheck-spin {
  animation: recheck-rotate 0.9s linear infinite;
  will-change: transform;
}
.recheck-idle {
  transform: rotate(0deg);
  transition: transform 0.3s ease-out;
}

@keyframes recheck-rotate {
  to {
    transform: rotate(360deg);
  }
}
</style>
