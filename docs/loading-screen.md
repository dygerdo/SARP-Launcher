# Plan del Loading Screen

Pantalla que se muestra **después del splash** y **antes de la home**. Su rol: **dejar al launcher en estado "listo para jugar"** verificando conectividad, descargando assets cuando hace falta y validando integridad.

Referencia de manifest y CDN: [./manifest.md](./manifest.md).

---

## Objetivo

Cuando el loading screen termina, el launcher tiene **todo lo necesario** para que el botón "Jugar" de la home funcione sin esperas:

- `samp.exe` correcto (versión del manifest) presente junto a `gta_sa.exe`.
- Cache del servidor extraído en `Documents\GTA San Andreas User Files\SAMP\cache\`.
- Información del servidor (IP, puerto) actualizada.
- News y estado del server cargados para mostrar en home.

---

## Tareas — clasificadas por tier

### Tier 1 — Críticas (bloquean el acceso al juego)

| # | Tarea | Dónde | Tiempo típico |
|---|-------|-------|---------------|
| 1 | Verificar que `gta_sa.exe` siga existiendo junto al launcher | electron main | <50ms |
| 2 | Fetch del manifest (`/api/public/launcher/manifest`) | renderer (axios) | <500ms |
| 3 | Comparar `samp.exe` local vs versión del manifest | electron main + electron-store | instantáneo |
| 4 | Comparar `cache.zip` local vs versión del manifest | electron main + electron-store | instantáneo |
| 5 | Descargar `samp.exe` si hace falta (con progreso real) | electron main (axios) | 5-30s |
| 6 | Verificar SHA256 de `samp.exe` descargado | electron main (crypto) | <500ms |
| 7 | Descargar `cache.zip` si hace falta (con progreso real) | electron main (axios) | 10-60s |
| 8 | Verificar SHA256 de `cache.zip` descargado | electron main (crypto) | <500ms |
| 9 | Extraer `cache.zip` a `~/Documents/...` (con progreso) | electron main (extract-zip) | 5-15s |
| 10 | Persistir nuevas versiones en electron-store | electron main | instantáneo |

### Tier 2 — UX y branding (no bloquean, mejoran la home)

| # | Tarea | Dónde | Tiempo típico |
|----|-------|-------|---------------|
| 11 | Verificar versión del launcher (`electron-updater`) | electron main | <1s |
| 12 | Fetch del estado del servidor de juego (`/api/public/launcher/status`) | renderer | <500ms |
| 13 | Pre-fetch de noticias (vienen en el manifest, ya cargadas) | — | — |

### Tier 3 — Seguridad / integridad (futuro, no v1)

- Verificar que `gta_sa.exe` sea la versión 1.0 US (compatible con SAMP).
- Detectar mods/cleos prohibidos en la carpeta de GTA.
- Verificar que el cache no fue modificado manualmente.

---

## Decisiones de diseño tomadas

### 1. Modo degradado si la API está caída

**Si `api.sarp.es` no responde**:

- **Tenemos `samp.exe` y `cache` en disco** (de un arranque previo) → permitir jugar igual, mostrar pequeña advertencia "Modo offline — no se pudieron verificar actualizaciones".
- **No tenemos los assets** (primera vez) → bloqueo: "El servidor está temporalmente fuera de línea, intentá más tarde".

Razón: el servidor de SAMP puede estar arriba aunque la API esté caída. No bloquear al usuario sin necesidad.

### 2. Reintentos automáticos en descargas

- 3 reintentos automáticos con backoff exponencial (1s, 3s, 9s).
- Si los 3 fallan → error claro con botón "Reintentar".

### 3. Barra de progreso híbrida

`useProgressBar` se extiende para soportar dos modos:

- **Asintótico** (lo actual): para checks rápidos donde no hay porcentaje real.
- **Determinístico**: cuando hay descarga con progreso conocido (vía `axios.onDownloadProgress`), la barra muestra el porcentaje real.

El cambio entre modos es transparente para el componente.

### 4. Una sola barra global + texto de estado dinámico

- Una sola barra que avanza por todas las tareas (no múltiples barras simultáneas).
- Texto debajo de la barra cambia según la tarea activa: _"Verificando archivos del juego..."_, _"Descargando samp.exe (3.2 MB / 4.1 MB)..."_, _"Extrayendo cache..."_.
- Lo que tenemos ya — solo cambia el contenido del status.

### 5. Estado online/offline del servidor en endpoint separado

- `/api/public/launcher/status` (no en el manifest).
- Razón: cambia en tiempo real, no quiere cache. El manifest sí quiere cache.

---

## Flujo del loading

```
[Splash inicial — ya existente, sin cambios]
       ↓
[Loading screen]
   1. ✓ Verificar gta_sa.exe (instant)
   2. ✓ Fetch manifest                              ← si falla → modo degradado o bloqueo
   3. ✓ Comparar versiones locales vs manifest
   4. (si hace falta) Descargar samp.exe            ← progreso real
   5. (si hace falta) Verificar SHA256 samp.exe
   6. (si hace falta) Descargar cache.zip           ← progreso real
   7. (si hace falta) Verificar SHA256 cache.zip
   8. (si hace falta) Extraer cache.zip             ← progreso de extracción
   9. ✓ Persistir versiones en store
  10. ✓ Verificar update del launcher               ← si hay update obligatorio: forzar
  11. ✓ Fetch estado del servidor                   ← UX, no bloquea
       ↓
