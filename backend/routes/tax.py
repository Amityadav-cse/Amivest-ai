from flask import Blueprint, request, jsonify
from database.db import get_connection
from database.db import get_connection

tax = Blueprint("tax", __name__)

# Indicative slabs based on general knowledge as of early 2026 — tax rules
# change with every Union Budget. This is NOT tax advice; always verify
# current slabs on incometax.gov.in or with a CA before filing.
NEW_REGIME_SLABS = [
    (300000, 0.0), (600000, 0.05), (900000, 0.10),
    (1200000, 0.15), (1500000, 0.20), (float("inf"), 0.30),
]
OLD_REGIME_SLABS = [
    (250000, 0.0), (500000, 0.05), (1000000, 0.20), (float("inf"), 0.30),
]
NEW_REGIME_STD_DEDUCTION = 75000
OLD_REGIME_STD_DEDUCTION = 50000
SECTION_80C_LIMIT = 150000
NEW_REGIME_REBATE_THRESHOLD = 700000  # taxable income at/below this ≈ zero tax under 87A


def _slab_tax(taxable_income, slabs):
    tax_amount = 0.0
    lower = 0
    for upper, rate in slabs:
        if taxable_income > lower:
            taxed_in_slab = min(taxable_income, upper) - lower
            tax_amount += taxed_in_slab * rate
            lower = upper
        else:
            break
    return round(tax_amount, 2)


@tax.route("/tax/analysis", methods=["GET"])
def analysis():
    try:
        user_id = request.args.get("user_id", 1)

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                IFNULL(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) AS income,
                COUNT(DISTINCT DATE_FORMAT(transaction_date, '%Y-%m')) AS months_covered
            FROM transactions
            WHERE user_id = %s
        """, (user_id,))
        totals = cursor.fetchone()
        months_covered = max(1, int(totals["months_covered"] or 1))
        monthly_income = float(totals["income"]) / months_covered
        annual_income = monthly_income * 12

        cursor.execute("SELECT monthly_investable, investment_goal FROM investment_profile WHERE user_id = %s", (user_id,))
        inv = cursor.fetchone()

        cursor.execute("SELECT employment_status FROM loan_profile WHERE user_id = %s", (user_id,))
        loan_profile = cursor.fetchone()

        cursor.close()
        conn.close()

        annual_sip = float(inv["monthly_investable"] or 0) * 12 if inv else 0
        # Assume ELSS-eligible SIPs count toward 80C if the goal mentions tax
        elss_eligible = annual_sip if (inv and (inv.get("investment_goal") or "").lower().find("tax") != -1) else 0
        section_80c_used = min(SECTION_80C_LIMIT, elss_eligible)

        # New regime (no deductions except standard deduction)
        new_taxable = max(0, annual_income - NEW_REGIME_STD_DEDUCTION)
        new_tax = 0 if new_taxable <= NEW_REGIME_REBATE_THRESHOLD else _slab_tax(new_taxable, NEW_REGIME_SLABS)

        # Old regime (standard deduction + 80C)
        old_taxable = max(0, annual_income - OLD_REGIME_STD_DEDUCTION - section_80c_used)
        old_tax = _slab_tax(old_taxable, OLD_REGIME_SLABS)

        better_regime = "New Regime" if new_tax <= old_tax else "Old Regime"
        savings_if_better = abs(new_tax - old_tax)

        alerts = []
        if section_80c_used < SECTION_80C_LIMIT and better_regime == "Old Regime":
            remaining = SECTION_80C_LIMIT - section_80c_used
            alerts.append(f"You still have ₹{remaining:,.0f} of your ₹1,50,000 Section 80C limit unused — ELSS, PPF, or EPF contributions could reduce your taxable income further under the Old Regime.")

        is_self_employed = loan_profile and loan_profile.get("employment_status") in ("Self-employed", "Business Owner")
        if is_self_employed and old_tax > 10000 or (is_self_employed and new_tax > 10000):
            alerts.append("As a self-employed individual with estimated tax liability above ₹10,000/year, you're likely required to pay advance tax in quarterly installments — check due dates on the Income Tax portal.")

        if annual_income > 5000000:
            alerts.append("Income above ₹50 lakh may attract a surcharge on top of slab rates — this estimate doesn't include surcharge or cess.")

        if not alerts:
            alerts.append("Nothing urgent flagged right now — this is a general estimate, not a filed return.")

        return jsonify({
            "success": True,
            "annual_income": round(annual_income, 2),
            "monthly_income": round(monthly_income, 2),
            "new_regime": {"taxable_income": round(new_taxable, 2), "estimated_tax": new_tax},
            "old_regime": {"taxable_income": round(old_taxable, 2), "estimated_tax": old_tax, "section_80c_used": section_80c_used},
            "better_regime": better_regime,
            "estimated_savings": round(savings_if_better, 2),
            "alerts": alerts,
            "disclaimer": "Indicative estimate only, based on general slab rules — excludes cess, surcharge, HRA, and other deductions. Not tax advice. Verify with incometax.gov.in or a qualified CA before filing.",
        })

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
