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
  window.open("https://ucp.sarp.es/auth/signup", "_blank", "noopener")
}

function goToMods() {
  showAnticheatDialog.value = false
  router.push("/mods")
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

// Extract .asi filename from anticheat error string
const detectedModFile = computed(() => {
  return anticheatDetail.value.match(/"([^"]+\.asi)"/)?.[1] ?? "mod.asi"
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
    <div class="flex w-full max-w-2xl flex-col items-center gap-4 md:gap-6">
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

      <div class="grid w-full grid-cols-[1fr_auto] items-stretch gap-3">
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
        width: '460px',
        background: 'transparent',
        border: 'none',
        boxShadow: 'none',
        padding: 0,
      }"
      :pt="{
        root: 'overflow-visible bg-transparent border-0 shadow-none',
        content: 'p-0 bg-transparent overflow-visible',
        mask: 'backdrop-blur-sm bg-black/75',
      }"
    >
      <div class="sarp-dialog sarp-dialog--danger">
        <!-- Ambient glow -->
        <div class="sarp-dialog__glow sarp-dialog__glow--danger" />

        <!-- Header stripe -->
        <div class="sarp-dialog__stripe">
          <div class="stripe-inner">
            <div class="stripe-icon-wrap">
              <svg class="stripe-svg" viewBox="0 0 40 40" fill="none">
                <circle
                  cx="20"
                  cy="20"
                  r="19"
                  fill="rgba(220,38,38,0.15)"
                  stroke="rgba(220,38,38,0.4)"
                  stroke-width="1"
                />
                <path
                  d="M20 9C14.48 9 10 13.48 10 19C10 22.4 11.72 25.4 14.35 27.2V30C14.35 30.55 14.8 31 15.35 31H24.65C25.2 31 25.65 30.55 25.65 30V27.2C28.28 25.4 30 22.4 30 19C30 13.48 25.52 9 20 9Z"
                  fill="rgba(220,38,38,0.9)"
                />
                <rect x="16" y="27" width="3" height="4" rx="0.5" fill="#0d0d0d" />
                <rect x="21" y="27" width="3" height="4" rx="0.5" fill="#0d0d0d" />
                <ellipse cx="16.5" cy="19" rx="2.5" ry="3" fill="#0d0d0d" />
                <ellipse cx="23.5" cy="19" rx="2.5" ry="3" fill="#0d0d0d" />
              </svg>
            </div>
            <div>
              <p class="stripe-eyebrow stripe-eyebrow--danger">Sistema Big Smoke</p>
              <h2 class="stripe-title">Mod no autorizado</h2>
            </div>
          </div>
        </div>

        <!-- Body -->
        <div class="sarp-dialog__body">
          <!-- Detected mod pill -->
          <div class="mod-tag mod-tag--danger">
            <i class="pi pi-file mod-tag-icon mod-tag-icon--danger" />
            <span class="mod-tag-text">{{ detectedModFile }}</span>
            <span class="mod-tag-badge mod-tag-badge--danger">No autorizado</span>
          </div>

          <!-- Big Smoke quote -->
          <div class="message-card message-card--danger">
            <div class="message-quote">
              <i class="pi pi-comment message-quote-icon message-quote-icon--danger" />
              <p class="message-quote-text">
                "You're walking into the wrong house with that mod, my friend."
              </p>
              <span class="message-quote-attr message-quote-attr--danger">
                — Big Smoke Anticheat
              </span>
            </div>
          </div>

          <!-- Resolution steps -->
          <div class="steps-list">
            <div class="step-item">
              <div class="step-num">1</div>
              <p class="step-text">
                Elimina el archivo de tu carpeta de
                <code class="step-code">GTA San Andreas</code>
              </p>
            </div>
            <div class="step-item">
              <div class="step-num">2</div>
              <p class="step-text">
                O instala una versión autorizada desde el catálogo oficial del launcher
              </p>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="sarp-dialog__actions">
          <button class="sarp-btn sarp-btn--ghost" @click="showAnticheatDialog = false">
            <i class="pi pi-times sarp-btn-icon" />
            <span>Cerrar</span>
          </button>
          <button class="sarp-btn sarp-btn--danger" @click="goToMods">
            <i class="pi pi-th-large sarp-btn-icon" />
            <span>Revisar mods</span>
          </button>
        </div>
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
        width: '480px',
        background: 'transparent',
        border: 'none',
        boxShadow: 'none',
        padding: 0,
      }"
      :pt="{
        root: 'overflow-visible bg-transparent border-0 shadow-none',
        content: 'p-0 bg-transparent overflow-visible',
        mask: 'backdrop-blur-sm bg-black/75',
      }"
    >
      <div class="sarp-dialog sarp-dialog--warning">
        <div class="sarp-dialog__glow sarp-dialog__glow--warning" />

        <!-- Header stripe -->
        <div class="sarp-dialog__stripe">
          <div class="stripe-inner">
            <div class="stripe-icon-wrap">
              <svg class="stripe-svg" viewBox="0 0 40 40" fill="none">
                <circle
                  cx="20"
                  cy="20"
                  r="19"
                  fill="rgba(251,115,0,0.12)"
                  stroke="rgba(251,115,0,0.35)"
                  stroke-width="1"
                />
                <path d="M20 10L32 30H8L20 10Z" fill="rgba(251,115,0,0.85)" />
                <rect x="19" y="17" width="2" height="7" rx="1" fill="#0d0d0d" />
                <rect x="19" y="26" width="2" height="2" rx="1" fill="#0d0d0d" />
              </svg>
            </div>
            <div>
              <p class="stripe-eyebrow stripe-eyebrow--warning">Integridad de archivos</p>
              <h2 class="stripe-title">Archivos faltantes</h2>
            </div>
          </div>
        </div>

        <!-- Body -->
        <div class="sarp-dialog__body">
          <!-- Mod pill -->
          <div class="mod-tag mod-tag--warning">
            <i class="pi pi-box mod-tag-icon mod-tag-icon--warning" />
            <span class="mod-tag-text">{{ brokenMod?.mod.name ?? "Mod desconocido" }}</span>
            <span class="mod-tag-badge mod-tag-badge--warning">Incompleto</span>
          </div>

          <p class="body-desc">
            Este mod tiene archivos dañados o faltantes. Sin ellos no se cargará correctamente y
            puede causar inestabilidad al iniciar el juego.
          </p>

          <!-- Missing files list -->
          <div v-if="brokenMod?.missingFiles.length" class="missing-files">
            <div class="missing-files-header">
              <i class="pi pi-exclamation-circle missing-files-icon" />
              <span class="missing-files-label">
                {{ brokenMod.missingFiles.length }} archivo{{
                  brokenMod.missingFiles.length > 1 ? "s" : ""
                }}
                faltante{{ brokenMod.missingFiles.length > 1 ? "s" : "" }}
              </span>
            </div>
            <ul class="missing-files-list">
              <li v-for="file in brokenMod.missingFiles" :key="file" class="missing-file-item">
                <i class="pi pi-file-o missing-file-icon" />
                <span class="missing-file-name">{{ file }}</span>
              </li>
            </ul>
          </div>
        </div>

        <!-- Actions -->
        <div class="sarp-dialog__actions">
          <button class="sarp-btn sarp-btn--ghost" @click="continueLaunch">
            <i class="pi pi-play sarp-btn-icon" />
            <span>Jugar de todas formas</span>
          </button>
          <button
            class="sarp-btn sarp-btn--primary"
            :class="{ 'sarp-btn--loading': isRepairing }"
            :disabled="isRepairing"
            @click="repairBrokenMod"
          >
            <span v-if="isRepairing" class="sarp-spinner" />
            <i v-else class="pi pi-wrench sarp-btn-icon" />
            <span>{{ isRepairing ? "Reparando..." : "Reparar mod" }}</span>
          </button>
        </div>
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

