<script setup lang="ts">
import { computed } from "vue"
import Dialog from "primevue/dialog"
import { useConfirm } from "primevue/useconfirm"
import { useModsStore } from "@/stores/mods"

const store = useModsStore()
const confirm = useConfirm()
const mod = computed(() => store.selectedMod)
const visible = computed({
  get: () => !!store.selectedMod,
  set: (val) => {
    if (!val) store.selectedMod = null
  },
})

const isInstalled = computed(() => (mod.value ? store.isInstalled(mod.value.id) : false))
const isPartial = computed(() => (mod.value ? store.isPartial(mod.value.id) : false))
const canInstall = computed(() => (mod.value ? store.canInstall(mod.value) : false))
const isInstalling = computed(() => (mod.value ? !!store.installing[mod.value.id] : false))
const progress = computed(() => (mod.value ? (store.installing[mod.value.id] ?? 0) : 0))

const categoryLabels: Record<string, string> = {
  vehicles: "Vehículos",
  cleo: "CLEO",
  graphics: "Gráficos",
  reality: "Realismo",
  performance: "Rendimiento",
  audio: "Audio",
  map: "Mapas",
  misc: "Misc.",
}

async function handleInstall() {
  if (!mod.value) return
  await store.installMod(mod.value)
}

function handleUninstall() {
  if (!mod.value) return
  confirm.require({
    message: `¿Seguro que quieres desinstalar ${mod.value.name}? Se eliminarán todos sus archivos.`,
    header: "Confirmar desinstalación",
    icon: "pi pi-exclamation-triangle",
    rejectLabel: "Cancelar",
    acceptLabel: "Desinstalar",
    rejectProps: { label: "Cancelar", severity: "secondary", outlined: true },
    acceptProps: { label: "Desinstalar", severity: "danger" },
    accept: async () => {
      await store.uninstallMod(mod.value!)
    },
  })
}
</script>

<template>
  <Dialog
    v-model:visible="visible"
    modal
    dismissable-mask
    :header="mod?.name || 'Detalles del Mod'"
    :pt="{
      root: { class: '!rounded-none !border-[#222] !bg-[#090909] !max-w-md !w-[90vw]' },
      header: { class: '!bg-[#0d0d0d] !border-b !border-[#1a1a1a] !px-5 !py-4' },
      headerTitle: { class: '!text-sm !font-bold !uppercase !tracking-widest !text-white' },
      closeButton: { class: '!text-white/30 hover:!bg-white/5 !rounded-none' },
      content: { class: '!bg-[#090909] !px-5 !py-5' },
    }"
  >
    <div v-if="mod" class="flex flex-col gap-5">
      <!-- Meta row -->
      <div class="flex items-center gap-3">
        <span class="border border-[#222] bg-[#111] px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-[#555]">
          {{ categoryLabels[mod.category] ?? mod.category }}
        </span>
        <span class="text-[9px] font-mono text-[#333] uppercase tracking-wider">v{{ mod.version }}</span>
        <span class="ml-auto text-[9px] font-mono text-[#333]">{{ mod.id }}</span>
      </div>

      <!-- Description -->
      <p class="text-xs leading-relaxed text-[#888]">{{ mod.description }}</p>

      <!-- Repair notice -->
      <div
        v-if="isPartial"
        class="border border-rose-900/50 bg-rose-900/10 p-3 flex gap-2 items-start"
      >
        <i class="pi pi-exclamation-triangle text-rose-500 text-xs mt-0.5 shrink-0" />
        <p class="text-[11px] text-rose-300/80 leading-snug">
          Archivos faltantes detectados. La reparación reinstalará los componentes necesarios.
        </p>
      </div>

      <!-- Dependencies -->
      <div v-if="mod.dependsOn && mod.dependsOn.length > 0" class="flex flex-col gap-2">
        <span class="text-[9px] font-bold uppercase tracking-widest text-[#444]">Dependencias</span>
        <div class="flex flex-wrap gap-1.5">
          <span
            v-for="dep in mod.dependsOn"
            :key="dep"
            class="border border-[#222] bg-[#111] px-2 py-0.5 text-[9px] font-mono text-[#666]"
          >
            {{ dep }}
          </span>
        </div>
      </div>

      <!-- Files list -->
      <div class="flex flex-col gap-2">
        <span class="text-[9px] font-bold uppercase tracking-widest text-[#444]">Archivos</span>
        <div class="flex flex-col gap-1">
          <div
            v-for="file in mod.files"
            :key="file.filename"
            class="flex items-center gap-2 border-b border-[#111] pb-1"
          >
            <i class="pi pi-file text-[10px] text-[#444]" />
            <span class="text-[10px] font-mono text-[#666]">{{ file.filename }}</span>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="border-t border-[#111] pt-4 flex gap-2">
        <!-- Installing progress -->
        <template v-if="isInstalling">
          <div class="relative flex-1 h-9 border border-orange-500/20 bg-orange-500/5 overflow-hidden">
            <div
              class="absolute left-0 top-0 h-full bg-orange-500/20 transition-[width] duration-300"
              :style="{ width: `${progress}%` }"
            />
            <div class="absolute inset-0 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest text-orange-400">
              <i class="pi pi-spinner animate-spin" />
              <span>{{ Math.round(progress) }}%</span>
            </div>
          </div>
        </template>
        <template v-else>
          <!-- Install / Repair -->
          <button
            v-if="!isInstalled || isPartial"
            class="flex-1 h-9 border text-[10px] font-bold uppercase tracking-widest transition-colors"
            :class="isPartial
              ? 'border-rose-900 bg-rose-900/10 text-rose-400 hover:bg-rose-900/20'
              : 'border-[#222] bg-[#111] text-[#aaa] hover:border-orange-500 hover:text-orange-500 disabled:border-[#111] disabled:text-[#333]'"
            :disabled="!isPartial && !canInstall"
            @click="handleInstall"
          >
            {{ isPartial ? "REPARAR" : "INSTALAR" }}
          </button>

          <!-- Uninstall -->
          <button
            v-if="isInstalled"
            class="flex-1 h-9 border border-[#222] bg-transparent text-[10px] font-bold uppercase tracking-widest text-[#666] hover:border-red-900 hover:text-red-500 transition-colors"
            @click="handleUninstall"
          >
            DESINSTALAR
          </button>
        </template>

        <button
          class="h-9 px-4 border border-[#1f1f1f] text-[10px] font-bold uppercase tracking-widest text-[#555] hover:text-[#aaa] transition-colors"
          @click="visible = false"
        >
          CERRAR
        </button>
      </div>
    </div>
  </Dialog>
</template>

<style scoped>
:deep(.p-dialog-mask) {
  backdrop-filter: blur(4px);
  background-color: rgba(0, 0, 0, 0.7);
}
</style>
