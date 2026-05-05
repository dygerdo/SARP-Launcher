# CLAUDE.md — San Andreas Roleplay · SA:MP Launcher

Launcher oficial del servidor SAMP de San Andreas Roleplay. App de escritorio Windows que verifica la instalación de GTA SA, descarga `samp.exe` y el `cache.zip` desde el CDN, y lanza el juego.

---

## Documentación

Los planes y diseños detallados viven en [docs/](docs/). Antes de implementar una feature compleja, consultá si hay un doc de referencia en esa carpeta.

- [docs/README.md](docs/README.md) — índice de documentación.
- [docs/manifest.md](docs/manifest.md) — estructura del CDN + endpoint del manifest.
- [docs/loading-screen.md](docs/loading-screen.md) — plan del loading screen.

---

## Skills del proyecto

Este repo incluye una colección de skills locales en [.agents/skills/](.agents/skills/) — guías de referencia (cada una con su propio `SKILL.md`) que Claude **debe consultar al iniciar tareas relacionadas** antes de generar código:

| Carpeta                                                                                | Cuándo usarla                                                              |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| [.agents/skills/vue/](.agents/skills/vue/)                                             | Cualquier trabajo con componentes Vue 3 (`<script setup>`, props, slots).  |
| [.agents/skills/vue-best-practices/](.agents/skills/vue-best-practices/)               | Patrones recomendados, organización, naming, antipatrones a evitar.        |
| [.agents/skills/vue-pinia-best-practices/](.agents/skills/vue-pinia-best-practices/)   | Diseño de stores Pinia, composición, persistencia, tipado.                 |
| [.agents/skills/vue-debug-guides/](.agents/skills/vue-debug-guides/)                   | Diagnóstico de bugs en Vue (reactividad, lifecycle, DevTools).             |
| [.agents/skills/tailwind-css-patterns/](.agents/skills/tailwind-css-patterns/)         | Patrones de Tailwind, composición de clases, variantes, arbitrary values.  |
| [.agents/skills/frontend-design/](.agents/skills/frontend-design/)                     | Decisiones de UX/UI, jerarquía visual, layouts, microinteracciones.        |
| [.agents/skills/accessibility/](.agents/skills/accessibility/)                         | A11y: roles ARIA, contraste, navegación por teclado, lectores de pantalla. |
| [.agents/skills/typescript-advanced-types/](.agents/skills/typescript-advanced-types/) | Generics, conditional types, mapped types, type narrowing avanzado.        |
| [.agents/skills/vite/](.agents/skills/vite/)                                           | Configuración de Vite, plugins, optimización de build, HMR.                |
| [.agents/skills/nodejs-backend-patterns/](.agents/skills/nodejs-backend-patterns/)     | Patrones de Node (relevante para el proceso main de Electron).             |
| [.agents/skills/nodejs-best-practices/](.agents/skills/nodejs-best-practices/)         | Buenas prácticas generales de Node.                                        |
| [.agents/skills/seo/](.agents/skills/seo/)                                             | (No aplica al launcher — Electron no se indexa.)                           |

**Reglas de uso:**

1. **Antes de implementar** una feature/refactor que toque un dominio listado, **leer el `SKILL.md` correspondiente** y aplicar sus recomendaciones.
2. Si una skill tiene `references/` o `GENERATION.md`, consultarlos también si la tarea es no-trivial.
3. La decisión de cuál skill activar es del asistente — el usuario no necesita pedirlo. Cuando se use, mencionarlo brevemente al inicio del trabajo (_"Leyendo skill `vue-best-practices` antes de tocar este componente"_).
4. Si la tarea es trivial (cambio de copy, ajuste de color, typo), no hace falta consultar skill.

---

## Stack Tecnológico

