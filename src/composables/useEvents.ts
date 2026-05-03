import { ref } from "vue"
import { fetchEvents, type ServerEvent } from "@/api/public"

const MOCK: ServerEvent[] = [
  {
    id: "navidad-2026",
    title: "Evento de Navidad",
    description:
      "Decorá Los Santos esta navidad. Misiones especiales, regalos diarios y skins limitadas.",
    image: "https://picsum.photos/seed/navidad/360/640",
    url: "https://sarp.es/eventos/navidad-2026",
    startsAt: "2026-12-15T00:00:00Z",
    endsAt: "2026-12-31T23:59:59Z",
  },
  {
    id: "torneo-drift",
    title: "Torneo de Drift",
    description: "Inscribite al torneo más loco del año en Mount Chiliad. Premios en efectivo.",
    image: "https://picsum.photos/seed/drift/360/640",
    url: "https://sarp.es/eventos/torneo-drift",
    startsAt: "2026-05-10T20:00:00Z",
  },
  {
    id: "casting-policia",
    title: "Casting LSPD",
    description: "Se buscan oficiales. Postulación abierta hasta fin de mes.",
    image: "https://picsum.photos/seed/lspd/360/640",
    url: "https://sarp.es/casting-lspd",
  },
  {
    id: "carrera-banda",
    title: "Carrera Clandestina",
    description: "Apostá tu vehículo. El que pierde, se va a pie.",
    image: "https://picsum.photos/seed/race/360/640",
    url: "https://sarp.es/eventos/carrera",
  },
  {
    id: "evento-cine",
    title: "Cine al Aire Libre",
    description: "Vení a Vinewood Hills a ver una peli con la comunidad.",
    image: "https://picsum.photos/seed/cinema/360/640",
    url: "https://sarp.es/eventos/cine",
  },
]

const USE_MOCK = false

export function useEvents() {
  const events = ref<ServerEvent[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function load() {
    loading.value = true
    error.value = null
    try {
      events.value = USE_MOCK ? MOCK : await fetchEvents()
    } catch {
      events.value = []
      error.value = "No se pudieron cargar los eventos."
    } finally {
      loading.value = false
    }
  }

  return { events, loading, error, load }
}
