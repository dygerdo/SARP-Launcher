<script setup lang="ts">
import { computed } from "vue"
import { useGlobalMetrics } from "@/composables/useGlobalMetrics"

const { metrics, loading } = useGlobalMetrics({ refreshMs: 60_000 })

const hasAnyMetric = computed(
  () =>
    metrics.value.online !== null ||
    metrics.value.weeklyPeak !== null ||
    metrics.value.totalAccounts !== null,
)

const isOnline = computed(() => (metrics.value.online ?? 0) > 0)

function formatCount(n: number): string {
  return new Intl.NumberFormat("es-AR").format(n)
}
</script>

<template>
  <Transition name="status">
    <div
      v-if="hasAnyMetric || loading"
      class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/55"
    >
      <span v-if="loading && !hasAnyMetric" class="text-white/40 italic">
        Conectando con el servidor...
      </span>

      <template v-else>
        <span
          v-if="metrics.online !== null"
          class="flex items-center gap-1.5"
          :class="isOnline ? 'text-emerald-300' : 'text-white/45'"
        >
          <span class="relative flex h-2 w-2">
            <span
              v-if="isOnline"
              class="absolute inset-0 animate-ping rounded-full bg-emerald-400/70"
            />
            <span
              class="relative inline-flex h-2 w-2 rounded-full"
              :class="isOnline ? 'bg-emerald-400' : 'bg-white/30'"
            />
          </span>
          <span>
            <span class="font-semibold">{{ formatCount(metrics.online) }}</span>
            jugadores en línea
          </span>
        </span>

        <span v-if="metrics.weeklyPeak !== null" class="flex items-center gap-1">
          <span class="text-white/30">·</span>
          <span>Peak semanal {{ formatCount(metrics.weeklyPeak) }}</span>
        </span>

        <span v-if="metrics.totalAccounts !== null" class="flex items-center gap-1">
          <span class="text-white/30">·</span>
          <span>{{ formatCount(metrics.totalAccounts) }} cuentas registradas</span>
        </span>
      </template>
    </div>
  </Transition>
</template>

<style scoped>
.status-enter-active {
  transition:
    opacity 0.4s ease,
    transform 0.4s ease;
}
.status-enter-from {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
