import { IpcMainInvokeEvent } from "electron";
import { IUpdateService } from "../domain/services/manifest";

export class UpdateController {
  constructor(private readonly updateService: IUpdateService) {}

  public async checkForUpdates(_event: IpcMainInvokeEvent) {
    return this.updateService.checkForUpdates();
  }

  public async checkModUpdate(_event: IpcMainInvokeEvent, modId: string) {
    return this.updateService.checkModUpdate(modId);
  }
}
