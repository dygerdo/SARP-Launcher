<script setup lang="ts">
defineProps<{
  value: number
}>()
</script>

<template>
  <div class="w-full">
    <div class="h-2 w-full overflow-hidden rounded-full bg-white/10 backdrop-blur-sm">
      <div
        class="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 shadow-[0_0_12px_rgba(251,146,60,0.6)] transition-[width] duration-150 ease-out"
        :style="{ width: `${value}%` }"
      />
    </div>
  </div>
</template>
