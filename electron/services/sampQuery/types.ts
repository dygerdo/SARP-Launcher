export interface ServerInfo {
  hostname: string
  players: number
  maxPlayers: number
  gamemode: string
  language: string
  hasPassword: boolean
}

export interface PingResult {
  alive: boolean
  ms: number | null
  info: ServerInfo | null
  error?: string
}
