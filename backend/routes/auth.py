from flask import Blueprint, request, jsonify, session
from database.db import get_connection
from werkzeug.security import generate_password_hash, check_password_hash

from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from datetime import datetime, timedelta
import os
import secrets
import hashlib
import smtplib
from email.message import EmailMessage


auth = Blueprint("auth", __name__)


# =========================================================
# HELPERS
# =========================================================

def create_otp():
    """
    Generate a secure 6-digit OTP.
    """
    return f"{secrets.randbelow(1000000):06d}"


def hash_otp(otp):
    """
    Hash OTP before storing it.
    """
    return hashlib.sha256(
        otp.encode("utf-8")
    ).hexdigest()


def send_otp_email(email, otp):
    """
    Send OTP using SMTP.

    Required environment variables:

    SMTP_HOST
    SMTP_PORT
    SMTP_EMAIL
    SMTP_PASSWORD
    """

    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_email = os.getenv("SMTP_EMAIL")
    smtp_password = os.getenv("SMTP_PASSWORD")

    if not smtp_host or not smtp_email or not smtp_password:
        raise Exception(
            "Email OTP is not configured on the server. "
            "Set SMTP_HOST, SMTP_PORT, SMTP_EMAIL and SMTP_PASSWORD."
        )

    message = EmailMessage()

    message["Subject"] = "Your Amivest AI Login OTP"
    message["From"] = smtp_email
    message["To"] = email

    message.set_content(
        f"""
Hello,

Your Amivest AI verification code is:

{otp}

This OTP is valid for 10 minutes.

If you did not request this code, you can safely ignore this email.

Regards,
Amivest AI Support
"""
    )

    with smtplib.SMTP(
        smtp_host,
        smtp_port
    ) as server:

        server.starttls()

        server.login(
            smtp_email,
            smtp_password
        )

        server.send_message(message)


def create_session(user):
    """
    Create Flask authentication session.
    """

    session.clear()

    session["user_id"] = int(user["id"])
    session["user_name"] = str(user["name"])
    session["user_email"] = str(user["email"])


def user_response(user):
    return {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"]
    }


# =========================================================
# REGISTER
# =========================================================

