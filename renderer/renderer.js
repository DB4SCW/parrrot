//variables to store information
let selectedFile = null;
let isPlaying = false;
let selectedDeviceId = null;

//references to different UI elements
const selectBtn = document.getElementById('select-file');
const filenameDisplay = document.getElementById('filename');
const playBtn = document.getElementById('play');
const stopBtn = document.getElementById('stop');
const volumeSlider = document.getElementById('volume');
const logOutput = document.getElementById('log');
const modeDisplay = document.getElementById('mode-display');
const deviceSelect = document.getElementById('devices');

//define file picker behaviour
selectBtn.addEventListener('click', async () => {
  const file = await window.electronAPI.selectFile();
  if (file) {
    selectedFile = file;
    filenameDisplay.textContent = file.split('/').pop();
    log(`Datei gewählt: ${file}`);
  }
});

//define play button
playBtn.addEventListener('click', () => {
  
  //if there is no selected file or file is already playing, do nothing
  if (!selectedFile || isPlaying) {
    return;
  }

  //if everything is good, play selected file.
  runTXLoop(selectedFile);
});

//define stop button
stopBtn.addEventListener('click', () => {
  
  //do nothing if nothing is playing right now
  if(!isPlaying)
  {
    return;
  }

  //set playing variable to false and log
  isPlaying = false;
  log(`⛔️ Wiedergabe gestoppt`);
});

//react to change of sound device
deviceSelect.addEventListener('change', () => {
  selectedDeviceId = deviceSelect.value;
  log(`🎚️ Gerät gewählt: ${selectedDeviceId}`);
});

//define parrot loop
async function runTXLoop(file) {
  
  //set playing variable to true and log that
  isPlaying = true;
  log(`▶️ Starte TX-Wiedergabeschleife`);

  //repeat this while playing is true
  while (isPlaying) {
    try {
      await window.flrigAPI.enableTX();
      log(`🎙️ TX aktiviert`);

      await playAudio(file);

      await window.flrigAPI.disableTX();
      log(`📻 RX aktiviert`);

      await updateModeDisplay();
      await delay(2000);
    } catch (err) {
      log(`❌ Fehler: ${err.message}`);
      isPlaying = false;
    }
  }
}

//delay between audio runs
function delay(ms) {
  return new Promise(res => setTimeout(res, ms));
}

//play audio function
function playAudio(file) {
  
  return new Promise((resolve, reject) => {
    try {
      
      //create audio
      const audio = new Audio(file);
      
      //read volume slider
      audio.volume = volumeSlider.value;

      //if device is valid, set output device
      if (selectedDeviceId && typeof audio.setSinkId === 'function') {
        
        //set audio output
        audio.setSinkId(selectedDeviceId)
          .then(() => {
            
            //play audio
            log(`🔈 Ausgabe → ${selectedDeviceId}`);
            audio.play();

          })
          .catch(err => {
            
            //log error, play audio anyway
            log(`⚠️ Ausgabe konnte nicht umgeschaltet werden: ${err.message}`);
            audio.play();

          });
      } else {

        //play audio anyway
        audio.play();

      }

      //log end
      audio.onended = () => {
        log(`✅ Wiedergabe abgeschlossen`);
        resolve();
      };

      //log error
      audio.onerror = () => {
        reject(new Error('Fehler beim Abspielen der Datei'));
      };
    } catch (err) {
      reject(err);
    }
  });

}

//log to log UI element
function log(msg) {
  const timestamp = new Date().toLocaleTimeString();
  logOutput.textContent += `[${timestamp}] ${msg}
`;
  logOutput.scrollTop = logOutput.scrollHeight;
}

//define updating of flrig mode
async function updateModeDisplay() {
  try {
    const mode = await window.flrigAPI.getMode();
    modeDisplay.textContent = mode;
  } catch (err) {
    modeDisplay.textContent = 'Fehler';
    log(`❌ FLRIG-Modus konnte nicht abgefragt werden`);
  }
}

//define loading of audio devices
async function loadAudioDevices() {
  try {
    
    //get devices
    const devices = await navigator.mediaDevices.enumerateDevices();
    
    //only get outputs
    const outputs = devices.filter(d => d.kind === 'audiooutput');

    //load options into selector in UI
    deviceSelect.innerHTML = '';
    outputs.forEach(device => {
      const option = document.createElement('option');
      option.value = device.deviceId;
      option.textContent = device.label || `Audioausgang ${device.deviceId}`;
      deviceSelect.appendChild(option);
    });

    //select the first device as default
    selectedDeviceId = outputs[0]?.deviceId || null;
    
    //log success
    log(`🔊 Audio-Geräte geladen (${outputs.length})`);
  } catch (err) {
    //log error
    log(`❌ Audio-Geräte konnten nicht geladen werden: ${err.message}`);
  }
}

//initialize renderer
init();

//define init behaviour
async function init() {
  await updateModeDisplay();
  await loadAudioDevices();
}