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
  /** 0-100 — when present, draws a progress bar across the button. */
  progress?: number
  /** Show a UAC shield icon before the label, cueing the user that a UAC prompt will appear. */
  shield?: boolean
  /** Visual treatment. Defaults to "primary" (amber). */
  variant?: ItemActionVariant
  onClick: () => void
}

/** Lightweight inline link rendered next to the item's title. Use it for
 *  affordances that don't deserve the heavy primary/secondary button slot,
 *  such as "Change folder" on the GTA row. */
export interface InlineAction {
  label: string
  /** PrimeIcons class, e.g. "pi-folder-open". */
  icon?: string
  title?: string
  onClick: () => void
}

const props = defineProps<{
  label: string
  state: CheckState
  detail?: string
  meta?: string
  /** When true, the subline area keeps its height even when there's no
   *  text to show. Used by rows that toggle between a 1-line "checking"
   *  state and a 2-line resolved state — without this, the row visibly
   *  expands the moment the meta string arrives. */
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
    case "ok":
      return "pi-check-circle"
    case "warning":
      return "pi-info-circle"
    case "error":
      return "pi-times-circle"
  }
  return "pi-circle"
})

const color = computed(() => {
  switch (props.state) {
    case "checking":
      return "text-white/40"
    case "ok":
      return "text-emerald-400"
    case "warning":
      return "text-amber-400"
    case "error":
      return "text-rose-400"
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
  if (actionVariant.value === "secondary") {
    return "bg-white/10 text-white/90 hover:bg-white/15"
  }
  return "bg-amber-500/90 text-black hover:bg-amber-400"
})

const actionProgressTrackClass = computed(() =>
  actionVariant.value === "secondary" ? "bg-white/10" : "bg-black/20",
)

const actionProgressFillClass = computed(() =>
  actionVariant.value === "secondary" ? "bg-white/70" : "bg-black/60",
)
</script>

<template>
  <div class="flex min-h-14 items-start gap-3 overflow-hidden py-2.5">
    <span class="mt-0.5 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center leading-none">
      <span v-if="state === 'checking'" class="state-spinner" aria-label="Verificando" />
      <i v-else class="pi text-base leading-none" :class="[icon, color]" />
    </span>
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
        <span
          v-else-if="reserveSublineSpace"
          class="block w-full text-xs leading-snug"
          aria-hidden="true"
        >
          &nbsp;
        </span>
        <slot name="extras" />
      </div>
    </div>

    <div v-if="menuItems && menuItems.length > 0" class="flex flex-shrink-0 items-center">
      <button
        type="button"
        class="mt-1 flex h-7 w-7 items-center justify-center rounded-md border border-white/5 bg-transparent text-white/30 transition-all hover:bg-white/5 hover:text-white/60 active:scale-95"
        title="Opciones"
        @click="settingsVisible = true"
      >
        <i class="pi pi-cog text-sm" />
      </button>

      <Dialog
        v-model:visible="settingsVisible"
        modal
        :header="`Ajustes de ${label}`"
        :style="{ width: '380px' }"
        :pt="{
          root: 'bg-[#0d0d0d] border border-orange-500/30 rounded-xl shadow-[0_0_60px_rgba(249,115,22,0.15)] flex flex-col overflow-hidden',
          header:
            'bg-[#1a1a1a] border-b border-white/5 px-6 py-4 flex items-center justify-between',
          title: 'text-[10px] font-black uppercase tracking-[0.25em] text-white/40 m-0',
          pcCloseButton:
            'text-white/20 hover:text-white transition-colors duration-200 bg-transparent border-0 h-8 w-8 flex items-center justify-center rounded-md hover:bg-white/5',
          content: 'p-0 bg-transparent flex-1',
          mask: 'backdrop-blur-md bg-black/60 transition-all duration-300',
        }"
      >
        <div class="flex flex-col p-5 gap-3">
          <!-- Tray Config (Solo para GTA) -->
          <div v-if="label === 'GTA: San Andreas'" class="mb-1">
            <div
              class="flex cursor-pointer items-center gap-4 rounded-xl border border-white/5 bg-white/[0.02] p-4 transition-all duration-200 hover:border-orange-500/20 hover:bg-white/[0.05] group"
              @click.stop="onTrayOptionClick"
            >
              <Checkbox
                v-model="minimizeToTray"
                :binary="true"
                :pt="{
                  box: ({ props }: any) => ({
                    class: [
                      'h-4 w-4 rounded border transition-all duration-300 flex items-center justify-center',
                      props.modelValue
                        ? 'bg-orange-500 border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.5)]'
                        : 'border-white/20 bg-white/5 group-hover:border-white/40',
                    ],
                  }),
                  icon: 'text-[10px] text-white',
                }"
                @change="handleTrayChange"
              />
              <div class="flex flex-col gap-0.5">
                <span
                  class="text-[11px] font-black uppercase tracking-widest text-white/80 group-hover:text-white transition-colors"
                >
                  Ocultar al jugar
                </span>
                <span class="text-[9px] font-medium text-white/25 uppercase tracking-tight">
                  Minimiza el launcher a la bandeja
                </span>
              </div>
            </div>
          </div>

          <!-- Opciones dinámicas -->
          <div
            v-for="(item, index) in menuItems"
            :key="typeof item.label === 'string' ? item.label : index"
            class="flex cursor-pointer items-center gap-4 rounded-xl border border-white/5 bg-orange-500/[0.02] p-4 transition-all duration-300 hover:border-orange-500/40 hover:bg-orange-500/[0.08] active:scale-[0.98] group"
            @click="handleDynamicOptionClick(item)"
          >
            <div
              class="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 transition-colors group-hover:bg-orange-500/20"
            >
              <i
                :class="[
                  item.icon,
                  'text-lg text-white/30 group-hover:text-orange-500 transition-colors',
                ]"
              />
            </div>
            <div class="flex flex-col gap-1">
              <span
                class="text-[11px] font-black uppercase tracking-[0.1em] text-white/90 transition-colors group-hover:text-white"
              >
                {{ typeof item.label === "string" ? item.label : "" }}
              </span>
              <span class="text-[9px] font-medium text-white/20 uppercase tracking-tight">
                Acción del sistema
              </span>
            </div>
          </div>
        </div>
      </Dialog>
    </div>

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
          aria-label="Pedirá permisos de administrador"
          title="Pedirá permisos de administrador"
        />
        <span class="leading-none">{{ action.label }}</span>
      </span>
      <span
        class="action-busy pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-200"
        :class="action.busy ? 'opacity-100' : 'opacity-0'"
        aria-live="polite"
      >
        <span
          class="action-spinner"
          :class="actionVariant === 'secondary' ? 'action-spinner-light' : 'action-spinner-dark'"
        />
        <span
          class="ml-1.5 font-mono font-bold tabular-nums text-[11px] transition-opacity duration-150"
          :class="action.busy && typeof action.progress === 'number' ? 'opacity-100' : 'opacity-0'"
        >
          {{ typeof action.progress === "number" ? `${Math.floor(action.progress)}%` : "" }}
        </span>
      </span>
      <span
        class="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 overflow-hidden transition-opacity duration-150"
        :class="[
          action.busy && typeof action.progress === 'number' ? 'opacity-100' : 'opacity-0',
          actionProgressTrackClass,
        ]"
        aria-hidden="true"
      >
        <span
          class="block h-full transition-[width] duration-150"
          :class="actionProgressFillClass"
          :style="{
            width: `${Math.min(100, Math.max(0, typeof action.progress === 'number' ? action.progress : 0))}%`,
          }"
        />
      </span>
    </button>
  </div>
