import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  hidePopover: () => ipcRenderer.send("hide-popover"),
  resizePopover: (width: number, height: number) =>
    ipcRenderer.send("resize-popover", width, height),
  onCreateNote: (callback: (text: string) => void) => {
    ipcRenderer.on("create-note", (_event, text) => callback(text));
  },
});
