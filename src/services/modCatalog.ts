import type { ModDefinition, RemoteManifest } from "@/types/mods"
import { MOD_CATALOG } from "@/data/mods"

const MANIFEST_URL =
  (import.meta.env.VITE_CDN_URL || "https://sarp-public.b-cdn.net") + "/mods/manifest.json"

let cachedCatalog: ModDefinition[] | null = null

async function fetchRemoteCatalog(): Promise<ModDefinition[] | null> {
  try {
    const response = await fetch(MANIFEST_URL, { cache: "no-store" })
    if (!response.ok) return null

    const manifest: RemoteManifest = await response.json()
    if (!manifest.mods || !Array.isArray(manifest.mods)) return null

    return manifest.mods.map((remote) => ({
      id: remote.id,
      name: remote.name,
      description: remote.description ?? "",
      category: remote.category,
      type: remote.type,
      requiresEssentials: remote.requiresEssentials ?? [],
      dependsOn: remote.dependsOn,
      files: remote.files ?? [],
      downloadUrl: remote.downloadUrl,
      version: remote.version,
      imageUrl: undefined,
      sha256: remote.sha256,
      size: remote.size,
    }))
  } catch {
    return null
  }
}

export async function loadCatalog(): Promise<ModDefinition[]> {
  if (cachedCatalog) return cachedCatalog

  const remote = await fetchRemoteCatalog()
  if (remote && remote.length > 0) {
    cachedCatalog = remote
    return remote
  }

  cachedCatalog = MOD_CATALOG
  return MOD_CATALOG
}

export function getStaticCatalog(): ModDefinition[] {
  return MOD_CATALOG
}
