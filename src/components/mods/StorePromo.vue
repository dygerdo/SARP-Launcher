<script setup lang="ts">
import Button from "primevue/button"

function openStore() {
  window.launcher.openExternal("https://ucp.sarp.es/app/ucp/shop")
}
</script>

<template>
  <div
    class="relative group overflow-hidden rounded-xl border border-zinc-800 bg-[#1a1a1a] transition-all hover:border-orange-500/30"
  >
    <!-- Background Gradient and Pattern -->
    <div
      class="absolute inset-0 bg-gradient-to-r from-orange-600/10 via-transparent to-transparent opacity-50"
    />
    <div
      class="absolute right-0 top-0 h-full w-1/3 bg-[url('/graffiti-texture.png')] bg-cover bg-right opacity-[0.03] mix-blend-overlay"
    />

    <div class="relative flex flex-col items-start gap-4 p-6 md:flex-row md:items-center md:gap-8">
      <!-- Icon/Visual Area -->
      <div class="flex h-16 w-16 shrink-0 items-center justify-center">
        <img
          src="https://i.imgur.com/vpuDoi2.png"
          alt="Store Icon"
          loading="eager"
          decoding="async"
          fetchpriority="high"
          class="h-full w-full object-contain mix-blend-screen"
        />
      </div>

      <!-- Text Content -->
      <div class="flex-1 space-y-1">
        <h3 class="text-xl font-black tracking-tight text-white uppercase italic">
          Potencia tu experiencia
        </h3>
        <p class="max-w-md text-sm leading-relaxed text-zinc-400">
          ¿Buscas vehículos exclusivos, skins únicos o mejoras de cuenta? Visita nuestra tienda
          oficial y apoya el desarrollo de San Andreas Roleplay.
        </p>
      </div>

      <!-- CTA Button -->
      <div class="w-full md:w-auto">
        <Button
          label="VISITAR TIENDA"
          icon="pi pi-external-link"
          icon-pos="right"
          class="!w-full !rounded-lg !border-zinc-800 !bg-zinc-900 !px-6 !py-3 !text-[11px] !font-black !tracking-widest !text-white hover:!bg-orange-500 hover:!text-black hover:!border-orange-500 transition-all duration-300 shadow-xl"
          @click="openStore"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.group:hover {
  box-shadow: 0 0 30px -10px rgba(249, 115, 22, 0.15);
}
</style>
