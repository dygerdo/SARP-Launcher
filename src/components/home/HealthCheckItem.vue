<script setup lang="ts">
import { computed, ref, onMounted } from "vue"
import type { CheckState } from "@/stores/healthCheck"
import Dialog from "primevue/dialog"
import type { MenuItem } from "primevue/menuitem"
import Checkbox from "primevue/checkbox"

export type ItemActionVariant = "primary" | "secondary"

export interface ItemAction {
  label: string
  busy?: boolean
  disabled?: boolean
  progress?: number
  shield?: boolean
  variant?: ItemActionVariant
  onClick: () => void
}

export interface InlineAction {
  label: string
  icon?: string
  title?: string
  onClick: () => void
}

const props = defineProps<{
  label: string
  state: CheckState
  detail?: string
  meta?: string
  reserveSublineSpace?: boolean
  action?: ItemAction
  inlineAction?: InlineAction
  menuItems?: MenuItem[]
}>()

const settingsVisible = ref(false)
const minimizeToTray = ref(false)

onMounted(async () => {
  minimizeToTray.value = (await window.launcher.getStore("minimizeToTray")) || false
})

async function handleTrayChange() {
  await window.launcher.setStore("minimizeToTray", minimizeToTray.value)
}

function onTrayOptionClick() {
  minimizeToTray.value = !minimizeToTray.value
  handleTrayChange()
}

function handleDynamicOptionClick(item: MenuItem) {
  if (item.command) {
    item.command({ item, originalEvent: new Event("click") })
  }
  settingsVisible.value = false
}

const icon = computed(() => {
  switch (props.state) {
    case "ok": return "pi-check-circle"
    case "warning": return "pi-info-circle"
    case "error": return "pi-times-circle"
  }
  return "pi-circle"
})

const color = computed(() => {
  switch (props.state) {
    case "checking": return "text-white/40"
    case "ok": return "text-emerald-400"
    case "warning": return "text-amber-400"
    case "error": return "text-rose-400"
  }
  return "text-white/40"
})

const subline = computed(() => {
  if (props.detail && props.state !== "ok" && props.state !== "checking") {
    return { text: props.detail, kind: "detail" as const }
  }
  if (props.meta) {
    return { text: props.meta, kind: "meta" as const }
  }
  return null
})

const actionVariant = computed<ItemActionVariant>(() => props.action?.variant ?? "primary")

const actionButtonClass = computed(() => {
  if (actionVariant.value === "secondary") return "bg-white/10 text-white/90 hover:bg-white/15"
  return "bg-amber-500/90 text-black hover:bg-amber-400"
})

const actionProgressTrackClass = computed(() =>
  actionVariant.value === "secondary" ? "bg-white/10" : "bg-black/20"
)
const actionProgressFillClass = computed(() =>
  actionVariant.value === "secondary" ? "bg-white/70" : "bg-black/60"
)

// Metadata enriquecida para cada opción del menú
const menuMeta: Record<string, { desc: string; color: string; glow: string }> = {
  "Cambiar ubicación": {
    desc: "Selecciona la carpeta de instalación",
    color: "rgba(63, 62, 61, 0.08)",
    glow: "rgba(17, 17, 16, 0.15)",
  },
  "Abrir carpeta": {
    desc: "Abre el directorio en el explorador",
    color: "rgba(63, 62, 61, 0.08)",
    glow: "rgba(17, 17, 16, 0.15)",
  },
  "Reinstalar GTA": {
    desc: "Descarga e instala el juego limpio",
    color: "rgba(63, 62, 61, 0.08)",
    glow: "rgba(17, 17, 16, 0.15)",
  },
}

function getMeta(label: string | ((...args: any[]) => string) | undefined) {
  const key = typeof label === "string" ? label : ""
  return menuMeta[key] ?? {
    desc: "Acción del sistema",
    color: "rgba(255,255,255,0.03)",
    glow: "rgba(255,255,255,0.08)",
  }
}
</script>

