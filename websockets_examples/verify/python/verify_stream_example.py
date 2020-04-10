import websocket
import os
import numpy as np
import sys
import requests
import base64
import json
import wave

# 0. Define paths

wav_path = "../../../wav/verify"
websocket_url = "ws://0.0.0.0:8080"
rest_url = "http://0.0.0.0:8080"

# 1. Read test audio files

with wave.open(os.path.join(wav_path, "m001_01_001.wav"), "rb") as wav:
    samples1 = np.frombuffer(wav.readframes(wav.getnframes()), dtype=np.int16)
    sample_rate1 = wav.getframerate()

with wave.open(os.path.join(wav_path, "m001_02_001.wav"), "rb") as wav:
    samples2 = np.frombuffer(wav.readframes(wav.getnframes()), dtype=np.int16)
    sample_rate2 = wav.getframerate()

# 2. Create voice template

r = requests.post(
    rest_url + "/verify_engine/create_voice_template_from_samples?sample_rate=%i" % sample_rate1,
    data=base64.b64encode(samples1.tostring()),
    headers={"Content-type": "application/octet-stream"}
)

print("Creating voice tempalte: ", r.status_code)

voice_template = r.text

# 3. Establish connection

ws = websocket.create_connection(websocket_url + "/verify_stream")

# 3.1. First stream constructor parameter - voice template to compare with

ws.send(voice_template)
result_code = ws.recv()
print("Setting verify stream voice template: ", result_code)

# 3.2. Second stream constructor parameter - audio sample rate

ws.send(str(sample_rate2))
result_code = ws.recv()
print("Setting verify stream sample rate: ", result_code)

# 3.3. Third stream constructor parameter - windows length

stream_window_length_seconds = 10
ws.send(str(stream_window_length_seconds))
result_code = ws.recv()
print("Setting verify stream window length seconds: ", result_code)

# 4. Use verify stream

print("Sending samples for 10 times")

for i in range(10):
    ws.send_binary(samples2.tostring())
    result = ws.recv()
    print("-------------------")
    print(result)
    print("-------------------")

ws.close()
