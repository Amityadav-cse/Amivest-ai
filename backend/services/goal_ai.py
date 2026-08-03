from database.db import get_connection
from datetime import datetime
import math


def analyze_goal(user_id, target_amount):

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    # Total Income
    cursor.execute("""
        SELECT IFNULL(SUM(amount),0) AS income
        FROM transactions
        WHERE user_id=%s
        AND type='Income'
    """, (user_id,))
    income = float(cursor.fetchone()["income"])

    # Total Expense
    cursor.execute("""
        SELECT IFNULL(SUM(amount),0) AS expense
        FROM transactions
        WHERE user_id=%s
        AND type='Expense'
    """, (user_id,))
    expense = float(cursor.fetchone()["expense"])

    cursor.close()
    conn.close()

    # Monthly saving capacity
    saving = max(income - expense, 0)

    if saving == 0:
        months = 999
        probability = 10
    else:
        months = math.ceil(target_amount / saving)

        if saving >= target_amount * 0.20:
            probability = 95
        elif saving >= target_amount * 0.10:
            probability = 80
        elif saving >= target_amount * 0.05:
            probability = 65
        else:
            probability = 40

    return {

        "income": income,

        "expense": expense,

        "saving_capacity": saving,

        "recommended_monthly_saving": saving,

        "estimated_months": months,

        "success_probability": probability,

        "message": get_message(probability)

    }


def get_message(probability):

    if probability >= 90:
        return "Excellent! Your goal is easily achievable."

    if probability >= 70:
        return "Good! Small spending reductions will help."

    if probability >= 50:
        return "Possible, but you need better budgeting."

    return "Current income is insufficient. Increase savings."