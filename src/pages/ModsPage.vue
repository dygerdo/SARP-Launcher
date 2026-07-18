<script setup lang="ts">
import { onMounted, ref, computed, watch } from "vue"
import ShellLayout from "@/layouts/ShellLayout.vue"
import EssentialCard from "@/components/mods/EssentialCard.vue"
import ModFilters from "@/components/mods/ModFilters.vue"
import ModCard from "@/components/mods/ModCard.vue"
import ModSkeleton from "@/components/mods/ModSkeleton.vue"
import ModDetailsDialog from "@/components/mods/ModDetailsDialog.vue"
import ModToast from "@/components/mods/ModToast.vue"
import DepsBanner from "@/components/mods/DepsBanner.vue"
import DepsDrawer from "@/components/mods/DepsDrawer.vue"
import StorePromo from "@/components/mods/StorePromo.vue"
import ConfirmDialog from "primevue/confirmdialog"
import Button from "primevue/button"
import { useConfirm } from "primevue/useconfirm"
import { useModsStore } from "@/stores/mods"
import { useHealthCheckStore } from "@/stores/healthCheck"
import type { ModDefinition } from "@/types/mods"

const store = useModsStore()
const healthStore = useHealthCheckStore()
const confirm = useConfirm()

const depsDrawerOpen = ref(false)
const refreshing = ref(false)

async function handleRefresh() {
  if (refreshing.value) return
  refreshing.value = true
  await store.loadState()
  // Keep the spin for at least 600ms so the animation is visible
  window.setTimeout(() => {
    refreshing.value = false
  }, 600)
}

const isGtaInstalled = computed(() => {
  return healthStore.entries.find((e) => e.id === "gta")?.state === "ok"
})

// Paginación
const ITEMS_PER_PAGE = 6
const currentPage = ref(1)

// Estado de carga sincronizado con el estilo de Inicio
const ready = ref(false)
const MIN_LOADING_TIME_MS = 1500
const pageLoadStart = performance.now()

const totalPages = computed(() => Math.ceil(store.filteredMods.length / ITEMS_PER_PAGE))
const paginatedMods = computed(() => {
  const start = (currentPage.value - 1) * ITEMS_PER_PAGE
  const end = start + ITEMS_PER_PAGE
  return store.filteredMods.slice(start, end)
})

// Reiniciar página si cambian los filtros
watch([() => store.searchQuery, () => store.selectedCategory, () => store.selectedType], () => {
  currentPage.value = 1
})

onMounted(async () => {
  if (store.ready) {
    ready.value = true
    await store.loadState()
    return
  }

  window.setTimeout(() => {
    if (store.ready) ready.value = true
  }, MIN_LOADING_TIME_MS)

  await store.loadState()

  const elapsed = performance.now() - pageLoadStart
  const remaining = Math.max(0, MIN_LOADING_TIME_MS - elapsed)
  if (remaining > 0) {
    window.setTimeout(() => {
      ready.value = true
    }, remaining)
  } else {
    ready.value = true
  }

  watch(
    () => store.ready,
    (isReady) => {
      if (isReady && !ready.value) {
        window.setTimeout(() => {
          ready.value = true
        }, 500)
      }
    },
    { immediate: true },
  )
})

