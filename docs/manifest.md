# Manifest del Launcher

Documento de referencia para el endpoint **`GET https://api.sarp.es/api/public/launcher/manifest`** y la estructura del CDN. Es la pieza que permite cambiar versiones de `samp.exe`, `cache.zip` y noticias **sin recompilar el launcher**.

---

## Filosofía

- **Lo que cambia seguido vive en la API**: versiones de assets, URLs, IP del servidor, noticias.
- **Lo que casi nunca cambia vive en `.env` del launcher**: URL base de la API, URL base del CDN.
- **Los binarios pesados viven en el CDN** (Bunny): `samp.exe`, `cache.zip`, futuras imágenes.
- **El launcher arranca, lee el manifest, decide qué descargar.** Si una versión local difiere de la del manifest → descarga.

---

## Estructura del CDN

`https://sarp-public.b-cdn.net/`

```
launcher/                                          # auto-update del .exe (electron-updater)
├── SARP-SAMP-Launcher-Setup-1.0.0.exe
├── SARP-SAMP-Launcher-Setup-1.0.0.exe.blockmap
└── latest.yml

samp/                                              # samp.exe versionado
├── samp-v1.exe
├── samp-v2.exe                                    # cuando saques v2, agregás este (no borrás el anterior)
└── ...

cache/                                             # caché del server (skins, vehículos custom, etc.)
├── 135.148.128.72.7777-v5.zip
├── 135.148.128.72.7777-v6.zip                    # cuando cambies algo del cache, subís v6
└── ...

news/                                              # imágenes de noticias destacadas
├── navidad-2026.jpg
└── ...
```

### Convenciones

- **Versión va en el nombre del archivo, no como query string.** Razones:
  - Bunny cachea por path → cuando subís v6, los edges lo distribuyen rápido sin invalidaciones.
  - Versiones viejas siguen accesibles → rollback en 1 segundo si v6 sale defectuoso.
  - URLs autodescriptivas.
- **Nunca borrar versiones viejas** del CDN salvo que estés 100% seguro de que ningún cliente las usa. Costo de almacenamiento es despreciable, costo de un cliente con URL rota es alto.
- **Carpeta `launcher/`** la maneja `electron-builder` automáticamente al hacer `yarn build` con `publish` configurado.

---

## Endpoint

### `GET /api/public/launcher/manifest`

**Auth**: ninguna (público).
**Cache**: 5 minutos en memoria (Node-cache). Cambia poco, leído por todos los launchers que abren la app.
**Status codes**:
- `200 OK` con el JSON.
- `503` si la API está degradada y el manifest no está disponible.

### Respuesta — schema completo

```json
{
  "launcher": {
    "minSupportedVersion": "1.0.0",
    "latestVersion": "1.0.0"
  },
  "samp": {
    "version": 1,
    "url": "https://sarp-public.b-cdn.net/samp/samp-v1.exe",
    "sha256": "a1b2c3d4e5f6...",
    "size": 4194304
  },
  "cache": {
    "version": 5,
    "url": "https://sarp-public.b-cdn.net/cache/135.148.128.72.7777-v5.zip",
    "sha256": "f6e5d4c3b2a1...",
    "size": 47185920,
    "extractTo": "Documents/GTA San Andreas User Files/SAMP/cache"
  },
  "server": {
    "ip": "135.148.128.72",
    "port": 7777,
    "name": "San Andreas Roleplay"
  },
  "news": [
    {
      "id": "evento-navidad-2026",
      "title": "Evento de Navidad",
      "summary": "Vení a participar del evento especial...",
      "url": "https://sarp.es/news/evento-navidad",
      "image": "https://sarp-public.b-cdn.net/news/navidad-2026.jpg",
      "publishedAt": "2026-12-15T10:00:00Z"
    }
  ]
}
```

### Descripción de campos

