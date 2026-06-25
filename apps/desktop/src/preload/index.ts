import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  hidePopover: () => ipcRenderer.send("hide-popover"),
  resizePopover: (width: number, height: number) =>
    ipcRenderer.send("resize-popover", width, height),
  onCreateNote: (callback: (text: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, text: string) => callback(text);
    ipcRenderer.on("create-note", handler);
    return () => {
      ipcRenderer.removeListener("create-note", handler);
    };
  },
  showNotification: (title: string, body: string) =>
    ipcRenderer.send("show-notification", title, body),
});
