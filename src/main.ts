import { createApp } from "vue"
import { createPinia } from "pinia"
import PrimeVue from "primevue/config"
import Aura from "@primevue/themes/aura"
import App from "./App.vue"
import "primeicons/primeicons.css"
import "./style.css"

const app = createApp(App)

app.use(createPinia())
app.use(PrimeVue, {
  theme: {
    preset: Aura,
    options: {
      darkModeSelector: ".dark",
    },
  },
})

app.mount("#app")

// Hand off from the static boot skeleton (rendered by index.html before Vue
// loads) to the Vue-rendered UI. We wait one rAF so the first Vue paint has
// landed, then trigger a CSS fade by toggling data-app-mounted, and finally
// remove the skeleton node after the transition so its keyframe animations
// stop consuming a render thread.
requestAnimationFrame(() => {
  document.documentElement.dataset.appMounted = "true"
  const skeleton = document.getElementById("boot-skeleton")
  if (skeleton) {
    skeleton.addEventListener(
      "transitionend",
      () => {
        skeleton.remove()
      },
      { once: true },
    )
    // Defensive fallback: if the transitionend never fires (reduced-motion,
    // someone overrides the CSS, etc.), drop the node after a hard timeout.
    setTimeout(() => skeleton.remove(), 1000)
  }
})
