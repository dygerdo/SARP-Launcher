<template>
  <Sidebar
    v-model:visible="localVisible"
    position="right"
    class="deps-drawer"
    :show-close-icon="false"
    :pt="{
      root: { style: 'width: 480px; background: #0d0d0d; border-left: 1px solid #1e1e1e;' },
      header: { style: 'display: none;' },
      content: {
        style: 'padding: 0; height: 100%; overflow: hidden; display: flex; flex-direction: column;',
      },
    }"
  >
    <div class="flex h-full flex-col bg-[#0d0d0d] text-white">
      <!-- Header -->
      <header
        class="flex shrink-0 items-start justify-between border-b border-[#1e1e1e] bg-[#111] px-7 py-6"
      >
        <div class="flex flex-col gap-1">
          <span class="text-[10px] font-bold uppercase tracking-[0.18em] text-orange-500">
            Configuración
          </span>
          <h2 class="text-[18px] font-bold leading-tight tracking-tight text-[#f0f0f0]">
            Requisitos del sistema
          </h2>
          <p class="text-[12px] text-[#4a4a4a]">Librerías necesarias para GTA:SA</p>
        </div>
        <button
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] text-[#555] transition-all hover:bg-[#252525] hover:text-[#ddd]"
          @click="localVisible = false"
        >
          <i class="pi pi-times text-[11px]" />
        </button>
      </header>

      <!-- Info Banner -->
      <div
        class="flex shrink-0 gap-3 border-b border-orange-500/10 bg-orange-500/[0.04] px-6 py-3.5"
      >
        <i class="pi pi-info-circle mt-[2px] shrink-0 text-[13px] text-orange-500/60" />
        <p class="text-[12px] leading-relaxed text-[#555]">
          Instala estas librerías si experimentas cuelgues o errores al iniciar el juego. Se
          recomienda tener todas instaladas para mayor estabilidad.
        </p>
      </div>

      <!-- Dep List -->
      <div class="custom-scrollbar flex-1 overflow-y-auto">
        <div class="flex flex-col gap-7 py-6">
          <section v-for="group in GROUPS" :key="group" class="flex flex-col gap-3 px-6">
            <!-- Group Header -->
            <div class="flex items-center gap-3">
              <span
                class="shrink-0 text-[9.5px] font-bold uppercase tracking-[0.18em] text-[#3a3a3a]"
              >
                {{ DEP_GROUP_LABELS[group] }}
              </span>
              <div class="h-px flex-1 bg-[#1d1d1d]" />
            </div>

            <!-- Dep Cards -->
            <div
              v-for="dep in depsInGroup(group)"
              :key="dep.id"
              class="group/card flex items-center gap-4 rounded-xl border border-[#1e1e1e] bg-[#141414] px-4 py-3.5 transition-all hover:border-orange-500/20 hover:bg-[#161616]"
            >
              <!-- Icon -->
              <div
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-orange-500/[0.18] bg-orange-500/[0.12] transition-transform group-hover/card:scale-105"
              >
                <i class="pi pi-box text-[15px] text-orange-500" />
              </div>

              <!-- Info -->
              <div class="flex flex-1 flex-col gap-[3px]">
                <div class="flex items-center gap-2">
                  <span class="text-[13px] font-bold uppercase tracking-[0.02em] text-[#e2e2e2]">
                    {{ dep.name }}
                  </span>
                  <span
                    v-if="dep.critical"
                    class="shrink-0 rounded-full border border-red-500/20 bg-red-500/10 px-2 py-[2px] text-[8.5px] font-bold uppercase tracking-wide text-red-400"
                  >
                    Req
                  </span>
                  <span
                    v-else-if="dep.recommended"
                    class="shrink-0 rounded-full border border-orange-500/20 bg-orange-500/10 px-2 py-[2px] text-[8.5px] font-bold uppercase tracking-wide text-orange-500"
                  >
                    Rec
                  </span>
                </div>
                <span class="text-[11.5px] text-[#444]">
                  {{ dep.critical ? "Necesaria para el ejecutable" : "Mejora estabilidad" }}
                </span>
              </div>

              <!-- Download Button -->
              <button
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-[#252525] bg-transparent text-[#555] transition-all hover:border-orange-500 hover:bg-orange-500 hover:text-black"
                title="Descargar"
                @click="store.openDepUrl(dep.downloadUrl)"
              >
                <i class="pi pi-download text-[12px]" />
              </button>
            </div>
          </section>
        </div>
      </div>

      <!-- Footer -->
      <footer
        class="flex shrink-0 items-center gap-2.5 border-t border-[#1a1a1a] bg-[#0f0f0f] px-6 py-3.5"
      >
        <i class="pi pi-shield text-[11px] text-orange-500/40" />
        <span class="text-[11px] text-[#3d3d3d]">
          Requiere permisos de administrador para instalar
        </span>
      </footer>
    </div>
  </Sidebar>
</template>

<script setup lang="ts">
import { computed } from "vue"
import Sidebar from "primevue/sidebar"
import { DEP_GROUP_LABELS, SYSTEM_DEPENDENCIES } from "@/data/mods"
import type { DepGroup } from "@/types/mods"
import { useModsStore } from "@/stores/mods"

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  "update:visible": [value: boolean]
}>()

const store = useModsStore()

const localVisible = computed({
  get: () => props.visible,
  set: (v) => emit("update:visible", v),
})

const GROUPS: DepGroup[] = ["vcredist", "directx", "openal", "dotnet"]

function depsInGroup(group: DepGroup) {
  return SYSTEM_DEPENDENCIES.filter((d) => d.group === group)
}
</script>

<style scoped>
.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: #222 transparent;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #222;
  border-radius: 4px;
}
</style>
