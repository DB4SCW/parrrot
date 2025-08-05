const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectFile: () => ipcRenderer.invoke('select-file')
});

contextBridge.exposeInMainWorld('flrigAPI', {
  enableTX: () => ipcRenderer.invoke('flrig:enableTX'),
  disableTX: () => ipcRenderer.invoke('flrig:disableTX'),
  getMode: () => ipcRenderer.invoke('flrig:getMode')
});