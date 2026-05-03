import { defineConfig, loadEnv } from "vite"
import vue from "@vitejs/plugin-vue"
import electron from "vite-plugin-electron/simple"
import renderer from "vite-plugin-electron-renderer"
import { resolve } from "node:path"

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")
  if (env.DEV_GTA_PATH) process.env.DEV_GTA_PATH = env.DEV_GTA_PATH

  return {
    resolve: {
      alias: {
        "@": resolve(__dirname, "src"),
      },
    },
    plugins: [
      vue(),
      electron({
        main: {
          entry: "electron/main.ts",
          vite: {
            build: {
              outDir: "dist-electron",
              rollupOptions: {
                external: ["electron-store", "electron-updater", "electron-log", "extract-zip"],
              },
            },
          },
        },
        preload: {
          input: "electron/preload.ts",
          vite: {
            build: {
              outDir: "dist-electron",
            },
          },
        },
      }),
      renderer(),
    ],
  }
})
