from flask import Blueprint, jsonify
from database.db import get_connection

dashboard = Blueprint("dashboard", __name__)


@dashboard.route("/dashboard", methods=["GET"])
def get_dashboard():

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    # Total Income
    cursor.execute("""
        SELECT IFNULL(SUM(amount), 0) AS income
        FROM transactions
        WHERE user_id = %s
        AND type = 'Income'
    """, (1,))
    income = cursor.fetchone()["income"]

    # Total Expense
    cursor.execute("""
        SELECT IFNULL(SUM(amount), 0) AS expense
        FROM transactions
        WHERE user_id = %s
        AND type = 'Expense'
    """, (1,))
    expense = cursor.fetchone()["expense"]

    balance = float(income) - float(expense)

    # Recent Transactions
    cursor.execute("""
        SELECT
            id,
            type,
            category,
            amount,
            description,
            transaction_date
        FROM transactions
        WHERE user_id = %s
        ORDER BY transaction_date DESC, id DESC
        LIMIT 5
    """, (1,))

    recent = cursor.fetchall()

    cursor.close()
    conn.close()

    return jsonify({
        "success": True,
        "balance": balance,
        "income": float(income),
        "expense": float(expense),
        "recent": recent
    })