| Campo                          | Tipo                | Para qué                                                                                            |
| ------------------------------ | ------------------- | --------------------------------------------------------------------------------------------------- |
| `launcher.minSupportedVersion` | string (semver)     | Mínima versión del launcher que la API soporta. Si el user tiene menos → forzar update obligatorio. |
| `launcher.latestVersion`       | string (semver)     | Versión más reciente publicada. Para mostrar UI "hay update disponible" antes que electron-updater. |
| `samp.version`                 | number              | Compara con `electron-store.get("sampVersion")`. Si difiere → descargar.                            |
| `samp.url`                     | string (URL)        | URL absoluta al archivo en el CDN.                                                                  |
| `samp.sha256`                  | string (hex 64)     | Verificación de integridad post-descarga. Si no matchea → re-descargar.                             |
| `samp.size`                    | number (bytes)      | Para mostrar progreso de descarga ("3.2 MB / 4.1 MB").                                              |
| `cache.version`                | number              | Igual que `samp.version`.                                                                           |
| `cache.url`                    | string (URL)        | Igual que `samp.url`.                                                                               |
| `cache.sha256`                 | string (hex 64)     | Igual que `samp.sha256`.                                                                            |
| `cache.size`                   | number (bytes)      | Igual que `samp.size`.                                                                              |
| `cache.extractTo`              | string (path)       | Path **relativo a `~/Documents`** donde extraer el contenido del zip.                               |
| `server.ip`                    | string              | IP del servidor de juego. Permite cambiar de host sin redeploy del launcher.                        |
| `server.port`                  | number              | Puerto del servidor.                                                                                |
| `server.name`                  | string              | Nombre del servidor (para mostrar en home).                                                         |
| `news`                         | array               | Noticias destacadas para la home. Puede ser `[]` si no hay nada.                                    |
| `news[].id`                    | string              | Identificador único (para deduplicar/cachear).                                                      |
| `news[].title`                 | string              | Título corto.                                                                                       |
| `news[].summary`               | string              | Bajada (1-2 oraciones).                                                                             |
| `news[].url`                   | string (URL)        | Link a la noticia completa (web/foro).                                                              |
| `news[].image`                 | string (URL) \| null | Imagen destacada (CDN). Opcional.                                                                   |
| `news[].publishedAt`           | string (ISO 8601)   | Para ordenar y mostrar "hace X horas".                                                              |

---

## Cómo generar los `sha256`

Antes de subir un archivo al CDN, calculás su hash y lo guardás en el manifest.

**PowerShell**:

```powershell
Get-FileHash -Path "samp-v1.exe" -Algorithm SHA256 | Select-Object Hash
```

**Node**:

```bash
node -e "const f=require('fs').readFileSync('samp-v1.exe'); console.log(require('crypto').createHash('sha256').update(f).digest('hex'))"
```

**Bash/WSL**:

```bash
sha256sum samp-v1.exe
```

El launcher, post-descarga, recalcula el hash del archivo bajado y lo compara con el del manifest. Si no matchea, asume corrupción y descarga de nuevo.

---

## Casos de uso operativos

### Cambiar el cache del servidor

1. Subir nuevo `cache/135.148.128.72.7777-v6.zip` al CDN.
2. Calcular SHA256.
3. Actualizar el manifest en la API:
   ```diff
     "cache": {
   -   "version": 5,
   -   "url": "https://sarp-public.b-cdn.net/cache/135.148.128.72.7777-v5.zip",
   -   "sha256": "f6e5d4c3...",
   -   "size": 47185920
   +   "version": 6,
   +   "url": "https://sarp-public.b-cdn.net/cache/135.148.128.72.7777-v6.zip",
   +   "sha256": "<nuevo hash>",
   +   "size": <nuevo size>
     }
   ```
4. Listo. La próxima vez que un user abra el launcher, descarga el nuevo cache automáticamente.

### Cambiar IP del servidor (migración de host)

```diff
  "server": {
-   "ip": "135.148.128.72"
+   "ip": "200.100.50.25"
  }
```

Cero deploy del launcher.

### Forzar actualización obligatoria del launcher

Cuando publiques v2.0.0 con cambios incompatibles:

```diff
  "launcher": {
-   "minSupportedVersion": "1.0.0",
-   "latestVersion": "1.0.0"
+   "minSupportedVersion": "2.0.0",
+   "latestVersion": "2.0.0"
  }
```

