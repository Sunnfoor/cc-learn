const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  storeGet: (key) => ipcRenderer.invoke('store-get', key),
  storeSet: (key, value) => ipcRenderer.invoke('store-set', key, value),
  storeGetAll: () => ipcRenderer.invoke('store-get-all'),
  sessionAdd: (session) => ipcRenderer.invoke('session-add', session),
  onTrayStart: (callback) => ipcRenderer.on('tray-start', callback),
  onTrayPause: (callback) => ipcRenderer.on('tray-pause', callback),
  onShortcutToggle: (callback) => ipcRenderer.on('shortcut-toggle', callback)
});