@auth.route("/register", methods=["POST"])
def register():

    conn = None
    cursor = None

    try:

        data = request.get_json(silent=True)

        if not data:
            return jsonify({
                "success": False,
                "message": "No registration data received."
            }), 400

        name = str(
            data.get("name", "")
        ).strip()

        email = str(
            data.get("email", "")
        ).strip().lower()

        password = str(
            data.get("password", "")
        )

        terms_accepted = bool(
            data.get("termsAccepted", False)
        )

        # -------------------------------------------------
        # VALIDATION
        # -------------------------------------------------

        if not name:
            return jsonify({
                "success": False,
                "message": "Name is required."
            }), 400

        if not email:
            return jsonify({
                "success": False,
                "message": "Email is required."
            }), 400

        if not password:
            return jsonify({
                "success": False,
                "message": "Password is required."
            }), 400

        if len(password) < 6:
            return jsonify({
                "success": False,
                "message": "Password must be at least 6 characters."
            }), 400

        if not terms_accepted:
            return jsonify({
                "success": False,
                "message": "You must accept the Terms & Conditions."
            }), 400

        # -------------------------------------------------
        # DATABASE
        # -------------------------------------------------

        conn = get_connection()

        if conn is None:
            return jsonify({
                "success": False,
                "message": "Database connection failed."
            }), 500

        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT id
            FROM users
            WHERE LOWER(email) = %s
            LIMIT 1
            """,
            (email,)
        )

        existing_user = cursor.fetchone()

        if existing_user:
            return jsonify({
                "success": False,
                "message": "Email already exists."
            }), 409

        # -------------------------------------------------
        # PASSWORD HASH
        # -------------------------------------------------

        password_hash = generate_password_hash(
            password,
            method="pbkdf2:sha256",
            salt_length=16
        )

        # -------------------------------------------------
        # CREATE USER
        # -------------------------------------------------

        cursor.execute(
            """
            INSERT INTO users
            (
                name,
                email,
                password
            )
            VALUES
            (
                %s,
                %s,
                %s
            )
            """,
            (
                name,
                email,
                password_hash
            )
        )

        conn.commit()

        user_id = cursor.lastrowid

        return jsonify({
            "success": True,
            "message": "Registration successful!",
            "user": {
                "id": user_id,
                "name": name,
                "email": email
            }
        }), 201

    except Exception as e:

        if conn:
            try:
                conn.rollback()
            except Exception:
                pass

        print("REGISTER ERROR:", e)

        return jsonify({
            "success": False,
            "message": str(e)
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


# =========================================================
# PASSWORD LOGIN
# =========================================================

@auth.route("/login", methods=["POST"])
def login():

    conn = None
    cursor = None

    try:

        data = request.get_json(silent=True)

        if not data:
            return jsonify({
                "success": False,
                "message": "No login data received."
            }), 400

        email = str(
            data.get("email", "")
        ).strip().lower()

        password = str(
            data.get("password", "")
        )

        if not email or not password:
            return jsonify({
                "success": False,
                "message": "Email and password are required."
            }), 400

        conn = get_connection()

        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                id,
                name,
                email,
                password
            FROM users
            WHERE LOWER(email) = %s
            LIMIT 1
            """,
            (email,)
        )

        user = cursor.fetchone()

        if not user:
            return jsonify({
                "success": False,
                "message": "Invalid email or password."
            }), 401

        stored_password = user.get("password")

        if not stored_password:
            return jsonify({
                "success": False,
                "message": "This account does not have password login. Use Google or OTP."
            }), 401

        if not check_password_hash(
            stored_password,
            password
        ):
            return jsonify({
                "success": False,
                "message": "Invalid email or password."
            }), 401

        create_session(user)

        return jsonify({
            "success": True,
            "message": "Login successful!",
            "user": user_response(user)
        }), 200

    except Exception as e:

        print("LOGIN ERROR:", e)

        return jsonify({
            "success": False,
            "message": str(e)
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


# =========================================================
# SEND OTP
# =========================================================

@auth.route("/send-otp", methods=["POST"])
def send_otp():

    conn = None
    cursor = None

    try:

        data = request.get_json(silent=True)

        email = str(
            (data or {}).get("email", "")
        ).strip().lower()

        if not email:
            return jsonify({
                "success": False,
                "message": "Email is required."
            }), 400

        conn = get_connection()

        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT id, name, email
            FROM users
            WHERE LOWER(email) = %s
            LIMIT 1
            """,
            (email,)
        )

        user = cursor.fetchone()

        # Do not reveal whether account exists.
        if not user:
            return jsonify({
                "success": True,
                "message": "If the email exists, an OTP has been sent."
            }), 200

        otp = create_otp()

        otp_hash = hash_otp(otp)

        expires_at = datetime.utcnow() + timedelta(
            minutes=10
        )

        cursor.execute(
            """
            UPDATE users
            SET
                otp_hash = %s,
                otp_expires_at = %s
            WHERE id = %s
            """,
            (
                otp_hash,
                expires_at,
                user["id"]
            )
        )

        conn.commit()

        send_otp_email(
            email,
            otp
        )

        return jsonify({
            "success": True,
            "message": "OTP sent to your email."
        }), 200

    except Exception as e:

        if conn:
            try:
                conn.rollback()
            except Exception:
                pass

        print("SEND OTP ERROR:", e)

        return jsonify({
            "success": False,
            "message": str(e)
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


# =========================================================
# VERIFY OTP
# =========================================================

@auth.route("/verify-otp", methods=["POST"])
def verify_otp():

    conn = None
    cursor = None

    try:

        data = request.get_json(silent=True)

        email = str(
            (data or {}).get("email", "")
        ).strip().lower()

        otp = str(
            (data or {}).get("otp", "")
        ).strip()

        if not email or not otp:
            return jsonify({
                "success": False,
                "message": "Email and OTP are required."
            }), 400

        conn = get_connection()

        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                id,
                name,
                email,
                otp_hash,
                otp_expires_at
            FROM users
            WHERE LOWER(email) = %s
            LIMIT 1
            """,
            (email,)
        )

        user = cursor.fetchone()

        if not user:
            return jsonify({
                "success": False,
                "message": "Invalid OTP."
            }), 401

        if not user["otp_hash"]:
            return jsonify({
                "success": False,
                "message": "No OTP requested."
            }), 401

        if not user["otp_expires_at"]:
            return jsonify({
                "success": False,
                "message": "OTP expired."
            }), 401

        if datetime.utcnow() > user["otp_expires_at"]:
            return jsonify({
                "success": False,
                "message": "OTP expired. Please request a new one."
            }), 401

        if hash_otp(otp) != user["otp_hash"]:
            return jsonify({
                "success": False,
                "message": "Invalid OTP."
            }), 401

        # -------------------------------------------------
        # CLEAR OTP AFTER SUCCESS
        # -------------------------------------------------

        cursor.execute(
            """
            UPDATE users
            SET
                otp_hash = NULL,
                otp_expires_at = NULL
            WHERE id = %s
            """,
            (user["id"],)
        )

        conn.commit()

        create_session(user)

        return jsonify({
            "success": True,
            "message": "OTP login successful!",
            "user": user_response(user)
        }), 200

    except Exception as e:

        print("VERIFY OTP ERROR:", e)

        return jsonify({
            "success": False,
            "message": str(e)
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


# =========================================================
# GOOGLE LOGIN
# =========================================================

@auth.route("/google-login", methods=["POST"])
def google_login():

    conn = None
    cursor = None

    try:

        data = request.get_json(silent=True)

        credential = str(
            (data or {}).get("credential", "")
        ).strip()

        if not credential:
            return jsonify({
                "success": False,
                "message": "Google credential is required."
            }), 400

        google_client_id = os.getenv(
            "GOOGLE_CLIENT_ID"
        )

        if not google_client_id:
            return jsonify({
                "success": False,
                "message": "Google login is not configured on the server."
            }), 500

        # -------------------------------------------------
        # VERIFY GOOGLE TOKEN
        # -------------------------------------------------

        google_user = id_token.verify_oauth2_token(
            credential,
            google_requests.Request(),
            google_client_id
        )

        google_id = google_user.get("sub")
        email = str(
            google_user.get("email", "")
        ).lower()

        name = (
            google_user.get("name")
            or email.split("@")[0]
        )

        if not google_id or not email:
            return jsonify({
                "success": False,
                "message": "Invalid Google account information."
            }), 401

        conn = get_connection()

        cursor = conn.cursor(dictionary=True)

        # -------------------------------------------------
        # FIND USER BY GOOGLE ID
        # -------------------------------------------------

        cursor.execute(
            """
            SELECT
                id,
                name,
                email,
                password,
                google_id
            FROM users
            WHERE google_id = %s
            LIMIT 1
            """,
            (google_id,)
        )

        user = cursor.fetchone()

        # -------------------------------------------------
        # IF NOT FOUND, FIND BY EMAIL
        # -------------------------------------------------

        if not user:

            cursor.execute(
                """
                SELECT
                    id,
                    name,
                    email,
                    password,
                    google_id
                FROM users
                WHERE LOWER(email) = %s
                LIMIT 1
                """,
                (email,)
            )

            user = cursor.fetchone()

        # -------------------------------------------------
        # CREATE OR LINK ACCOUNT
        # -------------------------------------------------

        if user:

            cursor.execute(
                """
                UPDATE users
                SET google_id = %s
                WHERE id = %s
                """,
                (
                    google_id,
                    user["id"]
                )
            )

            conn.commit()

            user["google_id"] = google_id

        else:

            cursor.execute(
                """
                INSERT INTO users
                (
                    name,
                    email,
                    password,
                    google_id
                )
                VALUES
                (
                    %s,
                    %s,
                    NULL,
                    %s
                )
                """,
                (
                    name,
                    email,
                    google_id
                )
            )

            conn.commit()

            user_id = cursor.lastrowid

            user = {
                "id": user_id,
                "name": name,
                "email": email
            }

        create_session(user)

        return jsonify({
            "success": True,
            "message": "Google login successful!",
            "user": user_response(user)
        }), 200

    except ValueError:

        return jsonify({
            "success": False,
            "message": "Invalid or expired Google credential."
        }), 401

    except Exception as e:

        if conn:
            try:
                conn.rollback()
            except Exception:
                pass

        print("GOOGLE LOGIN ERROR:", e)

        return jsonify({
            "success": False,
            "message": str(e)
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


# =========================================================
# SESSION
# =========================================================

@auth.route("/session", methods=["GET"])
def check_session():

    user_id = session.get("user_id")

    if not user_id:

        return jsonify({
            "success": True,
            "authenticated": False,
            "user": None
        }), 200

    return jsonify({
        "success": True,
        "authenticated": True,
        "user": {
            "id": session.get("user_id"),
            "name": session.get("user_name"),
            "email": session.get("user_email")
        }
    }), 200


# =========================================================
# CURRENT USER
# =========================================================

@auth.route("/me", methods=["GET"])
def me():

    user_id = session.get("user_id")

    if not user_id:

        return jsonify({
            "success": False,
            "authenticated": False,
            "message": "Authentication required."
        }), 401

    return jsonify({
        "success": True,
        "authenticated": True,
        "user": {
            "id": session.get("user_id"),
            "name": session.get("user_name"),
            "email": session.get("user_email")
        }
    }), 200


# =========================================================
# LOGOUT
# =========================================================

@auth.route("/logout", methods=["POST"])
def logout():

    old_user = session.get("user_id")

    session.clear()

    return jsonify({
        "success": True,
        "message": "Logout successful."
    }), 200