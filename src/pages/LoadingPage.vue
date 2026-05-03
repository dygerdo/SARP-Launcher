<script setup lang="ts">
import { onMounted, ref } from "vue"
import ShellLayout from "@/layouts/ShellLayout.vue"
import LogoMark from "@/components/loading/LogoMark.vue"
import ProgressBar from "@/components/loading/ProgressBar.vue"
import { useProgressBar } from "@/composables/useProgressBar"

const { progress, start } = useProgressBar({ duration: 12000, cap: 99 })

const status = ref("Inicializando launcher...")

onMounted(() => {
  start()
})
</script>

<template>
  <ShellLayout>
    <LogoMark />

    <div class="mt-16 w-full max-w-md">
      <ProgressBar :value="progress" />

      <div class="mt-3 flex items-center justify-between text-xs text-white/70">
        <span class="truncate">{{ status }}</span>
        <span class="font-mono tabular-nums text-white/50">{{ Math.floor(progress) }}%</span>
      </div>
    </div>
  </ShellLayout>
</template>
