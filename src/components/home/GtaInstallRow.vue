<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue"
import type { GtaInstallProgress } from "../../../electron/services/gtaInstall"

const props = withDefaults(
  defineProps<{
    progress: GtaInstallProgress | null
    downloadTitle?: string
  }>(),
  { downloadTitle: "Descargando GTA: San Andreas" },
)

function formatBytes(bytes: number | undefined): string {
  if (bytes === undefined || bytes === null) return ""
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(0)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

function formatSpeed(bps: number | undefined): string {
  if (bps === undefined || bps === null) return ""
  return `${formatBytes(bps)}/s`
}

const phase = computed(() => props.progress?.phase ?? "preflight")

const title = computed(() => {
  switch (phase.value) {
    case "preflight":
      return "Preparando instalación..."
    case "download":
      return props.downloadTitle
    case "verify":
      return "Verificando archivo..."
    case "extract":
      return props.progress?.message ?? "Extrayendo archivos..."
    case "shortcut":
      return "Creando acceso directo..."
    case "done":
      return "Instalación completada"
    case "error":
      return props.progress?.message ?? "La instalación falló"
  }
  return ""
})

const rightStat = computed(() => {
  const done = props.progress?.bytesDone
  const total = props.progress?.bytesTotal
  if (done === undefined || total === undefined) return ""
  if (phase.value === "download" || phase.value === "extract") {
    return `${formatBytes(done)} / ${formatBytes(total)}`
  }
  return ""
})

const percent = computed(() => Math.min(100, Math.max(0, props.progress?.percent ?? 0)))

// Smoothed value used by the bar fill. We tween toward `percent` instead of
// binding it directly so chunk-by-chunk progress doesn't visually jitter and
// long pauses (CPU-bound inflate of a big file) at least see the bar drift
// forward a tiny bit before catching up.
const displayPercent = ref(0)
let rafId: number | null = null
let lastTickAt = 0

function tick(now: number): void {
  const dt = lastTickAt === 0 ? 16 : now - lastTickAt
  lastTickAt = now
  // Exponential approach: closes ~half the gap every ~250 ms. Feels lively
  // without overshooting and never freezes even when the target is static.
  const target = percent.value
  const diff = target - displayPercent.value
  if (Math.abs(diff) < 0.05) {
    displayPercent.value = target
  } else {
    const k = 1 - Math.pow(0.5, dt / 250)
    displayPercent.value = displayPercent.value + diff * k
  }
  if (displayPercent.value < target) {
    rafId = requestAnimationFrame(tick)
  } else {
    rafId = null
    lastTickAt = 0
  }
}

function ensureTicking(): void {
  if (rafId === null) {
    lastTickAt = 0
    rafId = requestAnimationFrame(tick)
  }
}

watch(percent, (next) => {
  if (next < displayPercent.value) {
    // Phase change reset (e.g. download done → extract starts at 0).
    displayPercent.value = next
    return
  }
  ensureTicking()
})

watch(
  () => props.progress?.phase,
  () => {
    // Hard reset on phase boundaries so each phase's bar starts from 0.
    displayPercent.value = 0
    ensureTicking()
  },
)

onBeforeUnmount(() => {
  if (rafId !== null) cancelAnimationFrame(rafId)
})

const showDeterminate = computed(() => {
  if (phase.value === "download") return true
  // During extract we now have real % from the byte counter; only fall back
  // to the indeterminate animation while we wait for the first chunk.
  if (phase.value === "extract" && (props.progress?.bytesTotal ?? 0) > 0) return true
  return false
})
const showIndeterminate = computed(() => {
  if (showDeterminate.value) return false
  return phase.value === "extract" || phase.value === "verify" || phase.value === "preflight"
})

const subStat = computed(() => {
  if (phase.value === "download") {
    const speed = props.progress?.speedBps
    return `${Math.floor(displayPercent.value)}%${speed ? `  ·  ${formatSpeed(speed)}` : ""}`
  }
  if (phase.value === "extract" && (props.progress?.bytesTotal ?? 0) > 0) {
    return `${Math.floor(displayPercent.value)}%`
  }
  return ""
})

const titleClass = computed(() => (phase.value === "error" ? "text-rose-300" : "text-white/85"))
</script>

<template>
  <div class="flex min-h-14 flex-col justify-center gap-1.5 py-2.5">
    <div class="flex items-baseline justify-between gap-3">
      <span class="truncate py-px text-sm leading-tight" :class="titleClass">{{ title }}</span>
      <span
        v-if="rightStat"
        class="flex-shrink-0 py-px font-mono text-[11px] leading-tight tabular-nums text-white/60"
      >
        {{ rightStat }}
      </span>
    </div>
    <div class="flex items-center gap-3">
      <div class="relative h-2 flex-1 overflow-hidden rounded-full bg-white/10">
        <div
          v-if="showDeterminate"
          class="h-full rounded-full bg-amber-500"
          :style="{ width: `${displayPercent}%` }"
        />
        <div v-else-if="showIndeterminate" class="install-bar-indeterminate" />
        <div v-else-if="phase === 'done'" class="h-full w-full rounded-full bg-emerald-500" />
        <div v-else-if="phase === 'error'" class="h-full w-full rounded-full bg-rose-500/60" />
      </div>
      <span
        v-if="subStat"
        class="flex-shrink-0 font-mono text-[11px] tabular-nums leading-none text-white/55"
      >
        {{ subStat }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.install-bar-indeterminate {
  position: absolute;
  inset: 0;
  border-radius: 9999px;
  background: linear-gradient(
    90deg,
    rgba(245, 158, 11, 0) 0%,
    rgba(245, 158, 11, 0.85) 50%,
    rgba(245, 158, 11, 0) 100%
  );
  width: 40%;
  animation: install-bar-slide 1.4s ease-in-out infinite;
  will-change: transform;
}

@keyframes install-bar-slide {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(350%);
  }
}
</style>
