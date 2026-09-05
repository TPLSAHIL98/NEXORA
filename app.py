import os
import requests
from flask import Flask, jsonify, render_template, request, Response
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

API_BASE = "https://api.experientiallabs.ai/v1"
API_KEY = os.getenv("EXPLABS_API_KEY", "")

MODELS = {
    "gpt": {
        "name": "ChatGPT",
        "model": os.getenv("GPT_MODEL", "gpt-6-astra"),
        "description": "Advanced intelligence"
    },
    "claude": {
        "name": "Claude",
        "model": os.getenv("CLAUDE_MODEL", "fable-5"),
        "description": "Deep reasoning"
    },
    "gemini": {
        "name": "Gemini",
        "model": os.getenv("GEMINI_MODEL", "gemini-3.7-flash"),
        "description": "Fast multimodal intelligence"
    }
}


def api_headers():
    return {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/api/health")
def health():
    return jsonify({
        "ok": True,
        "configured": bool(API_KEY)
    })


@app.route("/api/models")
def get_models():
    return jsonify({
        key: {
            "name": value["name"],
            "model": value["model"],
            "description": value["description"]
        }
        for key, value in MODELS.items()
    })


@app.route("/api/chat", methods=["POST"])
def chat():

    if not API_KEY:
        return jsonify({
            "error": "EXPLABS_API_KEY is not configured on the server."
        }), 500

    data = request.get_json(silent=True) or {}

    provider = data.get("provider", "gpt")
    messages = data.get("messages", [])

    if provider not in MODELS:
        return jsonify({
            "error": "Invalid model."
        }), 400

    if not messages:
        return jsonify({
            "error": "No messages supplied."
        }), 400

    model = MODELS[provider]["model"]

    payload = {
        "model": model,
        "messages": messages,
        "stream": True
    }

    try:
        upstream = requests.post(
            f"{API_BASE}/chat/completions",
            headers=api_headers(),
            json=payload,
            stream=True,
            timeout=(20, 300)
        )

    except requests.RequestException as error:
        return jsonify({
            "error": f"API connection failed: {error}"
        }), 502

    if upstream.status_code >= 400:
        return Response(
            upstream.content,
            status=upstream.status_code,
            content_type=upstream.headers.get(
                "Content-Type",
                "application/json"
            )
        )

    def stream():

        for chunk in upstream.iter_content(
            chunk_size=4096
        ):
            if chunk:
                yield chunk

    return Response(
        stream(),
        content_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no"
        }
    )


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))

    app.run(
        host="0.0.0.0",
        port=port,
        debug=False
        )
