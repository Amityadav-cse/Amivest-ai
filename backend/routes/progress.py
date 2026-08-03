from flask import Blueprint, request, jsonify
from services.gemini_service import ask_financial_ai
from database.db import get_connection

progress = Blueprint("progress", __name__)


@progress.route("/progress/summary", methods=["GET"])
def summary():
    """
    Pulls real numbers from every module (transactions, goals, investment
    plan, loan plan) and asks the AI to phrase ONE short spoken summary.
    The AI only phrases what's already computed here — it doesn't invent
    or recalculate any figure.
    """
    try:
        user_id = request.args.get("user_id", 1)

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                IFNULL(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) AS income,
                IFNULL(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0) AS expense,
                COUNT(DISTINCT DATE_FORMAT(transaction_date, '%Y-%m')) AS months_covered
            FROM transactions
            WHERE user_id = %s
        """, (user_id,))
        totals = cursor.fetchone()
        months_covered = max(1, int(totals["months_covered"] or 1))
        monthly_income = float(totals["income"]) / months_covered
        monthly_expense = float(totals["expense"]) / months_covered
        net_savings = monthly_income - monthly_expense

        cursor.execute("""
            SELECT goal_name, target_amount, current_saved
            FROM goals WHERE user_id = %s AND status = 'Active'
        """, (user_id,))
        goals = cursor.fetchall()

        cursor.execute("""
            SELECT goal_name FROM goals
            WHERE user_id = %s AND status = 'Completed'
        """, (user_id,))
        completed_goals = cursor.fetchall()

        cursor.execute("""
            SELECT investment_goal, monthly_investable, risk_tolerance
            FROM investment_profile WHERE user_id = %s
        """, (user_id,))
        inv = cursor.fetchone()

        cursor.execute("""
            SELECT loan_type, requested_amount FROM loan_profile WHERE user_id = %s
        """, (user_id,))
        ln = cursor.fetchone()

        cursor.close()
        conn.close()

        goal_lines = []
        for g in goals:
            pct = (float(g["current_saved"]) / float(g["target_amount"]) * 100) if g["target_amount"] else 0
            goal_lines.append(f"{g['goal_name']}: {pct:.0f}% complete (₹{float(g['current_saved']):.0f} of ₹{float(g['target_amount']):.0f})")

        facts = f"""Monthly income: ₹{monthly_income:.0f}
Monthly expenses: ₹{monthly_expense:.0f}
Monthly net savings: ₹{net_savings:.0f}
Active goals: {"; ".join(goal_lines) if goal_lines else "None set up yet"}
Completed goals: {", ".join(g["goal_name"] for g in completed_goals) if completed_goals else "None yet"}
Investment plan: {f"₹{inv['monthly_investable']:.0f}/month toward {inv['investment_goal']}, {inv['risk_tolerance']} risk" if inv else "Not set up yet"}
Loan plan: {f"{ln['loan_type']} for ₹{float(ln['requested_amount']):.0f}" if ln else "None in progress"}"""

        prompt = f"""Here are a user's real financial facts, already calculated — do not change any numbers:

{facts}

Write a warm, spoken-style summary of their overall financial progress, as if a friendly
financial advisor were briefing them out loud. Keep it under 90 words, plain conversational
language, no bullet points or markdown (this will be read aloud by text-to-speech)."""

        try:
            narrative = ask_financial_ai(prompt, "")
        except Exception:
            narrative = (
                f"Your monthly income is about ₹{monthly_income:.0f}, and expenses are about "
                f"₹{monthly_expense:.0f}, leaving roughly ₹{net_savings:.0f} in savings each month."
            )

        return jsonify({
            "success": True,
            "narrative": narrative,
            "facts": {
                "monthly_income": round(monthly_income, 2),
                "monthly_expense": round(monthly_expense, 2),
                "net_savings": round(net_savings, 2),
                "active_goals": len(goals),
                "completed_goals": len(completed_goals),
            },
        })

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
