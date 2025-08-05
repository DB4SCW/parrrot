//BridgetoMailWorld
const { contextBridge, ipcRenderer } = require('electron');

//explose file handling
contextBridge.exposeInMainWorld('electronAPI', {
  selectFile: () => ipcRenderer.invoke('select-file')
});

//expose flrig handling
contextBridge.exposeInMainWorld('flrigAPI', {
  enableTX: () => ipcRenderer.invoke('flrig:enableTX'),
  disableTX: () => ipcRenderer.invoke('flrig:disableTX'),
  getMode: () => ipcRenderer.invoke('flrig:getMode')
});