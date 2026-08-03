from flask import Blueprint, request, jsonify
from database.db import get_connection

auth = Blueprint("auth", __name__)

# ---------------- REGISTER ---------------- #

@auth.route("/register", methods=["POST"])

def register():
    try:
        data = request.get_json()

        name = data["name"]
        email = data["email"]
        password = data["password"]

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        # Check if email already exists
        cursor.execute(
            "SELECT * FROM users WHERE email=%s",
            (email,)
        )

        user = cursor.fetchone()

        if user:
            cursor.close()
            conn.close()
            return jsonify({
                "success": False,
                "message": "Email already exists!"
            }), 400

        # Insert user
        cursor.execute(
            """
            INSERT INTO users(name,email,password)
            VALUES(%s,%s,%s)
            """,
            (name, email, password)
        )

        conn.commit()

        cursor.close()
        conn.close()

        return jsonify({
            "success": True,
            "message": "Registration Successful!"
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500


# ---------------- LOGIN ---------------- #

@auth.route("/login", methods=["POST"])
def login():

    try:
        data = request.get_json()

        email = data["email"]
        password = data["password"]

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT * FROM users
            WHERE email=%s AND password=%s
            """,
            (email, password)
        )

        user = cursor.fetchone()

        cursor.close()
        conn.close()

        if user:
            return jsonify({
                "success": True,
                "message": "Login Successful!",
                "user": {
                    "id": user["id"],
                    "name": user["name"],
                    "email": user["email"]
                }
            })

        return jsonify({
            "success": False,
            "message": "Invalid Email or Password"
        }), 401

    except Exception as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500