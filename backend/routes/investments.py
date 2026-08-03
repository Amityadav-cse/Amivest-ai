from flask import Blueprint, request, jsonify
from services.gemini_service import ask_financial_ai
from database.db import get_connection

investments = Blueprint("investments", __name__)


# ===================================================
# GET /investments/profile?user_id=1
# ===================================================
@investments.route("/investments/profile", methods=["GET"])
def get_profile():
    try:
        user_id = request.args.get("user_id", 1)

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM investment_profile WHERE user_id = %s", (user_id,))
        profile = cursor.fetchone()
        cursor.close()
        conn.close()

        if not profile:
            return jsonify({"success": True, "profile": None})

        profile["monthly_investable"] = float(profile.get("monthly_investable") or 0)
        profile["has_emergency_fund"] = bool(profile.get("has_emergency_fund"))
        profile["has_existing_investments"] = bool(profile.get("has_existing_investments"))
        profile["existing_loans"] = float(profile.get("existing_loans") or 0)
        profile["monthly_emi"] = float(profile.get("monthly_emi") or 0)

        return jsonify({"success": True, "profile": profile})

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ===================================================
# POST /investments/profile
# Saves the answers from the guided interview.
# ===================================================
@investments.route("/investments/profile", methods=["POST"])
def save_profile():
    try:
        data = request.json
        user_id = data.get("user_id", 1)

        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO investment_profile
                (user_id, investment_goal, investment_horizon_years, monthly_investable,
                 risk_tolerance, has_emergency_fund, has_existing_investments)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                investment_goal = VALUES(investment_goal),
                investment_horizon_years = VALUES(investment_horizon_years),
                monthly_investable = VALUES(monthly_investable),
                risk_tolerance = VALUES(risk_tolerance),
                has_emergency_fund = VALUES(has_emergency_fund),
                has_existing_investments = VALUES(has_existing_investments)
        """, (
            user_id,
            data.get("investment_goal"),
            int(data.get("investment_horizon_years", 0) or 0),
            float(data.get("monthly_investable", 0) or 0),
            data.get("risk_tolerance"),  # 'Low' | 'Medium' | 'High'
            1 if data.get("has_emergency_fund") else 0,
            1 if data.get("has_existing_investments") else 0,
        ))

        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({"success": True, "message": "Profile saved."})

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ===================================================
# Decision engine — deterministic. The interview answers +
# dashboard numbers decide everything; the language model is
# only used afterward to phrase a short explanation.
# ===================================================

RISK_LABELS = {"Low": "Conservative", "Medium": "Moderate", "High": "Aggressive"}


def _financial_health_score(income, expenses, has_emergency_fund, has_existing_investments,
                             monthly_emi, credit_score):
    score = 0
    savings_rate = ((income - expenses) / income * 100) if income > 0 else 0

    if savings_rate >= 30:
        score += 30
    elif savings_rate >= 20:
        score += 20
    elif savings_rate >= 10:
        score += 10

    score += 30 if has_emergency_fund else 0
    score += 10 if income > 0 else 0
    score += 10 if has_existing_investments else 0

    if monthly_emi and income > 0:
        emi_ratio = monthly_emi / income
        if emi_ratio < 0.10:
            score += 10
        elif emi_ratio < 0.30:
            score += 6
        elif emi_ratio < 0.50:
            score += 2
    else:
        score += 10  # neutral — no EMI data collected in this flow

    if credit_score:
        if credit_score >= 750:
            score += 10
        elif credit_score >= 650:
            score += 5
    else:
        score += 5  # neutral, not penalized for missing data

    return round(min(100, score), 1), round(savings_rate, 1)


def _base_allocation(risk_label):
    # Matches the flowchart's own example almost exactly for "Medium" risk.
    tables = {
        "Low":    {"Index Fund": 20, "Flexi Cap Fund": 10, "Gold ETF": 15, "Liquid Fund": 45, "Debt Fund": 10},
        "Medium": {"Index Fund": 40, "Flexi Cap Fund": 20, "Gold ETF": 20, "Liquid Fund": 20},
        "High":   {"Index Fund": 50, "Flexi Cap Fund": 30, "Gold ETF": 10, "Liquid Fund": 10},
    }
    return dict(tables.get(risk_label, tables["Medium"]))


def _adjust_allocation(allocation, has_emergency_fund, goal):
    allocation = dict(allocation)

    if not has_emergency_fund:
        boost = 15
        allocation["Liquid Fund"] = allocation.get("Liquid Fund", 0) + boost
        other_keys = [k for k in allocation if k != "Liquid Fund"]
        other_total = sum(allocation[k] for k in other_keys)
        if other_total > 0:
            for k in other_keys:
                allocation[k] = round(allocation[k] - (allocation[k] / other_total) * boost, 1)

    if goal == "Tax Saving":
        elss_share = 15
        other_keys = [k for k in allocation if k != "Liquid Fund"]
        other_total = sum(allocation[k] for k in other_keys)
        if other_total > 0:
            for k in other_keys:
                allocation[k] = round(allocation[k] - (allocation[k] / other_total) * elss_share, 1)
        allocation["ELSS (Tax Saving)"] = elss_share

    allocation = {k: round(v) for k, v in allocation.items() if v >= 3}
    drift = 100 - sum(allocation.values())
    if drift != 0 and allocation:
        biggest = max(allocation, key=allocation.get)
        allocation[biggest] += drift

    return allocation


@investments.route("/investments/analysis", methods=["GET"])
def analysis():
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
        income = float(totals["income"]) / months_covered
        expenses = float(totals["expense"]) / months_covered

        cursor.execute("SELECT * FROM investment_profile WHERE user_id = %s", (user_id,))
        profile = cursor.fetchone()

        cursor.close()
        conn.close()

        if not profile:
            return jsonify({"success": True, "profile_complete": False})

        has_ef = bool(profile.get("has_emergency_fund"))
        has_existing = bool(profile.get("has_existing_investments"))
        monthly_investable = float(profile.get("monthly_investable") or 0)
        goal = profile.get("investment_goal") or "Wealth Creation"
        horizon = int(profile.get("investment_horizon_years") or 0)
        risk_label = profile.get("risk_tolerance") or "Medium"
        monthly_emi = float(profile.get("monthly_emi") or 0)
        credit_score = profile.get("credit_score")

        health_score, savings_rate = _financial_health_score(
            income, expenses, has_ef, has_existing, monthly_emi, credit_score
        )

        apparent_surplus = max(0, income - expenses)
        over_budget_warning = None
        if monthly_investable > apparent_surplus:
            over_budget_warning = (
                f"You said you can invest ₹{monthly_investable:,.0f}/month, but your average "
                f"monthly surplus looks closer to ₹{apparent_surplus:,.0f}. Consider starting a "
                f"bit lower so it's sustainable."
            )

        base_allocation = _base_allocation(risk_label)
        allocation = _adjust_allocation(base_allocation, has_ef, goal)

        reasons = [
            f"{'Stable' if income > expenses else 'Tight'} monthly income vs. expenses",
            f"{risk_label} risk tolerance",
        ]
        if horizon:
            reasons.append(f"{horizon}-year investment horizon")
        reasons.append("Emergency fund already in place" if has_ef else "Limited emergency savings")
        if has_existing:
            reasons.append("Already has some investing experience")

        action_items = []
        if not has_ef:
            action_items.append("Start (or top up) an emergency fund — part of this plan is weighted toward Liquid Fund for that.")
        action_items.append(f"Invest ₹{monthly_investable:,.0f}/month toward the allocation below.")
        if goal == "Tax Saving":
            action_items.append("The ELSS portion has a mandatory 3-year lock-in — factor that into your liquidity planning.")

        risk_profile_label = RISK_LABELS.get(risk_label, "Moderate")

        readiness_checklist = {
            "income_stability": income > 0,
            "emergency_fund": has_ef,
            "existing_investments": has_existing,
            "risk_profile": risk_profile_label,
        }
        readiness_score = min(100, round(health_score * 0.7 + (30 if has_ef else 0)))

        roadmap = [
            {"period": "Today", "items": [
                {"label": "Emergency Fund", "done": has_ef},
                {"label": f"Start SIP toward {goal}", "done": False},
            ]},
            {"period": "Next 3 Months", "items": [
                {"label": "Confirm SIP is running consistently", "done": False},
            ]},
            {"period": "Next 1 Year", "items": [
                {"label": "Review and rebalance allocation", "done": False},
            ]},
            {"period": f"{horizon or 5} Years", "items": [
                {"label": goal, "done": False},
            ]},
        ]

        why_prompt = f"""A financial advisory engine (not you) already decided the following for a user
