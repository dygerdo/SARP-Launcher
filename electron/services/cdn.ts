import { net } from "electron"
import type { CdnResponse } from "../ipc/channels"

const TIMEOUT_MS = 8000

export function cdnGet<T = unknown>(url: string): Promise<CdnResponse<T>> {
  return new Promise((resolve) => {
    const request = net.request({ method: "GET", url })
    request.setHeader("Accept", "application/json")

    let body = ""
    let settled = false

    const timeout = setTimeout(() => {
      if (settled) return
      settled = true
      request.abort()
      resolve({ ok: false, status: 0, data: null, error: "timeout" })
    }, TIMEOUT_MS)

    request.on("response", (response) => {
      response.on("data", (chunk) => {
        body += chunk.toString()
      })
      response.on("end", () => {
        if (settled) return
        settled = true
        clearTimeout(timeout)
        const status = response.statusCode ?? 0
        if (status < 200 || status >= 300) {
          resolve({ ok: false, status, data: null, error: `HTTP ${status}` })
          return
        }
        try {
          resolve({ ok: true, status, data: JSON.parse(body) as T })
        } catch {
          resolve({ ok: false, status, data: null, error: "invalid JSON" })
        }
      })
    })

    request.on("error", (err) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      resolve({ ok: false, status: 0, data: null, error: err.message })
    })

    request.end()
  })
}
