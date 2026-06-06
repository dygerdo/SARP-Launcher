<template>
  <Sidebar
    v-model:visible="localVisible"
    position="right"
    class="deps-drawer"
    :show-close-icon="false"
    :pt="{
      root: { style: 'width: 520px; background: #0a0a0b; border-left: 1px solid rgba(255,255,255,0.05);' },
      header: { style: 'display: none;' },
      content: { style: 'padding: 0; height: 100%; overflow: hidden; display: flex; flex-direction: column;' },
    }"
  >
    <div class="drawer-root">

      <!-- ═══ HEADER ═══ -->
      <header class="drawer-header">
        <div class="header-left">
          <div class="header-icon">
            <i class="pi pi-server" />
          </div>
          <div>
            <p class="header-eyebrow">Configuración del sistema</p>
            <h2 class="header-title">Requisitos</h2>
            <p class="header-sub">{{ totalCount }} librerías</p>
          </div>
        </div>
        <button class="close-btn" @click="localVisible = false">
          <i class="pi pi-times" />
        </button>
      </header>

      <!-- ═══ GROUPS ═══ -->
      <div class="custom-scrollbar dep-list">
        <section
          v-for="group in GROUPS"
          :key="group"
          class="dep-group"
        >
          <!-- Group label -->
          <div class="group-header">
            <span class="group-label">{{ DEP_GROUP_LABELS[group] }}</span>
            <div class="group-line" />
            <span class="group-count">{{ depsInGroup(group).length }}</span>
          </div>

          <!-- Primary dep (first / most relevant shown by default) -->
          <div
            v-for="(dep, idx) in depsInGroup(group)"
            :key="dep.id"
            v-show="idx === 0 || expandedGroups.has(group)"
            class="dep-card"
            :class="{ 'dep-card--secondary': idx > 0 }"
          >
            <!-- Version ribbon for secondary items -->
            <div v-if="idx > 0" class="secondary-ribbon">
              <i class="pi pi-history ribbon-icon" />
              versión anterior
            </div>

            <div class="dep-card-inner">
              <!-- Status dot -->
              <div class="status-dot" :class="getStatusClass(dep)" />

              <!-- Icon -->
              <div class="dep-icon" :class="getStatusClass(dep)">
                <i :class="getDepIcon(dep)" />
              </div>

              <!-- Info -->
              <div class="dep-info">
                <div class="dep-name-row">
                  <span class="dep-name">{{ dep.name }}</span>
                  <span v-if="dep.critical" class="badge badge--critical">Requerida</span>
                  <span v-else-if="dep.recommended" class="badge badge--recommended">Recomendada</span>
                  <span v-else class="badge badge--optional">Opcional</span>
                </div>
                <span class="dep-desc">
                  {{ dep.critical ? 'Necesaria para ejecutar el juego' : dep.recommended ? 'Mejora estabilidad y rendimiento' : 'Complemento adicional' }}
                </span>
              </div>

              <!-- Download -->
              <button
                class="dl-btn"
                title="Descargar"
                @click="store.openDepUrl(dep.downloadUrl)"
              >
                <i class="pi pi-download" />
                <span>Instalar</span>
              </button>
            </div>
          </div>

          <!-- Expand toggle (only if group has more than 1) -->
          <button
            v-if="depsInGroup(group).length > 1"
            class="expand-toggle"
            @click="toggleGroup(group)"
          >
            <template v-if="!expandedGroups.has(group)">
              <i class="pi pi-chevron-down toggle-icon" />
              <span>{{ depsInGroup(group).length - 1 }} versión{{ depsInGroup(group).length - 1 > 1 ? 'es' : '' }} anterior{{ depsInGroup(group).length - 1 > 1 ? 'es' : '' }}</span>
            </template>
            <template v-else>
              <i class="pi pi-chevron-up toggle-icon" />
              <span>Ocultar versiones anteriores</span>
            </template>
          </button>

        </section>
      </div>

      <!-- ═══ FOOTER ═══ -->
      <footer class="drawer-footer">
        <div class="footer-left">
          <i class="pi pi-shield footer-icon" />
          <span class="footer-text">Requiere permisos de administrador</span>
        </div>
      </footer>

    </div>
  </Sidebar>
</template>

<script setup lang="ts">
import { computed, ref } from "vue"
import Sidebar from "primevue/sidebar"
import { DEP_GROUP_LABELS, SYSTEM_DEPENDENCIES } from "@/data/mods"
import type { DepGroup } from "@/types/mods"
import { useModsStore } from "@/stores/mods"

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ "update:visible": [value: boolean] }>()

