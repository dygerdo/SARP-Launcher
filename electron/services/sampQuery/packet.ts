export type QueryOpcode = "i" | "p" | "d" | "r"

const IPV4_REGEX = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/

export function isValidIPv4(ip: string): boolean {
  const match = IPV4_REGEX.exec(ip)
  if (!match) return false
  return match.slice(1, 5).every((part) => {
    const n = Number(part)
    return n >= 0 && n <= 255
  })
}

export function isValidPort(port: number): boolean {
  return Number.isInteger(port) && port >= 1 && port <= 65535
}

export function buildQueryPacket(ip: string, port: number, opcode: QueryOpcode): Buffer {
  if (!isValidIPv4(ip)) throw new Error("invalid IPv4")
  if (!isValidPort(port)) throw new Error("invalid port")

  const octets = ip.split(".").map(Number)
  const buf = Buffer.alloc(11)
  buf.write("SAMP", 0, 4)
  buf[4] = octets[0]
  buf[5] = octets[1]
  buf[6] = octets[2]
  buf[7] = octets[3]
  buf.writeUInt16LE(port, 8)
  buf[10] = opcode.charCodeAt(0)
  return buf
}
