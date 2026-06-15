import { IpcMainInvokeEvent } from "electron";
import { InstallerService } from "../services/mod/InstallerService";
import { UninstallerService } from "../services/mod/UninstallerService";
import { VerifierService } from "../services/mod/VerifierService";
import { Mod } from "../domain/models/mod";

export class ModController {
  private activeInstallations = new Map<string, AbortController>();

  constructor(
    private readonly installer: InstallerService,
    private readonly uninstaller: UninstallerService,
    private readonly verifier: VerifierService
  ) {}

  public async installMod(event: IpcMainInvokeEvent, mod: Mod) {
    if (this.activeInstallations.has(mod.id)) {
      throw new Error("Installation already in progress for this mod.");
    }

    const abortController = new AbortController();
    this.activeInstallations.set(mod.id, abortController);

    try {
      const result = await this.installer.install(
        mod,
        (progress) => {
          event.sender.send("mods:install-progress", { modId: mod.id, ...progress });
        },
        abortController.signal
      );
      return result;
    } finally {
      this.activeInstallations.delete(mod.id);
    }
  }

  public async uninstallMod(_event: IpcMainInvokeEvent, modId: string) {
    return this.uninstaller.uninstall(modId);
  }

  public async cancelInstallation(_event: any, modId: string) {
    const controller = this.activeInstallations.get(modId);
    if (controller) {
      controller.abort();
      this.activeInstallations.delete(modId);
      return true;
    }
    return false;
  }

  public async scanEssentials() {
    return this.verifier.scanEssentials();
  }

  public async scanCatalog() {
    return this.verifier.scanCatalog();
  }
}
