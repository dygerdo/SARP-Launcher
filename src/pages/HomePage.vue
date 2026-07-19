<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue"
import ShellLayout from "@/layouts/ShellLayout.vue"
import HealthCheckList from "@/components/home/HealthCheckList.vue"
import PlayCard from "@/components/home/PlayCard.vue"
import EventsCarousel from "@/components/home/EventsCarousel.vue"
import EventModal from "@/components/home/EventModal.vue"
import LogoMark from "@/components/brand/LogoMark.vue"
import ServerStatus from "@/components/home/ServerStatus.vue"
import { useHealthCheckStore } from "@/stores/healthCheck"
import { useModsStore } from "@/stores/mods"
import { useWebTabsStore } from "@/stores/webTabs"
import { useEvents } from "@/composables/useEvents"
import { useRotatingTagline } from "@/composables/useRotatingTagline"
import { useGameStatus } from "@/composables/useGameStatus"
import type { ServerEvent } from "@/api/public"
import Dialog from "primevue/dialog"
import { useRouter } from "vue-router"
import actuallyGoodSfxUrl from "@/assets/sounds/actually-good-fahhhh-sfx.aac?url"

const modErrorSound = new Audio(actuallyGoodSfxUrl)
modErrorSound.volume = 0.8

const health = useHealthCheckStore()
const mods = useModsStore()
const { events, loading: eventsLoading, load: loadEvents } = useEvents()
const { tagline } = useRotatingTagline()
const { phase, launchMessage, launch } = useGameStatus()
const router = useRouter()
const webTabs = useWebTabsStore()
const blockHint = ref<string | null>(null)
const selectedIndex = ref<number | null>(null)

const showAnticheatDialog = ref(false)
const anticheatDetail = ref("")
const showBrokenModDialog = ref(false)
const brokenMod = computed(() => mods.incompleteMods[0] ?? null)

const host = import.meta.env.VITE_GAME_SERVER_IP
const port = Number(import.meta.env.VITE_GAME_SERVER_PORT)

const ready = ref(false)
const READY_TIMEOUT_MS = 2500

