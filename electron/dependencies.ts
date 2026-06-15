import { ConfigRepository } from "./repositories/ConfigRepository";
import { ModRepository } from "./repositories/ModRepository";

// Repositories
export const configRepository = new ConfigRepository();
export const modRepository = new ModRepository(configRepository);

// Services
import { AppService } from "./services/AppService";
import { WindowService } from "./services/WindowService";
import { SettingsService } from "./services/SettingsService";
import { VerifierService } from "./services/mod/VerifierService";
import { HealthService } from "./services/HealthService";
import { DownloaderService } from "./services/DownloaderService";
import { ExtractorService } from "./services/mod/ExtractorService";
import { InstallerService } from "./services/mod/InstallerService";
import { UninstallerService } from "./services/mod/UninstallerService";
import { ManifestService } from "./services/ManifestService";
import { UpdateService } from "./services/UpdateService";

// Controllers
import { ModController } from "./controllers/ModController";
import { UpdateController } from "./controllers/UpdateController";

export const appService = new AppService();
export const windowService = new WindowService();
export const settingsService = new SettingsService(configRepository);

export const downloaderService = new DownloaderService();
export const modVerifierService = new VerifierService(settingsService);
export const extractorService = new ExtractorService();
export const modInstallerService = new InstallerService(
  downloaderService,
  modVerifierService,
  extractorService,
  modRepository,
  configRepository
);
export const modUninstallerService = new UninstallerService(modRepository, configRepository);

export const manifestService = new ManifestService(configRepository);
export const updateService = new UpdateService(manifestService, modRepository);

export const modController = new ModController(
  modInstallerService, 
  modUninstallerService,
  modVerifierService
);
export const updateController = new UpdateController(updateService);

export const healthService = new HealthService();

logDependencies();

function logDependencies() {
  console.log("[DI] Dependencies wired successfully.");
}
