# San-Andreas-Roleplay_Launcher

Launcher oficial de San Andreas Roleplay (SA:MP).

## Desarrollo

```bash
yarn install
yarn dev      # Vite + Electron en modo dev
yarn polish   # format + lint + typecheck
```

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

### Primera publicación (1.0.0)

Para la 1.0.0 no hay versión anterior contra la cual probar el update. Verificar solo:

- Instalación silenciosa en VM limpia (Windows 10/11).
- No pide UAC.
- Instala en `%LOCALAPPDATA%\Programs\San Andreas Roleplay - SA-MP Launcher\`.
- Aparece en Start Menu y _Aplicaciones y características_.
- Health check abre el flujo de selección de carpeta de GTA.

A partir de la 1.0.1 ya se puede probar el update end-to-end.

### Code signing

El `.exe` no está firmado. Los usuarios verán el SmartScreen _"Windows protected your PC"_ → _"More info"_ → _"Run anyway"_ la primera vez. En updates posteriores aplicados por NSIS no se vuelve a mostrar.
