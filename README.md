ID R&D VoiceSDK REST server
===========================

This package hosts Docker image with thin REST and WS wrapper for all VoiceSDK components.
REST wrapper conforms VoiceSDK Python API (all the methods and result classes). Please
take a look at [Python API documentation](https://docs.idrnd.net/voice/python) for better 
understanding the present API semantics.

Installation: Local package
---------------------------

This type of installation is applicable if you were provided with tar
archive of ready-to-use docker image.

1. Make sure you have Docker CE/EE installed  
   ```bash
   $ apt-get install docker.io
   ```
   
2. Load image into docker directly  
   ```bash
   $ docker load -i voicesdk-server.tar.gz
   Loaded image: voicesdk-server:tag
   ```
   
3. Launch resulting image
   ```bash
   $ docker run -d --name vrs --publish 8080:8080 voicesdk-server:tag
   ```

Installation: Amazon ECR
------------------------

This type of installation is applicable if you received AWS API key and secret
from ID R&D.

1. Make sure you have Python and Docker CE/EE installed  
   ```bash
   $ apt-get install docker.io python3-pip
   ```
   
2. Download AWS CLI  
   ```bash
   $ pip3 install awscli
   ```
   
3. Configure your credentials as provided by ID R&D  
    ```bash
    $ aws configure
    AWS Access Key ID None: <YOUR_API_KEY>
    AWS Secret Access Key None: <YOUR_SECRET_API_KEY>
    Default region name None: eu-central-1
    Default output format None: <None>
    ```
    
4. Login to Docker registry  
   ```bash
   $ eval $(aws ecr get-login --no-include-email)
   ```
   
5. Pull VoiceSDK server image  
   ```bash
   $ docker pull 367672406076.dkr.ecr.eu-central-1.amazonaws.com/voicesdk/voicesdk-server:2.14
   $ docker tag 367672406076.dkr.ecr.eu-central-1.amazonaws.com/voicesdk/voicesdk-server:2.14 voicesdk-server:2.14
   ```

6. Launch image  
   ```bash
   $ docker run -d --name vrss --publish 8080:8080 voicesdk-server:2.14
   ```

Configuration
-------------

There are two options to configure the container:

* via environment variables
* via passing a valid `application-config.yml` file

This documentation describes only the environment variables configuration option in details since the variables in config file are pretty much the same.
The valid default configuration file for user-defined changes can be downloaded from the [ID R&D GitHub repository](https://github.com/IDRnD/voicesdk-rest-ws-examples/tree/master/config/application-config.yml) 

### VoiceSDK component set

VoiceSDK contains various components, which solve different tasks. Some of them are rarely used along with each other.
You can configure the set of server components to use. This helps to decrease memory usage and remove unnecessary API endpoints.
Enabling/disabling a specific component is possible via a boolean environment variable ``IDRND_VOICESDK_COMPONENTS_<COMPONENT>``:

```bash
$ docker run -d --name vrss --publish 8080:8080 \
             -e IDRND_VOICESDK_COMPONENTS_<COMPONENT>=true|false
             voicesdk-server:2.14 
``` 

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

VoiceSDK voice verification component is delivered with a set of configurations covering
the most common use-cases and scenarios.
You can configure voice verification engine for a specific scenario by passing initialization data subfolder and voice verification method via environment
variables like this:

```bash
$ docker run -d --name vrss --publish 8080:8080 \
             -e IDRND_VOICESDK_VERIFY_VERIFY_METHODS="MAP,TI_X_2" \
             -e IDRND_VOICESDK_VERIFY_INIT_DATA="verify/verify_init_data_16k" \
             voicesdk-server:2.14 
```

**Available values for IDRND_VOICESDK_VERIFY_VERIFY_METHODS:**
* **MAP** - GMM-MAP verification method (intended to be used for text-dependent scenario)
* **TI_X** - x-vector verification method (intended to be used for text-independent scenario), can be used only along with 8k init data
* **TI_X_2** - new generation x-vector verification method (intended to be used for text-independent scenario)
* any combination (list) of these three methods passed as comma separated list

**Available values for IDRND_VOICESDK_VERIFY_INIT_DATA:**
* **verify/verify_init_data_8k** - init data for telephone channel or cross-channel (microphone-telephone) speaker verification
* **verify/verify_init_data_16k** - init data for microphone channel speaker verification

**Recommended configurations:**

| IDRND_VOICESDK_VERIFY_VERIFY_METHODS | IDRND_VOICESDK_VERIFY_INIT_DATA | Use-case |
| ---- | --- | --- |
| TI_X_2 | verify/verify_init_data_16k | **Text-independent** speaker verification in **microphone** channel |
| TI_X_2 and MAP ("TI_X_2,MAP") | verify/verify_init_data_16k | **Text-dependent** speaker verification in **microphone** channel |
| TI_X_2 or TI_X | verify/verify_init_data_8k | **Text-independent** speaker verification in **telephone** channel |
| TI_X_2 | verify/verify_init_data_8k | **Cross-channel** **text-independent** speaker verification |

The default configuration is text-independent speaker verification in microphone channel.

### Enabling CORS

In some cases Cross-Origin Resource Sharing is required (e.g. when client-side JavaScript interacts with the server placed on a different host/port).
It is not safe and is not recommended to use the option in production, but for debugging  purposes you can enable CORS by
passing `SERVER_ALLOW_CORS` environment variable on the container initialization:

```bash
$ docker run -d --name vrss --publish 8080:8080 \
             -e SERVER_ALLOW_CORS=true \
             voicesdk-server:2.14 
```

CORS is disabled by default.

REST API Usage
--------------

The docker image itself exposes port 8080 which is used for communicating with
underlying REST service. The service has `/swagger-ui.html` endpoint
where you can find documentation for endpoints and examples of all operations.

Note that the set of available methods is defined by the set of components which are presented
in the delivery. To determine which components are supported use `/core/get_build_info/`
API endpoint.

Below are several examples of using various endpoints.
Make sure you have `curl`, `jq` and `jo` utilities installed.

* Antispoofing
  ```bash
  $ curl --form wav_file=@examples/wav/antispoof2/genuine_1.wav -X POST localhost:8080/antispoof_engine/is_spoof_file
  {"score":0.9950553178787231,"score_Replay":0.0,"score_TTS":0.0,"score_VC":0.0}
  ```

* Verification
  ```bash
  $ voice_template1=$(curl -s --form wav_file=@examples/wav/verify/m001_01_001.wav -X POST localhost:8080/verify_engine/create_voice_template_from_file)
  $ voice_template2=$(curl -s --form wav_file=@examples/wav/verify/m001_02_001.wav -X POST localhost:8080/verify_engine/create_voice_template_from_file)
  $ curl -H 'Content-Type: application/json' --data $(jo template1=$voice_template1 template2=$voice_template1) -X POST localhost:8080/verify_engine/verify
  {"probability":1.0,"score":0.9999996423721313}
  ```

* Speech summary
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

No code examples for REST API are provided, because Swagger endpoint provides a very detailed documentation
and OpenAPI specification, which can be used for API client generation.

WebSocket API Usage
-------------------

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
* `/verify_stream` - voice verification in audio stream (a part of `verify` component)

All the endpoints accepts **string** data for parameters and **binary** data for audio stream.

The common order of working with WebSocket endpoints is the following:

1. At first you should sequentially pass the required parameters for initialization. Each parameter should be
   passed as a separate string. Here is a tiny Python-like pseudocode example for abstract endpoint:

   ```python
   connection = create_ws_connection("<WebSocket endpoint>")

   # Assuming that this endpoint requires signal sampling rate
   # parameter for initialization

   sample_rate = 16000

   # Send parameter as string
   connection.send(str(sample_rate))

   # Receive result code ("200" on success, "500" on failure)
   result_code = connection.receive()
   ```

   As you can see connection returns a HTTP-like result code on setting the required parameter.
   **"200"** result code means that the parameter value is valid and it was accepted.
   **"500"** error code means that either the parameter value is invalid or another internal error occurred. For more details on the error you can examine container logs.

2. As soon as you've successfully set all the required parameters, you can start passing audio stream
   data chunks to the endpoint and obtain processing results. As was mentioned before the audio stream data should
   be in binary representation. Each endpoint accepts PCM16 audio samples, i.e. a byte representation of 16-bit
   integer number array is expected. Here is an example of audio stream processing (this is a continuation of
   the previous example, so initialization stuff is skipped):

   ```python
   # Assumed that this object yeilds byte array chunks
   pcm16_audio_stream_source = create_audio_stream_source()

   while pcm16_audio_stream_source.has_data():
       chunk_to_send = pcm16_audio_stream_source.get_next_chunk()

       connection.send(chunk_to_send)

       result = connection.receive()

       print(result)
   ```

   As you can see after the intialization endpoint accepts audio samples and yeilds processing results. Of course
   it is not necessary to retrieve result on any send action: you can send as much samples as you want and receive
   the accumulated results in loop afterwards, like this:

   ```python
   while pcm16_audio_stream_source.has_data():
       chunk_to_send = pcm16_audio_stream_source.get_next_chunk()
       connection.send(chunk_to_send)

   while conenction.can_receive()
       result = connection.receive()
       print(result)
   ```

   The important part is that in the most cases the results of stream processing are JSON string representation,
   which can be parsed and treated like JSON objects.


### Endpoints documentation 

#### `/event_detector_stream`

**Parameters:**

1. Input audio stream sampling rate.

**Result:**

An array with JSON representations of Event class instance.

```json
[{"audio_interval": {"end_sample": 24150, "end_time": 3018, "sample_rate": 8000, "start_sample": 0, "start_time": 0}, "event_type": "Cough", "probability": 0.9999734163284302}]
```

#### `/speech_endpoint_detector`

1. Minimum speech length required to start endpoint detection (milliseconds).
2. Silence after utterance length required to detect speech endpoint (milliseconds).
3. Input audio stream sampling rate.

**Result:**

A string representation of boolean value, "true" if speech endpoint is detected, "false" otherwise.

#### `/speech_summary_stream`

1. Input audio stream sampling rate.

**Result:**

A JSON representation of SpeechSummary class instance.

```json
{"current_background_length": 0.0, "speech_length": 0.029999999329447746, "current_speech_summary": {"background_length": 0.33000001311302185, "speech_signal_length": 0.029999999329447746, "total_length": 0.38331249356269836, "vad_result": {"frame_length_ms": 30.0, "frames": [false, false, false, false, false, false, false, false, false, false, false, true]}}}
```

#### `/verify_stream`

1. Base64 string representation of voice template created with one of the methods from `/verify_engine/*` endpoint.
2. Input audio stream sampling rate.
3. Stream averaging window width (seconds). Can be used for managing the "memory" of stream: the wider is widnow, the longer
   stream memory is.

**Result:**

An array of JSON representations of VerifyStreamResult class instance.

```json
[{"audio_interval": {"end_sample": 48000, "end_time": 3000, "sample_rate": 16000, "start_sample": 0, "start_time": 0}, "verify_result": {"probability": 0.9999368786811829, "score": 0.6484680771827698}}]
```

Also take a look at Python and JavaScript examples for WebSocket API at [ID R&D GitHub repository](https://github.com/IDRnD/voicesdk-rest-ws-examples).
