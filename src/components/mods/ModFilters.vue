<script setup lang="ts">
import { ref, watch } from "vue"
import { useModsStore } from "@/stores/mods"
import type { ModCategory, ModType } from "@/types/mods"

const store = useModsStore()
const localSearch = ref("")
let debounceTimer: ReturnType<typeof setTimeout> | null = null

watch(localSearch, (val) => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    store.searchQuery = val
  }, 200)
})

const categories: { label: string; value: ModCategory | "all" }[] = [
  { label: "Todas", value: "all" },
  { label: "Vehículos", value: "vehicles" },
  { label: "CLEO", value: "cleo" },
  { label: "Gráficos", value: "graphics" },
  { label: "Realismo", value: "reality" },
  { label: "Rendimiento", value: "performance" },
  { label: "Audio", value: "audio" },
  { label: "Mapas", value: "map" },
  { label: "Misc.", value: "misc" },
]

const types: { label: string; value: ModType | "all" }[] = [
  { label: "Todos", value: "all" },
  { label: ".ASI", value: "asi" },
  { label: ".CS (CLEO)", value: "cleo" },
  { label: "ModLoader", value: "modloader" },
]
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="relative">
      <i
        class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-sm text-white/25 pointer-events-none"
      />
      <input
        v-model="localSearch"
        type="text"
        placeholder="Buscar mods..."
        class="w-full h-10 pl-10 pr-4 rounded-xl bg-white/[0.03] text-sm text-white placeholder:text-white/25 outline-none transition-colors focus:bg-white/[0.05]"
      />
    </div>

    <div class="flex flex-wrap gap-1.5">
      <button
        v-for="cat in categories"
        :key="cat.value"
        class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
        :class="
          store.selectedCategory === cat.value
            ? 'bg-orange-500 text-black'
            : 'bg-white/[0.04] text-white/40 hover:bg-white/[0.06] hover:text-white/70'
        "
        @click="store.selectedCategory = cat.value"
      >
        {{ cat.label }}
      </button>
    </div>

    <div class="flex flex-wrap gap-1.5">
      <button
        v-for="typ in types"
        :key="typ.value"
        class="px-3 py-1.5 rounded-lg text-xs font-medium font-mono transition-colors"
        :class="
          store.selectedType === typ.value
            ? 'bg-orange-500 text-black'
            : 'bg-white/[0.04] text-white/40 hover:bg-white/[0.06] hover:text-white/70'
        "
        @click="store.selectedType = typ.value"
      >
        {{ typ.label }}
      </button>
    </div>
  </div>
</template>
