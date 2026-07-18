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



function openDetails() {
  store.selectedMod = props.mod
}
</script>

<template>
  <div
    class="group cursor-pointer flex flex-col justify-between rounded-xl bg-white/[0.03] p-4 transition-colors hover:bg-white/[0.05]"
    @click="openDetails"
  >
    <div class="flex flex-col gap-2">
      <div>
        <h3
          class="text-sm font-bold uppercase tracking-wider text-white truncate transition-colors group-hover:text-orange-400"
        >
          {{ mod.name }}
        </h3>
      </div>

      <p class="text-xs leading-relaxed text-white/45 line-clamp-2 min-h-[2.5rem]">
        {{ mod.description }}
      </p>
    </div>

    <div class="mt-4 pt-3 flex items-center gap-2" @click.stop>
      <template v-if="isInstalling">
        <div
          class="flex flex-1 items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider text-orange-400 bg-orange-500/10"
        >
          <i class="pi pi-spinner animate-spin text-[11px]" />
          <span>Instalando</span>
        </div>
      </template>
      <template v-else>
        <div class="flex flex-1 gap-2">
          <Button
            v-if="!isInstalled && !isPartial"
            label="INSTALAR"
            class="!flex-1 !rounded-lg !border-none !bg-white/[0.04] !py-1.5 !text-xs !font-semibold !tracking-wider !text-white/30 !outline-none !ring-0 hover:!bg-white/[0.07] hover:!text-white/50 disabled:!bg-transparent disabled:!text-white/15 transition-colors"
            :disabled="!canInstall"
            @click="store.installMod(mod)"
          />
          <Button
            v-else-if="isPartial"
            label="REPARAR"
            class="!flex-1 !rounded-lg !border-none !bg-rose-500/10 !py-1.5 !text-xs !font-semibold !tracking-wider !text-rose-400 !outline-none !ring-0 hover:!bg-rose-500/15 transition-colors"
            @click="store.installMod(mod)"
          />
          <Button
            v-if="isInstalled"
            label="DESINSTALAR"
            class="!flex-1 !rounded-lg !border-none !bg-transparent !py-1.5 !text-xs !font-semibold !tracking-wider !text-white/35 !outline-none !ring-0 hover:!bg-rose-500/10 hover:!text-rose-400 disabled:!opacity-40 transition-colors"
            :loading="isUninstalling"
            :disabled="isUninstalling || asiloaderMissing"
            @click="emit('uninstall')"
          />
        </div>

        <div
          v-if="!canInstall"
          v-tooltip.top="`Falta: ${missingEssentials.join(', ')}`"
          class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400"
        >
          <i class="pi pi-lock text-[10px]" />
        </div>
      </template>
    </div>

    <div v-if="errorMessage" class="mt-2 p-2 rounded-lg text-xs text-rose-300 bg-rose-500/10">
      {{ errorMessage }}
    </div>
  </div>
</template>
