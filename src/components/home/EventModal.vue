<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue"
import type { ServerEvent } from "@/api/public"

const props = defineProps<{
  events: ServerEvent[]
  index: number | null
}>()

const emit = defineEmits<{
  close: []
  prev: []
  next: []
}>()

const event = computed<ServerEvent | null>(() => {
  if (props.index === null) return null
  return props.events[props.index] ?? null
})

const hasPrev = computed(() => props.index !== null && props.index > 0)
const hasNext = computed(() => props.index !== null && props.index < props.events.length - 1)

const direction = ref<"left" | "right">("right")

watch(
  () => props.index,
  (next, prev) => {
    if (next !== null && prev !== null) {
      direction.value = next > prev ? "right" : "left"
    }
  },
)

function goPrev() {
  if (!hasPrev.value) return
  direction.value = "left"
  emit("prev")
}

function goNext() {
  if (!hasNext.value) return
  direction.value = "right"
  emit("next")
}

function onKeydown(e: KeyboardEvent) {
  if (props.index === null) return
  if (e.key === "Escape") emit("close")
  else if (e.key === "ArrowLeft") goPrev()
  else if (e.key === "ArrowRight") goNext()
}

onMounted(() => window.addEventListener("keydown", onKeydown))
onUnmounted(() => window.removeEventListener("keydown", onKeydown))

function openExternal() {
  if (event.value?.url) window.open(event.value.url, "_blank", "noopener")
}
</script>

<template>
  <Transition name="modal">
    <div
      v-if="event"
      class="fixed inset-0 z-50 flex items-center justify-center p-6"
      style="-webkit-app-region: no-drag"
      @click.self="$emit('close')"
    >
      <div class="absolute inset-0 bg-black/70 backdrop-blur-sm" @click="$emit('close')" />

      <button
        v-if="hasPrev"
        type="button"
        class="absolute left-4 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/50 text-white/80 backdrop-blur-sm transition hover:border-white/30 hover:bg-black/80 hover:text-white"
        title="Evento anterior (←)"
        @click="goPrev"
      >
        <i class="pi pi-chevron-left text-sm" />
      </button>

      <button
        v-if="hasNext"
        type="button"
        class="absolute right-4 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/50 text-white/80 backdrop-blur-sm transition hover:border-white/30 hover:bg-black/80 hover:text-white"
        title="Siguiente evento (→)"
        @click="goNext"
      >
        <i class="pi pi-chevron-right text-sm" />
      </button>

      <Transition :name="direction === 'right' ? 'slide-left' : 'slide-right'" mode="out-in">
        <div
          :key="event.id"
          class="relative flex max-h-[calc(100vh-3rem)] w-full max-w-[min(90vw,28rem)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 shadow-[0_24px_60px_rgba(0,0,0,0.6)]"
        >
          <button
            type="button"
            class="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white/70 transition hover:bg-black/80 hover:text-white"
            @click="$emit('close')"
          >
            <i class="pi pi-times text-xs" />
          </button>

          <div class="relative w-full shrink-0 overflow-hidden bg-zinc-800">
            <img
              v-if="event.image"
              :src="event.image"
              :alt="event.title"
              class="max-h-[55vh] w-full object-cover"
              draggable="false"
            />
            <div
              v-else
              class="flex h-48 w-full items-center justify-center bg-gradient-to-br from-zinc-700 to-zinc-900"
            >
              <i class="pi pi-image text-4xl text-white/30" />
            </div>
            <div
              class="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/95 via-black/40 to-transparent"
            />
            <div class="absolute inset-x-0 bottom-0 p-5">
              <h3 class="text-xl font-semibold leading-tight text-white">{{ event.title }}</h3>
            </div>
          </div>

          <div class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
            <p v-if="event.description" class="text-sm leading-relaxed text-white/75">
              {{ event.description }}
            </p>

            <button
              v-if="event.url"
              type="button"
              class="flex shrink-0 items-center justify-center gap-2 rounded-lg bg-white/5 px-4 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
              @click="openExternal"
            >
              <span>Ver más</span>
              <i class="pi pi-external-link text-xs" />
            </button>
          </div>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.18s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
  transition:
    transform 0.28s cubic-bezier(0.4, 0, 0.2, 1),
    opacity 0.22s ease;
}

.slide-left-enter-from {
  transform: translateX(40px);
  opacity: 0;
}
.slide-left-leave-to {
  transform: translateX(-40px);
  opacity: 0;
}

.slide-right-enter-from {
  transform: translateX(-40px);
  opacity: 0;
}
.slide-right-leave-to {
  transform: translateX(40px);
  opacity: 0;
}
</style>
