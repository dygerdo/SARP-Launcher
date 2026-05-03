<script setup lang="ts">
import { computed, ref, watch } from "vue"
import HealthCheckItem from "./HealthCheckItem.vue"
import type { HealthEntry } from "@/composables/useHealthCheck"

const props = defineProps<{
  entries: HealthEntry[]
  rechecking: boolean
}>()

const emit = defineEmits<{
  recheck: []
}>()

const COOLDOWN_MS = 1000
const onCooldown = ref(false)
let cooldownTimer: ReturnType<typeof setTimeout> | null = null

watch(
  () => props.rechecking,
  (isRunning, wasRunning) => {
    if (wasRunning && !isRunning) {
      onCooldown.value = true
      if (cooldownTimer) clearTimeout(cooldownTimer)
      cooldownTimer = setTimeout(() => {
        onCooldown.value = false
      }, COOLDOWN_MS)
    }
  },
)

const disabled = computed(() => props.rechecking || onCooldown.value)

function handleRecheck() {
  if (disabled.value) return
  emit("recheck")
}
</script>

<template>
  <section
    class="w-full rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4 backdrop-blur-sm"
  >
    <header class="mb-2 flex items-center justify-between">
      <h2 class="text-xs font-medium uppercase tracking-widest text-white/50">
        Estado de tu instalación
      </h2>
      <button
        type="button"
        class="flex h-6 w-6 items-center justify-center rounded-md text-white/40 transition hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        title="Verificar de nuevo"
        :disabled="disabled"
        @click="handleRecheck"
      >
        <i class="pi pi-refresh text-xs" :class="{ 'pi-spin': rechecking }" />
      </button>
    </header>
    <div class="divide-y divide-white/5">
      <HealthCheckItem
        v-for="entry in entries"
        :key="entry.id"
        :label="entry.label"
        :state="entry.state"
        :detail="entry.detail"
      />
    </div>
  </section>
</template>
