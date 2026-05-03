<script setup lang="ts">
import { computed, onMounted, ref } from "vue"
import ShellLayout from "@/layouts/ShellLayout.vue"
import HealthCheckList from "@/components/home/HealthCheckList.vue"
import PlayButton from "@/components/home/PlayButton.vue"
import EventsCarousel from "@/components/home/EventsCarousel.vue"
import EventModal from "@/components/home/EventModal.vue"
import LogoMark from "@/components/brand/LogoMark.vue"
import ServerStatus from "@/components/home/ServerStatus.vue"
import { useHealthCheck } from "@/composables/useHealthCheck"
import { useEvents } from "@/composables/useEvents"
import { useRotatingTagline } from "@/composables/useRotatingTagline"
import { useGameStatus } from "@/composables/useGameStatus"
import type { ServerEvent } from "@/api/public"

const { entries, allOk, running, run } = useHealthCheck()
const { events, loading: eventsLoading, load: loadEvents } = useEvents()
const { tagline } = useRotatingTagline({ intervalMs: 30000 })
const { phase, launchMessage, launch } = useGameStatus()
const blockHint = ref<string | null>(null)
const selectedIndex = ref<number | null>(null)

const host = import.meta.env.VITE_GAME_SERVER_IP
const port = Number(import.meta.env.VITE_GAME_SERVER_PORT)

onMounted(() => {
  run()
  loadEvents()
})

const eventsList = computed(() => events.value)

function openEvent(event: ServerEvent) {
  const idx = eventsList.value.findIndex((e) => e.id === event.id)
  selectedIndex.value = idx >= 0 ? idx : null
}

function closeEvent() {
  selectedIndex.value = null
}

function prevEvent() {
  if (selectedIndex.value !== null && selectedIndex.value > 0) {
    selectedIndex.value -= 1
  }
}

function nextEvent() {
  if (selectedIndex.value !== null && selectedIndex.value < eventsList.value.length - 1) {
    selectedIndex.value += 1
  }
}

async function play() {
  if (phase.value !== "idle") return
  if (!allOk.value) {
    showBlockHint()
    return
  }
  await launch(host, port)
}

function openSignup() {
  window.open("https://ucp.sarp.es/auth/signup", "_blank", "noopener")
}

function showBlockHint() {
  const failing = entries.value.find(
    (e) => e.id !== "server" && e.state !== "ok" && e.state !== "checking",
  )
  blockHint.value = failing?.detail ?? "Faltan archivos del juego — verificá tu instalación."
  setTimeout(() => {
    blockHint.value = null
  }, 3500)
}
</script>

<template>
  <ShellLayout>
    <div class="flex w-full max-w-xl flex-col items-center gap-6">
      <header class="flex items-center gap-5">
        <LogoMark size="md" />
        <div class="flex min-w-0 flex-1 flex-col gap-1">
          <h1 class="text-2xl tracking-tight text-white">
            <span class="font-light text-white/85">Bienvenido a</span>
            <span
              class="bg-gradient-to-r from-amber-300 via-orange-400 to-red-400 bg-clip-text font-extrabold text-transparent"
            >
              San Andreas Roleplay
            </span>
          </h1>
          <ServerStatus />
          <div class="relative h-10 w-full overflow-hidden">
            <Transition name="tagline" mode="out-in">
              <p
                :key="tagline"
                class="absolute inset-x-0 line-clamp-2 text-sm italic leading-5 text-white/55"
              >
                « {{ tagline }} »
              </p>
            </Transition>
          </div>
        </div>
      </header>

      <HealthCheckList :entries="entries" :rechecking="running" @recheck="run" />

      <EventsCarousel :events="events" :loading="eventsLoading" @open="openEvent" />

      <div class="flex w-full flex-col items-center gap-2 pt-2">
        <Transition name="hint">
          <p v-if="blockHint" class="text-xs font-medium text-rose-300">{{ blockHint }}</p>
        </Transition>
        <PlayButton
          :phase="phase"
          :disabled="!allOk"
          :launch-message="launchMessage"
          @click="play"
        />
        <button
          type="button"
          class="group mt-1 inline-flex items-center gap-1.5 text-xs text-white/45 transition hover:text-white"
          style="-webkit-app-region: no-drag"
          @click="openSignup"
        >
          <span>¿Eres nuevo en Los Santos?</span>
          <span
            class="inline-flex items-center gap-1 font-medium text-amber-300/90 underline-offset-2 group-hover:underline"
          >
            Regístrate aquí 🚀
          </span>
        </button>
      </div>
    </div>

    <EventModal
      :events="events"
      :index="selectedIndex"
      @close="closeEvent"
      @prev="prevEvent"
      @next="nextEvent"
    />
  </ShellLayout>
</template>

<style scoped>
.hint-enter-active,
.hint-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}
.hint-enter-from,
.hint-leave-to {
  opacity: 0;
  transform: translateY(4px);
}

.tagline-enter-active,
.tagline-leave-active {
  transition:
    opacity 0.45s ease,
    transform 0.45s cubic-bezier(0.4, 0, 0.2, 1),
    filter 0.45s ease;
}
.tagline-enter-from {
  opacity: 0;
  transform: translateY(8px);
  filter: blur(4px);
}
.tagline-leave-to {
  opacity: 0;
  transform: translateY(-8px);
  filter: blur(4px);
}
</style>