| Capa               | Tecnología                                                        |
| ------------------ | ----------------------------------------------------------------- |
| Framework UI       | Vue 3 (`<script setup>`) + Composition API                        |
| Lenguaje           | TypeScript 5                                                      |
| Bundler            | Vite 5 + `vite-plugin-electron` + `vite-plugin-electron-renderer` |
| Runtime            | Electron 33                                                       |
| Empaquetado        | electron-builder 25 (target: NSIS, x64)                           |
| Estado             | Pinia                                                             |
| HTTP               | axios                                                             |
| UI Components      | PrimeVue 4 (tema Aura)                                            |
| Estilos            | Tailwind CSS 3                                                    |
| Persistencia local | electron-store                                                    |
| Auto-update        | electron-updater (provider: generic → Bunny CDN)                  |
| Logs               | electron-log                                                      |
| Descompresión      | extract-zip                                                       |
| DX                 | ESLint + Prettier + vue-tsc                                       |
| Package manager    | yarn                                                              |

---

## Estructura de Directorios

```
launcher/
├── electron/
│   ├── main.ts          # Proceso main: BrowserWindow, auto-updater, IPC handlers
│   └── preload.ts       # contextBridge → API segura al renderer
├── src/
│   ├── api/             # axios instance + servicios (api.sarp.es)
│   ├── components/      # Componentes Vue por feature
│   │   └── loading/     # ProgressBar, LogoMark
│   ├── composables/     # useProgressBar, etc.
│   ├── pages/           # Vistas full-screen (LoadingPage, ...)
│   ├── stores/          # Pinia
│   ├── App.vue
│   ├── main.ts          # Bootstrap Vue + Pinia + PrimeVue
│   ├── style.css        # Tailwind + reset global
│   └── env.d.ts         # Tipos de import.meta.env
├── public/              # Assets estáticos embebidos (NO van al CDN)
│   ├── logo.png
│   ├── favicon.ico
│   └── background.png
├── .env / .env.example  # VITE_API_URL, VITE_CDN_URL, VITE_GAME_SERVER_*
├── electron-builder.json
├── vite.config.ts
├── tailwind.config.js + postcss.config.js
├── tsconfig.json + tsconfig.node.json
└── package.json
```

---

## Decisiones de Producto

### Identidad

- **Nombre completo**: `San Andreas Roleplay - SA:MP Launcher` (window title, productName del instalador).
- **Nombre corto** (shortcuts, taskbar): `SARP SA:MP Launcher`.
- **App ID**: `es.sarp.launcher`.
- **Idioma de la UI**: español. Código y comentarios: inglés.
- **Copyright**: `© 2023 - {currentYear}` (año dinámico, lo arranca en 2023).

### Versionado

- Versión del launcher se muestra en la splash (`v1.0.0` minúscula, sin `uppercase`).
- El usuario instala una vez. Las v2, v3, v4 llegan vía **electron-updater desde Bunny CDN** (`https://sarp-public.b-cdn.net/launcher/`).
- Releases publican `latest.yml` + `.exe` + `.blockmap` al CDN. El launcher revisa al arrancar.

### Auth (v1)

- **Sin auth**. Solo endpoints públicos de `api.sarp.es`.
- A futuro: cookie `session` JWT (compartida con el UCP). Cuando se sume, configurar `axios` con `withCredentials: true` y revisar manejo de cookies en Electron.

### Distribución y ubicación del launcher

- **El launcher es un único `.exe` portable** (electron-builder `target: "portable"`). Se ejecuta desde donde el usuario lo deje (Descargas, Escritorio, USB…), sin instalación, sin entradas en registry ni Start Menu.
- **La carpeta de GTA es un dato gestionado dentro de la app**, no algo que un wizard configura por adelantado. `getGameDir()` devuelve `string | null`: hasta que el usuario elige carpeta válida es `null` y los health checks reportan error con un botón _"Cambiar ubicación"_ visible.
- **Flujo de primera apertura**: el usuario abre el `.exe` → health check muestra GTA en error → clic en _"Cambiar ubicación"_ → elige `C:\…\GTA San Andreas` → se guarda en `electron-store` y se crea `SARP Launcher.lnk` dentro de esa carpeta apuntando al `.exe` portable. El shortcut es idempotente: cambiar de carpeta repointea el `.lnk` en la nueva, no borra el de la anterior.
- **Importante**: el shortcut apunta a `process.env.PORTABLE_EXECUTABLE_FILE` (la ruta real del `.exe` portable), no a `app.getPath("exe")` — en modo portable Electron extrae a un temp dir transitorio y esa ruta desaparece entre ejecuciones.
- **En dev** (`yarn dev`), la ruta de GTA se simula vía `DEV_GTA_PATH` en `.env` y los shortcuts no se crean (`app.isPackaged` guard).

