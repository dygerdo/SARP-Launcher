import { app } from "electron";

export class AppService {
  /**
   * Returns the current application version.
   */
  public getVersion(): string {
    return app.getVersion();
  }
}
