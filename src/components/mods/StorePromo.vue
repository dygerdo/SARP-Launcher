<script setup lang="ts">
import { useWebTabsStore } from "@/stores/webTabs"

const webTabs = useWebTabsStore()

function openStore() {
  webTabs.openTab("https://ucp.sarp.es/app/ucp/shop", "Tienda SARP")
}

function openModSubmit() {
  webTabs.openTab(
    "https://forum.sarp.es/index.php?/topic/9149-publica-aqu%C3%AD-tu-petici%C3%B3n-para-permitir-un-mod/",
    "Proponer Mod",
  )
}
</script>

<template>
  <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
    <div
      class="group relative flex flex-col gap-4 p-5 rounded-xl bg-white/[0.03] cursor-pointer transition-all duration-300 hover:bg-white/[0.05] overflow-hidden"
      @click="openStore"
    >
      <div
        class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
      />

      <div class="flex flex-col gap-1.5">
        <div class="flex items-center gap-2">
          <i class="pi pi-shopping-bag text-sm text-orange-400/70" />
          <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-400/70">
            ¡CJ recomienda visitar la tienda!
          </p>
        </div>
        <h3 class="text-base font-bold uppercase tracking-wide text-white/90">TIENDA SARP</h3>
        <p class="text-xs leading-relaxed text-white/40">
          Encuentra los mejores descuentos del momento.
        </p>
      </div>

      <button
        class="inline-flex items-center gap-2 w-fit px-4 py-2 text-[10px] font-bold uppercase tracking-wider rounded-xl bg-orange-500 border border-orange-500 text-black transition-all duration-200 hover:bg-orange-400 hover:border-orange-400 hover:shadow-[0_0_20px_rgba(251,115,0,0.3)]"
        @click.stop="openStore"
      >
        VISITAR TIENDA
        <i class="pi pi-arrow-right text-[9px]" />
      </button>
    </div>

    <div
      class="group relative flex flex-col gap-4 p-5 rounded-xl bg-white/[0.03] cursor-pointer transition-all duration-300 hover:bg-white/[0.05] overflow-hidden"
      @click="openModSubmit"
    >
      <div
        class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
      />

      <div class="flex flex-col gap-1.5">
        <div class="flex items-center gap-2">
          <i class="pi pi-file-edit text-sm text-white/30" />
          <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
            Registro de Mods
          </p>
        </div>
        <h3 class="text-base font-bold uppercase tracking-wide text-white/60">PROPONER MOD</h3>
        <p class="text-xs leading-relaxed text-white/40">
          ¿Tu mod no aparece? Envíalo a revisión. Si cumple los estándares, lo añadimos
          oficialmente.
        </p>
      </div>

      <button
        class="inline-flex items-center gap-2 w-fit px-4 py-2 text-[10px] font-bold uppercase tracking-wider rounded-xl bg-white/[0.04] text-white/45 transition-all duration-200 hover:bg-white/[0.06] hover:text-white/70"
        @click.stop="openModSubmit"
      >
        ENVIAR MOD
        <i class="pi pi-arrow-right text-[9px]" />
      </button>
    </div>
  </div>
</template>
