from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from pathlib import Path
import os


# =====================================================
# ENVIRONMENT
# =====================================================

BASE_DIR = Path(__file__).resolve().parent
ENV_PATH = BASE_DIR / ".env"

# Local .env is loaded if it exists.
# On Render, environment variables come from Render itself.
load_dotenv(dotenv_path=ENV_PATH)


# =====================================================
# APP
# =====================================================

app = Flask(__name__)


# =====================================================
# SESSION
# =====================================================

app.config["SECRET_KEY"] = os.getenv(
    "SECRET_KEY",
    "amivest-development-secret"
)

app.config["SESSION_COOKIE_HTTPONLY"] = True

# Render/production = secure cookies
# Local development = normal cookies
IS_PRODUCTION = (
    os.getenv("RENDER") is not None
    or os.getenv("FLASK_ENV") == "production"
)

SESSION_COOKIE_SECURE = (
    os.getenv(
        "SESSION_COOKIE_SECURE",
        "true" if IS_PRODUCTION else "false"
    ).lower()
    == "true"
)

app.config["SESSION_COOKIE_SECURE"] = SESSION_COOKIE_SECURE

app.config["SESSION_COOKIE_SAMESITE"] = (
    "None" if SESSION_COOKIE_SECURE else "Lax"
)

app.config["SESSION_COOKIE_PATH"] = "/"


# =====================================================
# CORS
# =====================================================

# Your Vercel frontend
FRONTEND_URL = os.getenv(
    "FRONTEND_URL",
    "https://amivest-ai-iota.vercel.app"
)

ALLOWED_ORIGINS = [
    FRONTEND_URL,

    # Vercel production
    "https://amivest-ai-iota.vercel.app",

    # Local development
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://localhost:5173",
    "http://localhost:5174",
]

# Remove duplicates and empty values
ALLOWED_ORIGINS = list(
    dict.fromkeys(
        origin.strip()
        for origin in ALLOWED_ORIGINS
        if origin and origin.strip()
    )
)

CORS(
    app,
    resources={
        r"/*": {
            "origins": ALLOWED_ORIGINS
        }
    },
    supports_credentials=True,
    methods=[
        "GET",
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
        "OPTIONS"
    ],
    allow_headers=[
        "Content-Type",
        "Authorization",
        "X-Requested-With"
    ],
    expose_headers=[
        "Content-Type"
    ]
)


# =====================================================
# BLUEPRINTS
# =====================================================

from routes.auth import auth
from routes.upload import upload
from routes.dashboard import dashboard
from routes.chat import chat
from routes.goal import goals
from routes.investments import investments
from routes.loans import loans
from routes.tax import tax
from routes.rbi import rbi
from routes.news import news
from routes.progress import progress
from routes.user import user
from routes.budget import budget
from routes.transaction import transaction


app.register_blueprint(auth)
app.register_blueprint(upload)
app.register_blueprint(dashboard)
app.register_blueprint(chat)
app.register_blueprint(goals)
app.register_blueprint(investments)
app.register_blueprint(loans)
app.register_blueprint(tax)
app.register_blueprint(rbi)
app.register_blueprint(news)
app.register_blueprint(progress)
app.register_blueprint(user)
app.register_blueprint(budget)
app.register_blueprint(transaction)


# =====================================================
# HOME
# =====================================================

@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "success": True,
        "name": "Amivest AI",
        "message": "Backend Running Successfully"
    })


# =====================================================
# HEALTH
# =====================================================

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "success": True,
        "status": "healthy"
    })


# =====================================================
# OPTIONS / CORS PREFLIGHT
# =====================================================

@app.route("/<path:path>", methods=["OPTIONS"])
def handle_options(path):
    return "", 204


# =====================================================
# ERROR HANDLERS
# =====================================================

@app.errorhandler(404)
def not_found(error):
    return jsonify({
        "success": False,
        "error": "Not Found",
        "message": "Requested endpoint does not exist."
    }), 404


@app.errorhandler(500)
def server_error(error):
    return jsonify({
        "success": False,
        "error": "Internal Server Error",
        "message": "Internal server error."
    }), 500


# =====================================================
# RUN
# =====================================================

if __name__ == "__main__":

    # IMPORTANT:
    # 0.0.0.0 allows Render to access the Flask server.
    host = "0.0.0.0"

    # Render provides PORT automatically.
    # Local machine falls back to 5000.
    port = int(os.getenv("PORT", "5000"))

    app.run(
        host=host,
        port=port,
        debug=not IS_PRODUCTION
    )