### Funcionalidades v1

1. **Descargar `samp.exe`** desde Bunny CDN → colocarlo junto al launcher (= junto a `gta_sa.exe`).
2. **Descargar y extraer `cache.zip`** desde Bunny CDN → `Documents\GTA San Andreas User Files\SAMP\cache\`.
3. **Lanzar el juego** con `child_process.spawn(samp.exe, [IP, PUERTO])`.
4. **Auto-actualizar el launcher** cuando haya nueva versión publicada.

**Fuera de alcance v1**: auth, edición de `samp.cfg`, perfil del usuario, news feed, chat, Socket.IO, onboarding (no hace falta — el instalador ya hace ese rol).

### CDN y assets

- **CDN**: `https://sarp-public.b-cdn.net` (Bunny).
- **Regla de oro**: _"¿Lo necesito para mostrar la primera pantalla sin internet?"_ → sí, va en `public/`. No, va al CDN.
- **`public/`** (embebido en el `.exe`): logo, favicon, background, íconos UI, fuentes propias.
- **CDN** (cambia sin recompilar): `samp.exe`, `cache.zip`, banners/noticias futuros.
- **Versionado de assets del CDN**: query string `?v=N` (ej: `cache/135.148.128.72.7777.zip?v=5`).

### Manifest endpoint (a futuro)

- Idea: `GET https://api.sarp.es/api/public/launcher/manifest` → devuelve versiones y URLs actuales de `samp.exe` y `cache.zip`.
- Permite subir nueva versión al CDN sin tocar el launcher: el launcher compara `version` con `electron-store` y descarga si cambió.
- **v1 hardcodea** las versiones en `.env` (`VITE_CACHE_VERSION`, `VITE_SAMP_VERSION`) hasta crear el endpoint.

---

## Variables de Entorno

Leer siempre desde `import.meta.env.VITE_*` (renderer) o `process.env` (electron main).

```bash
# API
VITE_API_URL=https://api.sarp.es

# CDN
VITE_CDN_URL=https://sarp-public.b-cdn.net

# Servidor de juego
VITE_GAME_SERVER_IP=135.148.128.72
VITE_GAME_SERVER_PORT=7777
```

**Importante**: el `.env` se _bundlea_ dentro del `.exe` en build. Cualquier cambio requiere republicar el launcher. Por eso lo dinámico (versiones de assets) idealmente vive en el manifest endpoint, no en `.env`.

---

## Reglas Globales de UI

Aplicadas en [src/style.css](src/style.css). Valen para toda la app:

- **Look de app nativa, no de página web**: `user-select: none` global, `cursor: default`.
- **Imágenes no arrastrables**: `<img>` con `pointer-events: none` y `-webkit-user-drag: none`.
- **Excepción de selección de texto**: `<input>`, `<textarea>`, `[contenteditable]` mantienen `user-select: text`.
- **Drag region**: cualquier header/topbar usa `style="-webkit-app-region: drag"` para mover la ventana. Botones y links interactivos dentro deben llevar `-webkit-app-region: no-drag`.
- **Tema**: oscuro por defecto (gaming/SAMP). Tailwind con `darkMode: "class"`, clase `.dark` ya aplicada por el sistema PrimeVue Aura.
- **Tipografía**: `system-ui, -apple-system, "Segoe UI", sans-serif` (stack nativo Windows). No cargar fuentes web — el launcher debe arrancar offline.

---

## Iconografía

| Contexto           | Archivo                                                                          |
| ------------------ | -------------------------------------------------------------------------------- |
| Window icon (dev)  | `public/favicon.ico`                                                             |
| Window icon (prod) | `process.resourcesPath/favicon.ico` (copiado vía `extraResources`)               |
| Instalador NSIS    | `public/favicon.ico` (`installerIcon`, `uninstallerIcon`, `installerHeaderIcon`) |
| Logo en UI         | `public/logo.png`                                                                |

