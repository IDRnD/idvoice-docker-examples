// Textarea for output
let element = document.getElementById("output");

// WebSocket API endpoint
let backendUrl = "ws://0.0.0.0:8080/speech_endpoint_detector";

// WebSocket object, will be initialized later
var socket;

// Speech endpoint detection parameters
let minSpeechLengthMs = 1000;
let maxSilenceLengthMs = 500;

// Helper function to convert normalized (i.e. in range [-1; 1])
// float audio samples to PCM16 audio samples
function floatTo16BitPCM(input, output) {
  for (let i = 0; i < input.length; i++) {
    let s = Math.max(-1, Math.min(1, input[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
}

// Audio buffer processing callback, sends buffer to server
function processAudio(floatAudioBuffer) {
    let pcm16Buffer = new Int16Array(floatAudioBuffer.length);
    floatTo16BitPCM(floatAudioBuffer, pcm16Buffer);
    socket.send(pcm16Buffer);
}

// Starts the recording process, opens WebSocket connection and
// intializes it
function startRecording() {
    let audioBufferSize = 4096;
    let constraints = { audio: true };

    navigator.mediaDevices.getUserMedia(constraints)
        .then(function(stream) {
            let audioContext = window.AudioContext || window.webkitAudioContext;
            let context = new audioContext();

            var audioInput = context.createMediaStreamSource(stream);

            let sampleRate = context.sampleRate;

            socket = new WebSocket(backendUrl);

            socket.onopen = function(e) {
              // The first initialization parameter - minimum speech length required to start endpoint detection
              socket.send(minSpeechLengthMs.toString());

              // The second initialization parameter - silence after utterance length required to detect speech endpoint
              socket.send(maxSilenceLengthMs.toString());

              // The third initialization parameter - audio stream sampling rate
              socket.send(sampleRate.toString());
            };

            socket.onmessage = function(e) {
              // Result is a boolean value so just print it
              element.value += JSON.stringify(e.data) + "\n";
              element.scrollTop = element.scrollHeight;
            }

            socket.onerror = function(e) {
              console.log(e);
            }

            socket.onclose = function(e) {
              console.log(e);
            }

            var recorder = context.createScriptProcessor(audioBufferSize, 1, 1);

            recorder.onaudioprocess = function(e) {
              processAudio(e.inputBuffer.getChannelData(0));
            }

            audioInput.connect(recorder);
            recorder.connect(context.destination);
    });
}

startRecording();
