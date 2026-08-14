from flask import Blueprint, request, jsonify, session
from database.db import get_connection
from werkzeug.security import generate_password_hash, check_password_hash


auth = Blueprint("auth", __name__)


# =========================================================
# REGISTER
# =========================================================

@auth.route("/register", methods=["POST"])
def register():

    conn = None
    cursor = None

    try:
        data = request.get_json(silent=True)

        print("========================================")
        print("📝 REGISTER REQUEST")
        print("Data received:", bool(data))
        print("========================================")

        if not data:
            return jsonify({
                "success": False,
                "message": "No registration data received."
            }), 400

        name = str(data.get("name", "")).strip()
        email = str(data.get("email", "")).strip().lower()
        password = str(data.get("password", ""))

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

        # -------------------------------------------------
        # CHECK EMAIL
        # -------------------------------------------------

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
        #
        # PBKDF2 is explicitly selected because your
        # current Python environment doesn't support
        # hashlib.scrypt.
        # -------------------------------------------------

        password_hash = generate_password_hash(
            password,
            method="pbkdf2:sha256",
            salt_length=16
        )

        print("🔐 Password hash generated successfully.")

        # -------------------------------------------------
        # INSERT USER
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

        print("========================================")
        print("✅ USER CREATED")
        print(f"User ID: {user_id}")
        print(f"Name: {name}")
        print(f"Email: {email}")
        print("========================================")

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

        print("========================================")
        print("❌ REGISTER ERROR")
        print(str(e))
        print("========================================")

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
# LOGIN
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

        # -------------------------------------------------
        # FIND USER
        # -------------------------------------------------

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

            print(
                f"❌ LOGIN: User not found: {email}"
            )

            return jsonify({
                "success": False,
                "message": "Invalid email or password."
            }), 401

        stored_password = str(
            user["password"]
        )

        # -------------------------------------------------
        # VERIFY PASSWORD
        # -------------------------------------------------

        try:

            password_valid = check_password_hash(
                stored_password,
                password
            )

        except Exception as e:

            print(
                "❌ Password verification error:",
                str(e)
            )

            return jsonify({
                "success": False,
                "message": "Password format is not supported. Please register a new account."
            }), 401

        if not password_valid:

            print(
                f"❌ LOGIN: Wrong password for user #{user['id']}"
            )

            return jsonify({
                "success": False,
                "message": "Invalid email or password."
            }), 401

        # -------------------------------------------------
        # CREATE SESSION
        # -------------------------------------------------

        session.clear()

        session["user_id"] = int(user["id"])
        session["user_name"] = str(user["name"])
        session["user_email"] = str(user["email"])

        print("========================================")
        print("✅ LOGIN SUCCESS")
        print(f"User ID: {user['id']}")
        print(f"Name: {user['name']}")
        print(f"Email: {user['email']}")
        print("Session created.")
        print("========================================")

        return jsonify({
            "success": True,
            "message": "Login successful!",
            "user": {
                "id": user["id"],
                "name": user["name"],
                "email": user["email"]
            }
        }), 200

    except Exception as e:

        print("❌ LOGIN ERROR:", str(e))

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

    print(
        f"🚪 User {old_user} logged out."
    )

    return jsonify({
        "success": True,
        "message": "Logout successful."
    }), 200