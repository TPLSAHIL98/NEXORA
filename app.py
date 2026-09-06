import os
import json
import requests

from flask import Flask, render_template, request, Response, jsonify


app = Flask(__name__)


# ============================================================
# EXPERIENTIAL LABS
# ============================================================

API_BASE = "https://api.experientiallabs.ai/v1"

EXPLABS_API_KEY = os.getenv("EXPLABS_API_KEY")


# ============================================================
# NEXORA MODELS
# ============================================================

MODELS = {
    "gpt": os.getenv(
        "GPT_MODEL",
        "gpt-5.6-luna"
    ),

    "claude": os.getenv(
        "CLAUDE_MODEL",
        "deepseek-v4-flash"
    ),

    "gemini": os.getenv(
        "GEMINI_MODEL",
        "gemini-3.7-flash"
    ),
}


# ============================================================
# HOME
# ============================================================

@app.route("/")
def index():
    return render_template("index.html")


# ============================================================
# CHAT
# ============================================================

@app.route("/api/chat", methods=["POST"])
def chat():

    if not EXPLABS_API_KEY:
        return jsonify({
            "error": "EXPLABS_API_KEY is not configured on the server."
        }), 500


    data = request.get_json(silent=True) or {}


    provider = data.get("provider", "gpt")

    messages = data.get("messages", [])

    stream = data.get("stream", True)


    # --------------------------------------------------------
    # Validate provider
    # --------------------------------------------------------

    if provider not in MODELS:

        return jsonify({
            "error": f"Unknown provider: {provider}"
        }), 400


    model = MODELS[provider]


    # --------------------------------------------------------
    # Validate messages
    # --------------------------------------------------------

    if not isinstance(messages, list) or not messages:

        return jsonify({
            "error": "No messages were provided."
        }), 400


    # --------------------------------------------------------
    # Experiential Labs request
    # --------------------------------------------------------

    payload = {
        "model": model,
        "messages": messages,
        "stream": bool(stream)
    }


    headers = {
        "Authorization": f"Bearer {EXPLABS_API_KEY}",
        "Content-Type": "application/json",
        "Accept": "text/event-stream"
    }


    try:

        response = requests.post(
            f"{API_BASE}/chat/completions",
            headers=headers,
            json=payload,
            stream=bool(stream),
            timeout=300
        )


        # ----------------------------------------------------
        # API error
        # ----------------------------------------------------

        if not response.ok:

            try:
                error_data = response.json()

            except Exception:

                error_data = {
                    "error": response.text
                }


            return jsonify(error_data), response.status_code


        # ----------------------------------------------------
        # Streaming
        # ----------------------------------------------------

        if stream:

            def generate():

                for line in response.iter_lines(
                    decode_unicode=True
                ):

                    if line:

                        yield line + "\n\n"


            return Response(
                generate(),
                content_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "X-Accel-Buffering": "no"
                }
            )


        # ----------------------------------------------------
        # Normal JSON response
        # ----------------------------------------------------

        return jsonify(response.json())


    except requests.Timeout:

        return jsonify({
            "error": "The AI request timed out."
        }), 504


    except requests.RequestException as error:

        return jsonify({
            "error": str(error)
        }), 502


    except Exception as error:

        return jsonify({
            "error": str(error)
        }), 500


# ============================================================
# MODEL LIST
# ============================================================

@app.route("/api/models", methods=["GET"])
def models():

    return jsonify({
        "models": [
            {
                "provider": "gpt",
                "model": MODELS["gpt"],
                "name": "GPT-5.6 Luna"
            },
            {
                "provider": "claude",
                "model": MODELS["claude"],
                "name": "DeepSeek V4 Flash"
            },
            {
                "provider": "gemini",
                "model": MODELS["gemini"],
                "name": "Gemini 3.7 Flash"
            }
        ]
    })


# ============================================================
# HEALTH CHECK
# ============================================================

@app.route("/health")
def health():

    return jsonify({
        "status": "ok",
        "nexora": "V2"
    })


# ============================================================
# RUN
# ============================================================

if __name__ == "__main__":

    port = int(
        os.getenv(
            "PORT",
            "5000"
        )
    )

    app.run(
        host="0.0.0.0",
        port=port,
        debug=False
            )
