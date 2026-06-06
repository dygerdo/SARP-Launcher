<script setup lang="ts">
import { ref, watch } from "vue"
import Select from "primevue/select"
import InputText from "primevue/inputtext"
import IconField from "primevue/iconfield"
import InputIcon from "primevue/inputicon"
import { useModsStore } from "@/stores/mods"

const store = useModsStore()
const localSearch = ref("")
let debounceTimer: ReturnType<typeof setTimeout> | null = null

watch(localSearch, (val) => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    store.searchQuery = val
  }, 200)
})

const categories = [
  { label: "Todas las categorías", value: "all" },
  { label: "Vehículos", value: "vehicles" },
  { label: "CLEO", value: "cleo" },
  { label: "Gráficos", value: "graphics" },
  { label: "Realismo", value: "reality" },
  { label: "Rendimiento", value: "performance" },
  { label: "Audio", value: "audio" },
  { label: "Mapas", value: "map" },
  { label: "Miscelánea", value: "misc" },
]

const types = [
  { label: "Todos los tipos", value: "all" },
  { label: "ASI (.asi)", value: "asi" },
  { label: "CLEO (.cs)", value: "cleo" },
  { label: "ModLoader", value: "modloader" },
]

const selectPT = {
  root: { class: "!bg-[#1a1a1a] !border-[#2a2a2a] !rounded-lg !h-10 grow md:grow-0" },
  label: {
    class:
      "!text-[11px] !font-bold !uppercase !tracking-wider !text-white/70 !py-0 !flex !items-center",
  },
  dropdown: { class: "!text-white/40" },
  overlay: { class: "!bg-[#1a1a1a] !border-[#2a2a2a] !p-1 !shadow-2xl !min-w-[200px]" },
  list: { class: "!p-0 !flex !flex-col !gap-0.5" },
  option: ({ context }: { context: any }) => ({
    class: [
      "!text-[11px] !font-bold !uppercase !tracking-wider !px-3 !py-2.5 !rounded-md !transition-colors !cursor-pointer",
      context.selected
        ? "!bg-orange-500 !text-black"
        : "!text-white/60 hover:!bg-white/5 hover:!text-white",
    ],
  }),
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-3">
    <IconField class="flex-1 min-w-[240px]">
      <InputIcon class="pi pi-search text-white/20" />
      <InputText
        v-model="localSearch"
        placeholder="BUSCAR MODS..."
        class="w-full !h-10 !bg-[#1a1a1a] !border-[#2a2a2a] !rounded-lg !text-[11px] !font-bold !uppercase !tracking-wider !text-white placeholder:!text-white/20 focus:!border-orange-500/50 focus:!ring-0 transition-all"
      />
    </IconField>

    <Select
      v-model="store.selectedCategory"
      :options="categories"
      option-label="label"
      option-value="value"
      placeholder="CATEGORÍA"
      :pt="selectPT"
      class="min-w-[200px]"
    />

    <Select
      v-model="store.selectedType"
      :options="types"
      option-label="label"
      option-value="value"
      placeholder="TIPO"
      :pt="selectPT"
      class="min-w-[160px]"
    />
  </div>
</template>

<style>
/* Global styles for PrimeVue Select overaly to avoid white background even when appended to body */
.p-select-overlay {
  background-color: #1a1a1a !important;
  border: 1px solid #2a2a2a !important;
  border-radius: 8px !important;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5) !important;
  padding: 4px !important;
}

.p-select-list-container {
  background-color: #1a1a1a !important;
}

.p-select-list {
  padding: 0 !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 2px !important;
}

.p-select-option {
  color: rgba(255, 255, 255, 0.6) !important;
  padding: 10px 12px !important;
  font-size: 11px !important;
  font-weight: 700 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.05em !important;
  border-radius: 6px !important;
  transition: all 0.2s ease !important;
}

.p-select-option:not(.p-select-option-selected):hover {
  background-color: rgba(255, 255, 255, 0.05) !important;
  color: white !important;
}

.p-select-option-selected {
  background-color: #f97316 !important;
  color: #000000 !important;
}

/* Scrollbar del panel */
.p-select-list-container::-webkit-scrollbar {
  width: 4px;
}
.p-select-list-container::-webkit-scrollbar-track {
  background: transparent;
}
.p-select-list-container::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}
</style>