El `.ico` debe ser multi-resolución (16/24/32/48/64/128/256).

---

## Configuración de Electron

[electron/main.ts](electron/main.ts):

- `contextIsolation: true`, `nodeIntegration: false` (estándar de seguridad moderno).
- `autoHideMenuBar: true` (sin barra de menú File/Edit/View).
- DevTools **no se abren automáticamente** en dev. Quedan accesibles con F12 / Ctrl+Shift+I.
- `BrowserWindow`: 1100×700 default, mínimo 900×600.

---

## Scripts

```bash
yarn dev          # Vite + Electron en dev
yarn build        # typecheck → bundle → instalador .exe
yarn build:dir    # build sin instalador (testing rápido)
yarn typecheck    # vue-tsc --noEmit
yarn lint         # eslint --fix
yarn lint:check   # eslint en modo verificación (CI, sin --fix, --max-warnings=0)
yarn format       # prettier --write
yarn format:check # prettier --check (CI)
yarn polish       # format + lint + typecheck (todo en uno)
```

---

## Reglas de Calidad de Código

### Regla obligatoria al final de cada cambio

**Después de cualquier modificación de código (componente, composable, electron, config), correr siempre `yarn polish` antes de cerrar el cambio.**

`yarn polish` ejecuta en orden:

1. `prettier --write` — formato consistente.
2. `eslint --fix` — autocorrige + falla en errores.
3. `vue-tsc --noEmit` — type-check estricto (incluye `.vue`).

Si `polish` falla, **el cambio no está terminado**. Hay que arreglar lo que reporta antes de avanzar al próximo punto.

### Configuración estricta

- **Prettier** ([.prettierrc](.prettierrc)): `semi: false`, `singleQuote: false`, `printWidth: 100`, `trailingComma: "all"`, `arrowParens: "always"`, `endOfLine: "lf"`.
- **ESLint flat config** ([eslint.config.js](eslint.config.js)) — ESLint 9 con flat config, no `.eslintrc`.
  - `eqeqeq: "error"` (siempre `===`).
  - `prefer-const`, `no-var` como `error`.
  - `no-console: "warn"` (permite `warn`, `error`, `info`).
  - `@typescript-eslint/no-unused-vars` como `warn`, ignora variables con prefijo `_`.
  - `vue/html-self-closing: "always"` para componentes y void elements.
- **TypeScript**: `strict: true`. `vue-tsc` valida `.vue`.

### Naming — corto, claro, sin redundancia

**Regla**: el nombre dice **qué** es, no **cómo** funciona ni todos los detalles. Si necesita una frase, está mal. Si lo entiende un dev nuevo en 1 segundo, está bien.

| ✅ Sí                | ❌ No                                                     |
| -------------------- | --------------------------------------------------------- |
| `useProgressBar.ts`  | `useAsymptoticProgress.ts`                                |
| `LoadingPage.vue`    | `InitialLoadingScreenWithProgress.vue`                    |
| `ProgressBar.vue`    | `LinearProgressBarWithGlow.vue`                           |
| `LogoMark.vue`       | `AnimatedLogoWithShimmerEffect.vue`                       |
| `paths.ts`           | `gameInstallationPathHelpers.ts`                          |
| `downloader.ts`      | `assetDownloaderWithProgressTracking.ts`                  |
| `formatBytes(n)`     | `convertNumberOfBytesToHumanReadableString(n)`            |
| `getUser(id)`        | `retrieveUserFromDatabaseById(id)`                        |
| `extract(zip, dest)` | `extractZipArchiveContentsToDestinationFolder(zip, dest)` |

**Pautas concretas:**

