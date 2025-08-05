let selectedFile = null;
let isPlaying = false;
let selectedDeviceId = null;

const selectBtn = document.getElementById('select-file');
const filenameDisplay = document.getElementById('filename');
const playBtn = document.getElementById('play');
const stopBtn = document.getElementById('stop');
const volumeSlider = document.getElementById('volume');
const logOutput = document.getElementById('log');
const modeDisplay = document.getElementById('mode-display');
const deviceSelect = document.getElementById('devices');

selectBtn.addEventListener('click', async () => {
  const file = await window.electronAPI.selectFile();
  if (file) {
    selectedFile = file;
    filenameDisplay.textContent = file.split('/').pop();
    log(`Datei gewählt: ${file}`);
  }
});

playBtn.addEventListener('click', () => {
  if (!selectedFile || isPlaying) return;
  runTXLoop(selectedFile);
});

stopBtn.addEventListener('click', () => {
  isPlaying = false;
  log(`⛔️ Wiedergabe gestoppt`);
});

deviceSelect.addEventListener('change', () => {
  selectedDeviceId = deviceSelect.value;
  log(`🎚️ Gerät gewählt: ${selectedDeviceId}`);
});

async function runTXLoop(file) {
  isPlaying = true;
  log(`▶️ Starte TX-Wiedergabeschleife`);

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

function delay(ms) {
  return new Promise(res => setTimeout(res, ms));
}

function playAudio(file) {
  return new Promise((resolve, reject) => {
    try {
      const audio = new Audio(file);
      audio.volume = volumeSlider.value;

      if (selectedDeviceId && typeof audio.setSinkId === 'function') {
        audio.setSinkId(selectedDeviceId)
          .then(() => {
            log(`🔈 Ausgabe → ${selectedDeviceId}`);
            audio.play();
          })
          .catch(err => {
            log(`⚠️ Ausgabe konnte nicht umgeschaltet werden: ${err.message}`);
            audio.play();
          });
      } else {
        audio.play();
      }

      audio.onended = () => {
        log(`✅ Wiedergabe abgeschlossen`);
        resolve();
      };

      audio.onerror = () => {
        reject(new Error('Fehler beim Abspielen der Datei'));
      };
    } catch (err) {
      reject(err);
    }
  });
}

function log(msg) {
  const timestamp = new Date().toLocaleTimeString();
  logOutput.textContent += `[${timestamp}] ${msg}
`;
  logOutput.scrollTop = logOutput.scrollHeight;
}

async function updateModeDisplay() {
  try {
    const mode = await window.flrigAPI.getMode();
    modeDisplay.textContent = mode;
  } catch (err) {
    modeDisplay.textContent = 'Fehler';
    log(`❌ FLRIG-Modus konnte nicht abgefragt werden`);
  }
}

async function loadAudioDevices() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const outputs = devices.filter(d => d.kind === 'audiooutput');

    deviceSelect.innerHTML = '';
    outputs.forEach(device => {
      const option = document.createElement('option');
      option.value = device.deviceId;
      option.textContent = device.label || `Audioausgang ${device.deviceId}`;
      deviceSelect.appendChild(option);
    });

    selectedDeviceId = outputs[0]?.deviceId || null;
    log(`🔊 Audio-Geräte geladen (${outputs.length})`);
  } catch (err) {
    log(`❌ Audio-Geräte konnten nicht geladen werden: ${err.message}`);
  }
}

init();

async function init() {
  await updateModeDisplay();
  await loadAudioDevices();
}