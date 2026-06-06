<script setup lang="ts">
import { computed } from "vue"
import Button from "primevue/button"
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

const repairReason = computed(() => {
  if (isPartial.value) {
    return "Se han detectado archivos faltantes o corruptos. La reparación reinstalará los componentes necesarios."
  }
  return null
})

async function handleAction() {
  if (!mod.value) return
  if (!isInstalled.value || isPartial.value) {
    await store.installMod(mod.value)
    return
  }

  confirm.require({
    message: `¿Estás seguro de que deseas desinstalar ${mod.value.name}? Todos sus archivos serán eliminados permanentemente.`,
    header: "Confirmar desinstalación",
    icon: "pi pi-exclamation-triangle",
    rejectLabel: "Cancelar",
    acceptLabel: "Desinstalar",
    rejectProps: {
      label: "Cancelar",
      severity: "secondary",
      outlined: true,
    },
    acceptProps: {
      label: "Desinstalar",
      severity: "danger",
    },
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
    class="!bg-[#0a0a0a] !border-[#2a2a2a] !p-0 !max-w-md !w-[90vw]"
    :pt="{
      header: { class: '!bg-[#111] !border-b !border-[#222] !px-6 !py-4' },
      headerTitle: { class: '!text-lg !font-bold !text-white' },
      closeButton: { class: '!text-white/40 hover:!bg-white/5' },
      content: { class: '!bg-[#0a0a0a] !px-6 !py-6 !overflow-x-hidden' },
    }"
  >
    <div v-if="mod" class="flex flex-col gap-6">
      <div class="flex flex-col gap-4">
        <div class="flex items-center justify-between">
          <span
            class="rounded-full bg-orange-500/10 border border-orange-500/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-orange-400"
          >
            {{ mod.category }}
          </span>
          <span class="text-xs text-white/20 font-mono">ID: {{ mod.id }}</span>
        </div>

        <p class="text-sm leading-relaxed text-zinc-300">
          {{ mod.description }}
        </p>
      </div>

      <div
        v-if="repairReason"
        class="rounded-lg border border-rose-500/20 bg-rose-500/5 p-4 flex gap-3"
      >
        <i class="pi pi-info-circle text-rose-500 mt-0.5" />
        <div class="flex flex-col gap-1">
          <span class="text-[11px] font-bold uppercase tracking-wider text-rose-400"
            >Razón de reparación</span
          >
          <span class="text-xs text-rose-300/80">{{ repairReason }}</span>
        </div>
      </div>

      <div v-if="mod.dependsOn && mod.dependsOn.length > 0" class="flex flex-col gap-2">
        <span class="text-[10px] font-bold uppercase tracking-widest text-white/30"
          >Dependencias</span
        >
        <div class="flex flex-wrap gap-2">
          <span
            v-for="dep in mod.dependsOn"
            :key="dep"
            class="rounded bg-white/5 px-2 py-1 text-[10px] text-white/60"
          >
            {{ dep }}
          </span>
        </div>
      </div>

      <div class="flex flex-col gap-4 border-t border-[#222] pt-6">
        <div class="flex gap-3">
          <template v-if="isInstalling">
            <div
              class="relative flex-1 overflow-hidden rounded-md border border-orange-500/50 bg-orange-500/10 h-[42px]"
            >
              <div
                class="absolute left-0 top-0 h-full bg-orange-500/30 transition-[width] duration-300 ease-out"
                :style="{ width: `${progress}%` }"
              />
              <div
                class="absolute inset-0 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest text-orange-400"
              >
                <i class="pi pi-spinner animate-spin" />
                <span>{{ Math.round(progress) }}%</span>
              </div>
            </div>
          </template>
          <template v-else>
            <Button
              :label="
                isInstalled && !isPartial ? 'Desinstalar' : isPartial ? 'Reparar' : 'Instalar'
              "
              :severity="isInstalled && !isPartial ? 'danger' : 'primary'"
              class="!flex-1 !rounded-md !py-3 !text-xs !font-bold !uppercase !tracking-widest"
              :disabled="!isInstalled && !canInstall"
              @click="handleAction"
            />
          </template>
          <Button
            label="Cerrar"
            outlined
            class="!rounded-md !px-6 !text-xs !font-bold !uppercase !tracking-widest !border-zinc-800 !text-white/60 hover:!bg-white/5"
            @click="visible = false"
          />
        </div>
      </div>
    </div>
  </Dialog>
</template>

<style scoped>
:deep(.p-dialog-mask) {
  -webkit-backdrop-filter: blur(4px);
  backdrop-filter: blur(4px);
  background-color: rgba(0, 0, 0, 0.6);
}
:deep(.p-progressbar-value) {
  background: #f97316;
}
</style>
