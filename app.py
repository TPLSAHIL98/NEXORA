import os
import requests
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

BASE_URL = "https://api.experientiallabs.ai/v1"
MODEL = "gemini-2.5-flash"


def get_api_key():
    key = os.environ.get("EXPERIENTIAL_API_KEY", "").strip()

    if key:
        return key

    try:
        with open(".env", "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()

                if line.startswith("EXPERIENTIAL_API_KEY="):
                    return line.split("=", 1)[1].strip().strip('"').strip("'")

    except FileNotFoundError:
        pass

    return ""


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.get_json(silent=True) or {}

    messages = data.get("messages", [])

    if not messages:
        return jsonify({
            "error": "No message was provided."
        }), 400

    api_key = get_api_key()

    if not api_key:
        return jsonify({
            "error": "EXPERIENTIAL_API_KEY is missing."
        }), 500

    payload = {
        "model": MODEL,
        "messages": messages,
        "stream": False
    }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    try:
        response = requests.post(
            f"{BASE_URL}/chat/completions",
            headers=headers,
            json=payload,
            timeout=120
        )

        if not response.ok:
            return jsonify({
                "error": f"API error HTTP {response.status_code}",
                "details": response.text[:2000]
            }), response.status_code

        result = response.json()

        try:
            reply = result["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError):
            return jsonify({
                "error": "Unexpected API response.",
                "details": result
            }), 500

        return jsonify({
            "reply": reply,
            "model": MODEL
        })

    except requests.RequestException as e:
        return jsonify({
            "error": "Could not connect to Experiential Labs.",
            "details": str(e)
        }), 500


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 5000)),
        debug=False
            )
