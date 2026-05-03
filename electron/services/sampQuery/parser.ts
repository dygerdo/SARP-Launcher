import type { ServerInfo } from "./types"

const MAX_STRING_LENGTH = 256

interface StringRead {
  value: string
  next: number
}

function readLengthPrefixedString(buf: Buffer, offset: number): StringRead {
  if (offset + 4 > buf.length) throw new Error("buffer overflow reading length")
  const len = buf.readUInt32LE(offset)
  if (len > MAX_STRING_LENGTH) throw new Error("string too long")
  const end = offset + 4 + len
  if (end > buf.length) throw new Error("string out of bounds")
  return {
    value: buf.toString("utf8", offset + 4, end),
    next: end,
  }
}

export function parseInfoResponse(payload: Buffer): ServerInfo {
  if (payload.length < 5) throw new Error("response too short")

  let offset = 0
  const hasPassword = payload.readUInt8(offset) === 1
  offset += 1
  const players = payload.readUInt16LE(offset)
  offset += 2
  const maxPlayers = payload.readUInt16LE(offset)
  offset += 2

  const hostname = readLengthPrefixedString(payload, offset)
  offset = hostname.next
  const gamemode = readLengthPrefixedString(payload, offset)
  offset = gamemode.next
  const language = readLengthPrefixedString(payload, offset)

  return {
    hostname: hostname.value,
    players: Math.min(players, 10_000),
    maxPlayers: Math.min(maxPlayers, 10_000),
    gamemode: gamemode.value,
    language: language.value,
    hasPassword,
  }
}
