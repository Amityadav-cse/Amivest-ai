from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from pathlib import Path
import os

# =====================================================
# Load Environment Variables
# =====================================================
BASE_DIR = Path(__file__).resolve().parent
ENV_PATH = BASE_DIR / ".env"

load_dotenv(dotenv_path=ENV_PATH)

print("✅ .env loaded successfully")
print("📂 BASE_DIR:", BASE_DIR)
print("📄 ENV_PATH:", ENV_PATH)

if os.getenv("GROQ_API_KEY"):
    print("🔑 GROQ_API_KEY Loaded Successfully")
else:
    print("❌ GROQ_API_KEY Not Found")

# =====================================================
# Import Blueprints
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

from services.gemini_service import ask_financial_ai

# =====================================================
# Flask App
# =====================================================
app = Flask(__name__)

app.config["SECRET_KEY"] = os.getenv(
    "SECRET_KEY",
    "amivest_secret_key"
)

# =====================================================
# CORS
# =====================================================
CORS(
    app,
    supports_credentials=True,
    resources={r"/*": {"origins": "*"}}
)

# =====================================================
# Register Blueprints
# =====================================================
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
# Home
# =====================================================
@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "success": True,
        "name": "Amivest AI",
        "message": "Backend Running Successfully"
    })

# =====================================================
# Health Check
# =====================================================
@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "success": True,
        "status": "healthy"
    })

# =====================================================
# AI Test
# =====================================================
@app.route("/test-ai", methods=["GET"])
def test_ai():
    try:
        reply = ask_financial_ai(
            question="Say hello in one sentence.",
            context=""
        )

        return jsonify({
            "success": True,
            "reply": reply
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

# =====================================================
# 404 Handler
# =====================================================
@app.errorhandler(404)
def not_found(error):
    return jsonify({
        "success": False,
        "error": "Not Found",
        "message": "Requested endpoint does not exist."
    }), 404

# =====================================================
# 500 Handler
# =====================================================
@app.errorhandler(500)
def server_error(error):
    return jsonify({
        "success": False,
        "error": "Internal Server Error",
        "message": str(error)
    }), 500

# =====================================================
# Run Server
# =====================================================
if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )