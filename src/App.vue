<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue"
import AppDialog from "@/components/dialog/AppDialog.vue"
import AppLoader from "@/components/AppLoader.vue"
import Toast from "primevue/toast"
import { useUpdaterStore } from "@/stores/updater"
import launcherOpenSfxUrl from "@/assets/sounds/gta-san-andreas-ah-shit-here-we-go-again.aac?url"
import videoIntroUrl from "@/assets/video/video-main.mp4?url"

const updaterStore = useUpdaterStore()
const launcherOpenSound = new Audio(launcherOpenSfxUrl)
launcherOpenSound.volume = 0.85
const splashVisible = ref(true)
const splashFadeOut = ref(false)
const splashVideo = ref<HTMLVideoElement | null>(null)

function handleSplashEnd() {
  splashFadeOut.value = true
  window.setTimeout(() => {
    splashVisible.value = false
  }, 650)
}

function handleVideoLoaded() {
  const video = splashVideo.value
  if (!video) return

  void video.play().catch(() => {})
  void launcherOpenSound.play().catch(() => {})
}

onMounted(() => {
  updaterStore.setupListeners()
})

onUnmounted(() => {
  updaterStore.cleanup()
})
</script>

<template>
  <!--
    The splash video is shown first while the app loads in the background.
    The loader only appears after the splash ends if the updater is still blocking.
  -->
  <Transition name="loader">
    <AppLoader v-if="!splashVisible && updaterStore.isBlocking" />
  </Transition>

  <RouterView />
  <AppDialog />
  <Toast />

  <div
    v-if="splashVisible"
    :class="['splash-overlay', { 'splash-overlay--fade': splashFadeOut }]"
  >
    <video
      ref="splashVideo"
      class="splash-video"
      :src="videoIntroUrl"
      playsinline
      muted
      preload="auto"
      @loadeddata="handleVideoLoaded"
      @ended="handleSplashEnd"
    ></video>
    <div class="splash-fade-layer"></div>
  </div>
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

.splash-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
  overflow: hidden;
  opacity: 1;
  transition: opacity 650ms ease;
}

.splash-overlay--fade {
  opacity: 0;
}

.splash-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.splash-fade-layer {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.12), rgba(0, 0, 0, 0.3));
  pointer-events: none;
}</style>