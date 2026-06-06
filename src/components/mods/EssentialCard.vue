<script setup lang="ts">
import { computed, ref } from "vue"
import Button from "primevue/button"
import Dialog from "primevue/dialog"
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

const showDetails = ref(false)
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
    message: `¿Estás seguro de que deseas desinstalar ${mod.name}? Todos sus archivos serán eliminados permanentemente.`,
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
      await store.uninstallMod(mod)
    },
  })
}
</script>

<template>
  <div
    class="flex flex-1 flex-col gap-3 rounded-lg border border-zinc-800 bg-[#161616] p-5 transition-all hover:border-zinc-700 hover:bg-[#1a1a1a] cursor-pointer"
    @click="showDetails = true"
  >
    <div class="flex flex-col gap-2">
      <div class="flex items-center gap-2">
        <Transition name="fade">
          <i v-if="isInstalled" class="pi pi-check-circle text-base text-emerald-400" />
          <i v-else-if="needsRepair" class="pi pi-exclamation-triangle text-base text-rose-400" />
          <i v-else class="pi pi-circle text-base text-white/10" />
        </Transition>
        <h3 class="text-base font-bold text-white select-none">{{ name }}</h3>
        <i class="pi pi-info-circle text-xs text-white/20 ml-auto" />
      </div>

      <p class="text-xs leading-relaxed text-zinc-400 line-clamp-2">
        {{ description }}
      </p>
    </div>

    <div class="mt-auto pt-4" @click.stop>
      <div v-if="!isInstalled || needsRepair" class="flex flex-col gap-2">
        <template v-if="store.installing[id] !== undefined">
          <div
            class="flex h-8 w-full items-center justify-center gap-2 rounded-md border border-orange-500/50 bg-orange-500/10 text-[10px] font-bold uppercase tracking-wider text-orange-400"
          >
            <i class="pi pi-spinner animate-spin text-[10px]" />
            <span>Instalando...</span>
          </div>
        </template>
        <template v-else>
          <div class="flex items-center gap-2">
            <Button
              v-if="needsRepair"
              label="Reparar"
              size="small"
              class="!flex-1 !w-full !rounded-md !border-none !bg-rose-600 !text-[9px] !font-bold !uppercase !tracking-wider !text-white hover:!bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed active:!scale-[0.98] transition-all"
              :disabled="isLocked"
              @click="handleInstall"
            />
            <Button
              v-else
              label="Instalar"
              size="small"
              class="!flex-1 !w-full !rounded-md !border-zinc-700 !bg-transparent !text-[9px] !font-bold !uppercase !tracking-wider !text-white hover:!bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed active:!scale-[0.98] transition-all"
              outlined
              :disabled="isLocked"
              @click="handleInstall"
            />
            <div
              v-if="isLocked"
              v-tooltip.top="'Requiere: ASI Loader'"
              class="flex h-7 w-7 items-center justify-center rounded-md border border-rose-500/30 bg-rose-500/10 text-rose-500 transition-colors hover:bg-rose-500/20 shrink-0"
            >
              <i class="pi pi-lock text-[10px]" />
            </div>
          </div>
        </template>
      </div>

      <!-- ASI Loader: never uninstallable, show "Obligatorio" -->
      <template v-if="isInstalled && !needsRepair">
        <Button
          v-if="isAsiLoader"
          label="Obligatorio"
          size="small"
          class="!w-full !rounded-md !border-zinc-800 !bg-transparent !text-[9px] !font-bold !uppercase !tracking-wider !text-white/20 !cursor-not-allowed transition-all"
          :disabled="true"
          outlined
        />
        <div v-else class="flex items-center gap-2">
          <Button
            label="Desinstalar"
            size="small"
            class="!flex-1 !w-full !rounded-md !border-zinc-800 !bg-transparent !text-[9px] !font-bold !uppercase !tracking-wider !text-white/30 hover:!bg-rose-500/10 hover:!text-rose-400 hover:!border-rose-500/50 disabled:opacity-50 disabled:cursor-not-allowed active:!scale-[0.98] transition-all"
            :loading="store.uninstalling.has(id)"
            :disabled="store.uninstalling.has(id) || isLocked"
            outlined
            @click="handleUninstall"
          />
          <div
            v-if="isLocked"
            v-tooltip.top="'Requiere: ASI Loader'"
            class="flex h-7 w-7 items-center justify-center rounded-md border border-rose-500/30 bg-rose-500/10 text-rose-500 transition-colors hover:bg-rose-500/20 shrink-0"
          >
            <i class="pi pi-lock text-[10px]" />
          </div>
        </div>
      </template>
      <p
        v-if="errorMessage"
        class="mt-3 rounded-md border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-200"
      >
        {{ errorMessage }}
      </p>
    </div>
  </div>

  <!-- Details Dialog -->
  <Dialog v-model:visible="showDetails" modal :header="name" class="max-w-[480px] w-full mx-4">
    <div class="flex flex-col gap-4">
      <p class="text-sm leading-relaxed text-zinc-300">
        {{ modDefinition?.description ?? description }}
      </p>
      <div class="flex items-center gap-3 border-t border-[#222] pt-4 text-[10px] text-zinc-600">
        <span>v{{ modDefinition?.version }}</span>
        <span class="uppercase tracking-widest">{{ modDefinition?.type }}</span>
      </div>
    </div>
  </Dialog>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
