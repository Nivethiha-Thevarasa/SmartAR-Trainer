const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getHwnd: () => ipcRenderer.invoke('get-hwnd'),
});