<template>
  <div class="check-item flex min-h-14 items-start gap-3 overflow-hidden py-2.5">
    <!-- State indicator -->
    <span class="mt-0.5 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center leading-none">
      <span v-if="state === 'checking'" class="state-spinner" aria-label="Verificando" />
      <i v-else class="pi text-base leading-none" :class="[icon, color]" />
    </span>

    <!-- Label + subline -->
    <div class="flex min-w-0 flex-1 flex-col gap-1">
      <span class="truncate text-sm leading-tight text-white/85">{{ label }}</span>
      <div class="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        <span
          v-if="subline"
          class="block w-full break-words text-xs leading-snug"
          :class="subline.kind === 'detail' ? 'text-white/50' : 'text-white/40'"
        >
          {{ subline.text }}
        </span>
        <span v-else-if="reserveSublineSpace" class="block w-full text-xs leading-snug" aria-hidden="true">&nbsp;</span>
        <slot name="extras" />
      </div>
    </div>

    <!-- Settings gear -->
    <div v-if="menuItems && menuItems.length > 0" class="flex flex-shrink-0 items-center">
      <button
        type="button"
        class="settings-gear mt-1 flex h-7 w-7 items-center justify-center rounded-md border border-white/5 bg-transparent text-white/25 transition-all hover:border-orange-500/30 hover:bg-orange-500/5 hover:text-orange-400 active:scale-95"
        title="Opciones"
        @click="settingsVisible = true"
      >
        <i class="pi pi-cog text-sm" />
      </button>

      <!-- ═══════════════ DIALOG ═══════════════ -->
      <Dialog
        v-model:visible="settingsVisible"
        modal
        :show-header="false"
        :style="{ width: '400px', padding: 0, background: 'transparent', border: 'none', boxShadow: 'none' }"
        :pt="{
          root: 'overflow-visible bg-transparent border-0 shadow-none',
          content: 'p-0 bg-transparent overflow-visible',
          mask: 'backdrop-blur-sm bg-black/70',
        }"
      >
        <div class="dialog-shell">
          <!-- Ambient top glow -->
          <div class="dialog-ambient" />

          <!-- Header -->
          <div class="dialog-header">
            <div class="dialog-header-left">
              <div class="dialog-icon-wrap">
                <i class="pi pi-sliders-h dialog-icon" />
              </div>
              <div>
                <p class="dialog-eyebrow">Ajustes</p>
                <h2 class="dialog-title">{{ label }}</h2>
              </div>
            </div>
            <button class="dialog-close" @click="settingsVisible = false">
              <i class="pi pi-times" />
            </button>
          </div>

          <!-- Divider -->
          <div class="dialog-divider" />

          <!-- Content -->
          <div class="dialog-body">

            <!-- Tray toggle (solo GTA) -->
            <div v-if="label === 'GTA: San Andreas'" class="tray-section">
              <p class="section-label">Comportamiento</p>
              <div
                class="tray-row"
                :class="{ 'tray-row--active': minimizeToTray }"
                @click.stop="onTrayOptionClick"
              >
                <div class="tray-checkbox-wrap">
                  <Checkbox
                    v-model="minimizeToTray"
                    :binary="true"
                    @click.stop
                    :pt="{
                      box: ({ props: p }: any) => ({
                        class: [
                          'h-4 w-4 rounded border transition-all duration-300 flex items-center justify-center',
                          p.modelValue
                            ? 'bg-orange-500 border-orange-500 shadow-[0_0_12px_rgba(251,115,0,0.6)]'
                            : 'border-slate-500 bg-slate-500/10',
                        ],
                      }),
                      icon: 'text-[10px] text-slate-200 font-black',
                    }"
                    @change="handleTrayChange"
                  />
                </div>
                <div class="tray-text">
                  <span class="tray-label">Ocultar al jugar</span>
                  <span class="tray-desc">Minimiza el launcher a la bandeja del sistema</span>
                </div>
                <div class="tray-indicator" :class="{ 'tray-indicator--on': minimizeToTray }">
                  {{ minimizeToTray ? 'ON' : 'OFF' }}
                </div>
              </div>
            </div>

            <!-- Separator if both sections exist -->
            <div
              v-if="label === 'GTA: San Andreas' && menuItems && menuItems.length"
              class="section-sep"
            />

            <!-- Dynamic menu items -->
            <div v-if="menuItems && menuItems.length" class="actions-section">
              <p class="section-label">Acciones</p>
              <div class="actions-list">
                <button
                  v-for="(item, index) in menuItems"
                  :key="typeof item.label === 'string' ? item.label : index"
                  class="action-row"
                  :style="{ '--row-bg': getMeta(item.label).color, '--row-glow': getMeta(item.label).glow }"
                  @click="handleDynamicOptionClick(item)"
                >
                  <!-- Icon box -->
                  <div class="action-icon-box">
                    <i :class="[item.icon, 'action-icon-i']" />
                  </div>
                  <!-- Text -->
                  <div class="action-text">
                    <span class="action-label-text">{{ typeof item.label === 'string' ? item.label : '' }}</span>
                    <span class="action-desc-text">{{ getMeta(item.label).desc }}</span>
                  </div>
                  <!-- Arrow -->
                  <i class="pi pi-chevron-right action-arrow" />
                </button>
              </div>
            </div>

          </div>

          <!-- Footer -->
          <div class="dialog-footer">
            <i class="pi pi-shield footer-shield" />
            <span class="footer-text">Algunos cambios requieren permisos de administrador</span>
          </div>
        </div>
      </Dialog>
    </div>

    <!-- Inline action -->
    <button
      v-if="inlineAction && (!menuItems || menuItems.length === 0)"
      type="button"
      class="mt-0.5 inline-flex h-7 flex-shrink-0 items-center gap-1.5 rounded-md border border-white/15 bg-transparent px-2.5 text-xs font-medium text-white/70 transition-colors duration-150 hover:border-white/30 hover:bg-white/[0.04] hover:text-white/95"
      :title="inlineAction.title ?? inlineAction.label"
      @click="inlineAction.onClick"
    >
      <i v-if="inlineAction.icon" class="pi text-[11px]" :class="inlineAction.icon" />
      <span class="leading-none">{{ inlineAction.label }}</span>
    </button>

    <!-- Primary action button -->
    <button
      v-if="action"
      type="button"
      class="relative mt-0.5 inline-flex h-7 min-w-[88px] flex-shrink-0 items-center justify-center overflow-hidden rounded-md px-2.5 text-xs font-bold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60"
      :class="actionButtonClass"
      :disabled="action.disabled || action.busy"
      @click="action.onClick"
    >
      <span
        class="action-label inline-flex items-center gap-1.5 leading-none transition-opacity duration-150"
        :class="action.busy ? 'opacity-0' : 'opacity-100'"
      >
        <img
          v-if="action.shield"
          src="/images/admin_shield.png"
          loading="lazy"
          decoding="async"
          class="block h-[14px] w-[14px] flex-shrink-0"
          alt=""
        />
        <span class="leading-none">{{ action.label }}</span>
      </span>
      <span
        class="action-busy pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-200"
        :class="action.busy ? 'opacity-100' : 'opacity-0'"
        aria-live="polite"
      >
        <span class="action-spinner" :class="actionVariant === 'secondary' ? 'action-spinner-light' : 'action-spinner-dark'" />
        <span
          class="ml-1.5 font-mono font-bold tabular-nums text-[11px] transition-opacity duration-150"
          :class="action.busy && typeof action.progress === 'number' ? 'opacity-100' : 'opacity-0'"
        >
          {{ typeof action.progress === 'number' ? `${Math.floor(action.progress)}%` : '' }}
        </span>
      </span>
      <span
        class="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 overflow-hidden transition-opacity duration-150"
        :class="[action.busy && typeof action.progress === 'number' ? 'opacity-100' : 'opacity-0', actionProgressTrackClass]"
        aria-hidden="true"
      >
        <span
          class="block h-full transition-[width] duration-150"
          :class="actionProgressFillClass"
          :style="{ width: `${Math.min(100, Math.max(0, typeof action.progress === 'number' ? action.progress : 0))}%` }"
        />
      </span>
    </button>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&family=DM+Sans:wght@400;500;600&display=swap');

