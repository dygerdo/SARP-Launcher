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
    class="group cursor-pointer flex flex-col justify-between border border-[#1f1f1f] bg-[#090909] p-4 transition-colors hover:border-[#333333] hover:bg-[#0c0c0c]"
    @click="openDetails"
  >
    <div class="flex flex-col gap-2">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-bold uppercase tracking-wider text-white transition-colors group-hover:text-orange-500 truncate">
          {{ mod.name }}
        </h3>
        <span
          class="border border-[#222] bg-[#111] px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-zinc-500"
        >
          {{ categoryLabel }}
        </span>
      </div>

      <p class="text-xs leading-relaxed text-[#777] line-clamp-2 min-h-[2.5rem]">
        {{ mod.description }}
      </p>
    </div>

    <!-- Actions -->
    <div class="mt-4 pt-3 border-t border-[#111] flex items-center gap-2" @click.stop>
      <template v-if="isInstalling">
        <div
          class="flex flex-1 items-center justify-center gap-2 rounded-none border border-orange-500/20 bg-orange-500/10 py-1.5 text-[10px] font-bold uppercase tracking-widest text-orange-400"
        >
          <i class="pi pi-spinner animate-spin text-[10px]" />
          <span>Instalando</span>
        </div>
      </template>
      <template v-else>
        <div class="flex flex-1 gap-2">
          <Button
            v-if="!isInstalled && !isPartial"
            label="INSTALAR"
            class="!flex-1 !rounded-none !border-[#222] !bg-[#111] !py-1.5 !text-[10px] !font-bold !tracking-widest !text-[#aaa] hover:!border-orange-500 hover:!text-orange-500 disabled:!border-[#111] disabled:!text-[#333] transition-colors"
            outlined
            :disabled="!canInstall"
            @click="store.installMod(mod)"
          />
          <Button
            v-else-if="isPartial"
            label="REPARAR"
            class="!flex-1 !rounded-none !border-rose-900 !bg-rose-900/10 !py-1.5 !text-[10px] !font-bold !tracking-widest !text-rose-500 hover:!bg-rose-900/20 transition-colors"
            outlined
            @click="store.installMod(mod)"
          />
          <Button
            v-if="isInstalled"
            label="DESINSTALAR"
            class="!flex-1 !rounded-none !border-[#222] !bg-transparent !py-1.5 !text-[10px] !font-bold !tracking-widest !text-[#666] hover:!border-red-900 hover:!text-red-500 disabled:!opacity-50 transition-colors"
            outlined
            :loading="isUninstalling"
            :disabled="isUninstalling || asiloaderMissing"
            @click="emit('uninstall')"
          />
        </div>

        <div
          v-if="!canInstall"
          v-tooltip.top="`Falta: ${missingEssentials.join(', ')}`"
          class="flex h-7 w-7 shrink-0 items-center justify-center border border-rose-900/30 bg-rose-900/10 text-rose-500"
        >
          <i class="pi pi-lock text-[10px]" />
        </div>
      </template>
    </div>

    <div
      v-if="errorMessage"
      class="mt-2 border border-rose-900/50 bg-rose-900/10 p-2 text-[10px] text-rose-300"
    >
      {{ errorMessage }}
    </div>
  </div>
</template>

<style scoped>
/* No soft CSS or artificial rounded shapes */
</style>