const store = useModsStore()

const localVisible = computed({
  get: () => props.visible,
  set: (v) => emit("update:visible", v),
})

const GROUPS: DepGroup[] = ["vcredist", "directx", "openal", "dotnet"]

const expandedGroups = ref<Set<DepGroup>>(new Set())

function depsInGroup(group: DepGroup) {
  return SYSTEM_DEPENDENCIES.filter((d) => d.group === group)
}

function toggleGroup(group: DepGroup) {
  const next = new Set(expandedGroups.value)
  next.has(group) ? next.delete(group) : next.add(group)
  expandedGroups.value = next
}

function getStatusClass(dep: (typeof SYSTEM_DEPENDENCIES)[number]) {
  const status = store.depStatuses?.[dep.id]
  if (status === "installed") return "status--ok"
  if (status === "missing") return "status--missing"
  return "status--unknown"
}

function getDepIcon(dep: (typeof SYSTEM_DEPENDENCIES)[number]) {
  if (dep.group === "vcredist") return "pi pi-microsoft"
  if (dep.group === "directx") return "pi pi-desktop"
  if (dep.group === "openal") return "pi pi-volume-up"
  if (dep.group === "dotnet") return "pi pi-code"
  return "pi pi-box"
}

const totalCount = computed(() => SYSTEM_DEPENDENCIES.length)
const installedCount = computed(() =>
  Object.values(store.depStatuses ?? {}).filter((s) => s === "installed").length
)
const missingCount = computed(() =>
  Object.values(store.depStatuses ?? {}).filter((s) => s === "missing").length
)
const progressPercent = computed(() =>
  totalCount.value ? Math.round((installedCount.value / totalCount.value) * 100) : 0
)

function downloadAll() {
  SYSTEM_DEPENDENCIES.forEach((d) => store.openDepUrl(d.downloadUrl))
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=DM+Sans:wght@400;500;600&display=swap');

/* ── Root ── */
.drawer-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #0a0a0b;
  color: #fff;
  font-family: 'DM Sans', sans-serif;
}

/* ── Header ── */
.drawer-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 24px 24px 20px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  background: linear-gradient(180deg, #111113 0%, #0d0d0f 100%);
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}

.header-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: rgba(251,115,0,0.1);
  border: 1px solid rgba(251,115,0,0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fb7300;
  font-size: 16px;
  flex-shrink: 0;
  margin-top: 2px;
}

.header-eyebrow {
  font-family: 'Rajdhani', sans-serif;
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(251,115,0,0.65);
  margin: 0 0 3px;
}

.header-title {
  font-family: 'Rajdhani', sans-serif;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: #f0f0f0;
  margin: 0 0 4px;
  line-height: 1;
}

.header-sub {
  font-size: 11.5px;
  color: #3d3d3d;
  margin: 0;
}

.close-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid #1e1e1e;
  background: #161616;
  color: #444;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.close-btn:hover {
  background: #222;
  color: #ddd;
  border-color: #2a2a2a;
}

/* ── Progress ── */
.progress-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 24px;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  flex-shrink: 0;
  background: #0d0d0f;
}

.progress-track {
  flex: 1;
  height: 3px;
  background: rgba(255,255,255,0.06);
  border-radius: 99px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #fb7300, #ff9a40);
  border-radius: 99px;
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.progress-label {
  font-family: 'Rajdhani', sans-serif;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #3a3a3a;
  white-space: nowrap;
}

/* ── List ── */
.dep-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0 16px;
}

.dep-group {
  padding: 16px 20px 4px;
}

/* ── Group header ── */
.group-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.group-label {
  font-family: 'Rajdhani', sans-serif;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #2e2e2e;
  white-space: nowrap;
}

.group-line {
  flex: 1;
  height: 1px;
  background: #181818;
}

.group-count {
  font-family: 'Rajdhani', sans-serif;
  font-size: 9px;
  font-weight: 700;
  color: #2a2a2a;
  background: #161616;
  border: 1px solid #1e1e1e;
  border-radius: 4px;
  padding: 1px 6px;
}

/* ── Dep Card ── */
.dep-card {
  position: relative;
  border-radius: 12px;
  border: 1px solid #191919;
  background: #111113;
  margin-bottom: 6px;
  overflow: hidden;
  transition: border-color 0.2s, background 0.2s;
}

