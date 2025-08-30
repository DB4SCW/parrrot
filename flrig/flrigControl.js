const axios = require('axios');

const FLRIG_URL = 'http://localhost:12345/';
let originalMode = null;

//XML-Builder for FLRig API
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

//call FLRig and catch return
async function callFLRig(method, params = []) {
  const xml = buildXML(method, params);
  try {
    const res = await axios.post(FLRIG_URL, xml, {
      headers: { 'Content-Type': 'text/xml' }
    });

    const data = res.data;
    const matchString = data.match(/<value>(.*?)<\/value>/);
    const matchInt = data.match(/<int>(\d)<\/int>/);
    if (matchString) return matchString[1];
    if (matchInt) return parseInt(matchInt[1], 10);
    return null;
  } catch (err) {
    console.error(`[FLRIG ERROR] ${method}:`, err.message);
    throw err;
  }
}

//map mode to digi-input mode
function convertToDigitalMode(mode, targetMode) {
  
  //convert mode to required target mode for LSB/USB-D
  if(targetMode === 'LSB/USB-D'){
    if (mode === 'USB') return 'USB-D';
    if (mode === 'LSB') return 'LSB-D';
    if (mode === 'FM') return 'FM-D';
    return mode;
  }

  //deal with targetmode DIG
  if(targetMode === 'DIG'){
    return 'DIG';
  }
  
  //deal with targetmode DATA
  if(targetMode === 'DATA'){
    return 'DATA';
  }

  //deal with targetmode PKT
  if(targetMode === 'PKT'){
    return 'PKT';
  }

  //if nothing works, just stay here
  return mode;

}

async function enableTX(targetMode) {
  
  //get mode
  originalMode = await getMode();
  
  //convert to new digi in put mode
  const newMode = convertToDigitalMode(originalMode,targetMode);
  
  //set new mode if different
  if (newMode !== originalMode) {
    await setMode(newMode);
  }

  //trigger PTT, do not wait for FLRig answer
  setPTT(true).catch(err => {
    console.error("FLRIG TX set failed:", err.message);
  });

  //delay before other things are allowed to happen
  await delay(100);
}

//disable TX function
async function disableTX() {
  
  //disable TX, this time wait for the answer
  await setPTT(false);

  //return mode to original mode if that was different
  if (originalMode && (await getMode()) !== originalMode) {
    await setMode(originalMode);
  }
}

//set PTT state function
async function setPTT(state) {
  return await callFLRig('rig.set_ptt', [state ? 1 : 0]);
}

//get mode function
async function getMode() {
  return await callFLRig('rig.get_mode');
}

//set mode function
async function setMode(mode) {
  return await callFLRig('rig.set_mode', [mode]);
}

//set delay
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

//expose things to the outside
module.exports = {
  enableTX,
  disableTX,
  getMode,
  setMode,
  setPTT
};