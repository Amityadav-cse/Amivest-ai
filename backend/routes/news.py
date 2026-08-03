from flask import Blueprint, request, jsonify
from database.db import get_connection
import requests
import xml.etree.ElementTree as ET
from urllib.parse import quote

news = Blueprint("news", __name__)


def _fetch_rss(query, limit=6):
    """
    Google News RSS search — no API key required, returns real current
    headlines. If this ever fails (network blocked, format changes),
    callers get an empty list rather than a crash.
    """
    url = f"https://news.google.com/rss/search?q={quote(query)}&hl=en-IN&gl=IN&ceid=IN:en"
    try:
        resp = requests.get(url, timeout=8, headers={"User-Agent": "Mozilla/5.0"})
        resp.raise_for_status()
        root = ET.fromstring(resp.content)
        items = []
        for item in root.findall(".//item")[:limit]:
            title = item.findtext("title") or ""
            link = item.findtext("link") or ""
            pub_date = item.findtext("pubDate") or ""
            source_el = item.find("source")
            source = source_el.text if source_el is not None else ""
            items.append({"title": title, "link": link, "published": pub_date, "source": source})
        return items
    except Exception:
        return []


@news.route("/news/feed", methods=["GET"])
def feed():
    """
    Personalizes using REAL numbers from the dashboard (income, expenses,
    debt-to-income), not just profile labels — someone in a cash deficit
    gets budgeting-focused news, not investment news they can't act on yet.
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
        income = float(totals["income"]) / months_covered
        expense = float(totals["expense"]) / months_covered

        cursor.execute("SELECT investment_goal, risk_tolerance FROM investment_profile WHERE user_id = %s", (user_id,))
        inv = cursor.fetchone()
        cursor.execute("SELECT loan_type, existing_emi FROM loan_profile WHERE user_id = %s", (user_id,))
        ln = cursor.fetchone()
        cursor.close()
        conn.close()

        sections = {}
        sections["Top Financial News (India)"] = _fetch_rss("India economy finance markets", 6)

        in_deficit = income > 0 and expense >= income
        existing_emi = float(ln["existing_emi"]) if ln and ln.get("existing_emi") else 0
        high_dti = income > 0 and (existing_emi / income) > 0.4

        # Real-number-driven section, not label-driven
        if in_deficit:
            sections["Since your expenses are close to your income"] = _fetch_rss(
                "budgeting tips save money India", 4
            )
        elif high_dti:
            sections["Since your existing EMIs are high relative to income"] = _fetch_rss(
                "debt management reduce EMI burden India", 4
            )
        elif inv and inv.get("investment_goal"):
            sections[f"Related to your goal: {inv['investment_goal']}"] = _fetch_rss(
                f"{inv['investment_goal']} investing India", 4
            )

        if not in_deficit and inv and inv.get("risk_tolerance") == "High":
            sections["Stock Market"] = _fetch_rss("Nifty Sensex stock market India", 4)
        elif not in_deficit and inv and inv.get("risk_tolerance") == "Low":
            sections["Fixed Deposits & Gold"] = _fetch_rss("FD interest rates gold price India", 4)

        if ln and ln.get("loan_type"):
            sections[f"Related to your loan: {ln['loan_type']}"] = _fetch_rss(
                f"{ln['loan_type']} interest rate India RBI", 4
            )

        sections["RBI & Regulation"] = _fetch_rss("RBI monetary policy announcement", 4)

        sections = {k: v for k, v in sections.items() if v}

        return jsonify({"success": True, "sections": sections})

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
