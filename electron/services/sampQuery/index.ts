import { query } from "./client"
import { parseInfoResponse } from "./parser"
import { isValidIPv4, isValidPort } from "./packet"
import type { PingResult } from "./types"

const QUERY_TIMEOUT_MS = 1500

export async function pingServer(ip: string, port: number): Promise<PingResult> {
  if (!isValidIPv4(ip) || !isValidPort(port)) {
    return { alive: false, ms: null, info: null, error: "invalid host" }
  }

  const start = Date.now()
  try {
    const payload = await query(ip, port, "i", QUERY_TIMEOUT_MS)
    const info = parseInfoResponse(payload)
    const ms = Date.now() - start
    return { alive: true, ms, info }
  } catch (err) {
    return {
      alive: false,
      ms: null,
      info: null,
      error: err instanceof Error ? err.message : "query failed",
    }
  }
}

export type { PingResult, ServerInfo } from "./types"
