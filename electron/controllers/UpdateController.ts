import { IpcMainInvokeEvent } from "electron"
import type { IUpdateService } from "../../src/types/mods"

export class UpdateController {
  constructor(private readonly updateService: IUpdateService) {}

  public async checkForUpdates(_event: IpcMainInvokeEvent) {
    return this.updateService.checkForUpdates()
  }

  public async checkModUpdate(_event: IpcMainInvokeEvent, modId: string) {
    return this.updateService.checkModUpdate(modId)
  }
}
