from flask import Blueprint, request, jsonify
from database.db import get_connection

user = Blueprint("user", __name__)


@user.route("/user/me", methods=["GET"])
def me():
    try:
        user_id = request.args.get("user_id", 1)
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT id, name, email FROM users WHERE id = %s", (user_id,))
        row = cursor.fetchone()
        cursor.close()
        conn.close()

        if not row:
            return jsonify({"success": False, "error": "User not found."}), 404

        return jsonify({"success": True, "user": row})

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