onMounted(() => {
  loadEvents()

  if (health.entries[0].state !== "checking" && !health.running) {
    ready.value = true
    return
  }

  const timeout = window.setTimeout(() => {
    ready.value = true
  }, READY_TIMEOUT_MS)

  let firstHealthRunSeen = false

  const stop = watch(
    () => health.running,
    async (isRunning, wasRunning) => {
      if (wasRunning && !isRunning && !firstHealthRunSeen) {
        firstHealthRunSeen = true
        await nextTick()
        ready.value = true
        window.clearTimeout(timeout)
        stop()
      }
    },
    { immediate: true },
  )
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
  if (!health.allOk || health.asiloaderMissing) {
    showBlockHint()
    return
  }

  await mods.verifyFiles()
  if (brokenMod.value) {
    showBrokenModDialog.value = true
    void modErrorSound.play().catch(() => {})
    return
  }

  const res = await launch(host, port)
  if (res && !res.ok && res.error && res.error.includes("Big Smoke")) {
    anticheatDetail.value = res.error
    showAnticheatDialog.value = true
    void modErrorSound.play().catch(() => {})
  }
}

function openSignup() {
  window.launcher.openExternal("https://ucp.sarp.es/auth/signup")
}

function goToMods() {
  showAnticheatDialog.value = false
  router.push("/mods")
}

function proposeMod() {
  webTabs.openTab(
    "https://forum.sarp.es/index.php?/topic/9149-publica-aqu%C3%AD-tu-petici%C3%B3n-para-permitir-un-mod/",
    "Proponer Mod",
  )
}

async function repairBrokenMod() {
  if (!brokenMod.value) return
  await mods.installMod(brokenMod.value.mod)
  if (!mods.incompleteMods.length) {
    showBrokenModDialog.value = false
  }
}

async function continueLaunch() {
  showBrokenModDialog.value = false
  const res = await launch(host, port)
  if (res && !res.ok && res.error && res.error.includes("Big Smoke")) {
    anticheatDetail.value = res.error
    showAnticheatDialog.value = true
    void modErrorSound.play().catch(() => {})
  }
}

function showBlockHint() {
  if (health.asiloaderMissing) {
    blockHint.value = "Falta el ASI Loader — ve a Mods para repararlo."
  } else {
    const failing = health.entries.find(
      (e) => e.id !== "server" && e.state !== "ok" && e.state !== "checking",
    )
    blockHint.value = failing?.detail ?? "Faltan archivos del juego — verifica tu instalación."
  }
  setTimeout(() => {
    blockHint.value = null
  }, 3500)
}

// Extract detected mod filenames from anticheat error string
const detectedMods = computed(() => {
  const matches = anticheatDetail.value.match(/"([^"]+\.(asi|cs|dll))"/gi) ?? []
  const unique = [...new Set(matches.map((m) => m.replace(/"/g, "")))]
  return unique.length > 0 ? unique : ["mod.asi"]
})

// Is the repair currently in progress?
const isRepairing = computed(() => {
  return brokenMod.value ? mods.installing[brokenMod.value.mod.id] !== undefined : false
})
</script>

<template>
  <ShellLayout :loading="!ready">
    <!-- ═══ SKELETON ═══ -->
    <template #skeleton>
      <div class="flex w-full max-w-2xl flex-col items-center gap-4 md:gap-6">
        <header class="flex items-center gap-5">
          <LogoMark size="md" />
          <div class="flex min-w-0 flex-col gap-1">
            <div class="skeleton-block h-7 w-4/5" />
            <div class="skeleton-block h-4 w-3/5" />
            <div class="skeleton-block h-10 w-11/12" />
          </div>
        </header>

        <section
          class="relative w-full overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4 backdrop-blur-sm"
        >
          <div class="mb-3 flex items-center justify-between">
            <div class="skeleton-block h-3 w-40" />
            <div class="skeleton-block h-5 w-5 rounded-md" />
          </div>
          <div class="divide-y divide-white/5">
            <div
              v-for="i in 4"
              :key="i"
              class="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
            >
              <div class="flex flex-1 items-center gap-3">
                <div class="skeleton-block h-4 w-4 rounded-full" />
                <div class="flex flex-1 flex-col gap-1.5">
                  <div class="skeleton-block h-3.5 w-1/2" />
                  <div class="skeleton-block h-2.5 w-3/4" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <div class="flex w-full flex-col items-center gap-3 pt-2">
          <div class="skeleton-block h-14 w-full max-w-xs rounded-2xl" />
          <div class="skeleton-block h-3 w-48" />
        </div>
      </div>
    </template>

    <!-- ═══ MAIN CONTENT ═══ -->
    <div class="flex w-full max-w-2xl flex-col items-center gap-2 md:gap-3">
      <header class="flex items-center gap-5">
        <LogoMark size="md" />
        <div class="flex min-w-0 flex-col gap-1">
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

      <div class="grid w-full grid-cols-[1fr_auto] items-stretch gap-2">
        <HealthCheckList />
        <PlayCard
          class="w-44"
          :phase="phase"
          :disabled="!health.allOk || health.asiloaderMissing"
          :launch-message="launchMessage"
          :block-hint="blockHint"
          @play="play"
          @signup="openSignup"
        />
      </div>

      <EventsCarousel :events="events" :loading="eventsLoading" @open="openEvent" />
    </div>

    <EventModal
      :events="events"
      :index="selectedIndex"
      @close="closeEvent"
      @prev="prevEvent"
      @next="nextEvent"
    />

    <!-- ═══════════════════════════════════════════
         DIALOG 1 — ANTICHEAT / MOD NO AUTORIZADO
    ═══════════════════════════════════════════ -->
    <Dialog
      v-model:visible="showAnticheatDialog"
      modal
      :show-header="false"
      :closable="false"
      :style="{
        width: '440px',
        background: 'transparent',
        border: 'none',
        boxShadow: 'none',
        padding: 0,
      }"
      :pt="{
        root: 'overflow-visible bg-transparent border-0 shadow-none',
        content:
          'p-0 overflow-visible rounded-2xl border border-white/[0.06] bg-[#0e0e0e] shadow-[0_40px_100px_rgba(0,0,0,0.8)]',
        mask: 'backdrop-blur-sm bg-black/70',
      }"
    >
      <!-- Header -->
      <div class="border-b border-white/5 px-6 py-5">
        <div class="flex items-center gap-3">
          <svg viewBox="0 0 24 24" class="h-6 w-6 shrink-0 fill-rose-500/70">
            <path
              d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 2.18l7 3.12v4.7c0 4.83-3.4 9.36-7 10.5-3.6-1.14-7-5.67-7-10.5V6.3l7-3.12zM11 7v6h2V7h-2zm0 8v2h2v-2h-2z"
            />
          </svg>
          <div>
            <h2 class="text-base font-bold text-white/85">Mod no autorizado</h2>
            <p class="mt-0.5 text-[11px] text-white/30">
              {{ detectedMods.length }} mod{{ detectedMods.length > 1 ? "s" : "" }} detectado{{
                detectedMods.length > 1 ? "s" : ""
              }}
              en tu juego
            </p>
          </div>
        </div>
      </div>

      <!-- Body -->
      <div class="flex flex-col gap-4 px-6 py-5">
        <!-- Scrollable mod list -->
        <div
          class="max-h-36 overflow-y-auto rounded-xl border border-white/[0.05] bg-white/[0.02] custom-scroll"
        >
          <div class="flex flex-col">
            <div
              v-for="mod in detectedMods"
              :key="mod"
              class="flex items-center gap-2.5 border-b border-white/[0.03] px-3.5 py-2.5 last:border-b-0"
            >
              <i class="pi pi-file text-[11px] text-rose-500/50" />
              <span class="font-mono text-[11px] text-white/60">{{ mod }}</span>
            </div>
          </div>
        </div>

        <!-- Resolution steps -->
        <div class="flex flex-col gap-2.5">
          <div class="flex items-start gap-3">
            <div
              class="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-white/[0.08] bg-white/[0.04] text-[10px] font-bold text-white/35"
            >
              1
            </div>
            <p class="text-[12px] leading-relaxed text-white/40">
              Elimina el archivo de tu carpeta de
              <code
                class="rounded border border-white/[0.08] bg-white/[0.05] px-1.5 py-0.5 text-[11px] text-white/50"
              >
                GTA San Andreas
              </code>
            </p>
          </div>
          <div class="flex items-start gap-3">
            <div
              class="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-white/[0.08] bg-white/[0.04] text-[10px] font-bold text-white/35"
            >
              2
            </div>
            <p class="text-[12px] leading-relaxed text-white/40">
              O instala una versión autorizada desde el catálogo oficial del launcher
            </p>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex gap-2 border-t border-white/5 px-6 py-4">
        <button
          class="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-white/35 transition-colors hover:bg-white/[0.06] hover:text-white/55"
          @click="showAnticheatDialog = false"
        >
          Cerrar
        </button>
        <button
          class="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-white/35 transition-colors hover:bg-white/[0.06] hover:text-white/55"
          @click="proposeMod"
        >
          Proponer mods
        </button>
        <button
          class="flex flex-1 items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/[0.08] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-rose-400/80 transition-colors hover:bg-rose-500/[0.14] hover:text-rose-400"
          @click="goToMods"
        >
          Revisar mods
        </button>
      </div>
    </Dialog>

    <!-- ═══════════════════════════════════════════
         DIALOG 2 — MOD CON ARCHIVOS FALTANTES
    ═══════════════════════════════════════════ -->
    <Dialog
      v-model:visible="showBrokenModDialog"
      modal
      :show-header="false"
      :style="{
        width: '460px',
        background: 'transparent',
        border: 'none',
        boxShadow: 'none',
        padding: 0,
      }"
      :pt="{
        root: 'overflow-visible bg-transparent border-0 shadow-none',
        content:
          'p-0 overflow-visible rounded-2xl border border-white/[0.06] bg-[#0e0e0e] shadow-[0_40px_100px_rgba(0,0,0,0.8)]',
        mask: 'backdrop-blur-sm bg-black/70',
      }"
    >
      <!-- Header -->
      <div class="border-b border-white/5 px-6 py-5">
        <div class="flex items-center gap-4">
          <div
            class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-500/10"
          >
            <svg viewBox="0 0 24 24" class="h-5 w-5 fill-orange-500/80" fill="currentColor">
              <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
            </svg>
          </div>
          <div>
            <p class="text-[9px] font-bold uppercase tracking-[0.2em] text-orange-500/60">
              Integridad de archivos
            </p>
            <h2 class="text-base font-bold text-white/85">Archivos faltantes</h2>
          </div>
        </div>
      </div>

      <!-- Body -->
      <div class="flex flex-col gap-4 px-6 py-5">
        <!-- Mod pill -->
        <div
          class="inline-flex w-fit items-center gap-2 rounded-lg border border-orange-500/15 bg-orange-500/[0.06] px-3 py-1.5"
        >
          <i class="pi pi-box text-[11px] text-orange-500/60" />
          <span class="text-xs font-semibold text-white/70">{{
            brokenMod?.mod.name ?? "Mod desconocido"
          }}</span>
          <span
            class="rounded border border-orange-500/20 bg-orange-500/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-orange-400/80"
          >
            Incompleto
          </span>
        </div>

        <p class="text-[12px] leading-relaxed text-white/40">
          Este mod tiene archivos dañados o faltantes. Sin ellos no se cargará correctamente y puede
          causar inestabilidad al iniciar el juego.
        </p>

        <!-- Missing files -->
        <div
          v-if="brokenMod?.missingFiles.length"
          class="overflow-hidden rounded-xl border border-orange-500/10 bg-orange-500/[0.03]"
        >
          <div
            class="flex items-center gap-2 border-b border-orange-500/10 bg-orange-500/[0.03] px-3.5 py-2.5"
          >
            <i class="pi pi-exclamation-circle text-[11px] text-orange-500/50" />
            <span class="text-[9px] font-bold uppercase tracking-[0.15em] text-orange-500/50">
              {{ brokenMod.missingFiles.length }} archivo{{
                brokenMod.missingFiles.length > 1 ? "s" : ""
              }}
              faltante{{ brokenMod.missingFiles.length > 1 ? "s" : "" }}
            </span>
          </div>
          <ul class="flex flex-col gap-1 px-3.5 py-3">
            <li v-for="file in brokenMod.missingFiles" :key="file" class="flex items-center gap-2">
              <i class="pi pi-file-o text-[10px] text-white/15" />
              <span class="font-mono text-[11px] text-white/40">{{ file }}</span>
            </li>
          </ul>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex gap-2 border-t border-white/5 px-6 py-4">
        <button
          class="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-white/35 transition-colors hover:bg-white/[0.06] hover:text-white/55"
          @click="continueLaunch"
        >
          <i class="pi pi-play text-[11px]" />
          Jugar de todas formas
        </button>
        <button
          class="flex flex-1 items-center justify-center gap-2 rounded-xl border border-orange-500/30 bg-orange-500/[0.08] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-orange-400/80 transition-colors hover:bg-orange-500/[0.14] hover:text-orange-400 disabled:opacity-40"
          :disabled="isRepairing"
          @click="repairBrokenMod"
        >
          <span
            v-if="isRepairing"
            class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-orange-400/20 border-t-orange-400"
          />
          <i v-else class="pi pi-wrench text-[11px]" />
          {{ isRepairing ? "Reparando..." : "Reparar mod" }}
        </button>
      </div>
    </Dialog>
  </ShellLayout>
</template>

<style scoped>
/* ══ Page transitions ══ */
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
