# ============================================================
# AMIVEST AI - GROQ VISION API
# File: backend/routes/vision.py
# ============================================================

import os
import base64
import binascii
import traceback
from pathlib import Path

import requests
from flask import Blueprint, request, jsonify
from dotenv import load_dotenv


# ============================================================
# LOAD ENVIRONMENT
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = BASE_DIR / ".env"
load_dotenv(ENV_FILE)


# ============================================================
# BLUEPRINT
# ============================================================

vision = Blueprint("vision", __name__)


# ============================================================
# GROQ CONFIGURATION
# ============================================================

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip()

# Current Groq multimodal models.
# First model is preferred; second is a fallback.
VISION_MODELS = [
    os.getenv(
        "GROQ_VISION_MODEL",
        "qwen/qwen3.6-27b"
    ).strip(),
    "meta-llama/llama-4-scout-17b-16e-instruct",
]

VISION_MODELS = list(dict.fromkeys(
    model for model in VISION_MODELS if model
))

GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions"


# ============================================================
# IMAGE VALIDATION
# ============================================================

ALLOWED_IMAGE_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/heic",
    "image/heif",
    "image/avif",
}

MAX_IMAGE_BYTES = 20 * 1024 * 1024


def extract_image(data_url):
    """
    Convert a browser data URL:

        data:image/jpeg;base64,AAAA...

    into:

        mime_type
        base64_data
    """

    if not data_url:
        raise ValueError("No image was received.")

    if not isinstance(data_url, str):
        raise ValueError("Image must be a string.")

    data_url = data_url.strip()

    if not data_url.startswith("data:"):
        raise ValueError(
            "Invalid image format. Expected a browser data URL."
        )

    try:
        header, encoded = data_url.split(",", 1)
    except ValueError:
        raise ValueError("Invalid image data.")

    mime_type = (
        header
        .split(";")[0]
        .replace("data:", "")
        .strip()
        .lower()
    )

    if mime_type not in ALLOWED_IMAGE_TYPES:
        raise ValueError(
            f"Unsupported image type: {mime_type}"
        )

    encoded = "".join(encoded.split())

    if not encoded:
        raise ValueError("Image data is empty.")

    try:
        image_bytes = base64.b64decode(
            encoded,
            validate=True
        )
    except (ValueError, binascii.Error):
        raise ValueError("Image contains invalid base64 data.")

    if not image_bytes:
        raise ValueError("Decoded image is empty.")

    if len(image_bytes) > MAX_IMAGE_BYTES:
        raise ValueError(
            "Image is too large. Please use an image smaller than 20 MB."
        )

    return mime_type, encoded, len(image_bytes)


# ============================================================
# LANGUAGE
# ============================================================

def get_language_instruction(language):
    language = str(language or "english").lower().strip()

    if language in ("hindi", "hi", "हिंदी"):
        return """
Answer in natural Hindi/Hinglish.
Use simple Hindi that an Indian user can understand.
Keep technical, financial and computer terms in English when useful.
Do not translate technical names unnecessarily.
"""

    if language in ("hinglish", "hi-en", "hindi-english"):
        return """
Answer naturally in Hinglish, using Hindi and English together.
Keep technical and financial terms in English when that is clearer.
"""

    return """
Answer in clear natural English.
Keep the answer direct, useful and easy to understand.
"""


# ============================================================
# PROMPT
# ============================================================

def build_prompt(question, language):
    language_instruction = get_language_instruction(language)

    return f"""
You are AmiVest Alexa AI, an advanced multimodal personal AI assistant.

The user has provided an image and asked a question.

USER QUESTION:
{question}

{language_instruction}

IMPORTANT RULES:

1. Analyze the image carefully.
2. Answer the user's actual question first.
3. Only claim information that is visible or reasonably inferable.
4. Never invent names, numbers, dates, prices, text or facts.
5. If text is visible, read it carefully.
6. If text is blurry or unreadable, say so.
7. If the image contains a receipt, explain visible items,
   prices and totals.
8. If the image contains a document, summarize visible content.
9. If the image contains a chart, explain visible labels,
   trends and numbers.
10. If the image contains a financial statement, explain only
    what is visible.
11. If the user asks "tell about me", describe only visible,
    non-sensitive characteristics. Do not identify the person.
12. Never identify a real person by name from their face.
13. Do not claim private information that cannot be determined
    from the image.
14. If the user asks a normal question such as "hello", respond
    naturally.
15. You are AmiVest Alexa AI. Sound natural and conversational.
16. Do not mention Groq, models, APIs or internal implementation.
17. Keep answers concise unless the user asks for detail.
18. If the image does not contain enough information, clearly say
    what is missing instead of guessing.

USER QUESTION AGAIN:
{question}
"""


# ============================================================
# GROQ REQUEST
# ============================================================

