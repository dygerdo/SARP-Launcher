<script setup lang="ts">
function openStore() {
  window.launcher.openExternal("https://ucp.sarp.es/app/ucp/shop")
}

function openModSubmit() {
  window.launcher.openExternal("https://forum.sarp.es/index.php?/topic/9149-publica-aqu%C3%AD-tu-petici%C3%B3n-para-permitir-un-mod/")
}
</script>

<template>
  <div class="promo-wrapper">

    <!-- ══════════════════════════════════════
         CARD 1 — TIENDA
    ══════════════════════════════════════ -->
    <div class="promo-card card-store" @click="openStore">
      <!-- Animated bg glow -->
      <div class="card-glow store-glow" />

      <!-- Diagonal stripe accent -->
      <div class="diagonal-stripes" />

      <!-- Corner tag -->
      <div class="corner-tag">ESPECIAL</div>

      <div class="card-body">
        <!-- Icon -->
        <div class="store-icon-wrap">
          <!-- SVG "shop bag" 3D-style -->
          <svg class="store-svg" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="bagTop" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#ffb347"/>
                <stop offset="100%" stop-color="#fb7300"/>
              </linearGradient>
              <linearGradient id="bagSide" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stop-color="#c45700"/>
                <stop offset="100%" stop-color="#a03d00"/>
              </linearGradient>
              <linearGradient id="starGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#fff7d6"/>
                <stop offset="100%" stop-color="#ffd666"/>
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="2" result="blur"/>
                <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>
            <!-- Bag body -->
            <path d="M10 26h44l-4 30H14L10 26z" fill="url(#bagTop)" opacity="0.95"/>
            <!-- Bag shadow side -->
            <path d="M50 26l-4 30h6l4-30H50z" fill="url(#bagSide)" opacity="0.8"/>
            <!-- Bag flap top -->
            <rect x="10" y="22" width="44" height="6" rx="2" fill="#fb7300"/>
            <!-- Handle left -->
            <path d="M22 22 C22 10, 30 8, 32 8" stroke="#fb7300" stroke-width="3.5" stroke-linecap="round" fill="none" opacity="0.9"/>
            <!-- Handle right -->
            <path d="M42 22 C42 10, 34 8, 32 8" stroke="#fb7300" stroke-width="3.5" stroke-linecap="round" fill="none" opacity="0.9"/>
            <!-- Star -->
            <path filter="url(#glow)" d="M32 31 l2.5 5 5.5 0.8 -4 3.9 0.9 5.5 -4.9-2.6 -4.9 2.6 0.9-5.5 -4-3.9 5.5-0.8z" fill="url(#starGrad)"/>
            <!-- Shine -->
            <ellipse cx="20" cy="32" rx="3" ry="5" fill="white" opacity="0.07" transform="rotate(-20 20 32)"/>
          </svg>
          <div class="icon-shadow" />
        </div>

        <!-- Text -->
        <div class="card-text">
          <p class="card-eyebrow">Tienda exclusiva</p>
          <h3 class="card-title">Potencia tu<br><em>experiencia</em></h3>
          <p class="card-desc">
            Prendas exclusivas, skins únicos y mejoras de cuenta. Apoya el desarrollo de San Andreas Roleplay.
          </p>
        </div>

        <!-- CTA -->
        <div class="card-cta">
          <button class="cta-btn cta-btn--store" @click.stop="openStore">
            <span>Visitar tienda</span>
            <svg class="cta-arrow" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <span class="cta-hint">ucp.sarp.es/shop</span>
        </div>
      </div>
    </div>

    <!-- ══════════════════════════════════════
         CARD 2 — SUBMIT MOD
    ══════════════════════════════════════ -->
    <div class="promo-card card-mods" @click="openModSubmit">
      <div class="card-glow mods-glow" />

      <div class="card-body">
        <!-- Icon -->
        <div class="mod-icon-wrap">
          <svg class="mod-svg" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="wrenchGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#c8c8d4"/>
                <stop offset="100%" stop-color="#6b6b7a"/>
              </linearGradient>
              <linearGradient id="wrenchShine" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="white" stop-opacity="0.25"/>
                <stop offset="100%" stop-color="white" stop-opacity="0"/>
              </linearGradient>
              <linearGradient id="uploadGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#fb7300"/>
                <stop offset="100%" stop-color="#c45700"/>
              </linearGradient>
            </defs>
            <!-- Wrench shape -->
            <path d="M14 48 L36 26 C34 21 35 14 40 11 C43 10 46 10 48 12 L43 17 L44 21 L48 22 L53 17 C55 19 55 23 53 27 C50 32 43 33 38 31 L16 53 C14 55 11 55 10 53 C8 51 10 48 12 48 L14 48z" fill="url(#wrenchGrad)"/>
            <path d="M14 48 L36 26 C34 21 35 14 40 11 C43 10 46 10 48 12 L43 17 L44 21 L48 22 L53 17 C55 19 55 23 53 27 C50 32 43 33 38 31 L16 53 C14 55 11 55 10 53 C8 51 10 48 12 48 L14 48z" fill="url(#wrenchShine)"/>
            <!-- Upload arrow badge -->
            <circle cx="46" cy="46" r="12" fill="#111"/>
            <circle cx="46" cy="46" r="11" fill="url(#uploadGrad)" opacity="0.9"/>
            <path d="M46 52 L46 42 M42 46 L46 42 L50 46" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <div class="icon-shadow mod-shadow" />
        </div>

        <!-- Text -->
        <div class="card-text">
          <p class="card-eyebrow card-eyebrow--subtle">Registros de Mods</p>
          <h3 class="card-title card-title--sm">¿No aparece un mod?<br><em>Súbelo al launcher</em></h3>
          <p class="card-desc">
            Envía tu mod para revisión y whitelist. Si cumple los estándares de SARP, lo añadimos oficialmente.
          </p>
        </div>

        <!-- CTA -->
        <div class="card-cta">
          <button class="cta-btn cta-btn--mods" @click.stop="openModSubmit">
            <span>Enviar mod</span>
            <svg class="cta-arrow" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <span class="cta-hint">Foro SARP</span>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,400;0,700;0,800;1,700;1,800&family=DM+Sans:wght@400;500&display=swap');

