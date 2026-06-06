import { MOD_CATALOG } from "@/data/mods"
import { fetchEvents } from "@/api/public"

/**
 * Preloads an array of images and returns a promise that resolves when all are loaded or fail.
 */
export async function preloadImages(urls: string[]): Promise<void[]> {
  const promises = urls.map((url) => {
    return new Promise<void>((resolve) => {
      const img = new Image()
      img.onload = () => resolve()
      img.onerror = () => resolve() // Continue on error
      img.src = url
    })
  })
  return Promise.all(promises)
}

/**
 * Preloads all essential launcher images including mod catalog images and dynamic events.
 */
export async function preloadLauncherAssets(): Promise<void> {
  const imagesToLoad: Set<string> = new Set()

  // 1. Static/Known images
  imagesToLoad.add("/background.png")
  imagesToLoad.add("/logo-squared.png")

  // 2. Mod Catalog images
  MOD_CATALOG.forEach((m) => {
    if (m.imageUrl) imagesToLoad.add(m.imageUrl)
  })

  // 3. Dynamic Events (optional but better to have)
  try {
    const events = await fetchEvents()
    events.forEach((e) => {
      if (e.image) imagesToLoad.add(e.image)
    })
  } catch (e) {
    console.warn("Could not fetch events for preloading:", e)
  }

  await preloadImages(Array.from(imagesToLoad))
}
