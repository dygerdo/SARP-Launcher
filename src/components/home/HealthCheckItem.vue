<script setup lang="ts">
import { computed } from "vue"
import type { CheckState } from "@/composables/useHealthCheck"

const props = defineProps<{
  label: string
  state: CheckState
  detail?: string
}>()

const icon = computed(() => {
  switch (props.state) {
    case "checking":
      return "pi-spin pi-spinner"
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

const showDetail = computed(
  () => Boolean(props.detail) && props.state !== "ok" && props.state !== "checking",
)
</script>

<template>
  <div class="flex h-14 items-start gap-3 py-2.5">
    <i class="pi mt-0.5 text-base leading-none" :class="[icon, color]" />
    <div class="flex min-w-0 flex-1 flex-col gap-1">
      <span class="text-sm leading-none text-white/85">{{ label }}</span>
      <span
        class="block h-4 truncate text-xs leading-none text-white/50 transition-opacity"
        :class="{ 'opacity-0': !showDetail }"
      >
        <template v-if="showDetail">{{ detail }}</template>
        <template v-else>·</template>
      </span>
    </div>
  </div>
</template>
