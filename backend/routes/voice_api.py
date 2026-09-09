from flask import Blueprint, request, jsonify
from database.db import get_connection
import traceback

voice_api = Blueprint("voice_api", __name__)

def db_query(query, params=(), fetchone=False, fetchall=False, commit=False):
    conn = get_connection()
    if not conn:
        raise Exception("Database connection unavailable.")
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(query, params)
        if commit:
            conn.commit()
            last_id = cursor.lastrowid
            cursor.close()
            conn.close()
            return last_id
        if fetchone:
            res = cursor.fetchone()
            cursor.close()
            conn.close()
            return res
        if fetchall:
            res = cursor.fetchall() or []
            cursor.close()
            conn.close()
            return res
        cursor.close()
        conn.close()
        return True
    except Exception as e:
        if conn:
            conn.close()
        raise e

# =====================================================================
# 1. TRANSACTIONS (CRUD + BULK DELETION)
# =====================================================================
@voice_api.route("/api/voice/transactions", methods=["GET"])
def get_user_transactions():
    user_id = request.args.get("user_id")
    if not user_id:
        return jsonify({"success": False, "error": "user_id is required"}), 400
    try:
        rows = db_query(
            "SELECT id, type, category, amount, description, transaction_date FROM transactions WHERE user_id=%s ORDER BY transaction_date DESC, id DESC LIMIT 20",
            (user_id,), fetchall=True
        )
        return jsonify({"success": True, "transactions": rows}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@voice_api.route("/api/voice/transactions", methods=["POST"])
def add_user_transaction():
    data = request.get_json() or {}
    user_id = data.get("user_id")
    if not user_id:
        return jsonify({"success": False, "error": "user_id is required"}), 400
    try:
        new_id = db_query(
            "INSERT INTO transactions (user_id, type, category, amount, description, transaction_date) VALUES (%s, %s, %s, %s, %s, %s)",
            (user_id, data.get("type", "debit"), data.get("category", "General"), data.get("amount", 0), data.get("description", "Voice Entry"), data.get("transaction_date")),
            commit=True
        )
        return jsonify({"success": True, "id": new_id, "message": "Transaction recorded"}), 201
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@voice_api.route("/api/voice/transactions/all", methods=["DELETE"])
def delete_all_transactions():
    user_id = request.args.get("user_id")
    if not user_id:
        return jsonify({"success": False, "error": "user_id is required"}), 400
    try:
        db_query("DELETE FROM transactions WHERE user_id=%s", (user_id,), commit=True)
        return jsonify({"success": True, "message": "All transactions have been deleted."}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@voice_api.route("/api/voice/transactions/<int:tx_id>", methods=["DELETE"])
def delete_user_transaction(tx_id):
    user_id = request.args.get("user_id")
    if not user_id:
        return jsonify({"success": False, "error": "user_id is required"}), 400
    try:
        db_query("DELETE FROM transactions WHERE id=%s AND user_id=%s", (tx_id, user_id), commit=True)
        return jsonify({"success": True, "message": "Transaction deleted"}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# =====================================================================
# 2. GOALS (CRUD + BULK DELETION)
# =====================================================================
@voice_api.route("/api/voice/goals", methods=["GET"])
def get_user_goals():
    user_id = request.args.get("user_id")
    try:
        rows = db_query("SELECT id, goal_name, target_amount, current_saved, category, target_date FROM goals WHERE user_id=%s ORDER BY id DESC", (user_id,), fetchall=True)
        return jsonify({"success": True, "goals": rows}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@voice_api.route("/api/voice/goals", methods=["POST"])
def add_user_goal():
    data = request.get_json() or {}
    try:
        new_id = db_query(
            "INSERT INTO goals (user_id, goal_name, target_amount, current_saved, category, target_date) VALUES (%s, %s, %s, %s, %s, %s)",
            (data.get("user_id"), data.get("goal_name"), data.get("target_amount", 0), data.get("current_saved", 0), data.get("category", "General"), data.get("target_date")),
            commit=True
        )
        return jsonify({"success": True, "id": new_id, "message": "Goal created"}), 201
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@voice_api.route("/api/voice/goals/<int:goal_id>/add-money", methods=["POST"])
def add_money_to_goal(goal_id):
    data = request.get_json() or {}
    try:
        db_query("UPDATE goals SET current_saved = current_saved + %s WHERE id=%s AND user_id=%s", (data.get("amount", 0), goal_id, data.get("user_id")), commit=True)
        return jsonify({"success": True, "message": "Savings added"}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@voice_api.route("/api/voice/goals/all", methods=["DELETE"])
def delete_all_goals():
    user_id = request.args.get("user_id")
    if not user_id:
        return jsonify({"success": False, "error": "user_id is required"}), 400
    try:
        db_query("DELETE FROM goals WHERE user_id=%s", (user_id,), commit=True)
        return jsonify({"success": True, "message": "All goals have been deleted successfully."}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@voice_api.route("/api/voice/goals/<int:goal_id>", methods=["DELETE"])
def delete_user_goal(goal_id):
    user_id = request.args.get("user_id")
    try:
        db_query("DELETE FROM goals WHERE id=%s AND user_id=%s", (goal_id, user_id), commit=True)
        return jsonify({"success": True, "message": "Goal deleted"}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# =====================================================================
# 3. BUDGETS (CRUD + BULK RESET)
# =====================================================================
@voice_api.route("/api/voice/budgets", methods=["GET"])
def get_user_budgets():
    user_id = request.args.get("user_id")
    try:
        rows = db_query("SELECT id, category, monthly_limit FROM budget_limits WHERE user_id=%s", (user_id,), fetchall=True)
        return jsonify({"success": True, "limits": rows}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@voice_api.route("/api/voice/budgets", methods=["POST"])
def set_user_budget():
    data = request.get_json() or {}
    try:
        existing = db_query("SELECT id FROM budget_limits WHERE user_id=%s AND category=%s", (data.get("user_id"), data.get("category")), fetchone=True)
        if existing:
            db_query("UPDATE budget_limits SET monthly_limit=%s WHERE id=%s", (data.get("monthly_limit"), existing["id"]), commit=True)
        else:
            db_query("INSERT INTO budget_limits (user_id, category, monthly_limit) VALUES (%s, %s, %s)", (data.get("user_id"), data.get("category"), data.get("monthly_limit")), commit=True)
        return jsonify({"success": True, "message": "Budget updated"}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@voice_api.route("/api/voice/budgets/all", methods=["DELETE"])
def delete_all_budgets():
    user_id = request.args.get("user_id")
    if not user_id:
        return jsonify({"success": False, "error": "user_id is required"}), 400
    try:
        db_query("DELETE FROM budget_limits WHERE user_id=%s", (user_id,), commit=True)
        return jsonify({"success": True, "message": "All budgets have been reset."}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@voice_api.route("/api/voice/budgets/<int:budget_id>", methods=["DELETE"])
def delete_user_budget(budget_id):
    user_id = request.args.get("user_id")
    try:
        db_query("DELETE FROM budget_limits WHERE id=%s AND user_id=%s", (budget_id, user_id), commit=True)
        return jsonify({"success": True, "message": "Budget deleted"}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# =====================================================================
# 4. INVESTMENTS (CRUD)
# =====================================================================
@voice_api.route("/api/voice/investments", methods=["GET"])
def get_user_investments():
    user_id = request.args.get("user_id")
    try:
        rows = db_query("SELECT id, asset_name, asset_type, invested_amount, current_value FROM investments WHERE user_id=%s", (user_id,), fetchall=True)
        return jsonify({"success": True, "investments": rows}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@voice_api.route("/api/voice/investments", methods=["POST"])
def add_user_investment():
    data = request.get_json() or {}
    try:
        new_id = db_query(
            "INSERT INTO investments (user_id, asset_name, asset_type, invested_amount, current_value) VALUES (%s, %s, %s, %s, %s)",
            (data.get("user_id"), data.get("asset_name"), data.get("asset_type", "Mutual Fund"), data.get("invested_amount", 0), data.get("current_value", data.get("invested_amount", 0))),
            commit=True
        )
        return jsonify({"success": True, "id": new_id, "message": "Investment recorded"}), 201
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@voice_api.route("/api/voice/investments/all", methods=["DELETE"])
def delete_all_investments():
    user_id = request.args.get("user_id")
    if not user_id:
        return jsonify({"success": False, "error": "user_id is required"}), 400
    try:
        db_query("DELETE FROM investments WHERE user_id=%s", (user_id,), commit=True)
        return jsonify({"success": True, "message": "All investments deleted."}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# =====================================================================
# 5. LOANS & EMI (CRUD)
# =====================================================================
@voice_api.route("/api/voice/loans", methods=["GET"])
def get_user_loans():
    user_id = request.args.get("user_id")
    try:
        rows = db_query("SELECT id, loan_name, total_amount, emi_amount, remaining_amount, due_date FROM loans WHERE user_id=%s", (user_id,), fetchall=True)
        return jsonify({"success": True, "loans": rows}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@voice_api.route("/api/voice/loans", methods=["POST"])
def add_user_loan():
    data = request.get_json() or {}
    try:
        new_id = db_query(
            "INSERT INTO loans (user_id, loan_name, total_amount, emi_amount, remaining_amount, due_date) VALUES (%s, %s, %s, %s, %s, %s)",
            (data.get("user_id"), data.get("loan_name"), data.get("total_amount", 0), data.get("emi_amount", 0), data.get("remaining_amount", data.get("total_amount", 0)), data.get("due_date")),
            commit=True
        )
        return jsonify({"success": True, "id": new_id, "message": "Loan added"}), 201
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@voice_api.route("/api/voice/loans/all", methods=["DELETE"])
def delete_all_loans():
    user_id = request.args.get("user_id")
    if not user_id:
        return jsonify({"success": False, "error": "user_id is required"}), 400
    try:
        db_query("DELETE FROM loans WHERE user_id=%s", (user_id,), commit=True)
        return jsonify({"success": True, "message": "All loans deleted."}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500