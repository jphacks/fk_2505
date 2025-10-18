export interface IElectronAPI {
    version: () => string
    
    // ウィンドウ操作
    minimize: () => Promise<void>
    maximize: () => Promise<void>
    close: () => Promise<void>
    setFullscreen: () => Promise<void>
    setAlwaysOnTop: (flag: boolean) => Promise<void>
}

declare global {
    interface Window {
        electronAPI: IElectronAPI
    }
}