/* ── Layout ── */
.promo-wrapper {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  font-family: 'DM Sans', sans-serif;
}

@media (max-width: 640px) {
  .promo-wrapper { grid-template-columns: 1fr; }
}

/* ── Base card ── */
.promo-card {
  position: relative;
  overflow: hidden;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.05);
  background: #0f0f11;
  cursor: pointer;
  transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
}

.promo-card:hover {
  transform: translateY(-2px);
}

/* ── Store card ── */
.card-store {
  border-color: rgba(251,115,0,0.1);
  background: linear-gradient(135deg, #141210 0%, #0f0f11 50%, #110e0a 100%);
}

.card-store:hover {
  border-color: rgba(251,115,0,0.3);
  box-shadow: 0 12px 48px rgba(251,115,0,0.12), 0 0 0 1px rgba(251,115,0,0.08);
}

/* ── Mods card ── */
.card-mods {
  border-color: rgba(255,255,255,0.04);
  background: linear-gradient(135deg, #101012 0%, #0d0d10 100%);
}

.card-mods:hover {
  border-color: rgba(255,255,255,0.1);
  box-shadow: 0 12px 48px rgba(0,0,0,0.4);
}

/* ── Glows ── */
.card-glow {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  filter: blur(60px);
  transition: opacity 0.3s;
}

.store-glow {
  width: 200px; height: 200px;
  top: -60px; left: -40px;
  background: radial-gradient(circle, rgba(251,115,0,0.2) 0%, transparent 70%);
}

.mods-glow {
  width: 160px; height: 160px;
  bottom: -40px; right: -30px;
  background: radial-gradient(circle, rgba(150,150,180,0.08) 0%, transparent 70%);
}

/* ── Diagonal stripes (store) ── */
.diagonal-stripes {
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    -55deg,
    transparent,
    transparent 18px,
    rgba(251,115,0,0.018) 18px,
    rgba(251,115,0,0.018) 20px
  );
  pointer-events: none;
}

/* ── Corner tag ── */
.corner-tag {
  position: absolute;
  top: 14px;
  right: -20px;
  background: #fb7300;
  color: #000;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 8.5px;
  letter-spacing: 0.18em;
  padding: 3px 32px;
  transform: rotate(38deg);
  transform-origin: center;
  pointer-events: none;
}

/* ── Card body ── */
.card-body {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 22px 20px 20px;
  z-index: 1;
}

/* ── Icons ── */
.store-icon-wrap,
.mod-icon-wrap {
  position: relative;
  width: fit-content;
}

.store-svg,
.mod-svg {
  width: 54px;
  height: 54px;
  filter: drop-shadow(0 6px 12px rgba(0,0,0,0.5));
}

.icon-shadow {
  position: absolute;
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%);
  width: 36px;
  height: 8px;
  background: rgba(251,115,0,0.25);
  filter: blur(8px);
  border-radius: 50%;
}

.mod-shadow {
  background: rgba(100,100,120,0.2);
}

/* ── Text ── */
.card-eyebrow {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(251,115,0,0.7);
  margin: 0;
}

.card-eyebrow--subtle {
  color: rgba(255,255,255,0.2);
}

.card-title {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 26px;
  font-weight: 800;
  line-height: 1.0;
  letter-spacing: -0.01em;
  text-transform: uppercase;
  color: #f0f0f0;
  margin: 4px 0 0;
}

.card-title em {
  font-style: italic;
  color: #fb7300;
}

.card-title--sm {
  font-size: 21px;
  color: #c0c0c8;
}

.card-title--sm em {
  color: #e0e0e8;
}

.card-desc {
  font-size: 11.5px;
  line-height: 1.55;
  color: rgba(255,255,255,0.28);
  margin: 6px 0 0;
  max-width: 240px;
}

/* ── CTA ── */
.card-cta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 4px;
}

.cta-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 18px;
  border-radius: 8px;
  border: 1px solid;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.cta-arrow {
  width: 14px;
  height: 14px;
  transition: transform 0.2s;
}

.cta-btn:hover .cta-arrow {
  transform: translateX(3px);
}

/* Store button */
.cta-btn--store {
  background: #fb7300;
  border-color: #fb7300;
  color: #000;
  box-shadow: 0 4px 20px rgba(251,115,0,0.3);
}

.cta-btn--store:hover {
  background: #ff8c1f;
  box-shadow: 0 4px 28px rgba(251,115,0,0.45);
  transform: translateY(-1px);
}

/* Mods button */
.cta-btn--mods {
  background: rgba(255,255,255,0.05);
  border-color: rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.6);
}

.cta-btn--mods:hover {
  background: rgba(255,255,255,0.09);
  border-color: rgba(255,255,255,0.18);
  color: #fff;
}

.cta-hint {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 9.5px;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: rgba(255,255,255,0.12);
  white-space: nowrap;
}
</style>