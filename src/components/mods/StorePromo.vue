<script setup lang="ts">
function openStore() {
  window.launcher.openExternal("https://ucp.sarp.es/app/ucp/shop")
}

function openModSubmit() {
  window.launcher.openExternal(
    "https://forum.sarp.es/index.php?/topic/9149-publica-aqu%C3%AD-tu-petici%C3%B3n-para-permitir-un-mod/",
  )
}
</script>

<template>
  <div class="promo-wrapper">
    <!-- CARD: TIENDA -->
    <div class="promo-card card-store" @click="openStore">
      <div class="card-tag">EXCLUSIVO</div>
      <div class="card-body">
        <div class="card-text">
          <p class="card-eyebrow">Tienda SARP</p>
          <h3 class="card-title">TIENDA OFICIAL</h3>
          <p class="card-desc">
            Skins, prendas y mejoras de cuenta exclusivas. Apoya el desarrollo del servidor.
          </p>
        </div>
        <button class="cta-btn cta-btn--store" @click.stop="openStore">
          VISITAR TIENDA
          <i class="pi pi-arrow-right" />
        </button>
      </div>
    </div>

    <!-- CARD: SUBMIT MOD -->
    <div class="promo-card card-mods" @click="openModSubmit">
      <div class="card-body">
        <div class="card-text">
          <p class="card-eyebrow card-eyebrow--muted">Registro de Mods</p>
          <h3 class="card-title card-title--muted">PROPONER MOD</h3>
          <p class="card-desc">
            ¿Tu mod no aparece? Envíalo a revisión. Si cumple los estándares, lo añadimos
            oficialmente.
          </p>
        </div>
        <button class="cta-btn cta-btn--mods" @click.stop="openModSubmit">
          ENVIAR MOD
          <i class="pi pi-arrow-right" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.promo-wrapper {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

@media (max-width: 640px) {
  .promo-wrapper {
    grid-template-columns: 1fr;
  }
}

.promo-card {
  position: relative;
  border: 1px solid #1f1f1f;
  background: #090909;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
  overflow: hidden;
}

.promo-card:hover {
  background: #0c0c0c;
}

.card-store {
  border-left: 2px solid #f97316;
}

.card-store:hover {
  border-color: #f97316;
}

.card-mods:hover {
  border-color: #333;
}

.card-tag {
  position: absolute;
  top: 0;
  right: 0;
  background: #f97316;
  color: #000;
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 0.15em;
  padding: 3px 10px;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px 16px;
}

.card-eyebrow {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #f97316;
  margin: 0 0 6px;
}

.card-eyebrow--muted {
  color: #555;
}

.card-title {
  font-size: 18px;
  font-weight: 800;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: #fff;
  margin: 0 0 8px;
  line-height: 1;
}

.card-title--muted {
  color: #aaa;
}

.card-desc {
  font-size: 11px;
  line-height: 1.55;
  color: #555;
  margin: 0;
}

.cta-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 14px;
  border: 1px solid;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.2s;
  width: fit-content;
}

.cta-btn--store {
  background: #f97316;
  border-color: #f97316;
  color: #000;
}

.cta-btn--store:hover {
  background: #ea6a08;
  border-color: #ea6a08;
}

.cta-btn--mods {
  background: transparent;
  border-color: #222;
  color: #666;
}

.cta-btn--mods:hover {
  border-color: #444;
  color: #aaa;
}
</style>