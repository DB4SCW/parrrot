//BridgetoMailWorld
const { contextBridge, ipcRenderer } = require('electron');

//explose file handling
contextBridge.exposeInMainWorld('electronAPI', {
  selectFile: () => ipcRenderer.invoke('select-file'),
    exitApp: () => ipcRenderer.send('exit-app')
});

//expose flrig handling
contextBridge.exposeInMainWorld('flrigAPI', {
  enableTX: (targetMode) => ipcRenderer.invoke('flrig:enableTX', targetMode),
  disableTX: () => ipcRenderer.invoke('flrig:disableTX'),
  getMode: () => ipcRenderer.invoke('flrig:getMode')
});

//expose version check handling
contextBridge.exposeInMainWorld('versioncheck', {
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  checkLatestRelease: (currentVersion) =>
    ipcRenderer.invoke('app:checkLatestRelease', currentVersion),
});