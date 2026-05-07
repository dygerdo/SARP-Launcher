<script setup lang="ts">
import type { ServerEvent } from "@/api/public"

defineProps<{
  event: ServerEvent
}>()

defineEmits<{
  open: [event: ServerEvent]
}>()
</script>

<template>
  <button
    type="button"
    class="group relative flex shrink-0 snap-start flex-col overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] transition hover:border-white/25 hover:shadow-[0_8px_24px_rgba(0,0,0,0.45)]"
    style="-webkit-app-region: no-drag; height: clamp(150px, 21.6vh, 240px); aspect-ratio: 9 / 16"
    @click="$emit('open', event)"
  >
    <div class="relative h-full w-full overflow-hidden bg-zinc-800">
      <img
        v-if="event.image"
        :src="event.image"
        :alt="event.title"
        class="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        draggable="false"
      />
      <div
        v-else
        class="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-700 to-zinc-900"
      >
        <i class="pi pi-image text-2xl text-white/30" />
      </div>
      <div
        class="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 via-black/30 to-transparent"
      />
    </div>
    <div class="absolute inset-x-0 bottom-0 px-2.5 pb-2">
      <p class="line-clamp-2 text-left text-[11px] font-medium leading-tight text-white">
        {{ event.title }}
      </p>
    </div>
  </button>
</template>
