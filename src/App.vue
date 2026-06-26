<script setup lang="ts">
import { onMounted, onUnmounted, computed } from "vue"
import { useRouter } from "vue-router"
import AppDialog from "@/components/dialog/AppDialog.vue"
import Toast from "primevue/toast"
import { useUpdaterStore } from "@/stores/updater"

const updaterStore = useUpdaterStore()
const router = useRouter()

// Visual status for the mini indicator
const isBusy = computed(() => 
  updaterStore.status === "checking" || 
  updaterStore.status === "downloading"
)

const statusLabel = computed(() => {
  switch (updaterStore.status) {
    case "checking": return "Buscando updates..."
    case "downloading": return `Descargando (${Math.round(updaterStore.percent)}%)`
    case "downloaded": return "Reiniciando..."
    default: return ""
  }
})

onMounted(() => {
  updaterStore.setupListeners()
})

onUnmounted(() => {
  updaterStore.cleanup()
})
</script>

<template>
  <!-- Main View -->
  <RouterView />
  
  <!-- Global Overlay Components -->
  <AppDialog />
  <Toast />

  <!-- Mini Update Indicator (Bottom-Right) -->
  <Transition name="fade">
    <div
      v-if="isBusy"
      v-tooltip.left="statusLabel"
      class="fixed top-24 right-6 z-[99999] flex h-10 w-10 items-center justify-center rounded-full bg-[#111111]/90 shadow-[0_0_20px_rgba(0,0,0,0.8),0_0_15px_rgba(249,115,22,0.1)] backdrop-blur-xl border border-white/10 transition-transform active:scale-95"
    >
      <i class="pi pi-cog animate-spin text-orange-500 text-lg" />
    </div>
  </Transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: all 0.5s cubic-bezier(0.165, 0.84, 0.44, 1);
}
.fade-enter-from {
  opacity: 0;
  transform: translateY(10px) scale(0.95);
}
.fade-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.95);
}
</style>