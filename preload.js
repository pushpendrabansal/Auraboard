// Electron Secure Preload Script
const { contextBridge, ipcRenderer } = require('electron');

// Expose secure, limited APIs to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
    onOpenPreferences: (callback) => ipcRenderer.on('open-preferences', (event, ...args) => callback(...args)),
    quitApp: () => ipcRenderer.send('quit-app'),
    resizeWindow: (width, height) => ipcRenderer.send('resize-window', { width, height })
});
