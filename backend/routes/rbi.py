from flask import Blueprint, request, jsonify
from database.db import get_connection

rbi = Blueprint("rbi", __name__)

# General regulatory reference — written directly rather than AI-generated,
# since getting a rule like a deposit insurance limit wrong is a real-world
# mistake, not just a stylistic one. Verify current details at rbi.org.in.
RBI_TOPICS = [
    {"title": "Deposit Insurance (DICGC)", "detail": "Bank deposits are insured up to ₹5 lakh per depositor, per bank (covering all your accounts at that bank combined) — not per branch or per account."},
    {"title": "KYC Requirements", "detail": "Banks must periodically re-verify your KYC documents. Ignoring KYC update requests can lead to account restrictions."},
    {"title": "Cash Transaction Reporting", "detail": "Cash deposits or transactions above certain thresholds (e.g. ₹10 lakh in a year in savings accounts) are reported by banks to tax authorities under RBI/Income Tax rules."},
    {"title": "Digital Lending Guidelines", "detail": "RBI requires digital lending apps to disclose the lender's identity upfront, follow a standard loan agreement, and route all loan disbursals/repayments directly through bank accounts — not through the lending app's own wallet."},
    {"title": "Loan Interest Rate Rules", "detail": "Banks must link floating-rate retail loans (like most home loans) to an external benchmark (e.g. repo rate), so rate changes are more transparent and pass through faster."},
    {"title": "Cheque Bounce & Penalties", "detail": "A bounced cheque due to insufficient funds can lead to bank penalty charges and is also a criminal offence under the Negotiable Instruments Act if used to settle a debt."},
    {"title": "RBI Ombudsman", "detail": "If a bank doesn't resolve your complaint within 30 days, you can escalate free of charge to the RBI Integrated Ombudsman Scheme."},
    {"title": "Loan Prepayment", "detail": "RBI guidelines prohibit banks from charging prepayment penalties on floating-rate personal loans taken by individuals for non-business purposes."},
]

DICGC_LIMIT = 500000


@rbi.route("/rbi/topics", methods=["GET"])
def topics():
    return jsonify({"success": True, "topics": RBI_TOPICS})


@rbi.route("/rbi/check", methods=["GET"])
def check():
    """
    Real, dashboard-tied checks — not generic text:
    1. Net savings vs the DICGC ₹5 lakh deposit insurance limit
    2. Any single transaction near/above the ₹2 lakh cash-reporting threshold
    3. Prepayment-penalty awareness if they have an active tracked loan
    """
    try:
        user_id = request.args.get("user_id", 1)

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT
                IFNULL(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) AS income,
                IFNULL(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0) AS expense
            FROM transactions
            WHERE user_id = %s
        """, (user_id,))
        totals = cursor.fetchone()

        cursor.execute("""
            SELECT description, amount, transaction_date
            FROM transactions
            WHERE user_id = %s AND ABS(amount) >= 200000
            ORDER BY transaction_date DESC
            LIMIT 5
        """, (user_id,))
        large_txns = cursor.fetchall()

        cursor.execute("SELECT COUNT(*) AS cnt FROM loan_tracker WHERE user_id = %s", (user_id,))
        loan_count = cursor.fetchone()["cnt"]

        cursor.close()
        conn.close()

        net_savings = float(totals["income"]) - float(totals["expense"])
        exceeds_limit = net_savings > DICGC_LIMIT
        uninsured_amount = max(0, net_savings - DICGC_LIMIT)

        checks = []

        if exceeds_limit:
            checks.append({
                "title": "Deposit Insurance",
                "status": "warning",
                "message": (
                    f"Your tracked net savings (₹{net_savings:,.0f}) is above the ₹5,00,000 DICGC insurance limit. "
                    f"If concentrated in one bank, roughly ₹{uninsured_amount:,.0f} wouldn't be covered if that bank failed."
                ),
            })
        else:
            checks.append({
                "title": "Deposit Insurance",
                "status": "ok",
                "message": f"Your tracked savings (₹{net_savings:,.0f}) is within the ₹5,00,000 DICGC limit per bank.",
            })

        if large_txns:
            for t in large_txns:
                checks.append({
                    "title": "Large Transaction Reporting",
                    "status": "info",
                    "message": (
                        f"₹{abs(float(t['amount'])):,.0f} on {t['transaction_date']} ({t['description']}) is near or above "
                        f"the ₹2,00,000 threshold where banks report large cash transactions to tax authorities. "
                        f"Not an issue for non-cash transfers — just worth knowing if this was cash-based."
                    ),
                })
        else:
            checks.append({
                "title": "Large Transaction Reporting",
                "status": "ok",
                "message": "No transactions found near the ₹2,00,000 cash-reporting threshold.",
            })

        if loan_count > 0:
            checks.append({
                "title": "Loan Prepayment Rights",
                "status": "info",
                "message": (
                    f"You have {loan_count} loan(s) in your tracker. RBI rules prohibit prepayment penalties on "
                    f"floating-rate personal loans for individuals — if your lender tries to charge one, you can push back."
                ),
            })

        return jsonify({
            "success": True,
            "net_savings": round(net_savings, 2),
            "dicgc_limit": DICGC_LIMIT,
            "exceeds_limit": exceeds_limit,
            "uninsured_amount": round(uninsured_amount, 2),
            "checks": checks,
        })

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
