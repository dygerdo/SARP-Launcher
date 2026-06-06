<script setup lang="ts">
import { onMounted, onUnmounted } from "vue"
import AppDialog from "@/components/dialog/AppDialog.vue"
import AppLoader from "@/components/AppLoader.vue"
import Toast from "primevue/toast"
import { useUpdaterStore } from "@/stores/updater"

const updaterStore = useUpdaterStore()

onMounted(() => {
  updaterStore.setupListeners()
})

onUnmounted(() => {
  updaterStore.cleanup()
})
</script>

<template>
  <!--
    AppLoader blocks the main UI until the updater check finishes.
    The <Transition> applies a 300 ms fade-out defined below.
    The main content only mounts AFTER isBlocking is false so no
    skeleton flashes are visible while the loader is on screen.
  -->
  <Transition name="loader">
    <AppLoader v-if="updaterStore.isBlocking" />
  </Transition>

  <template v-if="!updaterStore.isBlocking">
    <RouterView />
    <AppDialog />
    <Toast />
  </template>
</template>

<style scoped>
/*
  Fade-out for <Transition name="loader">.
  Must live in the *parent* (here) because Vue applies transition classes
  to the child's root element using the parent's scoped attribute.
*/
.loader-leave-active {
  transition: opacity 300ms ease;
}
.loader-leave-to {
  opacity: 0;
}
</style>
