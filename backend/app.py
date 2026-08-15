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

# HTTPS is used on Render/Vercel
app.config["SESSION_COOKIE_SECURE"] = True

# Needed for frontend -> backend requests
app.config["SESSION_COOKIE_SAMESITE"] = "None"


# =====================================================
# CORS
# =====================================================

CORS(
    app,
    resources={
        r"/*": {
            "origins": [
                # Vercel production
                "https://amivest-ai-iota.vercel.app",

                # Local development
                "http://127.0.0.1:5173",
                "http://127.0.0.1:5174",
                "http://localhost:5173",
                "http://localhost:5174"
            ]
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
        "Authorization"
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

@app.route("/")
def home():

    return jsonify({
        "success": True,
        "name": "Amivest AI",
        "message": "Backend Running Successfully"
    })


# =====================================================
# HEALTH
# =====================================================

@app.route("/health")
def health():

    return jsonify({
        "success": True,
        "status": "healthy"
    })


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
        "message": str(error)
    }), 500


# =====================================================
# RUN
# =====================================================

if __name__ == "__main__":

    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )