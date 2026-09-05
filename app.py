import os
import json
import requests

from flask import Flask, render_template, request, jsonify, Response

app = Flask(__name__)

BASE_URL = "https://api.experientiallabs.ai/v1"


# =========================================================
# API KEY
# =========================================================

def load_key():
    # Try .env first
    try:
        with open(".env", "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()

                if not line or line.startswith("#"):
                    continue

                if line.startswith("EXPERIENTIAL_API_KEY="):
                    return line.split("=", 1)[1].strip().strip('"').strip("'")

    except FileNotFoundError:
        pass

    # Then environment variable
    return os.environ.get("EXPERIENTIAL_API_KEY", "").strip()


def api_headers():
    return {
        "Authorization": f"Bearer {load_key()}",
        "Content-Type": "application/json"
    }


# =========================================================
# HOME
# =========================================================

@app.route("/")
def index():
    return render_template("index.html")


# =========================================================
# MODELS
# =========================================================

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
            timeout=30
        )

        if not r.ok:
            return jsonify({
                "error": f"Models request failed: HTTP {r.status_code}",
                "details": r.text[:1000]
            }), r.status_code

        data = r.json()

        raw_models = data.get("data", [])

        available = []

        for item in raw_models:

            if isinstance(item, str):
                model_id = item
                model_name = item

                available.append({
                    "id": model_id,
                    "name": model_name,
                    "provider": detect_provider(model_id),
                    "type": detect_model_type(model_id)
                })

                continue

            if not isinstance(item, dict):
                continue

            model_id = (
                item.get("id")
                or item.get("name")
                or item.get("model")
                or ""
            )

            if not model_id:
                continue

            model_name = (
                item.get("name")
                or item.get("display_name")
                or model_id
            )

            provider = (
                item.get("provider")
                or detect_provider(model_id)
            )

            model_type = (
                item.get("type")
                or item.get("capability")
                or detect_model_type(model_id)
            )

            available.append({
                "id": model_id,
                "name": model_name,
                "provider": provider,
                "type": model_type
            })

        # Remove duplicates
        unique = {}
        for item in available:
            unique[item["id"]] = item

        available = list(unique.values())

        # Sort alphabetically
        available.sort(
            key=lambda x: (
                str(x.get("provider", "")).lower(),
                str(x.get("name", "")).lower()
            )
        )

        return jsonify({
            "models": available,
            "count": len(available)
        })

    except requests.RequestException as e:

        return jsonify({
            "error": f"Connection error: {str(e)}"
        }), 500

    except ValueError:

        return jsonify({
            "error": "Experiential Labs returned invalid JSON"
        }), 500

    except Exception as e:

        return jsonify({
            "error": str(e)
        }), 500


# =========================================================
# PROVIDER DETECTION
# =========================================================

def detect_provider(model_id):

    model = model_id.lower()

    if (
        model.startswith("gpt-")
        or model.startswith("o1")
        or model.startswith("o3")
        or model.startswith("o4")
    ):
        return "OpenAI"

    if (
        model.startswith("claude-")
        or "claude" in model
    ):
        return "Anthropic"

    if (
        model.startswith("gemini-")
        or "gemini" in model
    ):
        return "Google"

    if (
        "llama" in model
        or model.startswith("meta-")
    ):
        return "Meta"

    if "mistral" in model:
        return "Mistral"

    if "deepseek" in model:
        return "DeepSeek"

    if "qwen" in model:
        return "Qwen"

    if "grok" in model:
        return "xAI"

    return "Other"


# =========================================================
# MODEL TYPE DETECTION
# =========================================================

def detect_model_type(model_id):

    model = model_id.lower()

    # Image
    image_words = [
        "image",
        "imagen",
        "dall-e",
        "dalle",
        "flux",
        "stable-diffusion",
        "stable_diffusion",
        "sdxl"
    ]

    for word in image_words:
        if word in model:
            return "image"

    # Audio
    audio_words = [
        "audio",
        "tts",
        "speech",
        "whisper",
        "voice"
    ]

    for word in audio_words:
        if word in model:
            return "audio"

    # Search
    search_words = [
        "search",
        "web-search",
        "web_search",
        "sonar"
    ]

    for word in search_words:
        if word in model:
            return "search"

    # Code
    code_words = [
        "code",
        "coder",
        "coding",
        "codestral"
    ]

    for word in code_words:
        if word in model:
            return "code"

    # Default
    return "chat"


# =========================================================
# CHAT
# =========================================================

@app.route("/api/chat", methods=["POST"])
def chat():

    data = request.get_json(silent=True) or {}

    model = str(data.get("model", "")).strip()

    messages = data.get("messages", [])

    if not model:
        return jsonify({
            "error": "No model selected"
        }), 400

    if not isinstance(messages, list) or not messages:
        return jsonify({
            "error": "No conversation messages supplied"
        }), 400

    cleaned_messages = []

    for msg in messages:

        if not isinstance(msg, dict):
            continue

        role = msg.get("role")
        content = msg.get("content", "")

        if role not in (
            "system",
            "user",
            "assistant"
        ):
            continue

        cleaned_messages.append({
            "role": role,
            "content": str(content)
        })

    if not cleaned_messages:
        return jsonify({
            "error": "No valid conversation messages supplied"
        }), 400

    key = load_key()

    if not key:
        return jsonify({
            "error": "Experiential Labs API key is not configured"
        }), 500

    payload = {
        "model": model,
        "messages": cleaned_messages,
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

                    error_text = r.text[:1500]

                    yield (
                        "data: "
                        + json.dumps({
                            "error": error_text
                        })
                        + "\n\n"
                    )

                    return

                for line in r.iter_lines(
                    decode_unicode=True
                ):

                    if not line:
                        continue

                    if not line.startswith("data:"):
                        continue

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

                        if not choices:
                            continue

                        delta = choices[0].get(
                            "delta",
                            {}
                        )

                        content = delta.get(
                            "content"
                        )

                        if content:

                            yield (
                                "data: "
                                + json.dumps({
                                    "content": content
                                })
                                + "\n\n"
                            )

                    except json.JSONDecodeError:
                        continue

        except requests.RequestException as e:

            yield (
                "data: "
                + json.dumps({
                    "error": str(e)
                })
                + "\n\n"
            )

        except Exception as e:

            yield (
                "data: "
                + json.dumps({
                    "error": str(e)
                })
                + "\n\n"
            )

    return Response(
        generate(),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive"
        }
    )


# =========================================================
# RUN
# =========================================================

if __name__ == "__main__":

    app.run(
        host="0.0.0.0",
        port=int(
            os.environ.get(
                "PORT",
                5000
            )
        ),
        debug=True,
        threaded=True
                )