/* ════════════════════════════════════
   SARP DIALOG SYSTEM
════════════════════════════════════ */

.sarp-dialog {
  position: relative;
  border-radius: 14px;
  overflow: hidden;
  background: #0d0d0d;
  border: 1px solid rgba(255, 255, 255, 0.07);
  box-shadow:
    0 40px 100px rgba(0, 0, 0, 0.8),
    0 0 0 1px rgba(255, 255, 255, 0.04) inset;
  font-family: "DM Sans", sans-serif;
}

/* ── Ambient glows ── */
.sarp-dialog__glow {
  position: absolute;
  top: -80px;
  left: 50%;
  transform: translateX(-50%);
  width: 320px;
  height: 160px;
  border-radius: 50%;
  filter: blur(60px);
  pointer-events: none;
  z-index: 0;
}

.sarp-dialog__glow--danger {
  background: radial-gradient(ellipse, rgba(220, 38, 38, 0.25) 0%, transparent 70%);
}

.sarp-dialog__glow--warning {
  background: radial-gradient(ellipse, rgba(251, 115, 0, 0.2) 0%, transparent 70%);
}

/* ── Header stripe ── */
.sarp-dialog__stripe {
  position: relative;
  padding: 20px 22px 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.025) 0%, transparent 100%);
  z-index: 1;
}

