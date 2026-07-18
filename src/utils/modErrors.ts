export function mapModError(error: unknown, modName?: string): string {
  const technical = error instanceof Error ? error.message : String(error)
  console.error("Mod error:", technical)

  const lower = technical.toLowerCase()
  const title = modName ? `El mod ${modName}` : "El mod"

  if (lower.includes("404") || lower.includes("not found") || lower.includes("axioserror")) {
    return `${title} no está disponible por el momento.`
  }
  if (lower.includes("network") || lower.includes("timeout") || lower.includes("failed to fetch")) {
    return `${title} no se pudo descargar. Comprueba tu conexión e inténtalo de nuevo.`
  }
  if (lower.includes("permission") || lower.includes("eacces") || lower.includes("enospc")) {
    return `${title} no se pudo guardar en disco. Comprueba que tengas espacio y permisos.`
  }
  if (lower.includes("parse") || lower.includes("invalid")) {
    return `${title} tiene un paquete inválido o corrupto.`
  }
  return `${title} no se pudo instalar en este momento. Intenta de nuevo más tarde.`
}
