import websocket
import os
import numpy as np
import sys
import requests
import base64
import json
import wave

# 0. Define paths

websocket_url = "ws://0.0.0.0:8080"

# 1. Read test audio file

with wave.open("cough_0.wav", "rb") as wav:
    samples = np.frombuffer(wav.readframes(wav.getnframes()), dtype=np.int16)
    sample_rate = wav.getframerate()

# 2. Establish connection

ws = websocket.create_connection(websocket_url + "/event_detector_stream")

# 2.1. The only stream constructor parameter - audio sample rate

ws.send(str(sample_rate))
result_code = ws.recv()
print("Setting event detector stream sample rate: ", result_code)

# 3. Split audio files to chunk and feed it to stream

print("Sending samples by chunks")

for chunk in np.split(samples, 10):
    ws.send_binary(chunk.tostring())
    result = ws.recv()
    print("-------------------")
    print(result)
    print("-------------------")

ws.close()
