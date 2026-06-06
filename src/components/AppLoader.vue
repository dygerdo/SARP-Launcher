<script setup lang="ts">
import { computed } from "vue"
import { useUpdaterStore } from "@/stores/updater"

const store = useUpdaterStore()

const statusText = computed(() => {
  switch (store.status) {
    case "checking":
      return "Comprobando actualizaciones..."
    case "available":
      return `Actualización disponible · v${store.version}`
    case "downloading":
      return `Actualizando... ${Math.round(store.percent)}%`
    case "downloaded":
      return "Reiniciando..."
    case "error":
      return "Error al actualizar, continuando..."
    default:
      return ""
  }
})

const showProgress = computed(() => store.status === "downloading")
</script>

<template>
  <!--
    Full-screen splash overlay shown while the updater is checking / downloading.
    Uses fixed + inset-0 so it always covers the whole Electron window.
    The flex column flow guarantees: spinner → text → (progress bar).
  -->
  <div
    class="fixed inset-0 z-50 flex min-h-screen flex-col items-center justify-center gap-5 bg-[#111111]"
    aria-live="polite"
    aria-label="Cargando launcher"
  >
    <!-- Orange arc spinner -->
    <svg
      class="h-12 w-12 animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle class="opacity-20" cx="12" cy="12" r="10" stroke="#f97316" stroke-width="3" />
      <path class="opacity-90" fill="#f97316" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>

    <!-- Status text — always directly below the spinner -->
    <p class="text-center text-sm font-medium tracking-wide text-white/75">
      {{ statusText }}
    </p>

    <!-- Slim download progress bar — only visible while downloading -->
    <div v-if="showProgress" class="mt-1 h-px w-44 overflow-hidden rounded-full bg-white/10">
      <div
        class="h-full rounded-full bg-orange-500 transition-[width] duration-200"
        :style="{ width: `${store.percent}%` }"
      />
    </div>
  </div>
</template>