</template>

<style scoped>
.action-spinner {
  width: 14px;
  height: 14px;
  border-radius: 9999px;
  border-width: 2px;
  border-style: solid;
  animation: action-spinner-rotate 1s linear infinite;
  will-change: transform;
}
.action-spinner-dark {
  border-color: rgba(0, 0, 0, 0.2);
  border-top-color: rgba(0, 0, 0, 0.85);
}
.action-spinner-light {
  border-color: rgba(255, 255, 255, 0.2);
  border-top-color: rgba(255, 255, 255, 0.9);
}

.state-spinner {
  width: 12px;
  height: 12px;
  border-radius: 9999px;
  border: 1.5px solid rgba(255, 255, 255, 0.18);
  border-top-color: rgba(255, 255, 255, 0.7);
  animation: action-spinner-rotate 1s linear infinite;
  will-change: transform;
}

/* Sequenced crossfade: whichever is becoming visible waits for the other to
   finish leaving before fading in. Avoids both layers overlapping at half
   opacity in the middle of the transition. */
.action-label.opacity-0 {
  transition-delay: 0ms;
}
.action-label.opacity-100 {
  transition-delay: 120ms;
}
.action-busy.opacity-0 {
  transition-delay: 0ms;
}
.action-busy.opacity-100 {
  transition-delay: 120ms;
}

@keyframes action-spinner-rotate {
  to {
    transform: rotate(360deg);
  }
}
</style>
