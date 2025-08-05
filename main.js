//define electron
const { app, BrowserWindow, ipcMain, dialog } = require('electron');

//get path
const path = require('path');

//get flrig handler
const flrig = require('./flrig/flrigControl');

//create window
function createWindow() {
  const win = new BrowserWindow({
    width: 600,
    height: 800,
    icon: path.join(__dirname, 'assets', 'parrrot_icon_512.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  //load UI
  win.loadFile('renderer/index.html');
  
  //load dev tools when needed
  //win.webContents.openDevTools();
}
 
//define handlers

//define file handler
ipcMain.handle('select-file', async () => {
  const result = await dialog.showOpenDialog({
    filters: [{ name: 'Audio Files', extensions: ['mp3', 'wav'] }],
    properties: ['openFile']
  });
  return result.filePaths[0] || null;
});

//define flrig behaviour
ipcMain.handle('flrig:enableTX', () => flrig.enableTX());
ipcMain.handle('flrig:disableTX', () => flrig.disableTX());
ipcMain.handle('flrig:getMode', () => flrig.getMode());

//create window
app.whenReady().then(createWindow);

//handler for app close
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});