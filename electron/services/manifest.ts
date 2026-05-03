import { cdnGet } from "./cdn"

export interface ManifestFileEntry {
  path: string
  url: string
  sha256: string
  size: number
}

export interface ManifestInstallerEntry {
  filename: string
  url: string
  sha256: string
  size: number
  silentArgs: string[]
}

export interface LauncherManifest {
  schemaVersion: number
  generatedAt: string
  samp: {
    files: ManifestFileEntry[]
    installer: ManifestInstallerEntry
  }
}

const SUPPORTED_SCHEMA_VERSION = 1
const MANIFEST_PATH = "/launcher/manifest.json"
const RETRY_DELAYS_MS = [1000, 2000, 4000]

let cachedManifest: LauncherManifest | null = null

function getManifestUrl(): string {
  const base = process.env.VITE_CDN_URL?.replace(/\/+$/, "")
  if (!base) throw new Error("VITE_CDN_URL not configured")
  return `${base}${MANIFEST_PATH}`
}

function isValidManifest(value: unknown): value is LauncherManifest {
  if (!value || typeof value !== "object") return false
  const m = value as Partial<LauncherManifest>
  if (typeof m.schemaVersion !== "number") return false
  if (typeof m.generatedAt !== "string") return false
  if (!m.samp || typeof m.samp !== "object") return false
  if (!Array.isArray(m.samp.files)) return false
  if (!m.samp.installer || typeof m.samp.installer !== "object") return false
  return true
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchOnce(): Promise<LauncherManifest> {
  const url = getManifestUrl()
  const res = await cdnGet<LauncherManifest>(url)
  if (!res.ok || res.data === null) {
    throw new Error(res.error ?? `HTTP ${res.status}`)
  }
  if (!isValidManifest(res.data)) {
    throw new Error("Manifest payload has unexpected shape")
  }
  if (res.data.schemaVersion > SUPPORTED_SCHEMA_VERSION) {
    throw new Error(
      `Manifest schemaVersion ${res.data.schemaVersion} is newer than supported (${SUPPORTED_SCHEMA_VERSION}). Update the launcher.`,
    )
  }
  return res.data
}

export async function fetchManifest(): Promise<LauncherManifest> {
  let lastError: unknown = null
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      const manifest = await fetchOnce()
      cachedManifest = manifest
      return manifest
    } catch (error) {
      lastError = error
      if (attempt < RETRY_DELAYS_MS.length) {
        await sleep(RETRY_DELAYS_MS[attempt])
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Failed to fetch manifest")
}

export function getCachedManifest(): LauncherManifest | null {
  return cachedManifest
}

export async function refreshManifest(): Promise<LauncherManifest> {
  cachedManifest = null
  return fetchManifest()
}
