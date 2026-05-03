; Custom NSIS installer hooks for SARP SA:MP Launcher
; Sets the default install dir and validates that gta_sa.exe exists in the chosen folder.

; Custom NSIS installer hooks for SARP SA:MP Launcher
; - Carpeta de instalación recomendada: <carpeta del juego>\SARP
; - Valida que gta_sa.exe exista en la carpeta PADRE (la del juego)
; - Crea acceso directo en la carpeta padre además del escritorio/menú inicio

!macro preInit
  SetRegView 64
  WriteRegExpandStr HKLM "${INSTALL_REGISTRY_KEY}" InstallLocation "C:\Program Files (x86)\Rockstar Games\GTA San Andreas\SARP"
  WriteRegExpandStr HKCU "${INSTALL_REGISTRY_KEY}" InstallLocation "C:\Program Files (x86)\Rockstar Games\GTA San Andreas\SARP"
  SetRegView 32
  WriteRegExpandStr HKLM "${INSTALL_REGISTRY_KEY}" InstallLocation "C:\Program Files (x86)\Rockstar Games\GTA San Andreas\SARP"
  WriteRegExpandStr HKCU "${INSTALL_REGISTRY_KEY}" InstallLocation "C:\Program Files (x86)\Rockstar Games\GTA San Andreas\SARP"

  ; Reemplaza el sufijo largo del productName por "SARP" en el path por defecto.
  ; electron-builder arma $INSTDIR como "<carpeta>\San Andreas Roleplay - SA;MP Launcher".
  ; Tomamos el padre y le agregamos "SARP".
  ${GetParent} "$INSTDIR" $R0
  StrCpy $INSTDIR "$R0\SARP"
!macroend

!macro customWelcomePage
  !define MUI_WELCOMEPAGE_TITLE "Bienvenido al instalador de SARP SA:MP Launcher"
  !define MUI_WELCOMEPAGE_TEXT "Este instalador colocará el launcher de San Andreas Roleplay en una subcarpeta llamada SARP, dentro de la carpeta que elijas.$\r$\n$\r$\nSe recomienda elegir la carpeta donde tienes instalado GTA San Andreas (la que contiene gta_sa.exe). El launcher quedará en una subcarpeta SARP para no mezclarse con los archivos del juego.$\r$\n$\r$\nEjemplo recomendado: C:\Program Files (x86)\Rockstar Games\GTA San Andreas\SARP$\r$\n$\r$\nHaz clic en Siguiente para continuar."
  !insertmacro MUI_PAGE_WELCOME
!macroend

!macro customInstallDir
  ; gta_sa.exe se busca en la carpeta PADRE de $INSTDIR (la del juego)
  ${GetParent} "$INSTDIR" $R0
  IfFileExists "$R0\gta_sa.exe" gta_found 0
    MessageBox MB_YESNO|MB_ICONQUESTION "No se encontró gta_sa.exe en la carpeta padre ($R0).$\r$\n$\r$\nSe recomienda elegir la carpeta donde está instalado GTA San Andreas para que el launcher pueda iniciar el juego automáticamente.$\r$\n$\r$\n¿Deseas continuar de todos modos con esta ubicación?" IDYES gta_found
    Abort
  gta_found:
!macroend

!macro customInstall
  ; Acceso directo en la carpeta padre (junto a gta_sa.exe)
  ${GetParent} "$INSTDIR" $R0
  CreateShortCut "$R0\${PRODUCT_FILENAME}.lnk" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" "" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" 0
!macroend

!macro customUnInstall
  ${GetParent} "$INSTDIR" $R0
  Delete "$R0\${PRODUCT_FILENAME}.lnk"
!macroend
