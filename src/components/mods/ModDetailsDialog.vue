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
      root: {
        class:
          '!rounded-2xl !bg-[#0e0e10] !max-w-lg !w-[90vw] !shadow-[0_32px_80px_rgba(0,0,0,0.7)]',
      },
      header: { class: '!bg-[#111113] !rounded-t-2xl !px-5 !py-4' },
      headerTitle: { class: '!text-sm !font-bold !uppercase !tracking-widest !text-white/90' },
      closeButton: { class: '!text-white/30 hover:!bg-white/5 !rounded-lg' },
      content: { class: '!bg-[#0e0e10] !px-5 !py-5 !rounded-b-2xl' },
    }"
  >
    <div v-if="mod" class="flex flex-col gap-5">
      <div class="flex items-center gap-2.5 flex-wrap">
        <span
          class="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-orange-400/80 bg-orange-500/8 rounded-md"
        >
          {{ categoryLabels[mod.category] ?? mod.category }}
        </span>
        <span class="text-[10px] font-mono text-white/25">v{{ mod.version }}</span>
        <span class="ml-auto text-[10px] font-mono text-white/15">{{ mod.id }}</span>
      </div>

      <div class="rounded-xl bg-white/[0.02] p-4">
        <p class="text-[11px] leading-relaxed text-white/50">{{ mod.description }}</p>
      </div>

      <div v-if="isPartial" class="flex gap-2.5 items-start p-3 rounded-xl bg-rose-500/8">
        <i class="pi pi-exclamation-triangle text-rose-400 text-xs mt-0.5 shrink-0" />
        <p class="text-[11px] text-rose-300/80 leading-snug">
          Archivos faltantes detectados. La reparación reinstalará los componentes necesarios.
        </p>
      </div>

      <div v-if="mod.dependsOn && mod.dependsOn.length > 0" class="flex flex-col gap-2">
        <span class="text-[10px] font-semibold uppercase tracking-wider text-white/25"
          >Dependencias</span
        >
        <div class="flex flex-wrap gap-1.5">
          <span
            v-for="dep in mod.dependsOn"
            :key="dep"
            class="px-2 py-0.5 text-[10px] font-mono text-white/35 bg-white/[0.04] rounded-md"
          >
            {{ dep }}
          </span>
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <span class="text-[10px] font-semibold uppercase tracking-wider text-white/25"
          >Archivos incluidos</span
        >
        <div class="rounded-xl bg-white/[0.02] divide-y divide-white/5">
          <div
            v-for="file in mod.files"
            :key="file.filename"
            class="flex items-center gap-2.5 px-3 py-2"
          >
            <i class="pi pi-file text-[11px] text-white/20" />
            <span class="text-[11px] font-mono text-white/35">{{ file.filename }}</span>
          </div>
        </div>
      </div>

      <div class="pt-4 flex gap-2">
        <template v-if="isInstalling">
          <div class="relative flex-1 h-9 bg-orange-500/5 overflow-hidden rounded-xl">
            <div
              class="absolute left-0 top-0 h-full bg-orange-500/20 transition-[width] duration-300"
              :style="{ width: `${progress}%` }"
            />
            <div
              class="absolute inset-0 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wider text-orange-400"
            >
              <i class="pi pi-spinner animate-spin" />
              <span>{{ Math.round(progress) }}%</span>
            </div>
          </div>
        </template>
        <template v-else>
          <button
            v-if="!isInstalled || isPartial"
            class="flex-1 h-9 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all duration-200"
            :class="
              isPartial
                ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/15'
                : 'bg-white/[0.04] text-white/70 hover:bg-orange-500/10 hover:text-orange-400 hover:shadow-[0_0_16px_rgba(251,115,0,0.15)] disabled:bg-white/[0.02] disabled:text-white/20'
            "
            :disabled="!isPartial && !canInstall"
            @click="handleInstall"
          >
            {{ isPartial ? "REPARAR" : "INSTALAR" }}
          </button>

          <button
            v-if="isInstalled"
            class="flex-1 h-9 rounded-xl bg-transparent text-xs font-semibold uppercase tracking-wider text-white/35 transition-colors hover:bg-rose-500/10 hover:text-rose-400"
            @click="handleUninstall"
          >
            DESINSTALAR
          </button>
        </template>

        <button
          class="h-9 px-4 rounded-xl bg-transparent text-xs font-semibold uppercase tracking-wider text-white/30 transition-colors hover:text-white/60"
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
