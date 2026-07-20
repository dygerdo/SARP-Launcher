import { defineConfig, loadEnv } from "vite"
import vue from "@vitejs/plugin-vue"
import electron from "vite-plugin-electron/simple"
import renderer from "vite-plugin-electron-renderer"
import { execSync } from "node:child_process"
import { resolve } from "node:path"

// Resolve the short git commit hash at build time so the renderer footer can
// show e.g. "v1.0.0 (a3f2b1c)". Falls back to "unknown" outside a git checkout
// (CI without history, sources extracted from a tarball, etc.) so the build
// never breaks because of this.
function resolveGitCommit(): string {
  try {
    return execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim()
  } catch {
    return "unknown"
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")
  if (env.DEV_GTA_PATH) process.env.DEV_GTA_PATH = env.DEV_GTA_PATH

  const gitCommit = resolveGitCommit()

  // Vite only inlines `VITE_*` env vars into the renderer bundle. The Electron
  // main process is plain Node, so `process.env.VITE_FOO` is undefined at
  // runtime in the packaged build. We `define` the vars we read from main so
  // they get baked into dist-electron at build time.
  const mainEnvDefines = {
    "process.env.VITE_CDN_URL": JSON.stringify(env.VITE_CDN_URL ?? ""),
    "process.env.VITE_GAME_CACHE_FOLDER": JSON.stringify(env.VITE_GAME_CACHE_FOLDER ?? ""),
    "process.env.GH_TOKEN": JSON.stringify(env.GH_TOKEN ?? ""),
  }

  return {
    resolve: {
      alias: {
        "@": resolve(__dirname, "src"),
      },
    },
    define: {
      __GIT_COMMIT__: JSON.stringify(gitCommit),
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
                external: [
                  "electron-store",
                  "electron-updater",
                  "electron-log",
                  "extract-zip",
                  "discord-rpc",
                ],
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
