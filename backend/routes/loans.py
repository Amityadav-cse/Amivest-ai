from flask import Blueprint, request, jsonify
from datetime import date
from dateutil.relativedelta import relativedelta
from services.gemini_service import ask_financial_ai
from database.db import get_connection

loans = Blueprint("loans", __name__)


# ===================================================
# GET /loans/profile?user_id=1
# ===================================================
@loans.route("/loans/profile", methods=["GET"])
def get_profile():
    try:
        user_id = request.args.get("user_id", 1)
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM loan_profile WHERE user_id = %s", (user_id,))
        profile = cursor.fetchone()
        cursor.close()
        conn.close()

        if not profile:
            return jsonify({"success": True, "profile": None})

        profile["requested_amount"] = float(profile.get("requested_amount") or 0)
        profile["existing_emi"] = float(profile.get("existing_emi") or 0)
        return jsonify({"success": True, "profile": profile})

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ===================================================
# POST /loans/profile — saves the interview answers
# ===================================================
@loans.route("/loans/profile", methods=["POST"])
def save_profile():
    try:
        data = request.json
        user_id = data.get("user_id", 1)

        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO loan_profile
                (user_id, loan_type, requested_amount, loan_purpose, employment_status,
                 existing_emi, duration_years, credit_score)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                loan_type = VALUES(loan_type),
                requested_amount = VALUES(requested_amount),
                loan_purpose = VALUES(loan_purpose),
                employment_status = VALUES(employment_status),
                existing_emi = VALUES(existing_emi),
                duration_years = VALUES(duration_years),
                credit_score = VALUES(credit_score)
        """, (
            user_id,
            data.get("loan_type"),
            float(data.get("requested_amount", 0) or 0),
            data.get("loan_purpose"),
            data.get("employment_status"),
            float(data.get("existing_emi", 0) or 0),
            int(data.get("duration_years", 0) or 0),
            data.get("credit_score") or None,
        ))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({"success": True, "message": "Profile saved."})

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ===================================================
# Deterministic decision engine
# ===================================================

# Indicative annual rate RANGES by loan type — general knowledge, not live
# rates. Always shown with a "verify current rates" disclaimer in the UI.
INDICATIVE_RATES = {
    "Personal Loan": (10.5, 18.0),
    "Home Loan": (8.0, 10.5),
    "Education Loan": (8.5, 12.5),
    "Car Loan": (8.5, 12.0),
    "Business Loan": (10.0, 16.0),
    "Gold Loan": (7.5, 12.0),
}

LENDER_PROFILES = [
    {"name": "SBI", "kind": "Public Sector Bank", "pros": "Typically the lowest rates for salaried applicants, wide branch network", "cons": "Slower processing, more documentation"},
    {"name": "HDFC Bank", "kind": "Private Bank", "pros": "Fast digital processing, good for existing account holders", "cons": "Rates slightly higher than PSU banks"},
    {"name": "ICICI Bank", "kind": "Private Bank", "pros": "Strong digital experience, quick disbursal", "cons": "Rates vary a lot by credit profile"},
    {"name": "Axis Bank", "kind": "Private Bank", "pros": "Flexible tenure options", "cons": "Processing fees can be higher"},
    {"name": "Bajaj Finance", "kind": "NBFC", "pros": "Fast approval, works with thinner credit files", "cons": "Generally higher interest than banks"},
    {"name": "Tata Capital", "kind": "NBFC", "pros": "Flexible eligibility criteria", "cons": "Rates on the higher end of the range"},
]


def _emi(principal, annual_rate_pct, months):
    r = (annual_rate_pct / 100) / 12
    if r == 0:
        return principal / months
    return principal * r * (1 + r) ** months / ((1 + r) ** months - 1)


def _max_principal_for_emi(emi_capacity, annual_rate_pct, months):
    r = (annual_rate_pct / 100) / 12
    if r == 0:
        return emi_capacity * months
    return emi_capacity * ((1 + r) ** months - 1) / (r * (1 + r) ** months)


@loans.route("/loans/analysis", methods=["GET"])
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

        cursor.execute("SELECT * FROM loan_profile WHERE user_id = %s", (user_id,))
        profile = cursor.fetchone()

        # Cross-module: reuse emergency-fund status from the Investment
        # Advisor profile if it exists, per the flowchart's decision tree.
        cursor.execute("SELECT has_emergency_fund FROM investment_profile WHERE user_id = %s", (user_id,))
        inv_profile = cursor.fetchone()

        cursor.close()
        conn.close()

        if not profile:
            return jsonify({"success": True, "profile_complete": False})

        loan_type = profile.get("loan_type") or "Personal Loan"
        requested_amount = float(profile.get("requested_amount") or 0)
        existing_emi = float(profile.get("existing_emi") or 0)
        duration_years = int(profile.get("duration_years") or 3)
        credit_score = profile.get("credit_score")
        has_emergency_fund = bool(inv_profile.get("has_emergency_fund")) if inv_profile else None

        months = max(12, duration_years * 12)
        rate_low, rate_high = INDICATIVE_RATES.get(loan_type, (10, 15))
        assumed_rate = (rate_low + rate_high) / 2

        existing_dti = (existing_emi / income * 100) if income > 0 else 0

        warnings = []
        if existing_dti > 40:
            warnings.append("Your existing EMIs already take up more than 40% of your income — taking on more debt is risky right now.")
        if has_emergency_fund is False:
            warnings.append("You don't have an emergency fund yet — consider building one before adding a new loan.")
        if credit_score and credit_score < 650:
            warnings.append(f"Your credit score ({credit_score}) is on the lower side — you may face higher interest rates or rejection.")
        if income <= 0:
            warnings.append("No income data found from your transactions — analysis may be inaccurate.")

        # Safe EMI budget: total EMI (existing + new) capped at 40% of income.
        safe_emi_budget = max(0, income * 0.40)
        available_emi_capacity = max(0, safe_emi_budget - existing_emi)

        eligible = existing_dti <= 40 and income > 0 and (credit_score is None or credit_score >= 600)

        max_eligible_principal = _max_principal_for_emi(available_emi_capacity, assumed_rate, months)
        recommended_amount = min(requested_amount, max_eligible_principal) if requested_amount > 0 else max_eligible_principal
        recommended_amount = max(0, round(recommended_amount, -3))
        suggested_emi = round(_emi(recommended_amount, assumed_rate, months), 0) if recommended_amount > 0 else 0

        risk_score = 100
        risk_score -= min(40, existing_dti)
        risk_score -= 0 if has_emergency_fund else 15
        if credit_score:
            if credit_score < 600:
                risk_score -= 25
            elif credit_score < 700:
                risk_score -= 10
        risk_score = max(0, min(100, round(risk_score)))

        reasons = []
        reasons.append("Stable income" if income > expenses else "Tight monthly budget")
        reasons.append(f"{'Low' if existing_dti < 20 else 'Moderate' if existing_dti < 40 else 'High'} existing debt ratio ({existing_dti:.0f}%)")
        if has_emergency_fund is not None:
            reasons.append("Has an emergency fund" if has_emergency_fund else "No emergency fund yet")
        if credit_score:
            reasons.append(f"Credit score: {credit_score}")

        # Static, rule-based lender ranking — cheapest indicative rate first.
        # Not personalized pricing (real rates depend on the bank's own
        # underwriting), just a starting point for comparison.
        lenders = []
        for lender in LENDER_PROFILES:
            lender_low = rate_low - (1 if lender["kind"] == "Public Sector Bank" else 0)
            lender_high = rate_high + (1.5 if lender["kind"] == "NBFC" else 0)
            emi_at_avg = round(_emi(recommended_amount, (lender_low + lender_high) / 2, months)) if recommended_amount > 0 else 0
            lenders.append({
                **lender,
                "rate_range": f"{lender_low:.1f}% - {lender_high:.1f}%",
                "estimated_emi": emi_at_avg,
            })
        lenders.sort(key=lambda l: l["estimated_emi"])
        best_lender = lenders[0]["name"] if lenders else None

        documents = ["Aadhaar Card", "PAN Card", "Address Proof", "Recent Bank Statements (last 3-6 months)"]
        if profile.get("employment_status") == "Salaried":
            documents += ["Latest Salary Slips (3 months)", "Form 16 / Income Tax Returns"]
        elif profile.get("employment_status") in ("Self-employed", "Business Owner"):
            documents += ["Income Tax Returns (2-3 years)", "Business Proof / GST Registration"]
        if loan_type == "Home Loan":
            documents += ["Property Documents", "Sale Agreement"]
        elif loan_type == "Education Loan":
            documents += ["Admission Letter", "Fee Structure"]
        elif loan_type == "Car Loan":
            documents += ["Vehicle Quotation / Invoice"]

        why_prompt = f"""A loan advisory engine (not you) already decided the following for a user in India.
