# ============================================================
# AMIVEST AI - MAIN FLASK APPLICATION
# ============================================================

import os
import sys
import io
import json
import tempfile
import subprocess
import urllib.parse
import urllib.request
import traceback

from pathlib import Path

from flask import (
    Flask,
    jsonify,
    request,
    session,
    send_file,
)

from flask_cors import CORS
from dotenv import load_dotenv


# ============================================================
# LOAD ENVIRONMENT
# ============================================================

BASE_DIR = Path(__file__).resolve().parent

load_dotenv(BASE_DIR / ".env")


# ============================================================
# APPLICATION CONFIGURATION
# ============================================================

IS_PRODUCTION = (
    os.getenv("FLASK_ENV", "development").lower()
    == "production"
)

FRONTEND_URL = os.getenv(
    "FRONTEND_URL",
    "http://localhost:5173"
)

PORT = int(
    os.getenv(
        "PORT",
        "5000"
    )
)

SECRET_KEY = os.getenv(
    "SECRET_KEY",
    "amivest-development-secret-key"
)


# ============================================================
# CREATE FLASK APP
# ============================================================

app = Flask(__name__)

app.config["SECRET_KEY"] = SECRET_KEY

app.config["SESSION_COOKIE_NAME"] = os.getenv(
    "SESSION_COOKIE_NAME",
    "amivest_session"
)

app.config["SESSION_COOKIE_HTTPONLY"] = True

app.config["SESSION_COOKIE_SECURE"] = (
    IS_PRODUCTION
)

app.config["SESSION_COOKIE_SAMESITE"] = (
    "None"
    if IS_PRODUCTION
    else "Lax"
)

app.config["MAX_CONTENT_LENGTH"] = (
    50 * 1024 * 1024
)


# ============================================================
# CORS
# ============================================================

