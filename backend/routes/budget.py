from flask import Blueprint, request, jsonify
from datetime import date
from database.db import get_connection

budget = Blueprint("budget", __name__)


@budget.route("/budget/limits", methods=["GET"])
def list_limits():
    """
    For each category limit the user has set, computes REAL spend this
    calendar month from their actual imported transactions — not an
    estimate, an exact sum against real data.
    """
    try:
        user_id = request.args.get("user_id", 1)
        today = date.today()
        month_start = today.replace(day=1)

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT id, category, monthly_limit FROM spending_limits WHERE user_id = %s", (user_id,))
        limits = cursor.fetchall()

        results = []
        for limit in limits:
            cursor.execute("""
                SELECT IFNULL(SUM(ABS(amount)), 0) AS spent
                FROM transactions
                WHERE user_id = %s
                  AND category = %s
                  AND amount < 0
                  AND transaction_date >= %s
            """, (user_id, limit["category"], month_start))
            spent = float(cursor.fetchone()["spent"])
            monthly_limit = float(limit["monthly_limit"])
            pct = (spent / monthly_limit * 100) if monthly_limit > 0 else 0
            exceeded = spent > monthly_limit

            alert = None
            if exceeded:
                over_by = spent - monthly_limit
                alert = (
                    f"You've gone over your ₹{monthly_limit:,.0f} {limit['category']} budget by "
                    f"₹{over_by:,.0f} this month (spent ₹{spent:,.0f} so far)."
                )
            elif pct >= 80:
                remaining = monthly_limit - spent
                alert = (
                    f"Heads up — you've used {pct:.0f}% of your {limit['category']} budget. "
                    f"₹{remaining:,.0f} left for the rest of the month."
                )

            results.append({
                "id": limit["id"],
                "category": limit["category"],
                "monthly_limit": monthly_limit,
                "spent_this_month": round(spent, 2),
                "percent_used": round(min(999, pct), 1),
                "exceeded": exceeded,
                "alert": alert,
            })

        cursor.close()
        conn.close()

        return jsonify({"success": True, "limits": results})

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@budget.route("/budget/limits", methods=["POST"])
def set_limit():
    try:
        data = request.json
        user_id = data.get("user_id", 1)
        category = data.get("category")
        monthly_limit = float(data.get("monthly_limit", 0))

        if not category or monthly_limit <= 0:
            return jsonify({"success": False, "error": "Category and a positive monthly limit are required."}), 400

        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO spending_limits (user_id, category, monthly_limit)
            VALUES (%s, %s, %s)
            ON DUPLICATE KEY UPDATE monthly_limit = VALUES(monthly_limit)
        """, (user_id, category, monthly_limit))
        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({"success": True, "message": "Budget limit saved."})

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@budget.route("/budget/limits/<int:limit_id>", methods=["DELETE"])
def delete_limit(limit_id):
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM spending_limits WHERE id = %s", (limit_id,))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({"success": True})

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@budget.route("/budget/categories", methods=["GET"])
def known_categories():
    """Real category names pulled from the user's own transaction history,
    so the dropdown matches categories that actually exist in their data."""
    try:
        user_id = request.args.get("user_id", 1)
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT DISTINCT category FROM transactions
            WHERE user_id = %s AND category IS NOT NULL AND amount < 0
            ORDER BY category
        """, (user_id,))
        categories = [row["category"] for row in cursor.fetchall()]
        cursor.close()
        conn.close()
        return jsonify({"success": True, "categories": categories})

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
