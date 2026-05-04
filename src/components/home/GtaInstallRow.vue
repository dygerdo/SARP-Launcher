<script setup lang="ts">
import { computed } from "vue"
import type { GtaInstallProgress } from "../../../electron/services/gtaInstall"

const props = defineProps<{
  progress: GtaInstallProgress | null
}>()

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
      return "Descargando GTA: San Andreas"
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
  if (phase.value !== "download") return ""
  const done = props.progress?.bytesDone
  const total = props.progress?.bytesTotal
  if (done === undefined || total === undefined) return ""
  return `${formatBytes(done)} / ${formatBytes(total)}`
})

const percent = computed(() => Math.min(100, Math.max(0, props.progress?.percent ?? 0)))

const showDeterminate = computed(() => phase.value === "download")
const showIndeterminate = computed(
  () => phase.value === "extract" || phase.value === "verify" || phase.value === "preflight",
)

const subStat = computed(() => {
  if (phase.value === "download") {
    const speed = props.progress?.speedBps
    return `${Math.floor(percent.value)}%${speed ? `  ·  ${formatSpeed(speed)}` : ""}`
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
          class="h-full rounded-full bg-amber-500 transition-[width] duration-150"
          :style="{ width: `${percent}%` }"
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