/* ── Check item row ── */
.check-item {
  font-family: 'DM Sans', sans-serif;
}

.settings-gear {
  transition: color 0.2s, border-color 0.2s, background 0.2s;
}
.settings-gear:hover {
}

/* ══════════════════════════════════
   DIALOG SHELL
══════════════════════════════════ */
.dialog-shell {
  position: relative;
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,0.07);
  background: #0e0e10;
  overflow: hidden;
  font-family: 'DM Sans', sans-serif;
  box-shadow:
    0 32px 80px rgba(0,0,0,0.7),
    0 0 0 1px rgba(255,255,255,0.04) inset,
    0 1px 0 rgba(255,255,255,0.08) inset;
}

/* Top ambient glow */
.dialog-ambient {
  position: absolute;
  top: -60px;
  left: 50%;
  transform: translateX(-50%);
  width: 280px;
  height: 120px;
  background: radial-gradient(ellipse, rgba(251,115,0,0.12) 0%, transparent 70%);
  pointer-events: none;
}

/* ── Header ── */
.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 20px 18px;
}

.dialog-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.dialog-icon-wrap {
  width: 36px;
  height: 36px;
  border-radius: 9px;
  border: 1px solid rgba(251,115,0,0.2);
  background: rgba(251,115,0,0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.dialog-icon {
  font-size: 14px;
  color: rgba(251,115,0,0.8);
}

.dialog-eyebrow {
  font-family: 'Rajdhani', sans-serif;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(251,115,0,0.5);
  margin: 0 0 2px;
}

.dialog-title {
  font-family: 'Rajdhani', sans-serif;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.9);
  margin: 0;
  line-height: 1;
}

.dialog-close {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.07);
  background: rgba(255,255,255,0.03);
  color: rgba(255,255,255,0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  cursor: pointer;
  transition: all 0.2s;
}
.dialog-close:hover {
  background: rgba(255,255,255,0.07);
  color: rgba(255,255,255,0.7);
  border-color: rgba(255,255,255,0.12);
}

.dialog-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.06) 30%, rgba(255,255,255,0.06) 70%, transparent);
  margin: 0 20px;
}

