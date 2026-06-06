<script setup lang="ts">
import { computed } from "vue"
import Button from "primevue/button"
import { useModsStore } from "@/stores/mods"
import type { ModDefinition } from "@/types/mods"

const props = defineProps<{
  mod: ModDefinition
}>()

const emit = defineEmits<{
  (e: "uninstall"): void
}>()

const store = useModsStore()

const isInstalled = computed(() => store.isInstalled(props.mod.id))
const isPartial = computed(() => store.isPartial(props.mod.id))
// If ASI Loader is missing the entire catalog is locked regardless of per-mod requirements
const asiloaderMissing = computed(() => store.asiloaderMissing)
const canInstall = computed(() => {
  if (asiloaderMissing.value) return false
  return store.canInstall(props.mod)
})
const isInstalling = computed(() => store.installing[props.mod.id] !== undefined)
const isUninstalling = computed(() => store.uninstalling.has(props.mod.id))
const errorMessage = computed(() => store.errors[props.mod.id] ?? "")

const missingEssentials = computed(() => {
  if (asiloaderMissing.value) return ["ASI Loader"]
  return props.mod.requiresEssentials
    .filter((id) => store.essentials[id] !== "ok")
    .map((id) => {
      const labels: Record<string, string> = {
        cleo: "CLEO",
        modloader: "ModLoader",
        asiloader: "ASI Loader",
      }
      return labels[id] || id
    })
})

const categoryLabel = computed(() => {
  const labels: Record<string, string> = {
    vehicles: "Vehículos",
    cleo: "CLEO",
    graphics: "Gráficos",
    reality: "Realismo",
    performance: "Rendimiento",
    audio: "Audio",
    map: "Mapas",
    misc: "Miscelánea",
  }
  return labels[props.mod.category] || "Otro"
})

function openDetails() {
  store.selectedMod = props.mod
}
</script>

<template>
  <div
    class="group cursor-pointer flex flex-col gap-3 rounded-lg border border-zinc-800 bg-[#161616]/70 p-5 transition-all hover:border-zinc-700 hover:bg-[#1a1a1a]"
    @click="openDetails"
  >
    <div class="flex items-start justify-between gap-2">
      <div class="flex flex-col gap-1 min-w-0">
        <div class="flex items-center gap-2 min-w-0">
          <Transition name="fade">
            <i
              v-if="isInstalled && !isPartial"
              class="pi pi-check-circle text-emerald-400 text-sm shrink-0"
            />
            <i
              v-else-if="isPartial"
              class="pi pi-exclamation-triangle text-rose-400 text-sm shrink-0"
            />
          </Transition>
          <span
            class="text-left text-sm font-bold text-white transition-colors group-hover:text-orange-400 truncate"
          >
            {{ mod.name }}
          </span>
        </div>
        <div class="flex flex-wrap gap-1.5">
          <span
            class="rounded-full bg-zinc-800/80 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-400"
          >
            {{ categoryLabel }}
          </span>
        </div>
      </div>
    </div>

    <p class="line-clamp-2 text-xs leading-relaxed text-zinc-400 min-h-[2.5rem]">
      {{ mod.description }}
    </p>

    <div class="mt-auto space-y-3 pt-1" @click.stop>
      <div class="relative flex items-center gap-2">
        <template v-if="isInstalling">
          <div
            class="flex h-8 flex-1 items-center justify-center gap-2 rounded-md border border-orange-500/50 bg-orange-500/10 text-[10px] font-bold uppercase tracking-wider text-orange-400"
          >
            <i class="pi pi-spinner animate-spin text-[10px]" />
            <span>Instalando...</span>
          </div>
        </template>
        <template v-else>
          <div class="flex flex-1 gap-2">
            <Button
              v-if="!isInstalled && !isPartial"
              label="Instalar"
              size="small"
              class="!flex-1 !rounded-md !border-none !bg-orange-500 !py-2 !text-[9px] !font-bold !uppercase !tracking-wider !text-black hover:!bg-orange-400 disabled:!bg-zinc-800 disabled:!text-zinc-600 disabled:!opacity-100 active:!scale-[0.98] transition-all"
              :disabled="!canInstall"
              @click="store.installMod(mod)"
            />
            <Button
              v-else-if="isPartial"
              label="Reparar"
              size="small"
              class="!flex-1 !rounded-md !border-none !bg-rose-600 !py-2 !text-[9px] !font-bold !uppercase !tracking-wider !text-white hover:!bg-rose-500 active:!scale-[0.98] transition-all"
              @click="store.installMod(mod)"
            />
            <Button
              v-if="isInstalled"
              label="Quitar"
              size="small"
              class="!flex-1 !rounded-md !border-zinc-800 !bg-zinc-800/50 !py-2 !text-[9px] !font-bold !uppercase !tracking-wider !text-white/40 hover:!bg-zinc-800 hover:!text-white disabled:!opacity-50 active:!scale-[0.98] transition-all"
              :loading="isUninstalling"
              :disabled="isUninstalling || asiloaderMissing"
              outlined
              @click="emit('uninstall')"
            />
          </div>

          <!-- Candado cuando faltan requisitos: siempre visible si asiloader falta -->
          <div
            v-if="!canInstall"
            v-tooltip.top="`Requiere: ${missingEssentials.join(', ')}`"
            class="flex h-8 w-8 items-center justify-center rounded-md border border-rose-500/30 bg-rose-500/10 text-rose-500 transition-colors hover:bg-rose-500/20 shrink-0"
          >
            <i class="pi pi-lock text-xs" />
          </div>
        </template>
      </div>
      <p
        v-if="errorMessage"
        class="mt-3 rounded-md border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-200"
      >
        {{ errorMessage }}
      </p>
    </div>
  </div>
</template>

<style scoped>
:deep(.p-progressbar) {
  border-radius: 999px;
  overflow: hidden;
}
:deep(.p-progressbar-value) {
  background: #f97316;
  transition: width 0.3s ease;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