const confirmUninstall = (mod: ModDefinition) => {
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
  <ShellLayout :loading="!ready" class="h-full">
    <template #skeleton>
      <div class="flex w-full flex-col gap-8">
        <section class="flex flex-col gap-4">
          <div class="skeleton-block h-4 w-40" />
          <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div v-for="i in 3" :key="i" class="skeleton-block h-32 rounded-lg" />
          </div>
        </section>
        <div class="skeleton-block h-10 w-full rounded-lg" />
        <section class="flex flex-col gap-4">
          <div class="skeleton-block h-4 w-48" />
          <ModSkeleton />
        </section>
      </div>
    </template>

    <div v-if="!isGtaInstalled" class="flex h-[70vh] w-full items-center justify-center">
      <div class="flex max-w-md flex-col items-center gap-6 text-center">
        <div class="flex h-20 w-20 items-center justify-center rounded-2xl bg-orange-500/10">
          <i class="pi pi-exclamation-triangle text-4xl text-orange-500" />
        </div>
        <div class="flex flex-col gap-2">
          <h2 class="text-2xl font-bold tracking-tight text-white">GTA no encontrado</h2>
          <p class="text-sm leading-relaxed text-zinc-400">
            Para acceder al sistema de mods, primero debes verificar o instalar GTA: San Andreas
            desde la página de Inicio.
          </p>
        </div>
        <router-link to="/">
          <Button
            label="Ir a Inicio"
            icon="pi pi-home"
            class="!rounded-md !bg-orange-500 !px-6 !py-2.5 !text-sm !font-bold !text-black hover:!bg-orange-600 transition-colors"
          />
        </router-link>
      </div>
    </div>

    <div v-if="isGtaInstalled" class="flex h-[75vh] w-full flex-col overflow-hidden">
      <div class="flex-1 overflow-y-auto overflow-x-hidden pr-2 custom-scroll">
        <div class="flex flex-col gap-8 pb-10">
          <!-- ESENCIALES -->
          <section class="flex flex-col gap-4">
            <header class="flex items-center justify-between">
              <h2 class="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
                Estado de tu instalación
              </h2>
              <span class="h-px flex-1 ml-4 bg-white/5" />
              <button
                type="button"
                class="ml-3 flex h-6 w-6 items-center justify-center rounded text-white/20 transition-all hover:text-white/60"
                :class="{ 'animate-spin': refreshing }"
                :disabled="refreshing"
                title="Actualizar estado"
                @click="handleRefresh"
              >
                <i class="pi pi-refresh text-xs" />
              </button>
            </header>

            <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
              <EssentialCard
                id="cleo"
                name="CLEO 4"
                description="Librería necesaria para ejecutar la mayoría de scripts .cs y plugins locales."
              />
              <EssentialCard
                id="modloader"
                name="ModLoader"
                description="Herramienta indispensable que permite instalar mods sin modificar los archivos .img."
              />
              <EssentialCard
                id="asiloader"
                name="ASI Loader"
                description="Habilita la carga de archivos .asi en el juego (vorbisFile.dll/dsound.dll)."
              />
            </div>
          </section>

          <!-- TIENDA PROMO -->
          <section>
            <StorePromo />
          </section>

          <!-- DEPENDENCIAS DE WINDOWS -->
          <section class="flex flex-col gap-4">
            <header class="flex items-center justify-between">
              <h2 class="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
                Dependencias de Windows
              </h2>
              <span class="h-px flex-1 ml-4 bg-white/5" />
            </header>
            <DepsBanner @open="depsDrawerOpen = true" />
          </section>

          <!-- BARRA DE FILTROS -->
          <section class="py-2 bg-transparent">
            <ModFilters />
          </section>

          <!-- GRID DE MODS -->
          <section class="flex flex-col gap-4">
            <header class="flex items-center justify-between">
              <h2 class="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
                Catálogo disponible ({{ store.filteredMods.length }})
              </h2>
              <span class="h-px flex-1 ml-4 bg-white/5" />
            </header>

            <Transition name="grid-swap" mode="out-in">
              <div
                :key="`${currentPage}-${store.selectedCategory}-${store.selectedType}-${store.searchQuery}`"
                class="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3"
              >
                <ModCard
                  v-for="mod in paginatedMods"
                  :key="mod.id"
                  :mod="mod"
                  @uninstall="confirmUninstall(mod)"
                />
              </div>
            </Transition>

            <!-- PAGINACIÓN -->
            <div v-if="totalPages > 1" class="mt-8 flex items-center justify-center gap-2">
              <Button
                icon="pi pi-chevron-left"
                class="!h-8 !w-8 !rounded-xl !border-none !bg-white/[0.04] !p-0 !text-white/40 !outline-none !ring-0 hover:!bg-white/[0.08] hover:!text-white disabled:!opacity-20"
                :disabled="currentPage === 1"
                @click="currentPage--"
              />

              <div
                class="flex items-center gap-1.5 px-4 font-mono text-[11px] font-bold tracking-widest text-white/40"
              >
                <span class="text-white">{{ currentPage }}</span>
                <span>/</span>
                <span>{{ totalPages }}</span>
              </div>

              <Button
                icon="pi pi-chevron-right"
                class="!h-8 !w-8 !rounded-xl !border-none !bg-white/[0.04] !p-0 !text-white/40 !outline-none !ring-0 hover:!bg-white/[0.08] hover:!text-white disabled:!opacity-20"
                :disabled="currentPage === totalPages"
                @click="currentPage++"
              />
            </div>

            <div
              v-if="store.filteredMods.length === 0"
              class="flex flex-col items-center justify-center gap-4 py-20 text-center"
            >
              <div class="p-6 bg-white/[0.03] rounded-xl">
                <i class="pi pi-search text-3xl text-white/15" />
              </div>
              <p class="text-sm text-white/40">
                No se encontraron mods que coincidan con tu búsqueda.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>

    <!-- DIALOGS & OVERLAYS -->
    <ModDetailsDialog />
    <ConfirmDialog />
    <ModToast />
    <!-- Drawer de dependencias -->
    <DepsDrawer v-model:visible="depsDrawerOpen" @open-url="store.openDepUrl" />
  </ShellLayout>
</template>

<style scoped>
/* Scrollbar estilo Launcher */
.custom-scroll::-webkit-scrollbar {
  width: 3px;
}
.custom-scroll::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scroll::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: 999px;
}
.custom-scroll::-webkit-scrollbar-thumb:hover {
  background-color: rgba(255, 255, 255, 0.15);
}

.grid-swap-enter-active {
  transition:
    opacity 0.25s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
}
.grid-swap-leave-active {
  transition:
    opacity 0.15s ease;
}
.grid-swap-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
.grid-swap-leave-to {
  opacity: 0;
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
