from flask import Blueprint, request, jsonify, session
from datetime import datetime
from services.gemini_service import ask_financial_ai
from database.db import get_connection

goals = Blueprint("goals", __name__)


# ===================================================
# AUTH HELPER
# ===================================================

def _require_user():
    user_id = session.get("user_id")

    if not user_id:
        return None, (
            jsonify({
                "success": False,
                "error": "Authentication required."
            }),
            401
        )

    return int(user_id), None


# ===================================================
# GET /goals
# ===================================================

@goals.route("/goals", methods=["GET"])
def list_goals():

    try:
        user_id, auth_error = _require_user()

        if auth_error:
            return auth_error

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                id,
                goal_name,
                category,
                target_amount,
                current_saved,
                target_date,
                monthly_saving,
                status,
                created_at
            FROM goals
            WHERE user_id = %s
            ORDER BY created_at DESC
        """, (user_id,))

        rows = cursor.fetchall()

        cursor.close()
        conn.close()

        for r in rows:

            if r.get("target_date"):
                r["target_date"] = str(r["target_date"])

            if r.get("created_at"):
                r["created_at"] = str(r["created_at"])

            r["target_amount"] = float(
                r["target_amount"] or 0
            )

            r["current_saved"] = float(
                r["current_saved"] or 0
            )

            r["monthly_saving"] = float(
                r["monthly_saving"] or 0
            )

        return jsonify({
            "success": True,
            "goals": rows
        })

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# ===================================================
# POST /goals
# ===================================================

@goals.route("/goals", methods=["POST"])
def create_goal():

    try:

        data = request.json or {}

        user_id, auth_error = _require_user()

        if auth_error:
            return auth_error

        goal_name = data.get("goal_name")
        category = data.get("category")

        target_amount = float(
            data.get("target_amount", 0)
        )

        target_date = data.get("target_date")

        monthly_saving = float(
            data.get("monthly_saving", 0) or 0
        )

        if not goal_name or not target_amount or not target_date:

            return jsonify({
                "success": False,
                "error": "goal_name, target_amount and target_date are required."
            }), 400

        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO goals
            (
                user_id,
                goal_name,
                category,
                target_amount,
                current_saved,
                target_date,
                monthly_saving,
                status,
                created_at
            )
            VALUES (%s, %s, %s, %s, 0, %s, %s, 'Active', %s)
        """, (
            user_id,
            goal_name,
            category,
            target_amount,
            target_date,
            monthly_saving,
            datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        ))

        conn.commit()

        new_id = cursor.lastrowid

        cursor.close()
        conn.close()

        return jsonify({
            "success": True,
            "id": new_id,
            "message": "Goal created."
        })

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# ===================================================
# POST /goals/<id>/add-money
# ===================================================

@goals.route("/goals/<int:goal_id>/add-money", methods=["POST"])
def add_money(goal_id):

    try:

        data = request.json or {}

        amount = float(
            data.get("amount", 0)
        )

        if amount <= 0:

            return jsonify({
                "success": False,
                "error": "Amount must be greater than 0."
            }), 400

        user_id, auth_error = _require_user()

        if auth_error:
            return auth_error

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT target_amount, current_saved
            FROM goals
            WHERE id = %s
              AND user_id = %s
        """, (
            goal_id,
            user_id
        ))

        goal = cursor.fetchone()

        if not goal:

            cursor.close()
            conn.close()

            return jsonify({
                "success": False,
                "error": "Goal not found."
            }), 404

        new_saved = (
            float(goal["current_saved"] or 0)
            + amount
        )

        new_status = (
            "Completed"
            if new_saved >= float(goal["target_amount"])
            else "Active"
        )

        cursor.execute("""
            UPDATE goals
            SET
                current_saved = %s,
                status = %s
            WHERE id = %s
              AND user_id = %s
        """, (
            new_saved,
            new_status,
            goal_id,
            user_id
        ))

        conn.commit()

        cursor.close()
        conn.close()

        return jsonify({
            "success": True,
            "current_saved": new_saved,
            "status": new_status
        })

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500