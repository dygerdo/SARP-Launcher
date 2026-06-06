<script setup lang="ts">
import { useModsStore } from "@/stores/mods"
import { computed } from "vue"

defineEmits<{ open: [] }>()

const store = useModsStore()

const criticalMissingCount = computed(() => {
  return Object.values(store.depStatuses).filter((s) => s === "missing").length
})
</script>

<template>
  <div
    class="relative group overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 transition-all hover:border-orange-500/30"
  >
    <div class="flex items-center gap-4">
      <!-- Icon Area -->
      <div
        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-500/10 text-orange-500 ring-1 ring-orange-500/20"
      >
        <i
          :class="[
            'text-lg',
            criticalMissingCount > 0 ? 'pi pi-exclamation-triangle animate-pulse' : 'pi pi-shield',
          ]"
        />
      </div>

      <!-- Info Area -->
      <div class="flex-1 space-y-0.5">
        <h4 class="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500/80">
          Estado del Sistema
        </h4>
        <p class="text-xs font-medium text-zinc-300">
          <template v-if="criticalMissingCount > 0">
            Se han detectado {{ criticalMissingCount }} componentes del sistema faltantes.
          </template>
          <template v-else>
            Revisa las librerías necesarias para el funcionamiento óptimo de GTA SA.
          </template>
        </p>
      </div>

      <!-- Action Area -->
      <button
        class="shrink-0 rounded-lg border border-white/5 bg-white/5 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-orange-500 hover:text-black hover:border-orange-500"
        @click="$emit('open')"
      >
        CONFIGURAR
      </button>
    </div>
  </div>
</template>
