import { contextBridge, ipcRenderer } from "electron"

contextBridge.exposeInMainWorld("electronAPI", {
    version: () => "1.0.0",
    
    // ウィンドウ操作
    minimize: () => ipcRenderer.invoke('window-minimize'),
    maximize: () => ipcRenderer.invoke('window-maximize'),
    close: () => ipcRenderer.invoke('window-close'),
    setFullscreen: () => ipcRenderer.invoke('window-set-fullscreen'),
    setAlwaysOnTop: (flag: boolean) => ipcRenderer.invoke('window-set-always-on-top', flag),
})

