<script setup lang="ts">
import { computed, ref } from "vue"
import { useConfirm } from "primevue/useconfirm"
import { useModsStore } from "@/stores/mods"
import { MOD_CATALOG } from "@/data/mods"
import type { EssentialId } from "@/types/mods"

const props = defineProps<{
  id: EssentialId
  name: string
  description: string
}>()

const store = useModsStore()
const confirm = useConfirm()
const isInstalled = computed(() => store.essentials[props.id] === "ok")
const needsRepair = computed(() => store.essentials[props.id] === "reparar")
const isAsiLoader = computed(() => props.id === "asiloader")
const asiloaderMissing = computed(() => store.asiloaderMissing)
const isLocked = computed(() => !isAsiLoader.value && asiloaderMissing.value)

const modDefinition = computed(() => MOD_CATALOG.find((m) => m.id === props.id))

const handleInstall = async () => {
  const mod = modDefinition.value
  if (mod) {
    await store.installMod(mod)
  }
}

const errorMessage = computed(() => store.errors[props.id] ?? "")

const handleUninstall = async () => {
  const mod = modDefinition.value
  if (!mod) return

  confirm.require({
    message: `¿Estás seguro de que deseas desinstalar ${mod.name}?`,
    header: "Confirmar desinstalación",
    icon: "pi pi-exclamation-triangle",
    rejectLabel: "Cancelar",
    acceptLabel: "Desinstalar",
    rejectProps: { label: "Cancelar", severity: "secondary", outlined: true },
    acceptProps: { label: "Desinstalar", severity: "danger" },
    accept: async () => {
      await store.uninstallMod(mod)
    },
  })
}

const statusColor = computed(() => {
  if (needsRepair.value) return "#f43f5e"
  if (isInstalled.value) return "#22c55e"
  if (isLocked.value) return "#3f3f46"
  return "#f97316"
})

const statusText = computed(() => {
  if (store.installing[props.id] !== undefined) return "Instalando..."
  if (needsRepair.value) return "Requiere reparación"
  if (isInstalled.value) return "Operativo"
  if (isLocked.value) return "Bloqueado"
  return "No instalado"
})
</script>

<template>
  <div class="essential-card" :class="{ error: needsRepair }">
    <!-- Status bar top -->
    <div class="status-bar" :style="{ background: statusColor }" />

    <div class="card-body">
      <div class="card-header">
        <div class="name-row">
          <span class="card-name">{{ name }}</span>
        </div>
        <div class="status-row">
          <span class="status-dot" :style="{ background: statusColor }" />
          <span class="status-text">{{ statusText }}</span>
        </div>
      </div>

      <p class="card-desc">{{ description }}</p>

      <!-- Action -->
      <div class="card-action" @click.stop>
        <template v-if="store.installing[id] !== undefined">
          <div class="installing-indicator">
            <i class="pi pi-spinner pi-spin" />
            <span>INSTALANDO</span>
          </div>
        </template>
        <template v-else>
          <button
            v-if="!isInstalled || needsRepair"
            class="action-btn action-btn--install"
            :disabled="isLocked"
            @click="handleInstall"
          >
            {{ needsRepair ? 'REPARAR' : 'INSTALAR' }}
          </button>
          <button
            v-else-if="!isAsiLoader"
            class="action-btn action-btn--remove"
            :disabled="store.uninstalling.has(id)"
            @click="handleUninstall"
          >
            QUITAR
          </button>
          <span v-else class="required-text">SISTEMA CORE</span>
        </template>

        <div
          v-if="isLocked"
          v-tooltip.top="'Requiere: ASI Loader'"
          class="lock-icon"
        >
          <i class="pi pi-lock" />
        </div>
      </div>
    </div>

    <!-- Error overlay -->
    <div v-if="errorMessage" class="error-overlay">
      <p class="error-text">{{ errorMessage }}</p>
      <button class="error-dismiss" @click="delete store.errors[id]">CERRAR</button>
    </div>
  </div>
</template>

<style scoped>
.essential-card {
  position: relative;
  display: flex;
  flex-direction: column;
  background: #090909;
  border: 1px solid #1f1f1f;
  transition: border-color 0.2s, background 0.2s;
}

.essential-card:hover {
  background: #0c0c0c;
  border-color: #333333;
}

.status-bar {
  height: 2px;
  width: 100%;
  opacity: 1;
}

.card-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card-header {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.name-row {
  display: flex;
  align-items: center;
}

.card-name {
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.status-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-dot {
  width: 6px;
  height: 6px;
}

.status-text {
  font-size: 9px;
  font-weight: 700;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.card-desc {
  font-size: 12px;
  line-height: 1.5;
  color: #777;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 36px;
}

.card-action {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  border-top: 1px solid #111;
  padding-top: 12px;
}

.action-btn {
  flex: 1;
  padding: 6px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  background: #111;
  border: 1px solid #222;
  color: #aaa;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover:not(:disabled) {
  border-color: #f97316;
  color: #f97316;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-btn--install {
  color: #aaa;
}

.action-btn--remove {
  background: transparent;
  color: #666;
}

.action-btn--remove:hover:not(:disabled) {
  border-color: #7f1d1d;
  color: #ef4444;
}

.required-text {
  flex: 1;
  text-align: center;
  font-size: 10px;
  font-weight: 700;
  color: #444;
  letter-spacing: 0.1em;
  padding: 6px;
  border: 1px dashed #222;
}

.lock-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: rgba(159, 18, 57, 0.1);
  border: 1px solid rgba(159, 18, 57, 0.3);
  color: #f43f5e;
}

.installing-indicator {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: #f97316;
  background: rgba(249, 115, 22, 0.1);
  border: 1px solid rgba(249, 115, 22, 0.2);
  padding: 6px;
}

.error-overlay {
  position: absolute;
  inset: 0;
  background: #090909;
  border-top: 2px solid #9f1239;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 16px;
  text-align: center;
}

.error-text {
  font-size: 11px;
  color: #f43f5e;
  margin: 0;
}

.error-dismiss {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: #fff;
  background: #9f1239;
  border: none;
  padding: 6px 16px;
  cursor: pointer;
}
.error-dismiss:hover {
  background: #be123c;
}
</style>