Do not change any numbers or the eligibility decision, only explain it briefly and warmly in under 70 words:

Loan type: {loan_type}
Requested amount: ₹{requested_amount:.0f}
Eligible: {"Yes" if eligible else "No"}
Recommended amount: ₹{recommended_amount:.0f}
Suggested EMI: ₹{suggested_emi:.0f}/month
Existing debt-to-income ratio: {existing_dti:.0f}%"""

        try:
            ai_explanation = ask_financial_ai(why_prompt, "")
        except Exception:
            ai_explanation = ""

        return jsonify({
            "success": True,
            "profile_complete": True,
            "income": income,
            "expenses": expenses,
            "loan_type": loan_type,
            "requested_amount": requested_amount,
            "existing_dti": round(existing_dti, 1),
            "risk_score": risk_score,
            "eligible": eligible,
            "recommended_amount": recommended_amount,
            "suggested_emi": suggested_emi,
            "duration_years": duration_years,
            "assumed_rate_range": f"{rate_low:.1f}% - {rate_high:.1f}%",
            "warnings": warnings,
            "reasons": reasons,
            "lenders": lenders,
            "best_lender": best_lender,
            "documents": documents,
            "ai_explanation": ai_explanation,
        })

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ===================================================
# Loan tracker — POST to add, GET to list with computed
# remaining balance / progress (pure amortization math).
# ===================================================
@loans.route("/loans/track", methods=["GET"])
def list_tracked_loans():
    try:
        user_id = request.args.get("user_id", 1)
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM loan_tracker WHERE user_id = %s ORDER BY created_at DESC", (user_id,))
        rows = cursor.fetchall()
        cursor.close()
        conn.close()

        today = date.today()
        results = []
        for row in rows:
            principal = float(row["principal"])
            rate = float(row["annual_rate"])
            months = int(row["tenure_months"])
            start = row["start_date"]
            emi = _emi(principal, rate, months)

            months_elapsed = max(0, min(months, (today.year - start.year) * 12 + (today.month - start.month)))
            r = (rate / 100) / 12
            if r == 0:
                remaining_balance = max(0, principal - emi * months_elapsed)
            else:
                remaining_balance = principal * ((1 + r) ** months - (1 + r) ** months_elapsed) / ((1 + r) ** months - 1)
            remaining_balance = max(0, round(remaining_balance, 2))

            total_paid = round(emi * months_elapsed, 2)
            interest_paid = round(total_paid - (principal - remaining_balance), 2)
            next_due = start + relativedelta(months=months_elapsed + 1)

            results.append({
                "id": row["id"],
                "lender": row["lender"],
                "principal": principal,
                "annual_rate": rate,
                "tenure_months": months,
                "start_date": str(start),
                "emi": round(emi, 2),
                "months_elapsed": months_elapsed,
                "months_remaining": max(0, months - months_elapsed),
                "remaining_balance": remaining_balance,
                "interest_paid_so_far": max(0, interest_paid),
                "next_due_date": str(next_due),
                "progress_pct": round(min(100, months_elapsed / months * 100), 1),
            })

        return jsonify({"success": True, "loans": results})

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@loans.route("/loans/track", methods=["POST"])
def add_tracked_loan():
    try:
        data = request.json
        user_id = data.get("user_id", 1)
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO loan_tracker (user_id, lender, principal, annual_rate, tenure_months, start_date)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (
            user_id,
            data.get("lender"),
            float(data.get("principal", 0)),
            float(data.get("annual_rate", 0)),
            int(data.get("tenure_months", 0)),
            data.get("start_date"),
        ))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({"success": True, "message": "Loan added to tracker."})

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@loans.route("/loans/track/<int:loan_id>", methods=["DELETE"])
def delete_tracked_loan(loan_id):
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM loan_tracker WHERE id = %s", (loan_id,))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({"success": True, "message": "Removed."})

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
