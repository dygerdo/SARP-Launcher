<script setup lang="ts">
//
</script>

<template>
  <div class="flex flex-col items-center gap-4">
    <div class="logo-shimmer relative">
      <img
        src="/logo.png"
        alt="SARP"
        class="relative h-44 w-auto select-none drop-shadow-[0_6px_28px_rgba(0,0,0,0.55)]"
        draggable="false"
      />
    </div>
    <p class="text-xs font-medium uppercase tracking-[0.4em] text-white/70">San Andreas Roleplay</p>
  </div>
</template>

<style scoped>
.logo-shimmer {
  position: relative;
  display: inline-block;
  -webkit-mask-image: url("/logo.png");
  -webkit-mask-repeat: no-repeat;
  -webkit-mask-position: center;
  -webkit-mask-size: contain;
  mask-image: url("/logo.png");
  mask-repeat: no-repeat;
  mask-position: center;
  mask-size: contain;
}

.logo-shimmer::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(
    115deg,
    transparent 30%,
    rgba(235, 235, 240, 0.28) 48%,
    rgba(240, 240, 245, 0.45) 50%,
    rgba(235, 235, 240, 0.28) 52%,
    transparent 70%
  );
  background-size: 250% 100%;
  background-repeat: no-repeat;
  mix-blend-mode: screen;
  pointer-events: none;
  animation: shimmer-sweep 4.5s ease-in-out infinite;
}

@keyframes shimmer-sweep {
  0% {
    background-position: 200% 0;
    opacity: 0;
  }
  8% {
    opacity: 1;
  }
  85% {
    background-position: -100% 0;
    opacity: 1;
  }
  92%,
  100% {
    opacity: 0;
  }
}
</style>