in India. Do not invent a name — just say "Hi there". Do not change any numbers or the decision
below, only greet them and explain it briefly and warmly in under 70 words, like a financial
advisor opening a conversation:

Financial Health Score: {health_score}/100
Average monthly income: ₹{income:.0f}
Average monthly expenses: ₹{expenses:.0f}
Has emergency fund: {"Yes" if has_ef else "No"}
Goal: {goal}
Risk tolerance: {risk_label}
Recommended monthly investment: ₹{monthly_investable:.0f}"""

        try:
            ai_greeting = ask_financial_ai(why_prompt, "")
        except Exception:
            ai_greeting = ""

        return jsonify({
            "success": True,
            "profile_complete": True,
            "income": income,
            "expenses": expenses,
            "savings_rate": savings_rate,
            "health_score": health_score,
            "risk_profile": risk_profile_label,
            "goal": goal,
            "horizon_years": horizon,
            "over_budget_warning": over_budget_warning,
            "recommendation": {
                "suggested_sip": monthly_investable,
                "portfolio": allocation,
                "reasons": reasons,
                "action_items": action_items,
            },
            "roadmap": roadmap,
            "readiness_checklist": readiness_checklist,
            "readiness_score": readiness_score,
            "ai_greeting": ai_greeting,
        })

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ===================================================
# POST /investments/simulate — unchanged, pure math.
# ===================================================
@investments.route("/investments/simulate", methods=["POST"])
def simulate():
    try:
        data = request.json
        monthly_amounts = data.get("monthly_amounts", [5000, 10000, 20000])
        years_list = data.get("years", [5, 10, 20])
        annual_return_pct = float(data.get("annual_return", 12))

        r = (annual_return_pct / 100) / 12

        results = []
        for amount in monthly_amounts:
            amount = float(amount)
            projections = {}
            for years in years_list:
                n = years * 12
                if r > 0:
                    future_value = amount * (((1 + r) ** n - 1) / r) * (1 + r)
                else:
                    future_value = amount * n
                invested = amount * n
                projections[str(years)] = {
                    "invested": round(invested, 2),
                    "future_value": round(future_value, 2),
                    "gains": round(future_value - invested, 2),
                }
            results.append({"monthly_amount": amount, "projections": projections})

        return jsonify({"success": True, "annual_return": annual_return_pct, "results": results})

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500