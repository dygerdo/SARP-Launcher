<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useTemplateRef } from "vue"
import spray1Url from "@/assets/tag/spray_1.aac?url"
import spray2Url from "@/assets/tag/spray_2.aac?url"
import graffiti1Url from "@/assets/tag/graffiti_1.png"
import graffiti2Url from "@/assets/tag/graffiti_2.png"

const COVERAGE_TARGET = 0.8
const CANVAS_SIZE = 96
const BRUSH_RADIUS = 18
const SAMPLE_EVERY_N_FRAMES = 6

const sprayed = ref(false)
const hovering = ref(false)
const cursor = ref({ x: 0, y: 0 })
const canvasRef = useTemplateRef<HTMLCanvasElement>("canvasRef")

const graffiti2MaskUrl = `url(${graffiti2Url})`

const spray1 = new Audio(spray1Url)
spray1.loop = true
spray1.volume = 0.6

const spray2 = new Audio(spray2Url)
spray2.volume = 0.8

// `mouseDown` tracks the physical button state regardless of where the cursor
// is — so when the user drags out of the spot and back in without releasing,
// we can resume spraying instead of forcing them to click again. `pressing`
// tracks whether we are *actively painting right now* (cursor inside + button
// down). Two flags, two questions.
let mouseDown = false
let pressing = false
let lastPaintAt = 0
let frameCounter = 0

function getCtx() {
  return canvasRef.value?.getContext("2d", { willReadFrequently: true }) ?? null
}

function paintAt(x: number, y: number) {
  const ctx = getCtx()
  if (!ctx) return
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, BRUSH_RADIUS)
  gradient.addColorStop(0, "rgba(74, 222, 128, 0.55)")
  gradient.addColorStop(1, "rgba(74, 222, 128, 0)")
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(x, y, BRUSH_RADIUS, 0, Math.PI * 2)
  ctx.fill()
}

function checkCoverage() {
  const ctx = getCtx()
  if (!ctx) return
  const { data } = ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE)
  let painted = 0
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] > 30) painted++
  }
  const total = data.length / 4
  if (painted / total >= COVERAGE_TARGET) finish()
}

function onMouseDown() {
  mouseDown = true
  beginSpray()
}

function beginSpray() {
  if (sprayed.value || pressing) return
  pressing = true
  spray1.currentTime = 0
  void spray1.play().catch(() => {})
  paintAt(cursor.value.x, cursor.value.y)
  lastPaintAt = performance.now()
}

function pauseSpray() {
  if (!pressing) return
  pressing = false
  spray1.pause()
}

function onGlobalMouseUp() {
  mouseDown = false
  pauseSpray()
}

function finish() {
  mouseDown = false
  pauseSpray()
  sprayed.value = true
  void spray2.play().catch(() => {})
}

function onMouseMove(e: MouseEvent) {
  const target = e.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  cursor.value = { x, y }

  if (!pressing) return

  const now = performance.now()
  const dt = now - lastPaintAt
  if (dt > 16) {
    paintAt(x, y)
    lastPaintAt = now
    frameCounter++
    if (frameCounter % SAMPLE_EVERY_N_FRAMES === 0) checkCoverage()
  }
}

function onEnter() {
  hovering.value = true
  // If the user is dragging back in with the button still held, resume the
  // spray automatically instead of forcing them to click again.
  if (mouseDown && !sprayed.value) beginSpray()
}

function onLeave() {
  hovering.value = false
  // Pause painting+sound while outside, but keep `mouseDown` truthful so we
  // can resume on re-entry. The global mouseup listener will clear it if the
  // user actually releases the button outside the spot.
  pauseSpray()
}

onMounted(() => {
  window.addEventListener("mouseup", onGlobalMouseUp)
})

onBeforeUnmount(() => {
  window.removeEventListener("mouseup", onGlobalMouseUp)
  mouseDown = false
  pauseSpray()
  spray1.src = ""
  spray2.src = ""
})
</script>

<template>
  <div
    class="graffiti-spot relative h-24 w-24 select-none"
    :class="{ 'is-hovering': hovering && !sprayed }"
    @mouseenter="onEnter"
    @mouseleave="onLeave"
    @mousemove="onMouseMove"
    @mousedown="onMouseDown"
  >
    <img
      :src="graffiti1Url"
      alt=""
      loading="eager"
      decoding="async"
      class="pointer-events-none absolute inset-0 h-full w-full object-contain"
      draggable="false"
    />
    <canvas
      v-show="!sprayed"
      ref="canvasRef"
      :width="CANVAS_SIZE"
      :height="CANVAS_SIZE"
      class="spray-canvas pointer-events-none absolute inset-0 h-full w-full"
    />
    <img
      v-if="sprayed"
      :src="graffiti2Url"
      alt=""
      loading="lazy"
      decoding="async"
      class="graffiti-2 pointer-events-none absolute inset-0 h-full w-full object-contain"
      draggable="false"
    />
    <span
      v-if="hovering && !sprayed"
      class="spray-cursor pointer-events-none absolute h-5 w-5 rounded-full border border-green-300/80 bg-green-300/30"
      :style="{ left: `${cursor.x}px`, top: `${cursor.y}px` }"
    />
  </div>
</template>

<style scoped>
.graffiti-spot.is-hovering {
  cursor: none;
}

.spray-canvas {
  -webkit-mask-image: v-bind(graffiti2MaskUrl);
  -webkit-mask-repeat: no-repeat;
  -webkit-mask-position: center;
  -webkit-mask-size: contain;
  mask-image: v-bind(graffiti2MaskUrl);
  mask-repeat: no-repeat;
  mask-position: center;
  mask-size: contain;
}

.spray-cursor {
  transform: translate(-50%, -50%);
  mix-blend-mode: screen;
}

.graffiti-2 {
  animation: graffiti-pop 0.35s ease-out;
}

@keyframes graffiti-pop {
  0% {
    opacity: 0;
    transform: scale(0.92);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