- **Componentes Vue**: `PascalCase`, sustantivos cortos (`LogoMark`, no `LauncherBrandLogoMark`).
- **Composables**: `useNombre` — el nombre es el **qué** (`useProgressBar`), no el **cómo** (`useAsymptoticProgressAnimation`).
- **Funciones**: verbos cortos. `download()` mejor que `performAssetDownload()`. `extract()` mejor que `extractZipFileContents()`.
- **Variables**: el contexto ya da la mitad del significado. Dentro de `function downloadFile() { ... }` la variable se llama `progress`, no `downloadProgressPercentage`.
- **Detalles del cómo van adentro** del archivo (en JSDoc / comentario corto si hace falta), no en el nombre.
- **Si el nombre se repite con la carpeta, simplificar**: `composables/useProgressBar.ts` → función `useProgressBar`. No `composables/progressBar/useProgressBarComposable.ts`.
- **Excepción**: si hay dos cosas similares en el mismo scope, sí distinguilas (`getUserById` vs `getUserByEmail`). Pero si solo hay una, `getUser` alcanza.

### Convenciones de imports

- Usar siempre el alias `@/` para `src/*`.
- Imports de tipos: `import type { ... }` cuando solo se usan como tipo.

---

## Convenciones del Proyecto

### Estilos: Tailwind primero, siempre

**Regla obligatoria**: usamos Tailwind para todo. **Nunca** se abre un `<style>` o un nuevo `.css` si la tarea se puede resolver con clases utility. Antes de pensar "necesito CSS custom", consultar la skill [.agents/skills/tailwind-css-patterns/](.agents/skills/tailwind-css-patterns/) — casi siempre Tailwind ya tiene la solución.

**Por qué**: consistencia visual entre componentes, sin estilos huérfanos, sin nombres de clase que envejecen, scope automático, y el bundle final es óptimo (PurgeCSS).

**Cuándo SÍ se prefiere CSS custom (`<style scoped>`)** — excepciones legítimas:

- **Animaciones**: `@keyframes`, transiciones complejas, secuencias multi-step. CSS custom es **mejor** que Tailwind para esto — más expresivo, más controlable, mejor performance que `transition-*` para casos no triviales.
- `mask-image`, filtros complejos, propiedades que Tailwind no expresa bien sin arbitrary values gigantes.
- Reglas globales (`html`, `body`, selectores universales) → solo en [src/style.css](src/style.css).

**Para todo lo demás, antes de abrir un `<style>`, agotar estas opciones**:

1. ¿Hay una clase utility de Tailwind directa? → usarla.
2. ¿Hay un arbitrary value razonable? (`bg-[#1e293b]`, `mt-[42px]`) → usar.
3. ¿Hay una variante de Tailwind que aplique? (`hover:`, `dark:`, `motion-safe:`, `[&_img]:`) → usar.
4. ¿Lo resuelve un plugin de Tailwind ya instalado? → usar.
5. **Solo si todo lo anterior falla** (y no es una animación), abrir `<style scoped>` con la mínima cantidad de CSS posible.

**Nunca** crear nuevos archivos `.css` por componente / feature. El único `.css` del proyecto es [src/style.css](src/style.css) (Tailwind + reglas globales), y permanece pequeño.

### Otras convenciones

- **Path alias**: `@/*` → `src/*` (configurado en `tsconfig.json` y `vite.config.ts`).
- **Componentes Vue**: `<script setup lang="ts">` siempre.
- **Páginas full-screen** van en `src/pages/`. Componentes reutilizables en `src/components/<feature>/`.
- **Lógica reutilizable** → composables en `src/composables/`.
- **Estado global** → Pinia stores en `src/stores/`.
- **Comunicación con API** → módulos en `src/api/` (axios instance compartida).
- **IPC main ↔ renderer** → exponer vía `contextBridge` en `electron/preload.ts`. Tipar en `src/env.d.ts`.

---

## Archivos Clave

| Archivo                                        | Propósito                             |
| ---------------------------------------------- | ------------------------------------- |
| [electron/main.ts](electron/main.ts)           | BrowserWindow, auto-updater, IPC      |
| [electron/preload.ts](electron/preload.ts)     | contextBridge: API segura al renderer |
| [vite.config.ts](vite.config.ts)               | Plugins Vue + Electron, alias         |
| [electron-builder.json](electron-builder.json) | Empaquetado, NSIS, publish a Bunny    |
| [src/main.ts](src/main.ts)                     | Bootstrap Vue + Pinia + PrimeVue      |
| [src/style.css](src/style.css)                 | Tailwind + reglas globales            |
