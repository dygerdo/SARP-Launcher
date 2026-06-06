import { createApp } from "vue"
import { createPinia } from "pinia"
import PrimeVue from "primevue/config"
import Aura from "@primevue/themes/aura"
import App from "./App.vue"
import "primeicons/primeicons.css"
import "./style.css"

import router from "./router"
import ConfirmationService from "primevue/confirmationservice"
import ToastService from "primevue/toastservice"
import Tooltip from "primevue/tooltip"

import { preloadLauncherAssets } from "./utils/preloader"

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(ConfirmationService)
app.use(ToastService)
app.directive("tooltip", Tooltip)
app.use(PrimeVue, {
  theme: {
    preset: Aura,
    options: {
      darkModeSelector: ".dark",
    },
  },
})

// Initialize the app but delay showing it until assets are ready
const init = async () => {
  app.mount("#app")

  try {
    // Wait for the next tick + images to preload
    await Promise.all([
      new Promise((resolve) => requestAnimationFrame(resolve)),
      preloadLauncherAssets(),
    ])
  } catch (e) {
    console.error("Preloading error:", e)
  }

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
    // Absolute fallback to ensure the app is never stuck behind the skeleton
    setTimeout(() => {
      if (document.body.contains(skeleton)) {
        skeleton.remove()
      }
    }, 1500)
  }
}

init()
