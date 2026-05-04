<script setup lang="ts">
import { computed } from "vue"
import type { ModId } from "../../../electron/services/gtaMods"

const props = defineProps<{
  id: ModId
  label: string
}>()

// Outline + tinted-text per mod. Kept tenuous so they read as metadata, not
// calls-to-action. New mod IDs default to a neutral white.
const chipClass = computed(() => {
  switch (props.id) {
    case "modloader":
      return "border-sky-400/40 text-sky-300/90"
    case "asi-loader":
      return "border-emerald-400/40 text-emerald-300/90"
    default:
      return "border-white/20 text-white/70"
  }
})

const tooltip = computed(() => {
  switch (props.id) {
    case "modloader":
      return "Modloader detectado en la carpeta de GTA"
    case "asi-loader":
      return "Ultimate ASI Loader (dinput8.dll) detectado"
    default:
      return props.label
  }
})
</script>

<template>
  <span
    class="inline-flex items-center rounded-full border bg-transparent px-2 py-0.5 text-[10px] font-medium leading-none"
    :class="chipClass"
    :title="tooltip"
  >
    {{ label }}
  </span>
</template>
