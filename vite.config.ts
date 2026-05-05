import { defineConfig, loadEnv } from "vite"
import vue from "@vitejs/plugin-vue"
import electron from "vite-plugin-electron/simple"
import renderer from "vite-plugin-electron-renderer"
import { resolve } from "node:path"

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")
  if (env.DEV_GTA_PATH) process.env.DEV_GTA_PATH = env.DEV_GTA_PATH

  // Vite only inlines `VITE_*` env vars into the renderer bundle. The Electron
  // main process is plain Node, so `process.env.VITE_FOO` is undefined at
  // runtime in the packaged build. We `define` the vars we read from main so
  // they get baked into dist-electron at build time.
  const mainEnvDefines = {
    "process.env.VITE_CDN_URL": JSON.stringify(env.VITE_CDN_URL ?? ""),
    "process.env.VITE_GAME_CACHE_FOLDER": JSON.stringify(env.VITE_GAME_CACHE_FOLDER ?? ""),
  }

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
            define: mainEnvDefines,
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
            define: mainEnvDefines,
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
