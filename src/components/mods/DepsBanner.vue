<script setup lang="ts">
import { useModsStore } from "@/stores/mods"
import { computed } from "vue"

defineEmits<{ open: [] }>()

const store = useModsStore()

const criticalMissingCount = computed(() => {
  return Object.values(store.depStatuses).filter((s) => s === "missing").length
})

const hasIssues = computed(() => criticalMissingCount.value > 0)
</script>

<template>
  <div
    class="relative overflow-hidden rounded-xl transition-all duration-300 cursor-pointer"
    :class="hasIssues ? 'bg-white/[0.03]' : 'bg-white/[0.02] hover:bg-white/[0.03]'"
    @click="$emit('open')"
  >
    <div
      v-if="hasIssues"
      class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-500/50 to-transparent"
    />

    <div class="relative flex items-center gap-4 p-4">
      <div
        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors"
        :class="hasIssues ? 'bg-orange-500/10 text-orange-400' : 'bg-white/[0.04] text-white/30'"
      >
        <i class="pi pi-server text-base" />
      </div>

      <div class="flex-1 min-w-0">
        <p
          class="text-[10px] font-bold uppercase tracking-[0.2em] mb-0.5"
          :class="hasIssues ? 'text-orange-400/70' : 'text-white/30'"
        >
          Dependencias del Sistema
        </p>
        <p class="text-sm leading-snug" :class="hasIssues ? 'text-white/60' : 'text-white/40'">
          <template v-if="hasIssues">
            <span
              class="inline-flex items-center justify-center w-5 h-5 rounded-md text-[10px] font-bold bg-orange-500/15 text-orange-400 mr-1.5 align-middle"
            >
              {{ criticalMissingCount }}
            </span>
            componente{{ criticalMissingCount > 1 ? "s" : "" }} faltante{{
              criticalMissingCount > 1 ? "s" : ""
            }}
          </template>
          <template v-else>
            Librerías necesarias para el funcionamiento óptimo del juego.
          </template>
        </p>
      </div>

      <div
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-semibold uppercase tracking-wider shrink-0 transition-colors"
        :class="
          hasIssues
            ? 'bg-orange-500/10 text-orange-400 hover:bg-orange-500/15'
            : 'bg-white/[0.04] text-white/40 hover:bg-white/[0.06] hover:text-white/60'
        "
      >
        <span>Configurar</span>
        <i class="pi pi-arrow-right text-[9px]" />
      </div>
    </div>
  </div>
</template>
