import os
import json
import uuid
import requests

from flask import Flask, render_template, request, jsonify, Response

app = Flask(__name__)

BASE_URL = "https://api.experientiallabs.ai/v1"


def load_key():
    try:
        with open(".env", "r") as f:
            for line in f:
                line = line.strip()

                if line.startswith("EXPERIENTIAL_API_KEY="):
                    return line.split("=", 1)[1].strip()

    except FileNotFoundError:
        pass

    return os.environ.get("EXPERIENTIAL_API_KEY", "")


def api_headers():
    return {
        "Authorization": f"Bearer {load_key()}",
        "Content-Type": "application/json"
    }


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/models")
def models():
    key = load_key()

    if not key:
        return jsonify({
            "error": "Experiential Labs API key is not configured"
        }), 500

    try:
        r = requests.get(
            f"{BASE_URL}/models",
            headers={
                "Authorization": f"Bearer {key}"
            },
            timeout=20
        )

        if not r.ok:
            return jsonify({
                "error": f"Models request failed: HTTP {r.status_code}"
            }), r.status_code

        data = r.json()

        available = []

        for item in data.get("data", []):
            model_id = item.get("id", "")

            if (
                model_id.startswith("gpt-")
                or model_id.startswith("claude-")
                or model_id.startswith("gemini-")
            ):
                available.append({
                    "id": model_id,
                    "name": model_id
                })

        return jsonify({
            "models": available
        })

    except Exception as e:
        return jsonify({
            "error": str(e)
        }), 500


@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.get_json(silent=True) or {}

    model = data.get("model", "").strip()
    messages = data.get("messages", [])

    # Remove NEXORA UI-only fields before sending to the API.
    messages = [
        {
            "role": msg.get("role"),
            "content": msg.get("content", "")
        }
        for msg in messages
        if msg.get("role") in ("system", "user", "assistant")
    ]

    if not model:
        return jsonify({
            "error": "No model selected"
        }), 400

    if not messages:
        return jsonify({
            "error": "No conversation messages supplied"
        }), 400

    key = load_key()

    if not key:
        return jsonify({
            "error": "Experiential Labs API key is not configured"
        }), 500

    payload = {
        "model": model,
        "messages": messages,
        "stream": True
    }

    def generate():
        try:
            with requests.post(
                f"{BASE_URL}/chat/completions",
                headers=api_headers(),
                json=payload,
                stream=True,
                timeout=180
            ) as r:

                if not r.ok:
                    yield "data: " + json.dumps({
                        "error": r.text[:1500]
                    }) + "\n\n"
                    return

                for line in r.iter_lines(
                    decode_unicode=True
                ):

                    if not line:
                        continue

                    if line.startswith("data:"):
                        raw = line[5:].strip()

                        if raw == "[DONE]":
                            yield "data: [DONE]\n\n"
                            return

                        try:
                            obj = json.loads(raw)

                            choices = obj.get(
                                "choices",
                                []
                            )

                            if choices:
                                delta = choices[0].get(
                                    "delta",
                                    {}
                                )

                                content = delta.get(
                                    "content"
                                )

                                if content:
                                    yield "data: " + json.dumps({
                                        "content": content
                                    }) + "\n\n"

                        except json.JSONDecodeError:
                            continue

        except Exception as e:
            yield "data: " + json.dumps({
                "error": str(e)
            }) + "\n\n"

    return Response(
        generate(),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no"
        }
    )


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 5000)),
        debug=True,
        threaded=True
    )
