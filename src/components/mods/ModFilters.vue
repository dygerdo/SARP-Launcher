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
  <div class="filters-bar">
    <!-- Search -->
    <div class="search-wrap">
      <i class="pi pi-search search-icon" />
      <input
        v-model="localSearch"
        type="text"
        placeholder="BUSCAR MODS..."
        class="search-input"
      />
    </div>

    <!-- Category chips -->
    <div class="chips">
      <button
        v-for="cat in categories"
        :key="cat.value"
        class="chip"
        :class="{ 'chip--active': store.selectedCategory === cat.value }"
        @click="store.selectedCategory = cat.value"
      >
        {{ cat.label }}
      </button>
    </div>

    <!-- Type chips -->
    <div class="chips">
      <button
        v-for="typ in types"
        :key="typ.value"
        class="chip chip--type"
        :class="{ 'chip--active': store.selectedType === typ.value }"
        @click="store.selectedType = typ.value"
      >
        {{ typ.label }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.filters-bar {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.search-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 12px;
  font-size: 12px;
  color: #444;
  pointer-events: none;
}

.search-input {
  width: 100%;
  height: 36px;
  padding: 0 12px 0 36px;
  background: #090909;
  border: 1px solid #1f1f1f;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  outline: none;
  transition: border-color 0.2s;
}

.search-input::placeholder {
  color: #333;
}

.search-input:focus {
  border-color: #333;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.chip {
  padding: 4px 10px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  background: transparent;
  border: 1px solid #1f1f1f;
  color: #444;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
}

.chip:hover {
  border-color: #333;
  color: #aaa;
}

.chip--active {
  background: #f97316;
  border-color: #f97316;
  color: #000;
}

.chip--type {
  font-family: monospace;
}
</style>