.dep-card:hover {
  border-color: rgba(251,115,0,0.2);
  background: #131315;
}

.dep-card--secondary {
  border-style: dashed;
  border-color: #171717;
  background: #0e0e10;
  opacity: 0.85;
}

.dep-card--secondary:hover {
  opacity: 1;
}

/* Version ribbon */
.secondary-ribbon {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 14px;
  background: rgba(255,255,255,0.02);
  border-bottom: 1px solid #1a1a1a;
  font-size: 9.5px;
  font-family: 'Rajdhani', sans-serif;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #333;
}

.ribbon-icon {
  font-size: 9px;
}

.dep-card-inner {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 13px 14px;
}

/* Status dot */
.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  align-self: flex-start;
  margin-top: 6px;
}

.status-dot.status--ok { background: #22c55e; box-shadow: 0 0 6px rgba(34,197,94,0.5); }
.status-dot.status--missing { background: #fb7300; box-shadow: 0 0 6px rgba(251,115,0,0.5); animation: blink 2s ease-in-out infinite; }
.status-dot.status--unknown { background: #2a2a2a; }

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

/* Dep icon */
.dep-icon {
  width: 38px;
  height: 38px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
  border: 1px solid rgba(251,115,0,0.15);
  background: rgba(251,115,0,0.08);
  color: #fb7300;
  transition: transform 0.2s;
}

.dep-card:hover .dep-icon { transform: scale(1.05); }

.dep-icon.status--ok {
  border-color: rgba(34,197,94,0.2);
  background: rgba(34,197,94,0.08);
  color: #22c55e;
}

/* Info */
.dep-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.dep-name-row {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
}

.dep-name {
  font-family: 'Rajdhani', sans-serif;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: #e0e0e0;
}

.dep-desc {
  font-size: 11px;
  color: #333;
  line-height: 1.4;
}

/* Badges */
.badge {
  font-family: 'Rajdhani', sans-serif;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  padding: 2px 7px;
  border-radius: 99px;
  border: 1px solid;
  white-space: nowrap;
}

.badge--critical { color: #f87171; background: rgba(248,113,113,0.08); border-color: rgba(248,113,113,0.2); }
.badge--recommended { color: #fb7300; background: rgba(251,115,0,0.08); border-color: rgba(251,115,0,0.2); }
.badge--optional { color: #3d3d3d; background: transparent; border-color: #222; }

/* Download button */
.dl-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid #222;
  background: transparent;
  color: #404040;
  font-family: 'DM Sans', sans-serif;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  flex-shrink: 0;
}

.dl-btn:hover {
  background: #fb7300;
  border-color: #fb7300;
  color: #000;
  box-shadow: 0 0 16px rgba(251,115,0,0.25);
}

.dl-btn .pi {
  font-size: 11px;
}

/* Expand toggle */
.expand-toggle {
  display: flex;
  align-items: center;
  gap: 7px;
  width: 100%;
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px dashed #191919;
  background: transparent;
  color: #303030;
  font-family: 'Rajdhani', sans-serif;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 2px;
  margin-bottom: 8px;
  justify-content: center;
}

.expand-toggle:hover {
  border-color: rgba(251,115,0,0.2);
  color: rgba(251,115,0,0.6);
  background: rgba(251,115,0,0.03);
}

.toggle-icon {
  font-size: 9px;
  transition: transform 0.2s;
}

/* ── Footer ── */
.drawer-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  border-top: 1px solid #141414;
  background: #0d0d0f;
  flex-shrink: 0;
}

.footer-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.footer-icon {
  font-size: 11px;
  color: rgba(251,115,0,0.3);
}

.footer-text {
  font-size: 11px;
  color: #2d2d2d;
}

.footer-all-btn {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid rgba(251,115,0,0.2);
  background: rgba(251,115,0,0.06);
  color: rgba(251,115,0,0.7);
  font-family: 'Rajdhani', sans-serif;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.2s;
}

.footer-all-btn:hover {
  background: #fb7300;
  border-color: #fb7300;
  color: #000;
  box-shadow: 0 0 20px rgba(251,115,0,0.2);
}

/* ── Scrollbar ── */
.custom-scrollbar { scrollbar-width: thin; scrollbar-color: #1e1e1e transparent; }
.custom-scrollbar::-webkit-scrollbar { width: 3px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #1e1e1e; border-radius: 4px; }
</style>