Todos los usuarios en 1.x ven al abrir: "Hay una actualización obligatoria". `electron-updater` la baja del CDN.

### Rollback de cache

Si subís v6 y rompe algo:

```diff
  "cache": {
-   "version": 6,
-   "url": "https://sarp-public.b-cdn.net/cache/...-v6.zip",
+   "version": 5,
+   "url": "https://sarp-public.b-cdn.net/cache/...-v5.zip",
    ...
  }
```

Los users que ya tenían v6 detectan que `local !== manifest`, vuelven a v5. Si todavía no descargaron v6, ni se enteran.

---

## Estado actual (qué existe vs. qué falta)

### ✅ En el CDN (existe)

- `cache/135.148.128.72.7777.zip?v=5` (formato viejo, hay que migrar al nuevo nombre)

### ⏳ Por subir al CDN

- `samp/samp-v1.exe` (cuando lo tengas listo)
- `cache/135.148.128.72.7777-v5.zip` (renombrar el actual)

### ⏳ Por crear en `api.sarp.es`

- `GET /api/public/launcher/manifest` con el schema de arriba.
- Opcional: cache de 5 minutos en memoria.

### ⏳ Por hacer en el launcher

- Cuando exista el endpoint, consumir el manifest desde el loading screen.
- Mientras tanto, manifest hardcodeado en `.env` o constante para iterar la lógica de descarga.

---

## Decisiones pendientes (resolver antes de implementar)

1. **¿El estado online/offline del servidor de juego va en `manifest`** o en un endpoint separado (ej: `/api/public/launcher/status`)?
   - **Recomendación**: separado. El status cambia en tiempo real (jugadores conectados, ping), no quiere cache. El manifest cambia poco, sí quiere cache.
2. **¿Versionado del manifest mismo?**
   - Si el schema cambia, los launchers viejos pueden romperse. Una posible solución: agregar `"schemaVersion": 1` al root del JSON. Si el launcher ve un `schemaVersion` mayor al que conoce, asume "necesito actualizar el launcher".
   - **Recomendación**: agregar `schemaVersion: 1` desde el día uno.
3. **¿Firmar el manifest** (HMAC con `JWT_SECRET` o similar)?
   - Si alguien interceptara el tráfico (MITM), podría servir un manifest falso con una URL maliciosa de `samp.exe`.
   - Mitigaciones simples: HTTPS estricto + verificación de SHA256 (ya prevista) + comparar dominio del `url` contra `VITE_CDN_URL` antes de descargar.
   - **Recomendación**: para v1 alcanza con HTTPS + SHA256. Firmar el manifest es over-engineering por ahora.
4. **¿Distribuimos el instalador de SA:MP o solo el `samp.exe` final?**
   - Hay dos archivos distintos:
     - `samp03DLR1_install.exe` (~2.5 MB) — instalador wizard NSIS oficial.
     - `samp.exe` (~1 MB) — el cliente que efectivamente se conecta al servidor.
   - Distribuir el instalador → instala correctamente DLLs + folder `SAMP/`, pero requiere que el usuario corra otro wizard (mala UX).
   - Distribuir solo el `samp.exe` → asume que el usuario ya tiene SA:MP instalado (entonces ¿para qué descargarlo?) o necesitamos también enviar las DLLs y `SAMP/` aparte.
   - **Por resolver**: probablemente el approach correcto es bundlear `samp.exe` + DLLs + carpeta `SAMP/` en un `.zip` y extraerlo silenciosamente. Investigar qué pone exactamente el instalador oficial cuando termina, y replicarlo desde el launcher.
5. **Granularidad del check "SA:MP instalado"**
   - ¿Solo verifica `samp.exe`? ¿También DLLs (`samp.dll`, `vorbisFile.dll`)? ¿También carpeta `SAMP/`?
   - Definir junto con la decisión #4.
6. **Versionado de SA:MP**: ¿una sola versión del bundle completo (`samp.exe` + DLLs + `SAMP/`), o versionar `samp.exe` aparte de los assets?
   - **Recomendación tentativa**: bundle único versionado, simplifica todo.
