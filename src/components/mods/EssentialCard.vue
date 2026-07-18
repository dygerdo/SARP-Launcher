<script setup lang="ts">
import { computed } from "vue"
import { useConfirm } from "primevue/useconfirm"
import { useModsStore } from "@/stores/mods"
import { MOD_CATALOG } from "@/data/mods"
import type { EssentialId } from "@/types/mods"

const props = defineProps<{
  id: EssentialId
  name: string
  description: string
}>()

const store = useModsStore()
const confirm = useConfirm()
const isInstalled = computed(() => store.essentials[props.id] === "ok")
const needsRepair = computed(() => store.essentials[props.id] === "reparar")
const isAsiLoader = computed(() => props.id === "asiloader")
const asiloaderMissing = computed(() => store.asiloaderMissing)
const isLocked = computed(() => !isAsiLoader.value && asiloaderMissing.value)

const modDefinition = computed(() => MOD_CATALOG.find((m) => m.id === props.id))

const handleInstall = async () => {
  const mod = modDefinition.value
  if (mod) {
    await store.installMod(mod)
  }
}

const errorMessage = computed(() => store.errors[props.id] ?? "")

const handleUninstall = async () => {
  const mod = modDefinition.value
  if (!mod) return

  confirm.require({
    message: `¿Estás seguro de que deseas desinstalar ${mod.name}?`,
    header: "Confirmar desinstalación",
    icon: "pi pi-exclamation-triangle",
    rejectLabel: "Cancelar",
    acceptLabel: "Desinstalar",
    rejectProps: { label: "Cancelar", severity: "secondary", outlined: true },
    acceptProps: { label: "Desinstalar", severity: "danger" },
    accept: async () => {
      await store.uninstallMod(mod)
    },
  })
}

const statusDotColor = computed(() => {
  if (needsRepair.value) return "bg-rose-400"
  if (isLocked.value) return "bg-zinc-500"
  return "bg-orange-400"
})

const statusText = computed(() => {
  if (store.installing[props.id] !== undefined) return "Instalando..."
  if (needsRepair.value) return "Requiere reparación"
  if (isLocked.value) return "Bloqueado"
  return ""
})
</script>

<template>
  <div
    class="relative flex flex-col rounded-xl bg-white/[0.03] transition-colors hover:bg-white/[0.05]"
  >
    <div class="flex flex-col gap-3 p-4">
      <div class="flex flex-col gap-1.5">
        <span class="text-sm font-bold uppercase tracking-wider text-white">
          {{ name }}
        </span>
        <div v-if="statusText" class="flex items-center gap-2">
          <span class="w-1.5 h-1.5 rounded-full" :class="statusDotColor" />
          <span
            class="text-[11px] font-semibold uppercase tracking-wider"
            :class="needsRepair ? 'text-rose-400' : 'text-white/40'"
          >
            {{ statusText }}
          </span>
        </div>
      </div>

      <p class="text-xs leading-relaxed text-white/45 line-clamp-2 min-h-[36px]">
        {{ description }}
      </p>

      <div class="flex items-center gap-2 pt-3" @click.stop>
        <template v-if="store.installing[id] !== undefined">
          <div
            class="flex flex-1 items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider text-orange-400 bg-orange-500/10"
          >
            <i class="pi pi-spinner pi-spin text-[11px]" />
            <span>INSTALANDO</span>
          </div>
        </template>
        <template v-else>
          <button
            v-if="!isInstalled || needsRepair"
            class="flex-1 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors"
            :class="
              needsRepair
                ? 'text-rose-400 bg-rose-500/10 hover:bg-rose-500/15'
                : 'text-white/70 bg-white/[0.04] hover:bg-orange-500/10 hover:text-orange-400 disabled:bg-white/[0.02] disabled:text-white/20'
            "
            :disabled="isLocked"
            @click="handleInstall"
          >
            {{ needsRepair ? "REPARAR" : "INSTALAR" }}
          </button>
          <button
            v-else-if="!isAsiLoader"
            class="flex-1 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider text-white/35 bg-transparent transition-colors hover:bg-rose-500/10 hover:text-rose-400 disabled:opacity-40"
            :disabled="store.uninstalling.has(id)"
            @click="handleUninstall"
          >
            QUITAR
          </button>
          <span
            v-else
            class="flex-1 py-1.5 text-center text-xs font-semibold uppercase tracking-wider text-white/25"
          >
            OBLIGATORIO
          </span>
        </template>

        <div
          v-if="isLocked"
          v-tooltip.top="'Requiere: ASI Loader'"
          class="flex items-center justify-center w-7 h-7 rounded-lg bg-rose-500/10 text-rose-400 shrink-0"
        >
          <i class="pi pi-lock text-[10px]" />
        </div>
      </div>
    </div>

    <div
      v-if="errorMessage"
      class="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 rounded-xl text-center bg-[#090909]/95"
    >
      <p class="text-xs text-rose-400">{{ errorMessage }}</p>
      <button
        class="px-4 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider text-white bg-rose-700 hover:bg-rose-600 transition-colors"
        @click="delete store.errors[id]"
      >
        CERRAR
      </button>
    </div>
  </div>
</template>
