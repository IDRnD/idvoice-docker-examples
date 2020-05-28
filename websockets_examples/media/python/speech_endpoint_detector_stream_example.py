import websocket
import os
import numpy as np
import sys
import requests
import json
import wave

# 0. Define paths

websocket_url = "ws://0.0.0.0:8080"

# 1. Read test audio file

with wave.open("genuine.wav", "rb") as wav:
    samples = np.frombuffer(wav.readframes(wav.getnframes()), dtype=np.int16)
    sample_rate = wav.getframerate()

# 2. Establish connection

ws = websocket.create_connection(websocket_url + "/speech_endpoint_detector")

# 2.1. First stream constructor parameter - min speech length

min_speech_length_ms = 1000

ws.send(str(min_speech_length_ms))
result_code = ws.recv()
print("Setting speech endpoint detector min speech length: ", result_code)

# 2.2. Second stream constructor parameter - max silence length

max_silence_length_ms = 600

ws.send(str(max_silence_length_ms))
result_code = ws.recv()
print("Setting speech endpoint detector max silence length: ", result_code)

# 2.3. Third stream constructor parameter - audio sample rate

ws.send(str(sample_rate))
result_code = ws.recv()
print("Setting speech endpoint detector sample rate: ", result_code)

# 3. Split audio files to chunk and feed it to stream

print("Sending samples by chunks")

print(len(samples))

for chunk in np.split(samples, 8):
    ws.send_binary(chunk.tostring())
    result = ws.recv()
    print("-------------------")
    print(result)
    print("-------------------")

ws.close()
