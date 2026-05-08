<div align="center">
  <a href="https://sarp.es/" target="_blank">
    <img style="width: 200px;" src="https://i.imgur.com/EFK15nk.png" alt="San Andreas Roleplay"/>
  </a>
</div>

![Discord Shield](https://discord.com/api/guilds/1118327104908570654/widget.png?style=shield)
[![License: MIT](https://img.shields.io/badge/License-MIT%20License-yellow.svg)](https://opensource.org/licenses/MIT)

Launcher oficial del servidor SAMP de [San Andreas Roleplay](https://sarp.es). Verifica la instalación de GTA SA, descarga `samp.exe` y los archivos de cache desde el CDN, y lanza el juego en el servidor oficial.

## Para jugadores

Descargá la última versión desde [Releases](https://github.com/San-Andreas-Roleplay-ES/San-Andreas-Roleplay_Launcher/releases/latest). A partir de la primera instalación, el launcher se actualiza solo cuando hay una nueva versión disponible.

## Para desarrolladores

```bash
yarn install
yarn dev      # Vite + Electron en modo dev
yarn polish   # format + lint + typecheck
```

Documentación técnica completa (stack, estructura, convenciones, decisiones de producto) en [CLAUDE.md](CLAUDE.md).

## Release

Las actualizaciones se distribuyen vía `electron-updater` con `provider: generic` apuntando a `https://sarp-public.b-cdn.net/launcher/`. El launcher revisa al arrancar, descarga delta en background y aplica al cerrar.

### Pasos para publicar una nueva versión

1. **Bump de versión** en [package.json](package.json) (`"version": "1.0.1"`). Es la única fuente de verdad — el footer del shell la lee de `app.getVersion()` y `electron-builder` la usa para `latest.yml`.

2. **Build local**:

   ```bash
   yarn build
   ```

   Produce en `release/<version>/`:
   - `SARP-SAMP-Launcher-Setup-<version>.exe` — el instalador NSIS one-click.
   - `SARP-SAMP-Launcher-Setup-<version>.exe.blockmap` — habilita delta updates.
   - `latest.yml` — manifest que electron-updater compara contra la versión instalada.

3. **Subir los 3 archivos** a Bunny CDN bajo el path `/launcher/`. Pueden subirse por el panel web o por la Storage API (`PUT https://storage.bunnycdn.com/<storage-zone>/launcher/<file>` con header `AccessKey: <storage-zone-password>`).

   > ⚠️ Subir siempre los **3** archivos. Sin `.blockmap`, electron-updater igual aplica la actualización pero descarga el `.exe` completo (~80 MB) en lugar del delta. **No borrar los blockmaps de versiones anteriores** — se necesitan para diffs entre versiones consecutivas.

4. **Verificar accesibilidad**:

   ```bash
   curl -I https://sarp-public.b-cdn.net/launcher/latest.yml
   curl -I https://sarp-public.b-cdn.net/launcher/SARP-SAMP-Launcher-Setup-<version>.exe.blockmap
   ```

   Ambos deben responder `200 OK`. Si Bunny sirve `latest.yml` con `Content-Type: application/octet-stream`, configurar un override en Bunny para que sea `text/yaml` (electron-updater es laxo, pero es buena higiene).

5. **Probar el update** desde una versión anterior instalada: abrir el launcher con la `<version-1>` instalada, esperar unos segundos, debería aparecer el banner _"Descargando actualización"_ → _"Reiniciar para aplicar"_. Logs en `%APPDATA%\san-andreas-roleplay-launcher\logs\main.log`.

### Code signing

El `.exe` no está firmado. Los usuarios verán el SmartScreen _"Windows protected your PC"_ → _"More info"_ → _"Run anyway"_ la primera vez. En updates posteriores aplicados por NSIS no se vuelve a mostrar.

## Licencia

MIT — ver [LICENSE](LICENSE).