[Home — siguiente paso del proyecto]
```

**Camino feliz** (segunda vez en adelante, todo cacheado): pasos 1-3, 9-11. **<2 segundos.**

**Camino primera vez**: todos los pasos. **30-90 segundos** según red. La barra avanza con progreso real durante descargas.

---

## Mensajes de estado (texto debajo de la barra)

Cada tarea cambia el texto. Mensajes propuestos (en español, conciso):

| Tarea | Mensaje |
|-------|---------|
| 1 | "Verificando instalación del juego..." |
| 2 | "Conectando con el servidor..." |
| 3 | "Comprobando archivos..." |
| 5 | "Descargando SA:MP ({downloaded} / {total})..." |
| 6 | "Verificando SA:MP..." |
| 7 | "Descargando recursos del servidor ({downloaded} / {total})..." |
| 8 | "Verificando recursos..." |
| 9 | "Instalando recursos del servidor..." |
| 10 | "Guardando configuración..." |
| 11 | "Buscando actualizaciones del launcher..." |
| 12 | "Obteniendo estado del servidor..." |
| Final | "Listo." |

Si una tarea falla y entra en reintento: _"Hubo un problema, reintentando ({n}/3)..."_.

---

## Arquitectura técnica

### Archivos a crear

```
electron/
├── ipc/
│   ├── channels.ts                    # agregar canales nuevos
│   └── handlers.ts                    # agregar handlers nuevos
└── services/
    ├── manifest.ts                    # fetch + cache del manifest
    ├── downloader.ts                  # descarga con progreso + SHA256
    ├── extractor.ts                   # extract-zip con progreso
    └── assetSync.ts                   # orquestador: compara versiones, descarga, extrae

src/
├── composables/
│   ├── useProgressBar.ts              # ampliar para modo determinístico
│   ├── useManifest.ts                 # consume manifest desde renderer
│   └── useBootSequence.ts             # orquesta todas las tareas del loading
└── pages/
    └── LoadingPage.vue                # consumir useBootSequence
```

### Canales IPC nuevos

```ts
ASSET_SYNC_START          // inicia toda la secuencia de sync
ASSET_SYNC_PROGRESS       // event (main → renderer): { task, progress, total, message }
ASSET_SYNC_DONE           // event: completado
ASSET_SYNC_ERROR          // event: error con detalle
GAME_VERIFY               // verifica que gta_sa.exe existe
UPDATER_CHECK             // verifica si hay update del launcher
```

Los eventos `*_PROGRESS`, `*_DONE`, `*_ERROR` van por `webContents.send()` (main → renderer push), no por `invoke`.

### Schema del store

Ampliar `LauncherStoreSchema` ([electron/services/store.ts](electron/services/store.ts)):

```ts
interface LauncherStoreSchema {
  sampVersion: number | null
  cacheVersion: number | null
  lastManifestFetchAt: string | null   // ISO 8601
  lastSuccessfulSyncAt: string | null  // ISO 8601 — para "modo offline"
}
```

---

## Estados de error y recovery

| Error | UX |
|-------|-----|
| `gta_sa.exe` no existe (usuario lo movió) | Pantalla de error: "No encontramos GTA San Andreas. Reinstalá el launcher en la carpeta correcta." Sin recovery automático. |
| Manifest no responde | Reintentos. Si no hay assets locales: bloqueo. Si hay: modo offline con advertencia. |
| Descarga corrupta (SHA256 no matchea) | Reintenta automáticamente (hasta 3 veces). Si falla: error con botón "Reintentar". |
| Sin espacio en disco para extraer | Error claro con la cantidad necesaria: "Necesitás X MB libres". |
| Update del launcher obligatorio | Bloquea el flujo. Solo botón "Actualizar" que descarga e instala. |

---

## Plan de implementación (cuando arranquemos)

Lo dividiría en estos pasos para hacerlo manejable:

1. **Mock del manifest**: hardcodear un JSON en el launcher para iterar sin depender del endpoint real.
2. **Service `manifest.ts`** + composable `useManifest.ts` (consume mock, después switch a HTTP real).
3. **Service `downloader.ts`** con progreso vía `axios.onDownloadProgress` + cálculo de SHA256 al terminar.
4. **Service `extractor.ts`** con `extract-zip` + progreso de extracción.
5. **Service `assetSync.ts`** que orquesta los pasos del Tier 1 (compara versiones → decide qué descargar → ejecuta).
6. **Composable `useBootSequence.ts`** que llama al main vía IPC y traduce eventos en cambios del progreso/status del loading.
7. **Ampliar `useProgressBar`** para soportar modo determinístico.
8. **Actualizar `LoadingPage.vue`** para usar el nuevo flujo.
9. **Endpoint real en `api.sarp.es`**: cuando esté listo, switchear el `useManifest` de mock a HTTP. Cero cambios en el launcher.
10. **Auto-updater (electron-updater)**: integrar Tier 2 #11.
11. **Endpoint `/launcher/status`** + composable `useServerStatus`: Tier 2 #12.

Dependencia entre pasos: 1 → 2 → 3, 4 (en paralelo) → 5 → 6 → 7, 8.

---

## Lo que queda fuera del alcance del loading

Estas son cosas que **no** hace el loading, ni siquiera en versiones futuras — pertenecen a otras pantallas:

- **Lanzar el juego**: lo hace el botón "Jugar" de la home, no el loading.
- **Settings de gráficos / sonido**: pantalla de settings.
- **Login del usuario**: no aplica en v1 (sin auth). En v2+, una pantalla de login va antes del loading.
- **Browse de servidores**: el launcher es de un servidor único (SARP), no es un cliente SAMP genérico.
