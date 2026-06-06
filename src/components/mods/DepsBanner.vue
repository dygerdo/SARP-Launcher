<script setup lang="ts">
import { useModsStore } from "@/stores/mods"
import { computed } from "vue"

defineEmits<{ open: [] }>()

const store = useModsStore()

const criticalMissingCount = computed(() => {
  return Object.values(store.depStatuses).filter((s) => s === "missing").length
})

const hasIssues = computed(() => criticalMissingCount.value > 0)
</script>

<template>
  <div class="system-status-card" :class="{ 'has-issues': hasIssues }">
    <!-- Accent line top -->
    <div class="accent-line" />

    <!-- Scan line overlay -->
    <div class="scanline" />

    <div class="card-inner">
      
      

      <!-- Text -->
      <div class="info">
        <span class="label">Estado del Sistema</span>
        <p class="description" :class="{ alert: hasIssues }">
          <template v-if="hasIssues">
            <span class="count">{{ criticalMissingCount }}</span>
            componente{{ criticalMissingCount > 1 ? 's' : '' }} faltante{{ criticalMissingCount > 1 ? 's' : '' }} detectado{{ criticalMissingCount > 1 ? 's' : '' }}
          </template>
          <template v-else>
            Revisa las librerías necesarias para el funcionamiento óptimo de GTA SA.
          </template>
        </p>
      </div>

      <!-- Button -->
      <button class="config-btn" @click="$emit('open')">
        <span class="btn-text">Configurar</span>
        <i class="pi pi-arrow-right" />
      </button>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=Inter:wght@400;500&display=swap');

.system-status-card {
  position: relative;
  overflow: hidden;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: linear-gradient(135deg, #111113 0%, #0e0e10 60%, #111116 100%);
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
  font-family: 'Inter', sans-serif;
}

.system-status-card:hover {
  border-color: rgba(251, 115, 0, 0.25);
  box-shadow: 0 0 32px rgba(251, 115, 0, 0.06), 0 8px 32px rgba(0, 0, 0, 0.4);
}

.system-status-card.has-issues {
  border-color: rgba(251, 115, 0, 0.2);
  box-shadow: 0 0 24px rgba(251, 115, 0, 0.08);
}

/* Top accent line */
.accent-line {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, rgba(251, 115, 0, 0.6) 40%, rgba(251, 115, 0, 0.6) 60%, transparent 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.system-status-card:hover .accent-line,
.system-status-card.has-issues .accent-line {
  opacity: 1;
}

/* Scan line */
.scanline {
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(255, 255, 255, 0.012) 2px,
    rgba(255, 255, 255, 0.012) 4px
  );
  pointer-events: none;
}

.card-inner {
  position: relative;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
}



/* Info */
.info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.label {
  font-family: 'Rajdhani', sans-serif;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(251, 115, 0, 0.75);
}

.description {
  margin: 0;
  font-size: 12px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.5);
  line-height: 1.4;
  transition: color 0.2s;
}

.description.alert {
  color: rgba(255, 255, 255, 0.7);
}

.count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 4px;
  background: rgba(251, 115, 0, 0.15);
  border: 1px solid rgba(251, 115, 0, 0.3);
  color: #fb7300;
  font-family: 'Rajdhani', sans-serif;
  font-weight: 700;
  font-size: 11px;
  margin-right: 5px;
  vertical-align: middle;
}

/* Button */
.config-btn {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 16px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.7);
  font-family: 'Rajdhani', sans-serif;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.config-btn:hover {
  background: #fb7300;
  border-color: #fb7300;
  color: #000;
  box-shadow: 0 0 20px rgba(251, 115, 0, 0.3);
}

</style>