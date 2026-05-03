import { contextBridge } from "electron"

contextBridge.exposeInMainWorld("launcher", {
  ping: () => "pong",
})
