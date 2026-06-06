<script setup lang="ts">
import { computed } from "vue"
import { useModsStore } from "@/stores/mods"
import type { ToastType } from "@/stores/mods"

const store = useModsStore()

const iconMap: Record<ToastType, string> = {
  install: "pi-check-circle",
  uninstall: "pi-minus-circle",
  repair: "pi-wrench",
  error: "pi-exclamation-circle",
}

const colorMap: Record<ToastType, string> = {
  install: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  uninstall: "text-rose-400 border-rose-500/30 bg-rose-500/10",
  repair: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  error: "text-rose-300 border-rose-500/30 bg-rose-500/10",
}

const items = computed(() => store.toastItems)
</script>

<template>
  <Teleport to="body">
    <div
      class="pointer-events-none fixed bottom-6 left-6 z-[9999] flex flex-col-reverse gap-2"
      style="max-width: 260px"
    >
      <TransitionGroup name="toast" tag="div" class="flex flex-col-reverse gap-2">
        <div
          v-for="item in items"
          :key="item.id"
          class="flex items-center gap-2.5 rounded-lg border px-3.5 py-2.5 shadow-lg backdrop-blur-sm pointer-events-auto"
          :class="colorMap[item.type]"
        >
          <i :class="`pi ${iconMap[item.type]} text-sm shrink-0`" />
          <span class="text-[11px] font-semibold leading-snug text-white/90">{{ item.text }}</span>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-enter-active {
  transition: all 0.28s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.toast-leave-active {
  transition: all 0.22s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(-16px) scale(0.95);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(-8px) scale(0.97);
}
.toast-move {
  transition: transform 0.28s ease;
}
</style>
