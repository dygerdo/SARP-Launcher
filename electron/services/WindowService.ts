import { BrowserWindow, WebContents } from "electron";
import { IWindowStateContract } from "../contracts";

export class WindowService {
  public minimize(webContents: WebContents): void {
    BrowserWindow.fromWebContents(webContents)?.minimize();
  }

  public close(webContents: WebContents): void {
    BrowserWindow.fromWebContents(webContents)?.close();
  }

  public toggleMaximize(webContents: WebContents): void {
    const win = BrowserWindow.fromWebContents(webContents);
    if (!win) return;

    if (win.isFullScreen()) {
      win.setFullScreen(false);
      return;
    }

    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
  }

  public toggleFullscreen(webContents: WebContents): void {
    const win = BrowserWindow.fromWebContents(webContents);
    if (!win) return;
    win.setFullScreen(!win.isFullScreen());
  }

  public getWindowState(webContents: WebContents): IWindowStateContract {
    const win = BrowserWindow.fromWebContents(webContents);
    return {
      isMaximized: win?.isMaximized() ?? false,
      isFullscreen: win?.isFullScreen() ?? false,
    };
  }
}
