import dgram from "node:dgram"
import { buildQueryPacket, type QueryOpcode } from "./packet"

const HEADER_BYTES = 11
const MAX_RESPONSE_BYTES = 4096

export function query(
  ip: string,
  port: number,
  opcode: QueryOpcode,
  timeoutMs: number,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const socket = dgram.createSocket("udp4")
    const packet = buildQueryPacket(ip, port, opcode)
    let closed = false

    const cleanup = () => {
      if (closed) return
      closed = true
      try {
        socket.close()
      } catch {
        // already closed
      }
    }

    const timer = setTimeout(() => {
      cleanup()
      reject(new Error("timeout"))
    }, timeoutMs)

    socket.on("message", (msg) => {
      clearTimeout(timer)
      cleanup()
      if (msg.length > MAX_RESPONSE_BYTES) return reject(new Error("response too large"))
      if (msg.length < HEADER_BYTES) return reject(new Error("response too short"))
      resolve(msg.slice(HEADER_BYTES))
    })

    socket.on("error", (err) => {
      clearTimeout(timer)
      cleanup()
      reject(err)
    })

    socket.send(packet, 0, packet.length, port, ip, (err) => {
      if (err) {
        clearTimeout(timer)
        cleanup()
        reject(err)
      }
    })
  })
}