allowed_origins = [
    FRONTEND_URL,
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

# Remove empty values
allowed_origins = [
    origin
    for origin in allowed_origins
    if origin
]


CORS(
    app,
    supports_credentials=True,
    origins=allowed_origins,
)


# ============================================================
# DATABASE
# ============================================================

try:

    from database.db import database

except Exception:

    database = None

    print(
        "WARNING: database module could not be loaded:"
    )

    traceback.print_exc()


# ============================================================
# OPTIONAL DATABASE COMPATIBILITY
# ============================================================

def get_connection():

    if database is None:
        return None

    return database()


# ============================================================
# BLUEPRINT IMPORTS
# ============================================================

# ------------------------------------------------------------
# Authentication
# ------------------------------------------------------------

try:

    from routes.auth import auth

except Exception as e:

    auth = None

    print(
        "WARNING: auth could not be loaded:",
        e
    )


# ------------------------------------------------------------
# Upload
# ------------------------------------------------------------

try:

    from routes.upload import upload

except Exception as e:

    upload = None

    print(
        "WARNING: upload could not be loaded:",
        e
    )


# ------------------------------------------------------------
# Dashboard
# ------------------------------------------------------------

try:

    from routes.dashboard import dashboard

except Exception as e:

    dashboard = None

    print(
        "WARNING: dashboard could not be loaded:",
        e
    )


# ------------------------------------------------------------
# Chat
# ------------------------------------------------------------

try:

    from routes.chat import chat

except Exception as e:

    chat = None

    print(
        "WARNING: chat could not be loaded:",
        e
    )


# ------------------------------------------------------------
# Goals
# ------------------------------------------------------------

try:

    from routes.goal import goals

except Exception as e:

    goals = None

    print(
        "WARNING: goals could not be loaded:",
        e
    )


# ------------------------------------------------------------
# Investments
# ------------------------------------------------------------

try:

    from routes.investments import investments

except Exception as e:

    investments = None

    print(
        "WARNING: investments could not be loaded:",
        e
    )


# ------------------------------------------------------------
# Loans
# ------------------------------------------------------------

try:

    from routes.loans import loans

except Exception as e:

    loans = None

    print(
        "WARNING: loans could not be loaded:",
        e
    )


# ------------------------------------------------------------
# Tax
# ------------------------------------------------------------

try:

    from routes.tax import tax

except Exception as e:

    tax = None

    print(
        "WARNING: tax could not be loaded:",
        e
    )


# ------------------------------------------------------------
# RBI
# ------------------------------------------------------------

try:

    from routes.rbi import rbi

except Exception as e:

    rbi = None

    print(
        "WARNING: rbi could not be loaded:",
        e
    )


# ------------------------------------------------------------
# News
# ------------------------------------------------------------

try:

    from routes.news import news

except Exception as e:

    news = None

    print(
        "WARNING: news could not be loaded:",
        e
    )


# ------------------------------------------------------------
# Progress
# ------------------------------------------------------------

try:

    from routes.progress import progress

except Exception as e:

    progress = None

    print(
        "WARNING: progress could not be loaded:",
        e
    )


# ------------------------------------------------------------
# User
# ------------------------------------------------------------

try:

    from routes.user import user

except Exception as e:

    user = None

    print(
        "WARNING: user could not be loaded:",
        e
    )


# ------------------------------------------------------------
# Budget
# ------------------------------------------------------------

try:

    from routes.budget import budget

except Exception as e:

    budget = None

    print(
        "WARNING: budget could not be loaded:",
        e
    )


# ------------------------------------------------------------
# Transaction
# ------------------------------------------------------------

try:

    from routes.transaction import transaction

except Exception as e:

    transaction = None

    print(
        "WARNING: transaction could not be loaded:",
        e
    )


# ------------------------------------------------------------
# Vision
# ------------------------------------------------------------

try:

    from routes.vision import vision

except Exception as e:

    vision = None

    print(
        "WARNING: vision could not be loaded:",
        e
    )


# ------------------------------------------------------------
# Business
# ------------------------------------------------------------

try:

    from routes.business import business

except Exception as e:

    business = None

    print(
        "WARNING: business could not be loaded:",
        e
    )


# ------------------------------------------------------------
# Alexa
# ------------------------------------------------------------

try:

    from routes.alexa import alexa

except Exception as e:

    alexa = None

    print(
        "WARNING: alexa could not be loaded:",
        e
    )


# ------------------------------------------------------------
# Voice
# ------------------------------------------------------------

try:

    from routes.voice_api import voice_api

except Exception as e:

    voice_api = None

    print(
        "WARNING: voice_api could not be loaded:",
        e
    )


# ------------------------------------------------------------
# AmiRent Owner
# ------------------------------------------------------------

try:

    from routes.rent_owner import rent_owner

except Exception as e:

    rent_owner = None

    print(
        "WARNING: rent_owner could not be loaded:",
        e
    )


# ------------------------------------------------------------
# AmiRent Renter
# ------------------------------------------------------------

try:

    from routes.rent_renter import rent_renter

except Exception as e:

    rent_renter = None

    print(
        "WARNING: rent_renter could not be loaded:",
        e
    )


# ============================================================
# REGISTER BLUEPRINTS
# ============================================================

# IMPORTANT:
#
# Each blueprint is registered ONLY ONCE.
#
# This fixes:
#
# ValueError:
# The name 'rent_owner' is already registered
#
# ============================================================


if auth is not None:

    app.register_blueprint(
        auth
    )


if upload is not None:

    app.register_blueprint(
        upload
    )


if dashboard is not None:

    app.register_blueprint(
        dashboard
    )


if chat is not None:

    app.register_blueprint(
        chat
    )


if goals is not None:

    app.register_blueprint(
        goals
    )


if investments is not None:

    app.register_blueprint(
        investments
    )


if loans is not None:

    app.register_blueprint(
        loans
    )


if tax is not None:

    app.register_blueprint(
        tax
    )


if rbi is not None:

    app.register_blueprint(
        rbi
    )


if news is not None:

    app.register_blueprint(
        news
    )


if progress is not None:

    app.register_blueprint(
        progress
    )


if user is not None:

    app.register_blueprint(
        user
    )


if budget is not None:

    app.register_blueprint(
        budget
    )


if transaction is not None:

    app.register_blueprint(
        transaction
    )


if vision is not None:

    app.register_blueprint(
        vision
    )


if business is not None:

    app.register_blueprint(
        business
    )


# ============================================================
# AMIRENT OWNER
# ============================================================

if rent_owner is not None:

    app.register_blueprint(
        rent_owner
    )


# ============================================================
# AMIRENT RENTER
# ============================================================

if rent_renter is not None:

    app.register_blueprint(
        rent_renter
    )


# ============================================================
# ALEXA
# ============================================================

if alexa is not None:

    app.register_blueprint(
        alexa
    )


# ============================================================
# VOICE
# ============================================================

if voice_api is not None:

    app.register_blueprint(
        voice_api
    )


# ============================================================
# NOTIFICATION HELPERS
# ============================================================

def create_notification(
    user_id,
    notification_type,
    title,
    body,
    related_entity_type=None,
    related_entity_id=None,
):

    conn = None
    cursor = None

    try:

        conn = get_connection()

        if not conn:
            return False

        cursor = conn.cursor()

        cursor.execute(
            """
            INSERT INTO rent_notifications
            (
                user_id,
                type,
                title,
                body,
                related_entity_type,
                related_entity_id,
                is_read
            )
            VALUES
            (
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                0
            )
            """,
            (
                user_id,
                notification_type,
                title,
                body,
                related_entity_type,
                related_entity_id,
            )
        )

        conn.commit()

        return True

    except Exception:

        if conn:
            conn.rollback()

        traceback.print_exc()

        return False

    finally:

        if cursor:

            try:
                cursor.close()
            except Exception:
                pass

        if conn:

            try:
                conn.close()
            except Exception:
                pass


# ============================================================
# NOTIFICATIONS
# ============================================================

@app.route(
    "/api/notifications",
    methods=["GET"]
)
@app.route(
    "/notifications",
    methods=["GET"]
)
def notifications():

    # Use ONLY the server-side Flask session for identity.
    # Ignore any user_id sent in the query string.
    user_id = session.get("user_id")

    # Helpful server-side diagnostic. Do not log cookies or secrets.
    print(
        "NOTIFICATIONS AUTH CHECK:",
        {
            "authenticated": bool(user_id),
            "user_id": user_id,
            "session_cookie_name": app.config.get("SESSION_COOKIE_NAME"),
        }
    )

    if user_id is None or str(user_id).strip() == "":
        return jsonify({
            "success": False,
            "authenticated": False,
            "notifications": [],
            "error": "Login required."
        }), 401

    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        return jsonify({
            "success": False,
            "authenticated": False,
            "notifications": [],
            "error": "Invalid session user."
        }), 401

    conn = None
    cursor = None

    try:

        conn = get_connection()

        if not conn:

            return jsonify({
                "success": False,
                "notifications": [],
                "error": "Database unavailable."
            }), 500

        cursor = conn.cursor(
            dictionary=True
        )

        cursor.execute(
            """
            SELECT
                id,
                user_id,
                type,
                title,
                body,
                related_entity_type,
                related_entity_id,
                is_read,
                created_at
            FROM rent_notifications
            WHERE user_id = %s
            ORDER BY created_at DESC
            LIMIT 100
            """,
            (
                user_id,
            )
        )

        rows = cursor.fetchall() or []

        return jsonify({
            "success": True,
            "notifications": rows
        }), 200

    except Exception as e:

        traceback.print_exc()

        return jsonify({
            "success": False,
            "notifications": [],
            "error": str(e)
        }), 500

    finally:

        if cursor:

            try:
                cursor.close()
            except Exception:
                pass

        if conn:

            try:
                conn.close()
            except Exception:
                pass


# ============================================================
# MARK ALL NOTIFICATIONS READ
# ============================================================

@app.route(
    "/api/notifications/read-all",
    methods=["POST"]
)
@app.route(
    "/notifications/read-all",
    methods=["POST"]
)
def mark_all_notifications_read():

    user_id = session.get(
        "user_id"
    )

    if not user_id:

        return jsonify({
            "success": False,
            "error": "Login required."
        }), 401

    conn = None
    cursor = None

    try:

        conn = get_connection()

        if not conn:

            return jsonify({
                "success": False,
                "error": "Database unavailable."
            }), 500

        cursor = conn.cursor()

        cursor.execute(
            """
            UPDATE rent_notifications
            SET is_read = TRUE
            WHERE user_id = %s
            """,
            (
                user_id,
            )
        )

        conn.commit()

        return jsonify({
            "success": True,
            "message":
                "All notifications marked as read"
        }), 200

    except Exception as e:

        if conn:
            conn.rollback()

        traceback.print_exc()

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

    finally:

        if cursor:

            try:
                cursor.close()
            except Exception:
                pass

        if conn:

            try:
                conn.close()
            except Exception:
                pass


# ============================================================
# MARK SINGLE NOTIFICATION READ
# ============================================================

@app.route(
    "/api/notifications/<int:notification_id>/read",
    methods=["POST"]
)
@app.route(
    "/notifications/<int:notification_id>/read",
    methods=["POST"]
)
def mark_notification_read(
    notification_id
):

    user_id = session.get(
        "user_id"
    )

    if not user_id:

        return jsonify({
            "success": False,
            "error": "Login required."
        }), 401

    conn = None
    cursor = None

    try:

        conn = get_connection()

        if not conn:

            return jsonify({
                "success": False,
                "error": "Database unavailable."
            }), 500

        cursor = conn.cursor()

        cursor.execute(
            """
            UPDATE rent_notifications
            SET is_read = TRUE
            WHERE id = %s
              AND user_id = %s
            """,
            (
                notification_id,
                user_id,
            )
        )

        conn.commit()

        if cursor.rowcount == 0:

            return jsonify({
                "success": False,
                "error":
                    "Notification not found."
            }), 404

        return jsonify({
            "success": True,
            "message":
                "Notification marked as read."
        }), 200

    except Exception as e:

        if conn:
            conn.rollback()

        traceback.print_exc()

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

    finally:

        if cursor:

            try:
                cursor.close()
            except Exception:
                pass

        if conn:

            try:
                conn.close()
            except Exception:
                pass


# ============================================================
# DEBUG ROUTES
# ============================================================

@app.route(
    "/debug-routes",
    methods=["GET"]
)
def debug_routes():

    routes = []

    for rule in app.url_map.iter_rules():

        if any(
            key in rule.rule
            for key in [
                "/chat",
                "/alexa",
                "/vision",
                "/business",
                "/dashboard",
                "/rent",
                "/notifications"
            ]
        ):

            routes.append({
                "rule":
                    rule.rule,

                "methods":
                    sorted(
                        method
                        for method in rule.methods
                        if method not in {
                            "HEAD",
                            "OPTIONS"
                        }
                    ),
            })

    return jsonify({
        "success": True,
        "routes": routes
    }), 200


# ============================================================
# HOME
# ============================================================

@app.route(
    "/",
    methods=["GET"]
)
def home():

    return jsonify({

        "success": True,

        "name":
            "Amivest AI",

        "message":
            "Backend Running Successfully",

        "environment":
            (
                "production"
                if IS_PRODUCTION
                else "development"
            ),

        "authenticated":
            bool(
                session.get(
                    "user_id"
                )
            ),

        "modules": {

            "finance":
                True,

            "business":
                business is not None,

            "alexa":
                alexa is not None,

            "voice":
                voice_api is not None,

            "vision":
                vision is not None,

            "rent_owner":
                rent_owner is not None,

            "rent_renter":
                rent_renter is not None,

        },

    })


# ============================================================
# HEALTH
# ============================================================

@app.route(
    "/health",
    methods=["GET"]
)
def health():

    return jsonify({

        "success": True,

        "status":
            "healthy",

        "database":
            database is not None,

        "modules": {

            "auth":
                auth is not None,

            "dashboard":
                dashboard is not None,

            "chat":
                chat is not None,

            "business":
                business is not None,

            "vision":
                vision is not None,

            "alexa":
                alexa is not None,

            "voice":
                voice_api is not None,

            "rent_owner":
                rent_owner is not None,

            "rent_renter":
                rent_renter is not None,

        },

    }), 200


# ============================================================
# AMIVEST MODES
# ============================================================

@app.route(
    "/api/app/modes",
    methods=["GET"]
)
def app_modes():

    return jsonify({

        "success": True,

        "active_modes": [

            {
                "id":
                    "finance",

                "name":
                    "AmiVest Finance",

                "path":
                    "/dashboard",

                "icon":
                    "💰",

                "status":
                    "ready",
            },

            {
                "id":
                    "rent",

                "name":
                    "AmiRent",

                "path":
                    "/rent",

                "icon":
                    "🏠",

                "status":
                    (
                        "ready"
                        if (
                            rent_owner is not None
                            or
                            rent_renter is not None
                        )
                        else
                        "planned"
                    ),

                "roles": [

                    {
                        "id":
                            "owner",

                        "name":
                            "Property Owner",

                        "path":
                            "/rent/owner",
                    },

                    {
                        "id":
                            "renter",

                        "name":
                            "Renter",

                        "path":
                            "/rent/renter",
                    },

                ],
            },

            {
                "id":
                    "business",

                "name":
                    "AmiVest Business",

                "path":
                    "/business",

                "icon":
                    "🏪",

                "status":
                    "ready",
            },

        ],

    }), 200


# ============================================================
# CURRENT USER
# ============================================================

@app.route(
    "/api/current-user",
    methods=["GET"]
)
def current_user():

    user_id = session.get(
        "user_id"
    )

    if not user_id:

        return jsonify({

            "success":
                False,

            "authenticated":
                False,

            "user":
                None,

        }), 401

    conn = None
    cursor = None

    try:

        conn = get_connection()

        if not conn:

            return jsonify({

                "success":
                    True,

                "authenticated":
                    True,

                "user": {

                    "id":
                        user_id,

                    "name":
                        session.get(
                            "user_name"
                        ),

                    "email":
                        session.get(
                            "user_email"
                        ),

                },

            }), 200

        cursor = conn.cursor(
            dictionary=True
        )

        cursor.execute(
            """
            SELECT
                id,
                name,
                email
            FROM users
            WHERE id = %s
            LIMIT 1
            """,
            (
                user_id,
            )
        )

        user = cursor.fetchone()

        if not user:

            return jsonify({

                "success":
                    False,

                "authenticated":
                    False,

                "user":
                    None,

                "error":
                    "User not found."

            }), 401

        return jsonify({

            "success":
                True,

            "authenticated":
                True,

            "user":
                user,

        }), 200

    except Exception as e:

        traceback.print_exc()

        return jsonify({

            "success":
                True,

            "authenticated":
                True,

            "user": {

                "id":
                    user_id,

                "name":
                    session.get(
                        "user_name"
                    ),

                "email":
                    session.get(
                        "user_email"
                    ),

            },

            "warning":
                str(e),

        }), 200

    finally:

        if cursor:

            try:
                cursor.close()
            except Exception:
                pass

        if conn:

            try:
                conn.close()
            except Exception:
                pass


# ============================================================
# SESSION CHECK
# ============================================================

@app.route(
    "/session-check",
    methods=["GET"]
)
def session_check():

    user_id = session.get(
        "user_id"
    )

    if not user_id:

        return jsonify({

            "success":
                False,

            "authenticated":
                False,

            "error":
                "No user_id found in Flask session."

        }), 401

    return jsonify({

        "success":
            True,

        "authenticated":
            True,

        "user_id":
            user_id,

        "name":
            session.get(
                "user_name"
            ),

        "email":
            session.get(
                "user_email"
            ),

    }), 200


# ============================================================
# DEBUG SESSION
# ============================================================

@app.route(
    "/debug-session",
    methods=["GET"]
)
def debug_session():

    return jsonify({

        "success":
            True,

        "authenticated":
            bool(
                session.get(
                    "user_id"
                )
            ),

        "user_id":
            session.get(
                "user_id"
            ),

        "user_name":
            session.get(
                "user_name"
            ),

        "user_email":
            session.get(
                "user_email"
            ),

        "cookie_name":
            app.config[
                "SESSION_COOKIE_NAME"
            ],

        "cookie_secure":
            app.config[
                "SESSION_COOKIE_SECURE"
            ],

        "cookie_samesite":
            app.config[
                "SESSION_COOKIE_SAMESITE"
            ],

    })


# ============================================================
# ALEXA STATUS
# ============================================================

@app.route(
    "/api/alexa/status",
    methods=["GET"]
)
def alexa_status():

    return jsonify({

        "success":
            True,

        "service":
            "AmiVest Alexa Pro",

        "status":
            (
                "ready"
                if alexa is not None
                else "disabled"
            ),

        "authenticated":
            bool(
                session.get(
                    "user_id"
                )
            ),

        "user_id":
            session.get(
                "user_id"
            ),

    }), 200


# ============================================================
# TTS
# ============================================================

@app.route(
    "/api/tts",
    methods=["POST"]
)
def native_tts():

    temp_dir = None

    try:

        data = request.get_json(
            silent=True
        ) or {}

        text = str(
            data.get(
                "text",
                ""
            )
        ).strip()

        language = str(
            data.get(
                "language",
                "en"
            )
        ).strip()

        if not text:

            return jsonify({

                "success":
                    False,

                "error":
                    "Text is required"

            }), 400

        # Clean markdown
        text = (
            text
            .replace("**", "")
            .replace("__", "")
            .replace("`", "")
            .replace("#", "")
            .strip()
        )

        text = text[:2000]

        # ====================================================
        # MACOS TTS
        # ====================================================

        if sys.platform == "darwin":

            temp_dir = tempfile.mkdtemp(
                prefix="amivest_tts_"
            )

            aiff_path = os.path.join(
                temp_dir,
                "speech.aiff"
            )

            wav_path = os.path.join(
                temp_dir,
                "speech.wav"
            )

            voice = (
                "Aarti"
                if language == "hi"
                else "Samantha"
            )

            say_cmd = [

                "say",

                "-o",
                aiff_path,

                "-v",
                voice,

                text,

            ]

            result = subprocess.run(

                say_cmd,

                capture_output=True,

                text=True,

                timeout=10,

            )

            # Fallback to default voice
            if result.returncode != 0:

                say_cmd = [

                    "say",

                    "-o",
                    aiff_path,

                    text,

                ]

                result = subprocess.run(

                    say_cmd,

                    capture_output=True,

                    text=True,

                    timeout=10,

                )

            if (
                result.returncode == 0
                and
                os.path.exists(
                    aiff_path
                )
            ):

                convert = subprocess.run(

                    [

                        "afconvert",

                        "-f",
                        "WAVE",

                        "-d",
                        "LEI16@22050",

                        aiff_path,

                        wav_path,

                    ],

                    capture_output=True,

                    text=True,

                    timeout=10,

                )

                if (
                    convert.returncode == 0
                    and
                    os.path.exists(
                        wav_path
                    )
                ):

                    response = send_file(

                        wav_path,

                        mimetype=
                            "audio/wav",

                        as_attachment=False,

                        download_name=
                            "amivest-speech.wav",

                        max_age=0,

                    )

                    @response.call_on_close
                    def cleanup():

                        import shutil

                        try:

                            if (
                                temp_dir
                                and
                                os.path.exists(
                                    temp_dir
                                )
                            ):

                                shutil.rmtree(
                                    temp_dir,
                                    ignore_errors=True
                                )

                        except Exception:

                            pass

                    return response

        # ====================================================
        # GOOGLE TTS FALLBACK
        # ====================================================

        lang_code = (
            "hi"
            if language == "hi"
            else "en"
        )

        encoded_text = urllib.parse.quote(
            text
        )

        google_tts_url = (

            "https://translate.google.com/"
            "translate_tts"
            f"?ie=UTF-8"
            f"&q={encoded_text}"
            f"&tl={lang_code}"
            f"&client=tw-ob"

        )

        req = urllib.request.Request(

            google_tts_url,

            headers={

                "User-Agent":
                    "Mozilla/5.0"

            }

        )

        with urllib.request.urlopen(

            req,

            timeout=10

        ) as resp:

            audio_bytes = resp.read()

        return send_file(

            io.BytesIO(
                audio_bytes
            ),

            mimetype=
                "audio/mpeg",

            as_attachment=False,

            download_name=
                "amivest-speech.mp3",

            max_age=0,

        )

    except Exception as e:

        traceback.print_exc()

        return jsonify({

            "success":
                False,

            "error":
                f"TTS synthesis failed: {str(e)}"

        }), 500


# ============================================================
# AMIRENT DATA OWNERSHIP CHECK
# ============================================================

@app.route(
    "/api/rent/me",
    methods=["GET"]
)
def rent_me():

    user_id = session.get(
        "user_id"
    )

    if not user_id:

        return jsonify({

            "success":
                False,

            "authenticated":
                False,

            "error":
                "Login required."

        }), 401

    conn = None
    cursor = None

    try:

        conn = get_connection()

        if not conn:

            return jsonify({

                "success":
                    False,

                "error":
                    "Database unavailable."

            }), 500

        cursor = conn.cursor(
            dictionary=True
        )

        # ----------------------------------------------------
        # Owner profile
        # ----------------------------------------------------

        cursor.execute(

            """
            SELECT
                id,
                user_id,
                full_name,
                primary_mobile,
                secondary_mobile,
                email,
                phone_verified,
                identity_status,
                status,
                created_at,
                updated_at
            FROM rent_owners
            WHERE user_id = %s
            LIMIT 1
            """,

            (
                user_id,
            )

        )

        owner = cursor.fetchone()

        # ----------------------------------------------------
        # Count owner's properties
        # ----------------------------------------------------

        property_count = 0
        room_count = 0

        if owner:

            cursor.execute(

                """
                SELECT COUNT(*) AS total
                FROM rent_properties
                WHERE owner_id = %s
                """,

                (
                    owner["id"],
                )

            )

            row = cursor.fetchone()

            property_count = (
                row["total"]
                if row
                else 0
            )

            cursor.execute(

                """
                SELECT COUNT(*) AS total
                FROM rent_rooms r
                INNER JOIN rent_properties p
                    ON p.id = r.property_id
                WHERE p.owner_id = %s
                """,

                (
                    owner["id"],
                )

            )

            row = cursor.fetchone()

            room_count = (
                row["total"]
                if row
                else 0
            )

        return jsonify({

            "success":
                True,

            "user_id":
                user_id,

            "owner":
                owner,

            "summary": {

                "properties":
                    property_count,

                "rooms":
                    room_count,

            },

        }), 200

    except Exception as e:

        traceback.print_exc()

        return jsonify({

            "success":
                False,

            "error":
                str(e)

        }), 500

    finally:

        if cursor:

            try:
                cursor.close()
            except Exception:
                pass

        if conn:

            try:
                conn.close()
            except Exception:
                pass


# ============================================================
# 404
# ============================================================

@app.errorhandler(404)
def not_found(error):

    return jsonify({

        "success":
            False,

        "error":
            "Not Found",

        "message":
            "Requested endpoint does not exist.",

        "path":
            request.path,

    }), 404


# ============================================================
# 405
# ============================================================

@app.errorhandler(405)
def method_not_allowed(error):

    return jsonify({

        "success":
            False,

        "error":
            "Method Not Allowed",

        "message":
            "HTTP method not allowed for this endpoint.",

        "method":
            request.method,

        "path":
            request.path,

    }), 405


# ============================================================
# 413
# ============================================================

@app.errorhandler(413)
def request_too_large(error):

    return jsonify({

        "success":
            False,

        "error":
            "File too large",

        "message":
            "Maximum request size is 50 MB."

    }), 413


# ============================================================
# 500
# ============================================================

@app.errorhandler(500)
def server_error(error):

    traceback.print_exc()

    return jsonify({

        "success":
            False,

        "error":
            "Internal Server Error",

        "message":
            "Internal server error occurred."

    }), 500


# ============================================================
# RUN SERVER
# ============================================================

if __name__ == "__main__":

    host = "0.0.0.0"

    print(
        "\n========================================"
    )

    print(
        "          AMIVEST AI BACKEND"
    )

    print(
        "========================================"
    )

    print(
        "Environment : "
        +
        (
            "PRODUCTION"
            if IS_PRODUCTION
            else "LOCAL"
        )
    )

    print(
        f"Port        : {PORT}"
    )

    print(
        f"Frontend    : {FRONTEND_URL}"
    )

    print(
        "Database    : "
        +
        (
            "ENABLED"
            if database is not None
            else "DISABLED"
        )
    )

    print(
        "Business    : "
        +
        (
            "ENABLED"
            if business is not None
            else "DISABLED"
        )
    )

    print(
        "Vision      : "
        +
        (
            "ENABLED"
            if vision is not None
            else "DISABLED"
        )
    )

    print(
        "Alexa       : "
        +
        (
            "ENABLED"
            if alexa is not None
            else "DISABLED"
        )
    )

    print(
        "Voice       : "
        +
        (
            "ENABLED"
            if voice_api is not None
            else "DISABLED"
        )
    )

    print(
        "Rent Owner  : "
        +
        (
            "ENABLED"
            if rent_owner is not None
            else "DISABLED"
        )
    )

    print(
        "Rent Renter : "
        +
        (
            "ENABLED"
            if rent_renter is not None
            else "DISABLED"
        )
    )

    print(
        "========================================\n"
    )

    app.run(

        host=host,

        port=PORT,

        debug=not IS_PRODUCTION,

    )