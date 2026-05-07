<script setup lang="ts">
import EventCard from "./EventCard.vue"
import type { ServerEvent } from "@/api/public"

defineProps<{
  events: ServerEvent[]
  loading: boolean
}>()

defineEmits<{
  open: [event: ServerEvent]
}>()
</script>

<template>
  <section v-if="loading || events.length > 0" class="w-full">
    <div v-if="loading" class="flex justify-center gap-3 overflow-hidden">
      <div
        v-for="i in 5"
        :key="i"
        class="shrink-0 animate-pulse rounded-xl bg-white/[0.05]"
        style="height: clamp(150px, 21.6vh, 240px); aspect-ratio: 9 / 16"
      />
    </div>

    <div v-else class="events-scroll overflow-x-auto pb-2">
      <div class="mx-auto flex w-fit snap-x snap-mandatory gap-3">
        <EventCard
          v-for="event in events"
          :key="event.id"
          :event="event"
          @open="(e) => $emit('open', e)"
        />
      </div>
    </div>
  </section>
</template>

<style scoped>
.events-scroll {
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
}
.events-scroll::-webkit-scrollbar {
  height: 4px;
}
.events-scroll::-webkit-scrollbar-track {
  background: transparent;
}
.events-scroll::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 999px;
}
.events-scroll::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style>
