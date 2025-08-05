const axios = require('axios');

const FLRIG_URL = 'http://localhost:12345/';
let originalMode = null;

function buildXML(method, params = []) {
  const paramXML = params.map(p => {
    let valueTag = '';
    if (typeof p === 'number' || typeof p === 'boolean') {
      valueTag = `<int>${p ? 1 : 0}</int>`;
    } else if (typeof p === 'string') {
      valueTag = `<string>${p}</string>`;
    } else {
      throw new Error(`Unsupported type: ${typeof p}`);
    }
    return `<param><value>${valueTag}</value></param>`;
  }).join('');

  return `<?xml version="1.0"?>
<methodCall>
  <methodName>${method}</methodName>
  <params>${paramXML}</params>
</methodCall>`;
}

async function callFLRig(method, params = []) {
  const xml = buildXML(method, params);
  try {
    const res = await axios.post(FLRIG_URL, xml, {
      headers: { 'Content-Type': 'text/xml' }
    });

    const data = res.data;
    const matchString = data.match(/<string>(.*?)<\/string>/);
    const matchInt = data.match(/<int>(\d)<\/int>/);
    if (matchString) return matchString[1];
    if (matchInt) return parseInt(matchInt[1], 10);
    return null;
  } catch (err) {
    console.error(`[FLRIG ERROR] ${method}:`, err.message);
    throw err;
  }
}

function convertToDigitalMode(mode) {
  if (mode === 'USB') return 'USB-D';
  if (mode === 'LSB') return 'LSB-D';
  if (mode === 'FM') return 'FM-D';
  return mode;
}

async function enableTX() {
  originalMode = await getMode();
  const newMode = convertToDigitalMode(originalMode);
  if (newMode !== originalMode) {
    await setMode(newMode);
  }
  await setPTT(true);
}

async function disableTX() {
  await setPTT(false);
  if (originalMode && (await getMode()) !== originalMode) {
    await setMode(originalMode);
  }
}

async function setPTT(state) {
  return await callFLRig('rig.set_ptt', [state ? 1 : 0]);
}

async function getMode() {
  return await callFLRig('rig.get_mode');
}

async function setMode(mode) {
  return await callFLRig('rig.set_mode', [mode]);
}

module.exports = {
  enableTX,
  disableTX,
  getMode,
  setMode,
  setPTT
};