/* ── Body ── */
.dialog-body {
  padding: 16px 16px 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.section-label {
  font-family: 'Rajdhani', sans-serif;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.18);
  margin: 0 0 8px 4px;
}

/* ── Tray row ── */
.tray-section { margin-bottom: 4px; }

.tray-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.05);
  background: rgba(255,255,255,0.02);
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
}

.tray-row:hover {
  border-color: rgba(251,115,0,0.2);
  background: rgba(251,115,0,0.04);
}

.tray-row--active {
  border-color: rgba(251,115,0,0.15);
  background: rgba(251,115,0,0.05);
}

.tray-checkbox-wrap {
  flex-shrink: 0;
}

.tray-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.tray-label {
  font-size: 12px;
  font-weight: 600;
  color: rgba(255,255,255,0.8);
  letter-spacing: 0.01em;
}

.tray-desc {
  font-size: 10.5px;
  color: rgba(255,255,255,0.25);
}

.tray-indicator {
  font-family: 'Rajdhani', sans-serif;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.15em;
  padding: 2px 7px;
  border-radius: 4px;
  border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.2);
  background: rgba(255,255,255,0.03);
  transition: all 0.25s;
}

.tray-indicator--on {
  color: #fb7300;
  border-color: rgba(251,115,0,0.3);
  background: rgba(251,115,0,0.08);
  box-shadow: 0 0 8px rgba(251,115,0,0.2);
}

.section-sep {
  height: 1px;
  background: rgba(255,255,255,0.04);
  margin: 8px 4px;
}

/* ── Actions ── */
.actions-section { }
.actions-list { display: flex; flex-direction: column; gap: 4px; }

.action-row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 11px 14px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.05);
  background: var(--row-bg, rgba(255,255,255,0.02));
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
}

.action-row:hover {
  border-color: rgba(255,255,255,0.1);
  background: var(--row-glow, rgba(255,255,255,0.05));
  transform: translateX(2px);
}

.action-row:active {
  transform: translateX(2px) scale(0.99);
}

.action-icon-box {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.07);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s;
}

.action-row:hover .action-icon-box {
  background: rgba(255,255,255,0.09);
  border-color: rgba(255,255,255,0.12);
}

.action-icon-i {
  font-size: 13px;
  color: rgba(255,255,255,0.4);
  transition: color 0.2s;
}

.action-row:hover .action-icon-i {
  color: rgba(255,255,255,0.75);
}

.action-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.action-label-text {
  font-size: 12px;
  font-weight: 600;
  color: rgba(255,255,255,0.75);
  transition: color 0.2s;
}

.action-row:hover .action-label-text {
  color: rgba(255,255,255,0.95);
}

.action-desc-text {
  font-size: 10.5px;
  color: rgba(255,255,255,0.22);
}

.action-arrow {
  font-size: 9px;
  color: rgba(255,255,255,0.12);
  flex-shrink: 0;
  transition: all 0.2s;
}

.action-row:hover .action-arrow {
  color: rgba(255,255,255,0.4);
  transform: translateX(2px);
}

/* ── Footer ── */
.dialog-footer {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 10px 20px 14px;
  margin-top: 4px;
}

.footer-shield {
  font-size: 10px;
  color: rgba(251,115,0,0.25);
}

.footer-text {
  font-size: 10.5px;
  color: rgba(255,255,255,0.13);
}

/* ══ Spinners ══ */
.state-spinner {
  width: 12px;
  height: 12px;
  border-radius: 9999px;
  border: 1.5px solid rgba(255,255,255,0.18);
  border-top-color: rgba(255,255,255,0.7);
  animation: spin 1s linear infinite;
}

.action-spinner {
  width: 14px;
  height: 14px;
  border-radius: 9999px;
  border-width: 2px;
  border-style: solid;
  animation: spin 1s linear infinite;
}
.action-spinner-dark { border-color: rgba(0,0,0,0.2); border-top-color: rgba(0,0,0,0.85); }
.action-spinner-light { border-color: rgba(255,255,255,0.2); border-top-color: rgba(255,255,255,0.9); }

.action-label.opacity-0 { transition-delay: 0ms; }
.action-label.opacity-100 { transition-delay: 120ms; }
.action-busy.opacity-0 { transition-delay: 0ms; }
.action-busy.opacity-100 { transition-delay: 120ms; }

@keyframes spin { to { transform: rotate(360deg); } }
</style>