ID R&D VoiceSDK REST server
===========================

This package hosts Docker image with thin REST and WS wrapper for all VoiceSDK components.
REST wrapper conforms VoiceSDK Python API (all the methods and result classes). Please
take a look at [Python API documentation](https://docs.idrnd.net/voice/python) for better 
understanding the present API semantics.

Installation: Local package
---------------------------

> Server installation from local package

```bash
$ apt-get install docker.io
$ docker load -i voicesdk-server.tar.gz
Loaded image: voicesdk-server:tag
$ docker run -d --name vrs --publish 8080:8080 voicesdk-server:tag
```

This type of installation is applicable if you were provided with tar
archive of ready-to-use docker image.

1. Make sure you have Docker CE/EE installed  
   
2. Load image into Docker directly  
   
3. Launch resulting image

Installation: Amazon ECR
------------------------

> Server installation from Amazon ECR

```bash
$ apt-get install docker.io python3-pip
$ pip3 install awscli
$ aws configure
AWS Access Key ID None: <YOUR_API_KEY>
AWS Secret Access Key None: <YOUR_SECRET_API_KEY>
Default region name None: eu-central-1
Default output format None: <None>
$ eval $(aws ecr get-login --no-include-email)
$ docker pull 367672406076.dkr.ecr.eu-central-1.amazonaws.com/voicesdk/voicesdk-server:3.0
$ docker tag 367672406076.dkr.ecr.eu-central-1.amazonaws.com/voicesdk/voicesdk-server:3.0 voicesdk-server:3.0
$ docker run -d --name vrss --publish 8080:8080 voicesdk-server:3.0
```

This type of installation is applicable if you received AWS API key and secret
from ID R&D.

1. Make sure you have Python and Docker CE/EE installed  

2. Download AWS CLI  
   
3. Configure your credentials as provided by ID R&D  
    
4. Login to Docker registry  
   
5. Pull VoiceSDK server image  

6. Launch image  

Configuration
-------------

There are two options to configure the container:

* via environment variables
* via passing a valid `application-config.yml` file

This documentation describes only the environment variables configuration option in details since the variables in config file are pretty much the same.
The valid default configuration file for user-defined changes can be downloaded from the [ID R&D GitHub repository](https://github.com/IDRnD/voicesdk-server-examples/tree/master/config/application-config.yml) 

### VoiceSDK component set

> Launching server with a specific VoiceSDK component set

```bash
$ docker run -d --name vrss --publish 8080:8080 \
             -e IDRND_VOICESDK_COMPONENTS_<COMPONENT>=true|false
             voicesdk-server:3.0
``` 

VoiceSDK contains various components, which solve different tasks. Some of them are rarely used along with each other.
You can configure the set of server components to use. This helps to decrease memory usage and remove unnecessary API endpoints.
Enabling/disabling a specific component is possible via a boolean environment variable `IDRND_VOICESDK_COMPONENTS_<COMPONENT>`.
Please see the example at the right panel.

The table below shows the list of variables to configure VoiceSDK component set.

| Variable name | Description |
| ---- | --- |
| IDRND_VOICESDK_COMPONENTS_ANTISPOOF | Voice anti-spoofing |
| IDRND_VOICESDK_COMPONENTS_VERIFY | Voice verification |
| IDRND_VOICESDK_COMPONENTS_MEDIA | Speech and signal processing utilities |
| IDRND_VOICESDK_COMPONENTS_DIARIZATION | Speaker diarization |
| IDRND_VOICESDK_COMPONENTS_AED | Acoustic event detection |
| IDRND_VOICESDK_COMPONENTS_ATTRIBUTES | Speaker attributes estimation |

All the components are enabled by default.

### Voice verification component

> VoiceSDK speaker verification component configuration

```bash
$ docker run -d --name vrss --publish 8080:8080 \
             -e IDRND_VOICESDK_VERIFY_INIT_DATA="verify/TI-mic" \
             voicesdk-server:3.0
```

VoiceSDK voice verification component is delivered with a set of configurations covering
the most common use-cases and scenarios.
You can configure voice verification engine for a specific scenario by passing initialization data subfolder via environment
variables. Please see the example at the right panel.

**Available values for IDRND_VOICESDK_VERIFY_INIT_DATA (recommended configurations):**

* **verify/TI-mic** - init data for microphone channel text-independent speaker verification
* **verify/TD-mic** - init data for microphone channel text-dependent speaker verification
* **verify/TI-tel** - init data for telephone channel text-independent speaker verification
* **verify/TI-universal** - init data for telephone channel or cross-channel (microphone-telephone) text-independent speaker verification

The default configuration is text-independent speaker verification in microphone channel (**verify/TI-mic**).

### Enabling CORS

> Launching server with enabled CORS

```bash
$ docker run -d --name vrss --publish 8080:8080 \
             -e SERVER_ALLOW_CORS=true \
             voicesdk-server:3.0
```

In some cases Cross-Origin Resource Sharing is required (e.g. when client-side JavaScript interacts with the server placed on a different host/port).
It is not safe and is not recommended to use the option in production, but for debugging  purposes you can enable CORS by
passing `SERVER_ALLOW_CORS` environment variable on the container initialization.

CORS is disabled by default.

REST API Usage
--------------

> Anti-spoofing check REST API call example

```bash
$ curl --form wav_file=@examples/wav/antispoof2/genuine_1.wav -X POST localhost:8080/antispoof_engine/is_spoof_file
{"score":0.9950553178787231,"score_Replay":0.0,"score_TTS":0.0,"score_VC":0.0}
```

> Speaker verification REST API call example

```bash
$ voice_template1=$(curl -s --form wav_file=@examples/wav/verify/m001_01_001.wav -X POST localhost:8080/voice_template_factory/create_voice_template_from_file)
$ voice_template2=$(curl -s --form wav_file=@examples/wav/verify/m001_02_001.wav -X POST localhost:8080/voice_template_factory/create_voice_template_from_file)
$ curl -H 'Content-Type: application/json' --data $(jo template1=$voice_template1 template2=$voice_template1) -X POST localhost:8080/voice_template_matcher/match_voice_templates
{"probability":1.0,"score":0.9999996423721313}
```

> Speaker verification REST API call example

```bash
$ # real voice
$ curl --form wav_file=@examples/wav/media/genuine.wav -X POST localhost:8080/speech_summary_engine/get_speech_summary_from_file | jq 'del(.vad_result)'
{
"background_length": 1.350000023841858,
"speech_signal_length": 1.7100000381469727,
"total_length": 3.066499948501587
}

$ # silence
$ curl --form wav_file=@examples/wav/media/silence.wav -X POST localhost:8080/speech_summary_engine/get_speech_summary_from_file | jq 'del(.vad_result)'
{
"background_length": 13.109999656677246,
"speech_signal_length": 0,
"total_length": 13.134499549865723
}
```

The docker image itself exposes port 8080 which is used for communicating with
underlying REST service. The service has `/swagger-ui.html` endpoint
where you can find documentation for endpoints and examples of all operations.

Note that the set of available methods is defined by the set of components which are presented
in the delivery. To determine which components are supported use `/core/get_build_info/`
API endpoint.

There are several basic command-line examples of using various endpoints at the right panel.
Make sure you have `curl`, `jq` and `jo` utilities installed.

No code examples for REST API are provided, because Swagger endpoint provides a very detailed documentation
and OpenAPI specification, which can be used for API client generation.

WebSocket API Usage
-------------------

>  Python-like pseudocode example for an abstract WS endpoint usage

```python
connection = create_ws_connection("<WebSocket endpoint>")

# Assuming that this endpoint requires signal sampling rate
# parameter for initialization

sample_rate = 16000

# Send parameter as string
connection.send(str(sample_rate))

# Receive result code ("200" on success, "500" on failure)
result_code = connection.receive()

# Its assumed that this object yeilds byte array chunks
pcm16_audio_stream_source = create_audio_stream_source()

# You may receive results as soon as they've been produce
while pcm16_audio_stream_source.has_data():
   chunk_to_send = pcm16_audio_stream_source.get_next_chunk()

   connection.send(chunk_to_send)

   result = connection.receive()

   print(result)

# Or you may receive all the results at once
while pcm16_audio_stream_source.has_data():
   chunk_to_send = pcm16_audio_stream_source.get_next_chunk()
   connection.send(chunk_to_send)

while conenction.can_receive()
   result = connection.receive()
   print(result)
```

The docker image itself exposes port 8080 which is used for communicating with
underlying service.

This container exposes WebSocket API methods in order to support streaming audio
processing capabilities which are presented in VoiceSDK.

There is no formal documentation on WebSocket API as it implements
the low level protocol, which semantics is not as strict as for HTTP. However, we did our
best to provide as much information on WebSocket API usage as possible.

The following WebSocket endpoints are exposed:

* `/event_detector_stream` - acoustic event detection in audio stream (a part of `aed` component)
* `/speech_endpoint_detector` - speech endpoint detection in audio stream (a part of `media` component)
* `/speech_summary_stream` - voice activity detection and speech length estimation in audio stream
  (a part of `media` component)
* `/voice_verify_stream` - voice verification in audio stream (a part of `verify` component)

All the endpoints accepts **string** data for parameters and **binary** data for audio stream.

The common order of working with WebSocket endpoints is the following:

1. At first you should sequentially pass the required parameters for initialization. Each parameter should be
   passed as a separate string.
   As you can see connection returns a HTTP-like result code on setting the required parameter.
   **"200"** result code means that the parameter value is valid and it was accepted.
   **"500"** error code means that either the parameter value is invalid or another internal error occurred. For more details on the error you can examine container logs.
2. As soon as you've successfully set all the required parameters, you can start passing audio stream
   data chunks to the endpoint and obtain processing results. As was mentioned before the audio stream data should
   be in binary representation. Each endpoint accepts PCM16 audio samples, i.e. a byte representation of 16-bit
   integer number array is expected.

   As you can see after the intialization endpoint accepts audio samples and yeilds processing results. Of course
   it is not necessary to retrieve result on any send action: you can send as much samples as you want and receive
   the accumulated results in loop afterwards.

   The important part is that in the most cases the results of stream processing are JSON string representation,
   which can be parsed and treated like JSON objects.


### Endpoints documentation 

#### `/event_detector_stream`

**Parameters:**

1. Input audio stream sampling rate.

> Example of acoustic event detection result

```json
[{"audio_interval": {"end_sample": 24150, "end_time": 3018, "sample_rate": 8000, "start_sample": 0, "start_time": 0}, "event_type": "Cough", "probability": 0.9999734163284302}]
```

**Result:**

An array with JSON representations of Event class instance.

#### `/speech_endpoint_detector`

**Parameters:**

1. Minimum speech length required to start endpoint detection (milliseconds).
2. Silence after utterance length required to detect speech endpoint (milliseconds).
3. Input audio stream sampling rate.

**Result:**

A string representation of boolean value, "true" if speech endpoint is detected, "false" otherwise.

#### `/speech_summary_stream`

> Example of speech summary estimation result

```json
{"current_background_length": 0.0, "speech_length": 0.029999999329447746, "current_speech_summary": {"background_length": 0.33000001311302185, "speech_signal_length": 0.029999999329447746, "total_length": 0.38331249356269836, "vad_result": {"frame_length_ms": 30.0, "frames": [false, false, false, false, false, false, false, false, false, false, false, true]}}}
```

**Parameters:**

1. Input audio stream sampling rate.

**Result:**

A JSON representation of SpeechSummary class instance.

#### `/voice_verify_stream`

> Example of continuous voice verification result

```json
[{"audio_interval": {"end_sample": 48000, "end_time": 3000, "sample_rate": 16000, "start_sample": 0, "start_time": 0}, "verify_result": {"probability": 0.9999368786811829, "score": 0.6484680771827698}}]
```

**Parameters:**

1. Base64 string representation of voice template created with one of the methods from `/voice_template_factory/*` endpoint.
2. Input audio stream sampling rate.
3. Stream averaging window width (seconds). Can be used for managing the "memory" of stream: the wider is widnow, the longer
   stream memory is.

**Result:**

An array of JSON representations of VerifyStreamResult class instance.

Also take a look at Python and JavaScript examples for WebSocket API at [ID R&D GitHub repository](https://github.com/IDRnD/voicesdk-server-examples).

~~Performance~~
-----------

These are basic performance metrics obtained for a set of typical REST API use cases for a server instance
deployed on [AWS c5.4xlarge instance](https://aws.amazon.com/ec2/instance-types/c5) (Intel Xeon Platinum 8000 CPU, 32 Gb RAM).

The RPS metric (requests per second) should be interpreted as a maximum number of requests which server is able to process in one second.

### Text-dependent voice template creation, microphone channel

*Container configuration*:

* `IDRND_VOICESDK_VERIFY_VERIFY_METHODS="MAP,TI_X_2"`
* `IDRND_VOICESDK_VERIFY_INIT_DATA="verify/verify_init_data_16k"`

*Audio info*: 3 seconds of speech, 16 kHz sampling rate

*Request*: `POST /verify_engine/create_voice_template_from_samples?sample_rate=16000&channel_type=MIC`

**RPS: 65.5**

### Text-independent voice template creation, telephone channel

*Container configuration*:

* `IDRND_VOICESDK_VERIFY_VERIFY_METHODS="TI_X_2"`
* `IDRND_VOICESDK_VERIFY_INIT_DATA="verify/verify_init_data_8k"`

*Audio info*: 60 seconds of speech, 8 kHz sampling rate

*Request*: `POST /verify_engine/create_voice_template_from_samples?sample_rate=8000&channel_type=TEL`

**RPS: 4.2**

### Text-dependent voice template matching, microphone channel

*Container configuration*:

* `IDRND_VOICESDK_VERIFY_VERIFY_METHODS="MAP,TI_X_2"`
* `IDRND_VOICESDK_VERIFY_INIT_DATA="verify/verify_init_data_16k"`

*Audio info*: 3 seconds of speech, 16 kHz sampling rate

*Request*: `POST /verify_engine/verify`

**RPS: 113.5**

### Text-independent voice template matching, telephone channel

*Container configuration*:

* `IDRND_VOICESDK_VERIFY_VERIFY_METHODS="TI_X_2"`
* `IDRND_VOICESDK_VERIFY_INIT_DATA="verify/verify_init_data_8k"`

*Audio info*: 60 seconds of speech, 8 kHz sampling rate

*Request*: `POST /verify_engine/verify`

**RPS: 511.9**

### Anti-spoofing check, microphone channel

*Audio info*: 5 seconds of speech, 16 kHz sampling rate

*Request*: `POST /antispoof_engine/if_spoof_samples?sample_rate=16000`

**RPS: 2.4**

### Speaker diarization, telephone channel

*Audio info*: 100 seconds of speech, 8 kHz sampling rate

*Request*: `POST /diarization_engine/get_segmentation_from_samples?sample_rate=8000`

**RPS: 1.2**

### Speaker attributes estimation, microphone channel

*Audio info*: 5 seconds of speech, 16 kHz sampling rate

*Request*: `POST /attributes_estimator/estimate_with_samples?sample_rate=16000`

**RPS: 37.9**

### Acoustic event detection

*Audio info*: 5 seconds recording, 16 kHz sampling rate

*Request*: `POST /event_detector/detect_with_samples?sample_rate=16000`

**RPS: 47.7**

### Speech summary estimation (VAD + net speech length), microphone channel

*Audio info*: 3 seconds of speech, 16 kHz sampling rate

*Request*: `POST /speech_summary_engine/get_speech_summary_from_samples?sample_rate=16000`

**RPS: 394.3**

### Speech summary estimation (VAD + net speech length), telephone channel

*Audio info*: 60 seconds of speech, 8 kHz sampling rate

*Request*: `POST /speech_summary_engine/get_speech_summary_from_samples?sample_rate=8000`

**RPS: 143.8**

### SNR estimation, microphone channel

*Audio info*: 3 seconds of speech, 16 kHz sampling rate

*Request*: `POST /snr_computer/compute_with_samples?sample_rate=16000`

**RPS: 479.4**

### SNR estimation, telephone channel

*Audio info*: 60 seconds of speech, 8000 kHz sampling rate

*Request*: `POST /snr_computer/compute_with_samples?sample_rate=8000`

**RPS: 92.6**

### RT60 estimation, microphone channel

*Audio info*: 3 seconds of speech, 16 kHz sampling rate

*Request*: `POST /rt60_computer/compute_with_samples?sample_rate=16000`

**RPS: 446.2**
