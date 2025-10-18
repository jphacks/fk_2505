from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import logging
from dotenv import load_dotenv
import os
import sounddevice as sd
import json
import numpy as np

load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}})

logging.basicConfig(level=logging.DEBUG)

DIFY_API_KEY = os.getenv('DIFY_API_KEY')
DIFY_API_URL = os.getenv('DIFY_API_URL')

host = "127.0.0.1"
port = "50021"
speaker = 4

def post_audio_query(text: str) -> dict:
    params = {"text": text, "speaker": speaker}
    res = requests.post(
        f"http://{host}:{port}/audio_query",
        params=params,
    )
    query_data = res.json()
    return query_data

def post_synthesis(query_data: dict) -> bytes:
    params = {"speaker": speaker}
    headers = {"content-type": "application/json"}
    res = requests.post(
        f"http://{host}:{port}/synthesis",
        data=json.dumps(query_data),
        params=params,
        headers=headers,
    )
    return res.content

def play_wavfile(wav_data: bytes):
    sample_rate = 24000
    wav_array = np.frombuffer(wav_data, dtype=np.int16)
    sd.play(wav_array, sample_rate, blocking=True)

@app.route('/chat', methods=['POST', 'OPTIONS'])
def chat():
    if request.method == 'OPTIONS':
        response = app.make_default_options_response()
        response.headers['Access-Control-Allow-Origin'] = 'http://localhost:3000'
        response.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
        return response

    try:
        data = request.get_json()
        user_message = data.get('message', '')

        # Dify APIへのリクエスト
        dify_response = requests.post(
            DIFY_API_URL,
            headers={
                'Authorization': f'Bearer {DIFY_API_KEY}',
                'Content-Type': 'application/json'
            },
            json={
                'inputs': {},
                'query': user_message,
                'response_mode': 'blocking',
                'conversation_id': '',
                'user': 'user-123'
            }
        )

        if dify_response.status_code == 200:
            ai_response = dify_response.json().get('answer', 'すみません、応答を生成できませんでした。')
        else:
            ai_response = 'エラーが発生しました。'

        # VOICEVOXで音声生成
        try:
            query_data = post_audio_query(ai_response)
            wav_data = post_synthesis(query_data)
            play_wavfile(wav_data)
        except Exception as e:
            print(f"音声生成エラー: {e}")

        return jsonify({'response': ai_response})

    except Exception as e:
        logging.error(f"Error in chat endpoint: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=True)
