// Textareas for output
let element = document.getElementById("output");
let element1 = document.getElementById("output1");

// REST API and WebSocket API endpoints
let restBackendUrl = "http://0.0.0.0:8080/verify_engine/create_voice_template_from_samples"
let wsBackendUrl = "ws://0.0.0.0:8080/verify_stream";

// WebSocket object, will be initialized later
var socket;

// Voice verification parameters
let requiredEnrollmentAudioLengthSeconds = 5;
var requiredEnrollmentAudioLengthSamples;
let verifyStreamWindowLengthSeconds = 3;

// Audio recording stuff
var audioInput;
var recorder;
var context;
var sampleRate;

// Enrollment audio recording stuff
var numSamplesRecorded = 0;
var buffersCollected = [];

/**************
 * ENROLLMENT *
 **************/

function collectAudioBuffer(floatAudioBuffer) {
  // Collect audio buffer
  buffersCollected.push(floatAudioBuffer);
  numSamplesRecorded += floatAudioBuffer.length;

  if (numSamplesRecorded >= requiredEnrollmentAudioLengthSamples) {
    // 1. Stop recording
    audioInput.disconnect(recorder);
    recorder.disconnect(context.destination);
    recorder.onaudioprocess = null;

    // 2. Merge collected buffer to union buffer
    let mergedBuffer = new Float32Array(numSamplesRecorded);
    let offset = 0;
    for (let i = 0; i < buffersCollected.length; i++) {
      mergedBuffer.set(buffersCollected[i], offset);
      offset += buffersCollected[i].length;
    }

    // 3. Convert merged audio buffer from float samples to PCM16 samples
    let pcm16Buffer = new ArrayBuffer(mergedBuffer.length * 2);

    let view = new DataView(pcm16Buffer);
    offset = 0;
    for (let i = 0; i < mergedBuffer.length; i++, offset += 2) {
      let s = Math.max(-1, Math.min(1, mergedBuffer[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }

    // 4. Make a request for voice template creation
    var req = new XMLHttpRequest();
    req.open('POST', restBackendUrl + "?sample_rate=" + sampleRate, true);
    req.setRequestHeader('Content-type', 'application/octet-stream');

    req.onloadend = function() {
      if (req.status == 200) {
        alert("Voice template was created successfully!");
        startRecording(req.response);
      } else {
        alert("Cannot create voice template! Please reload the page and try again");
      }
    };

    // 5. Send recorded data to REST API
    let blob = new Blob([view]);
    req.send(blob);

    buffersCollected = [];
  }
}

function createEnrollVoiceTemplate() {
    alert("Please speak for " + requiredEnrollmentAudioLengthSeconds +
          " seconds to create voice template, which will be used for continuous voice verificaiton.");

    let audioBufferSize = 4096;
    let constraints = { audio: true };

    navigator.mediaDevices.getUserMedia(constraints)
        .then(function(stream) {
          let audioContext = window.AudioContext || window.webkitAudioContext;
          context = new audioContext();

          audioInput = context.createMediaStreamSource(stream);

          sampleRate = context.sampleRate;

          requiredEnrollmentAudioLengthSamples = sampleRate * requiredEnrollmentAudioLengthSeconds;

          recorder = context.createScriptProcessor(audioBufferSize, 1, 1);

          recorder.onaudioprocess = function(e) {
            collectAudioBuffer(Array.from(e.inputBuffer.getChannelData(0)));
          }

          audioInput.connect(recorder);
          recorder.connect(context.destination);

          element.value = "Recording...\n";
    });
}

/**************************
 * STREAMING VERIFICATION *
 **************************/

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
function startRecording(enrollVoiceTemplate) {
    if (enrollVoiceTemplate === undefined) {
      return;
    }

    let audioBufferSize = 4096;
    let constraints = { audio: true };

    navigator.mediaDevices.getUserMedia(constraints)
        .then(function(stream) {
          let audioContext = window.AudioContext || window.webkitAudioContext;
          context = new audioContext();

          audioInput = context.createMediaStreamSource(stream);

          sampleRate = context.sampleRate;

          socket = new WebSocket(wsBackendUrl);

          socket.onopen = function(e) {
            // The first parameter - voice template to match with
            socket.send(enrollVoiceTemplate);
            // The second parameter - audio stream sampling rate
            socket.send(sampleRate.toString());
            // The third parameter - verification sliding window width
            socket.send(verifyStreamWindowLengthSeconds.toString());
          };

          socket.onmessage = function(e) {
            // Result is a serialized JSON array, so we parse it and print
            // if it is not empty
            let result = JSON.parse(e.data);

            if (result.length != 0) {
              element.value += JSON.stringify(result) + "\n";
              element.scrollTop = element.scrollHeight;

              if (result[0] != undefined) {
                for (var i = 0; i < result.length; i++) {
                  element1.value = result[i]["verify_result"]["probability"];
                }
              }
            }
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

createEnrollVoiceTemplate();
