//define electron and dependencies
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const https = require('https');
const semver = require('semver');

//define data for version check
const OWNER = 'DB4SCW';
const REPO  = 'parrrot';

//get path
const path = require('path');

//get flrig handler
const flrig = require('./flrig/flrigControl');

//create window
function createWindow() {
  const win = new BrowserWindow({
    width: 600,
    height: 830,
    icon: path.join(__dirname, 'assets', 'parrrot_icon_512.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  //load UI
  win.loadFile('renderer/index.html');
  
}

//Close handler
ipcMain.on('exit-app', () => {
  app.quit();
});
 
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
ipcMain.handle('flrig:enableTX', (_evt, targetMode) => flrig.enableTX(targetMode));
ipcMain.handle('flrig:disableTX', () => flrig.disableTX());
ipcMain.handle('flrig:getMode', () => flrig.getMode());

//define version check behaviour
ipcMain.handle('app:getVersion', () => app.getVersion()); 

//define release check behaviour
ipcMain.handle('app:checkLatestRelease', async (_evt, currentVersion) => {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/releases/latest`;

  //small helper with timeout + safe fallbacks
  function getJsonWithTimeout(url, timeoutMs = 1500) {
    return new Promise((resolve, _reject) => {
      const req = https.request(url, {
        method: 'GET',
        headers: {
          'User-Agent': `${REPO}-updater`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28'
        }
      }, res => {
        let data = '';
        res.on('data', d => data += d);
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try { resolve(JSON.parse(data)); } catch { resolve(null); }
          } else {
            //treat non-2xx as "no update info" instead of an error
            resolve(null);
          }
        });
      });

      //hard timeout so we never block startup on flaky networks
      const to = setTimeout(() => {
        req.destroy(); //abort the request
        resolve(null); //fail gently
      }, timeoutMs);

      //shut everything down nicely
      req.on('error', () => { clearTimeout(to); resolve(null); });
      req.on('close', () => clearTimeout(to));
      req.end();
    });
  }

  //check github for new version - null means “couldn’t check”
  const latest = await getJsonWithTimeout(url, 1500);
  if (!latest) {
    return { isNewer: false, latestVersion: null, htmlUrl: null, body: '' };
  }

  //get the tag from the json
  const tag = latest.tag_name || latest.name || '';
  
  //remove a leading "v" if present including optional dot
  const latestVersion = tag.replace(/^v\.?/i, '');

  //check if version is newer
  const isNewer = semver.valid(latestVersion) && semver.valid(currentVersion)
    ? semver.gt(latestVersion, currentVersion)
    : (latestVersion !== currentVersion);

  //return info for further handling
  return {
    isNewer,
    latestVersion: tag,
    htmlUrl: latest.html_url || null,
    body: latest.body || ''
  };
});

//create window
app.whenReady().then(createWindow);

//handler for app close
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});