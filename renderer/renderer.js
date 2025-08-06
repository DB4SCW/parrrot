//variables to store information
let selectedFile = null;
let isPlaying = false;
let selectedDeviceId = null;
let audioPlayer = null;

//references to different UI elements
const selectBtn = document.getElementById('select-file');
const filenameDisplay = document.getElementById('filename');
const playBtn = document.getElementById('play');
const stopBtn = document.getElementById('stop');
const volumeSlider = document.getElementById('volume');
const logOutput = document.getElementById('log');
const modeDisplay = document.getElementById('mode-display');
const deviceSelect = document.getElementById('devices');
const delayInput = document.getElementById('tx-delay');
const txBadge = document.getElementById('tx-badge');

//define file picker behaviour
selectBtn.addEventListener('click', async () => {
  const file = await window.electronAPI.selectFile();
  if (file) {
    selectedFile = file;
    filenameDisplay.textContent = file.split('/').pop();
    log(`File chosen: ${file}`);
  }
});

//define play button
playBtn.addEventListener('click', async () => {
  
  //if there is no selected file or file is already playing, do nothing
  if (!selectedFile || isPlaying) {
    return;
  }

  //allwed modes for parrot to be in
  const allowed_modes = ['USB', 'LSB', 'FM', 'USB-D', 'LSB-D', 'FM-D'];

  const mode = await window.flrigAPI.getMode();
  if(!allowed_modes.includes(mode))
  {
    log("Mode " + mode + " is not a voice mode supported by parrrot.");
    return;
  }

  //if everything is good, play selected file.
  runTXLoop(selectedFile);
});

//define stop button
stopBtn.addEventListener('click', async () => {

  //stop audio immediately
  if (audioPlayer) {
    audioPlayer.pause();
    audioPlayer.currentTime = 0;
    audioPlayer = null;
  }

  //set playing variable to false
  isPlaying = false;

  //switch back to RX immediately
  try {
    await window.flrigAPI.disableTX();
    txBadge.textContent = 'RX';
    txBadge.classList.remove('tx');
    log("📻 Switching back to RX");
  } catch (err) {
    log("❌ Error while switching to RX: " + err.message);
  }

  //log success
  log(`⛔️ Playback stopped`);
});

//react to change of sound device
deviceSelect.addEventListener('change', () => {
  selectedDeviceId = deviceSelect.value;
  log(`🎚️ Device chosen: ${selectedDeviceId}`);
});

//define parrot loop
async function runTXLoop(file) {
  
  //set playing variable to true and log that
  isPlaying = true;
  log(`▶️ Started Parrrot`);

  //repeat this while playing is true
  while (isPlaying) {
    try {
      
      //set minimum of one second delay
      const delaySeconds = Math.max(1, parseFloat(delayInput.value) || 1);
      delayInput.value = delaySeconds;

      //set proper mode and set TX to on
      await window.flrigAPI.enableTX();
      txBadge.textContent = 'TX';
      txBadge.classList.add('tx');
      log(`🎙️ activated TX`);

      //play audio to the device
      await playAudio(file);

      //disable TX and restore previous mode
      await window.flrigAPI.disableTX();
      txBadge.textContent = 'RX';
      txBadge.classList.remove('tx');
      log(`📻 return to RX`);

      //update mode display just in case
      await updateModeDisplay();

      //wait between TX cycles
      await delay(delaySeconds * 1000);

    } catch (err) {
      log(`❌ Error: ${err.message}`);
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
      audioPlayer = new Audio(file);
      const audio = audioPlayer;

      //read volume slider
      audio.volume = volumeSlider.value;

      //if device is valid, set output device
      if (selectedDeviceId && typeof audio.setSinkId === 'function') {
        
        //set audio output
        audio.setSinkId(selectedDeviceId)
          .then(() => {
            
            //play audio
            log(`🔈 Output → ${selectedDeviceId}`);
            audio.play();

          })
          .catch(err => {
            
            //log error, play audio anyway
            log(`⚠️ Output could not be switched: ${err.message}`);
            audio.play();

          });
      } else {

        //play audio anyway
        audio.play();

      }

      //log end
      audio.onended = () => {
        log(`✅ Playback done`);
        resolve();
      };

      //log error
      audio.onerror = () => {
        reject(new Error('Error while playing file.'));
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
  let error = false;
  let mode = null; 

  try {
    mode = await window.flrigAPI.getMode();
    modeDisplay.textContent = mode;
  } catch (err) {
    modeDisplay.textContent = 'No mode from FLRig available';
    error = true;
    log(`❌ Could not get FLRIG-Mode`);
  }

  if (!mode || error) {
    alert("FLRig does not answer or invalid mode received.\nPlease check FLRig.\nClosing app now.");
    window.electronAPI.exitApp();
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
      option.textContent = device.label || `Output device ${device.deviceId}`;
      deviceSelect.appendChild(option);
    });

    //select the first device as default
    selectedDeviceId = outputs[0]?.deviceId || null;
    
    //log success
    log(`🔊 Output devices loaded (${outputs.length})`);
  } catch (err) {
    //log error
    log(`❌ Output devices could not be loaded: ${err.message}`);
  }
}

//initialize renderer
init();

//define init behaviour
async function init() {
  await updateModeDisplay();
  await loadAudioDevices();
}