/* Diagonal texture */
.sarp-dialog--danger .sarp-dialog__stripe::before,
.sarp-dialog--warning .sarp-dialog__stripe::before {
  content: "";
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    -55deg,
    transparent,
    transparent 14px,
    rgba(255, 255, 255, 0.012) 14px,
    rgba(255, 255, 255, 0.012) 16px
  );
  pointer-events: none;
}

.stripe-inner {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
}

.stripe-icon-wrap {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
}

.stripe-svg {
  width: 44px;
  height: 44px;
}

.stripe-eyebrow {
  font-family: "Barlow Condensed", sans-serif;
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  margin: 0 0 3px;
}

.stripe-eyebrow--danger {
  color: rgba(220, 38, 38, 0.7);
}

.stripe-eyebrow--warning {
  color: rgba(251, 115, 0, 0.7);
}

.stripe-title {
  font-family: "Barlow Condensed", sans-serif;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: #f0f0f0;
  margin: 0;
  line-height: 1;
}

/* ── Body ── */
.sarp-dialog__body {
  position: relative;
  z-index: 1;
  padding: 18px 22px 14px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* Mod tag pill */
.mod-tag {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px 6px 10px;
  border-radius: 8px;
  border: 1px solid;
  width: fit-content;
  max-width: 100%;
}

.mod-tag--danger {
  border-color: rgba(220, 38, 38, 0.22);
  background: rgba(220, 38, 38, 0.06);
}

.mod-tag--warning {
  border-color: rgba(251, 115, 0, 0.22);
  background: rgba(251, 115, 0, 0.06);
}

.mod-tag-icon {
  font-size: 11px;
  flex-shrink: 0;
}

.mod-tag-icon--danger {
  color: rgba(220, 38, 38, 0.7);
}

.mod-tag-icon--warning {
  color: rgba(251, 115, 0, 0.7);
}

.mod-tag-text {
  font-family: "Barlow Condensed", sans-serif;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: rgba(255, 255, 255, 0.8);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mod-tag-badge {
  font-family: "Barlow Condensed", sans-serif;
  font-size: 8.5px;
  font-weight: 700;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  padding: 2px 7px;
  border-radius: 4px;
  border: 1px solid;
  white-space: nowrap;
  flex-shrink: 0;
}

.mod-tag-badge--danger {
  background: rgba(220, 38, 38, 0.15);
  border-color: rgba(220, 38, 38, 0.25);
  color: #f87171;
}

.mod-tag-badge--warning {
  background: rgba(251, 115, 0, 0.12);
  border-color: rgba(251, 115, 0, 0.25);
  color: #fb7300;
}

/* Quote card */
.message-card {
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  background: rgba(255, 255, 255, 0.02);
  overflow: hidden;
}

.message-card--danger {
  border-left: 3px solid rgba(220, 38, 38, 0.5);
}

.message-quote {
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.message-quote-icon {
  font-size: 12px;
}

.message-quote-icon--danger {
  color: rgba(220, 38, 38, 0.5);
}

.message-quote-text {
  font-size: 12.5px;
  font-style: italic;
  color: rgba(255, 255, 255, 0.55);
  line-height: 1.5;
  margin: 0;
}

.message-quote-attr {
  font-family: "Barlow Condensed", sans-serif;
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.message-quote-attr--danger {
  color: rgba(220, 38, 38, 0.5);
}

/* Steps */
.steps-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.step-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.step-num {
  width: 20px;
  height: 20px;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: "Barlow Condensed", sans-serif;
  font-size: 11px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.4);
  flex-shrink: 0;
  margin-top: 1px;
}

.step-text {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.45);
  line-height: 1.5;
  margin: 0;
}

.step-code {
  font-family: "Courier New", monospace;
  font-size: 11px;
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  padding: 1px 5px;
  color: rgba(255, 255, 255, 0.6);
}

/* Body description */
.body-desc {
  font-size: 12.5px;
  color: rgba(255, 255, 255, 0.4);
  line-height: 1.55;
  margin: 0;
}

/* Missing files block */
.missing-files {
  border-radius: 10px;
  border: 1px solid rgba(251, 115, 0, 0.15);
  background: rgba(251, 115, 0, 0.04);
  overflow: hidden;
}

.missing-files-header {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 9px 12px;
  border-bottom: 1px solid rgba(251, 115, 0, 0.1);
  background: rgba(251, 115, 0, 0.04);
}

.missing-files-icon {
  font-size: 11px;
  color: rgba(251, 115, 0, 0.6);
}

.missing-files-label {
  font-family: "Barlow Condensed", sans-serif;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: rgba(251, 115, 0, 0.6);
}

.missing-files-list {
  list-style: none;
  margin: 0;
  padding: 8px 12px 10px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.missing-file-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.missing-file-icon {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.2);
  flex-shrink: 0;
}

.missing-file-name {
  font-family: "Courier New", monospace;
  font-size: 11.5px;
  color: rgba(255, 255, 255, 0.5);
}

/* ── Actions footer ── */
.sarp-dialog__actions {
  position: relative;
  z-index: 1;
  display: flex;
  gap: 8px;
  padding: 14px 22px 18px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

/* ── Buttons ── */
.sarp-btn {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 11px 18px;
  border-radius: 9px;
  border: 1px solid;
  font-family: "Barlow Condensed", sans-serif;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.2s ease;
}

.sarp-btn-icon {
  font-size: 12px;
}

.sarp-btn--ghost {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.45);
}

.sarp-btn--ghost:hover {
  background: rgba(255, 255, 255, 0.07);
  border-color: rgba(255, 255, 255, 0.14);
  color: rgba(255, 255, 255, 0.7);
}

.sarp-btn--danger {
  background: #dc2626;
  border-color: #dc2626;
  color: #fff;
  box-shadow: 0 4px 20px rgba(220, 38, 38, 0.3);
}

.sarp-btn--danger:hover {
  background: #ef4444;
  border-color: #ef4444;
  box-shadow: 0 4px 28px rgba(220, 38, 38, 0.45);
  transform: translateY(-1px);
}

.sarp-btn--primary {
  background: #fb7300;
  border-color: #fb7300;
  color: #000;
  font-weight: 800;
  box-shadow: 0 4px 20px rgba(251, 115, 0, 0.3);
}

.sarp-btn--primary:hover:not(:disabled) {
  background: #ff8c1f;
  border-color: #ff8c1f;
  box-shadow: 0 4px 28px rgba(251, 115, 0, 0.45);
  transform: translateY(-1px);
}

.sarp-btn--primary:disabled,
.sarp-btn--loading {
  opacity: 0.65;
  cursor: not-allowed;
  transform: none !important;
  pointer-events: none;
}

/* Inline spinner */
.sarp-spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid rgba(0, 0, 0, 0.25);
  border-top-color: rgba(0, 0, 0, 0.9);
  animation: sarp-spin 0.75s linear infinite;
  flex-shrink: 0;
}

@keyframes sarp-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>