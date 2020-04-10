ID R&D VoiceSDK WebSocket and REST API examples
===============================================

This repository hosts documentation and examples for VoiceSDK WebSocket and REST API. Also please
take a look at [Python API documentation](https://docs.idrnd.net/voice/python) for better 
understanding the present API semantics.

REST API Usage
--------------

The docker image itself exposes port 8080 which is used for communicating with
underlying REST service. The service has `/swagger-ui/` endpoint
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
  $ voice_template1=$(curl -s --form wav_file=@examples/wav/verify/m001_01_001.wav -X POST localhost:8080/verify_engine/create_voice_template_from_file | jq -r)
  $ voice_template2=$(curl -s --form wav_file=@examples/wav/verify/m001_02_001.wav -X POST localhost:8080/verify_engine/create_voice_template_from_file | jq -r)
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

Also take a look at Python and JavaScript examples for WebSocket API at [this repository](https://github.com/IDRnD/voicesdk-rest-ws-examples/tree/master/websockets_examples).
