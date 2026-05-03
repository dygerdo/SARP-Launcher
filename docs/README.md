# Documentación del Launcher

Documentos técnicos y de planificación. Acá vive todo lo que **no es código** pero define cómo se construye el launcher.

| Documento                                  | Resumen                                                                                                |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| [manifest.md](./manifest.md)             | Estructura del CDN (Bunny) + endpoint `/api/public/launcher/manifest` + casos de uso operativos.       |
| [loading-screen.md](./loading-screen.md) | Plan completo del loading screen: tareas por tier, decisiones de diseño, arquitectura, plan por pasos. |

## Convenciones

- Los documentos viven en español, alineados con la UI (el código y comentarios en código siguen siendo inglés).
- Cuando un doc deja de aplicar, se borra. No mantenemos history dentro del archivo — para eso está git.
- Los planes detallados (con pasos) se actualizan a medida que se implementan: tachamos lo hecho o lo movemos a una sección "Implementado".
