const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const flrig = require('./flrig/flrigControl');

function createWindow() {
  const win = new BrowserWindow({
    width: 600,
    height: 550,
    icon: path.join(__dirname, 'assets', 'parrrot_icon_512.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile('renderer/index.html');
  win.webContents.openDevTools();
}
 
ipcMain.handle('select-file', async () => {
  const result = await dialog.showOpenDialog({
    filters: [{ name: 'Audio Files', extensions: ['mp3', 'wav'] }],
    properties: ['openFile']
  });
  return result.filePaths[0] || null;
});

ipcMain.handle('flrig:enableTX', () => flrig.enableTX());
ipcMain.handle('flrig:disableTX', () => flrig.disableTX());
ipcMain.handle('flrig:getMode', () => flrig.getMode());

app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});