def call_groq(model, mime_type, image_base64, prompt):
    """
    Send image + question to Groq's OpenAI-compatible
    Chat Completions endpoint.
    """

    data_url = f"data:{mime_type};base64,{image_base64}"

    payload = {
        "model": model,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are AmiVest Alexa AI. "
                    "Be accurate, natural and helpful."
                ),
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": prompt,
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": data_url,
                        },
                    },
                ],
            },
        ],
        "temperature": 0.2,
        "max_completion_tokens": 1500,
        "top_p": 0.9,
        "stream": False,
    }

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json",
    }

    response = requests.post(
        GROQ_CHAT_URL,
        headers=headers,
        json=payload,
        timeout=90,
    )

    if response.ok:
        try:
            result = response.json()
        except Exception:
            raise RuntimeError(
                "Groq returned invalid JSON."
            )

        choices = result.get("choices") or []

        if not choices:
            raise RuntimeError(
                "Groq returned no choices."
            )

        message = choices[0].get("message") or {}
        reply = str(
            message.get("content") or ""
        ).strip()

        if not reply:
            raise RuntimeError(
                "Groq returned an empty response."
            )

        return reply

    try:
        error_data = response.json()
    except Exception:
        error_data = {
            "message": response.text[:2000]
        }

    error_message = (
        error_data
        .get("error", {})
        .get("message")
    )

    if not error_message:
        error_message = str(error_data)

    raise RuntimeError(
        f"Groq HTTP {response.status_code}: {error_message}"
    )


# ============================================================
# HEALTH / STATUS
# ============================================================

@vision.route("/vision/status", methods=["GET", "OPTIONS"])
def vision_status():

    if request.method == "OPTIONS":
        return "", 204

    return jsonify({
        "success": True,
        "service": "AmiVest Vision",
        "provider": "Groq",
        "configured": bool(GROQ_API_KEY),
        "models": VISION_MODELS,
    }), 200


# ============================================================
# MAIN VISION ENDPOINT
# ============================================================

@vision.route(
    "/vision/analyze",
    methods=["POST", "OPTIONS"]
)
def analyze_image():

    if request.method == "OPTIONS":
        return "", 204

    try:
        print("")
        print("==========================================")
        print("       AMIVEST GROQ VISION REQUEST")
        print("==========================================")

        # ----------------------------------------------------
        # API KEY
        # ----------------------------------------------------

        if not GROQ_API_KEY:
            print("❌ GROQ_API_KEY NOT FOUND")

            return jsonify({
                "success": False,
                "error": (
                    "GROQ_API_KEY is missing. "
                    "Add it to backend/.env."
                ),
            }), 500

        print("✅ Groq API key loaded")

        # ----------------------------------------------------
        # JSON
        # ----------------------------------------------------

        data = request.get_json(silent=True)

        if not data:
            return jsonify({
                "success": False,
                "error": "Request body must be JSON.",
            }), 400

        # ----------------------------------------------------
        # IMAGE
        # ----------------------------------------------------

        image = data.get("image")

        if not image:
            return jsonify({
                "success": False,
                "error": "Image is required.",
            }), 400

        # ----------------------------------------------------
        # QUESTION
        # ----------------------------------------------------

        question = (
            data.get("question")
            or data.get("prompt")
            or "Describe this image and tell me the important visible details."
        )

        question = str(question).strip()

        if not question:
            question = (
                "Describe this image and tell me the important "
                "visible details."
            )

        # ----------------------------------------------------
        # LANGUAGE
        # ----------------------------------------------------

        language = str(
            data.get("language", "english")
        ).lower().strip()

        # ----------------------------------------------------
        # IMAGE EXTRACTION
        # ----------------------------------------------------

        print("📷 Processing image...")

        mime_type, image_base64, image_size = extract_image(image)

        print(f"✅ Image type: {mime_type}")
        print(f"✅ Image size: {image_size} bytes")

        # ----------------------------------------------------
        # PROMPT
        # ----------------------------------------------------

        prompt = build_prompt(
            question,
            language
        )

        # ----------------------------------------------------
        # MODEL FALLBACK
        # ----------------------------------------------------

        last_error = None

        for model in VISION_MODELS:

            print(f"🤖 Trying Groq model: {model}")

            try:
                reply = call_groq(
                    model=model,
                    mime_type=mime_type,
                    image_base64=image_base64,
                    prompt=prompt,
                )

                print(
                    f"✅ Vision response from {model}"
                )

                print("==========================================")

                return jsonify({
                    "success": True,
                    "reply": reply,
                    "response": reply,
                    "answer": reply,
                    "model": model,
                    "provider": "groq",
                    "language": language,
                }), 200

            except Exception as exc:

                last_error = str(exc)

                print(
                    f"⚠️ {model} failed:"
                )
                print(last_error)

                continue

        # ----------------------------------------------------
        # ALL MODELS FAILED
        # ----------------------------------------------------

        print("❌ ALL GROQ VISION MODELS FAILED")

        return jsonify({
            "success": False,
            "error": (
                "Groq Vision AI failed. "
                + (
                    last_error
                    or "Unknown Groq error."
                )
            ),
        }), 502

    except ValueError as exc:

        print(
            f"❌ Validation error: {exc}"
        )

        return jsonify({
            "success": False,
            "error": str(exc),
        }), 400

    except Exception as exc:

        print("❌ VISION SERVER ERROR")
        traceback.print_exc()

        return jsonify({
            "success": False,
            "error": (
                f"Vision server error: {str(exc)}"
            ),
        }), 500
