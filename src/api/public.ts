interface CdnEnvelope<T> {
  generatedAt: string
  data: T
}

export interface GlobalMetrics {
  [key: string]: unknown
}

export interface ServerEvent {
  id: string | number
  title: string
  description?: string | null
  image?: string | null
  url?: string | null
  startsAt?: string | null
  endsAt?: string | null
}

interface RawServerEvent {
  id?: string | number | null
  title?: string
  description?: string | null
  image?: string | null
  image_url?: string | null
  url?: string | null
  startsAt?: string | null
  event_date?: string | null
  endsAt?: string | null
}

const CDN_BASE = import.meta.env.VITE_CDN_URL

function unwrap<T>(payload: T | CdnEnvelope<T>): T {
  if (payload && typeof payload === "object" && "data" in payload && "generatedAt" in payload) {
    return (payload as CdnEnvelope<T>).data
  }
  return payload as T
}

function normalizeEvent(raw: RawServerEvent, index: number): ServerEvent {
  return {
    id: raw.id ?? `event-${index}`,
    title: raw.title ?? "Evento",
    description: raw.description ?? null,
    image: raw.image ?? raw.image_url ?? null,
    url: raw.url ?? null,
    startsAt: raw.startsAt ?? raw.event_date ?? null,
    endsAt: raw.endsAt ?? null,
  }
}

async function getJson<T>(path: string): Promise<T> {
  const url = `${CDN_BASE}${path}`
  const res = await window.launcher.cdnGet<T | CdnEnvelope<T>>(url)
  if (!res.ok || res.data === null) {
    throw new Error(res.error ?? `HTTP ${res.status}`)
  }
  return unwrap(res.data)
}

export async function fetchGlobalMetrics(): Promise<GlobalMetrics> {
  return getJson<GlobalMetrics>("/launcher/global-metrics.json")
}

export async function fetchEvents(): Promise<ServerEvent[]> {
  const raw = await getJson<RawServerEvent[]>("/launcher/events.json")
  return raw.map(normalizeEvent)
}
