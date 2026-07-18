<template>
  <Sidebar
    v-model:visible="localVisible"
    position="right"
    :show-close-icon="false"
    :pt="{
      root: { class: '!w-[420px] !bg-[#0e0e10]' },
      header: { style: 'display: none;' },
      content: {
        style: 'padding: 0; height: 100%; overflow: hidden; display: flex; flex-direction: column;',
      },
    }"
  >
    <div class="relative flex h-full flex-col bg-[#0e0e10] text-white">
      <header class="flex flex-shrink-0 items-center justify-between px-5 pt-5 pb-4">
        <div>
          <p class="mb-0.5 text-[9px] font-bold uppercase tracking-[0.2em] text-white/20">
            Configuración del sistema
          </p>
          <h2 class="text-sm font-bold text-white/80 leading-none">Requisitos</h2>
        </div>
        <button
          class="flex h-6 w-6 items-center justify-center rounded-lg text-white/20 transition-colors hover:bg-white/[0.05] hover:text-white/60"
          @click="localVisible = false"
        >
          <i class="pi pi-times text-[10px]" />
        </button>
      </header>

      <div class="h-px mx-5" style="background: rgba(128, 128, 128, 0.2)" />

      <div class="flex-1 overflow-y-auto py-3 scrollbar-thin">
        <section v-for="group in GROUPS" :key="group" class="px-5 pb-4">
          <p class="mb-2 text-[9px] font-bold uppercase tracking-[0.2em] text-white/15">
            {{ DEP_GROUP_LABELS[group] }}
          </p>

          <div class="flex flex-col">
            <div
              v-for="(dep, idx) in depsInGroup(group)"
              v-show="idx === 0 || expandedGroups.has(group)"
              :key="dep.id"
              class="flex items-center gap-3 py-2"
              :class="idx > 0 ? 'opacity-50' : ''"
            >
              <div class="min-w-0 flex-1">
                <span class="text-xs font-semibold text-white/70">
                  {{ dep.name }}
                  <template v-if="dep.critical">
                    <span class="text-white/15"> · </span>
                    <span class="text-[9px] font-bold uppercase tracking-wider text-orange-400/80"
                      >Requerida</span
                    >
                  </template>
                  <template v-else-if="dep.recommended">
                    <span class="text-white/15"> · </span>
                    <span class="text-[9px] font-bold uppercase tracking-wider text-orange-400/30"
                      >Recomendada</span
                    >
                  </template>
                </span>
              </div>

              <button
                class="shrink-0 rounded-md px-2.5 py-1 text-[10px] font-semibold text-white/25 transition-all hover:bg-orange-500/5 hover:text-orange-400"
                style="border: 1px solid rgba(128, 128, 128, 0.5)"
                @click="store.openDepUrl(dep.downloadUrl)"
              >
                Instalar
              </button>
            </div>

            <button
              v-if="depsInGroup(group).length > 1"
              class="flex items-center justify-center gap-1.5 py-1.5 text-[9px] font-bold uppercase tracking-wider text-white/15 transition-colors hover:text-orange-400/40"
              @click="toggleGroup(group)"
            >
              <i
                class="pi text-[7px]"
                :class="expandedGroups.has(group) ? 'pi-chevron-up' : 'pi-chevron-down'"
              />
              <span v-if="!expandedGroups.has(group)">
                {{ depsInGroup(group).length - 1 }} más
              </span>
              <span v-else>Menos</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  </Sidebar>
</template>

<script setup lang="ts">
import { computed, ref } from "vue"
import Sidebar from "primevue/sidebar"
import { DEP_GROUP_LABELS, SYSTEM_DEPENDENCIES } from "@/data/mods"
import type { DepGroup } from "@/types/mods"
import { useModsStore } from "@/stores/mods"

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ "update:visible": [value: boolean] }>()

const store = useModsStore()

const localVisible = computed({
  get: () => props.visible,
  set: (v) => emit("update:visible", v),
})

const GROUPS: DepGroup[] = ["vcredist", "directx", "openal", "dotnet"]

const expandedGroups = ref<Set<DepGroup>>(new Set())

function depsInGroup(group: DepGroup) {
  return SYSTEM_DEPENDENCIES.filter((d) => d.group === group)
}

function toggleGroup(group: DepGroup) {
  const next = new Set(expandedGroups.value)
  next.has(group) ? next.delete(group) : next.add(group)
  expandedGroups.value = next
}
</script>

<style scoped>
.scrollbar-thin {
  scrollbar-width: thin;
  scrollbar-color: #1e1e1e transparent;
}
.scrollbar-thin::-webkit-scrollbar {
  width: 3px;
}
.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}
.scrollbar-thin::-webkit-scrollbar-thumb {
  background: #1e1e1e;
  border-radius: 4px;
}
</style>
