from flask import Blueprint, request, jsonify, session
from database.db import get_connection
from dotenv import load_dotenv
from groq import Groq
from pathlib import Path
from datetime import date, datetime
import os
import traceback
import re


# ============================================================
# ENVIRONMENT
# ============================================================

BASE_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BASE_DIR / ".env")


# ============================================================
# BLUEPRINT
# ============================================================

chat = Blueprint("chat", __name__)


# ============================================================
# GROQ CONFIGURATION
# ============================================================

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip()

GROQ_MODEL = os.getenv(
    "GROQ_MODEL",
    "llama-3.3-70b-versatile",
).strip()

groq_client = None

if GROQ_API_KEY:
    try:
        groq_client = Groq(api_key=GROQ_API_KEY)
    except Exception:
        traceback.print_exc()
        groq_client = None


# ============================================================
# CURRENT USER
# ============================================================

def get_current_user_id():
    """
    Get the authenticated user from the Flask session.

    IMPORTANT:
    Never trust a user_id sent by the browser for authentication.
    The authenticated session is the source of truth.
    """
    user_id = session.get("user_id")

    if not user_id:
        return None

    try:
        return int(user_id)
    except (TypeError, ValueError):
        return None


# ============================================================
# HELPERS
# ============================================================

def safe_float(value, default=0.0):
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def json_safe(value):
    if isinstance(value, (date, datetime)):
        return value.isoformat()

    if isinstance(value, dict):
        return {key: json_safe(val) for key, val in value.items()}

    if isinstance(value, list):
        return [json_safe(item) for item in value]

    return value


# ============================================================
# USER FINANCIAL DATA
# ============================================================

def get_financial_context(user_id):
    conn = None
    cursor = None

    try:
        conn = get_connection()

        if conn is None:
            raise RuntimeError("Database connection failed.")

        cursor = conn.cursor(dictionary=True)

        # ----------------------------------------------------
        # TRANSACTIONS
        # ----------------------------------------------------

        cursor.execute(
            """
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
            LIMIT 100
            """,
            (user_id,),
        )

        transactions = cursor.fetchall() or []

        # ----------------------------------------------------
        # GOALS
        # ----------------------------------------------------

        goals = []

        try:
            cursor.execute(
                """
                SELECT *
                FROM goals
                WHERE user_id = %s
                ORDER BY id DESC
                LIMIT 50
                """,
                (user_id,),
            )

            goals = cursor.fetchall() or []

        except Exception:
            conn.rollback()
            goals = []

        # ----------------------------------------------------
        # SPENDING LIMITS
        # ----------------------------------------------------

        limits = []

        try:
            cursor.execute(
                """
                SELECT
                    id,
                    category,
                    monthly_limit
                FROM spending_limits
                WHERE user_id = %s
                ORDER BY category
                """,
                (user_id,),
            )

            limits = cursor.fetchall() or []

        except Exception:
            conn.rollback()
            limits = []

        return {
            "transactions": json_safe(transactions),
            "goals": json_safe(goals),
            "limits": json_safe(limits),
        }

    except Exception:
        traceback.print_exc()

        return {
            "transactions": [],
            "goals": [],
            "limits": [],
        }

    finally:
        if cursor:
            try:
                cursor.close()
            except Exception:
                pass

        if conn:
            try:
                conn.close()
            except Exception:
                pass


# ============================================================
# CATEGORY NORMALIZATION
# ============================================================

CATEGORY_ALIASES = {
    "food": "Food",
    "foods": "Food",
    "khana": "Food",
    "khaana": "Food",
    "restaurant": "Food",
    "restaurants": "Food",
    "meal": "Food",
    "meals": "Food",

    "shopping": "Shopping",
    "shop": "Shopping",
    "shopping expenses": "Shopping",

    "travel": "Travel",
    "travelling": "Travel",
    "traveling": "Travel",

    "transport": "Transport",
    "transportation": "Transport",

    "fuel": "Fuel",
    "petrol": "Fuel",
    "diesel": "Fuel",

    "education": "Education",
    "college": "Education",
    "study": "Education",

    "entertainment": "Entertainment",

    "medical": "Medical",
    "medicine": "Medical",
    "health": "Medical",

    "rent": "Rent",

    "bills": "Bills",
    "bill": "Bills",

    "groceries": "Groceries",
    "grocery": "Groceries",

    "subscriptions": "Subscriptions",
    "subscription": "Subscriptions",

    "investment": "Investment",
    "investments": "Investment",

    "savings": "Savings",
    "saving": "Savings",
}


def normalize_category(category):
    if not category:
        return "Other"

    clean = str(category).strip()
    key = clean.lower()

    if key in CATEGORY_ALIASES:
        return CATEGORY_ALIASES[key]

    return clean.title()


# ============================================================
# TRANSACTION COMMAND PARSER
# ============================================================

def extract_transaction_command(message):
    """
    Examples supported:

    Add 500 in food
    Add ₹500 in food
    Food mein 500 add karo
    ₹500 spent on food
    Add 1000 for shopping
    I spent 250 on travel
    """

    if not message:
        return None

    text = message.strip()
    lower = text.lower()

    command_words = [
        "add",
        "spent",
        "spend",
        "expense",
        "paid",
        "pay",
        "kharch",
        "kharcha",
        "kharche",
        "dala",
        "dalo",
        "add karo",
        "add kar",
        "spent on",
    ]

    if not any(word in lower for word in command_words):
        return None

    # Amount
    amount_match = re.search(
        r"(?:₹|rs\.?|inr)?\s*([0-9]+(?:\.[0-9]+)?)",
        lower,
        re.IGNORECASE,
    )

    if not amount_match:
        return None

    amount = safe_float(amount_match.group(1))

    if amount <= 0:
        return None

    category = None

    # "in food"
    match = re.search(
        r"\bin\s+([a-zA-Z][a-zA-Z0-9 _-]{1,40})",
        lower,
    )

    if match:
        category = match.group(1)

    # "for food"
    if not category:
        match = re.search(
            r"\bfor\s+([a-zA-Z][a-zA-Z0-9 _-]{1,40})",
            lower,
        )

        if match:
            category = match.group(1)

    # "on food"
    if not category:
        match = re.search(
            r"\bon\s+([a-zA-Z][a-zA-Z0-9 _-]{1,40})",
            lower,
        )

        if match:
            category = match.group(1)

    # Hinglish: "food mein 500 add karo"
    if not category:
        match = re.search(
            r"\b([a-zA-Z][a-zA-Z0-9 _-]{1,30})\s+mein\b",
            lower,
        )

        if match:
            category = match.group(1)

    # Known categories
    if not category:
        for alias in CATEGORY_ALIASES:
            if re.search(r"\b" + re.escape(alias) + r"\b", lower):
                category = alias
                break

    # Do not automatically create a transaction if category is unknown.
    if not category:
        return None

    return {
        "amount": round(amount, 2),
        "category": normalize_category(category),
        "description": text,
    }


# ============================================================
# SAVE TRANSACTION
# ============================================================

def save_transaction(user_id, amount, category, description):
    conn = None
    cursor = None

    try:
        conn = get_connection()

        if conn is None:
            raise RuntimeError("Database connection failed.")

        cursor = conn.cursor()

        # Expenses are stored as negative amounts.
        expense_amount = -abs(float(amount))

        cursor.execute(
            """
            INSERT INTO transactions
            (
                user_id,
                type,
                category,
                amount,
                description,
                transaction_date
            )
            VALUES
            (%s, %s, %s, %s, %s, %s)
            """,
            (
                user_id,
                "expense",
                category,
                expense_amount,
                description,
                date.today(),
            ),
        )

        transaction_id = cursor.lastrowid
        conn.commit()

        return {
            "success": True,
            "transaction_id": transaction_id,
            "amount": abs(expense_amount),
            "category": category,
        }

    except Exception as e:
        if conn:
            try:
                conn.rollback()
            except Exception:
                pass

        traceback.print_exc()

        return {
            "success": False,
            "error": str(e),
        }

    finally:
        if cursor:
            try:
                cursor.close()
            except Exception:
                pass

        if conn:
            try:
                conn.close()
            except Exception:
                pass


# ============================================================
# CHECK SPENDING LIMIT
# ============================================================

def check_spending_limit(user_id, category):
    conn = None
    cursor = None

    try:
        conn = get_connection()

        if conn is None:
            raise RuntimeError("Database connection failed.")

        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                id,
                category,
                monthly_limit
            FROM spending_limits
            WHERE user_id = %s
              AND LOWER(category) = LOWER(%s)
            LIMIT 1
            """,
            (user_id, category),
        )

        limit_row = cursor.fetchone()

        if not limit_row:
            return {"has_limit": False}

        monthly_limit = safe_float(
            limit_row.get("monthly_limit", 0)
        )

        today = date.today()
        month_start = today.replace(day=1)

        cursor.execute(
            """
            SELECT
                IFNULL(SUM(ABS(amount)), 0) AS spent
            FROM transactions
            WHERE user_id = %s
              AND LOWER(category) = LOWER(%s)
              AND amount < 0
              AND transaction_date >= %s
            """,
            (user_id, category, month_start),
        )

        row = cursor.fetchone() or {}
        spent = safe_float(row.get("spent", 0))

        percent = (
            (spent / monthly_limit) * 100
            if monthly_limit > 0
            else 0
        )

        remaining = max(monthly_limit - spent, 0)
        exceeded = spent > monthly_limit

        if exceeded:
            over_by = spent - monthly_limit

            alert = (
                f"⚠️ Your {category} limit has been "
                f"exceeded by ₹{over_by:,.0f}. "
                f"You have spent ₹{spent:,.0f} "
                f"against your ₹{monthly_limit:,.0f} limit."
            )

        elif percent >= 80:
            alert = (
                f"⚠️ You have used {percent:.0f}% "
                f"of your {category} limit. "
                f"₹{remaining:,.0f} remains."
            )

        else:
            alert = (
                f"✅ Your {category} spending is "
                f"within your limit. "
                f"₹{remaining:,.0f} remains."
            )

        return {
            "has_limit": True,
            "category": category,
            "monthly_limit": round(monthly_limit, 2),
            "spent_this_month": round(spent, 2),
            "percent_used": round(percent, 1),
            "remaining": round(remaining, 2),
            "exceeded": exceeded,
            "alert": alert,
        }

    except Exception as e:
        traceback.print_exc()

        return {
            "has_limit": False,
            "error": str(e),
        }

    finally:
        if cursor:
            try:
                cursor.close()
            except Exception:
                pass

        if conn:
            try:
                conn.close()
            except Exception:
                pass


# ============================================================
# SYSTEM PROMPT
# ============================================================

SYSTEM_PROMPT = """
You are AmiVest Alexa AI inside FinSaathi.

You are a personal financial assistant.

Your main purpose is to help users:
- understand spending
- control expenses
- manage budgets
- manage financial goals
- understand transactions
- stay within spending limits

LANGUAGE:
Reply in the language used by the user.

Supported languages:
- English
- Hindi
- Hinglish

Use simple, clear language.

FINANCIAL SAFETY:
1. Always use ₹ for Indian currency.
2. Never invent transactions.
3. Never claim access to live bank, PhonePe, Google Pay or Paytm data.
4. Only use financial data supplied by the backend.
5. Never claim a transaction was saved unless the backend actually saved it.
6. Do not promise investment returns.
7. Do not claim to be a licensed financial advisor.
8. For investment questions, provide general educational information and mention that users should verify decisions independently.

Keep responses concise and useful.
"""


# ============================================================
# CHAT ENDPOINT
# ============================================================

@chat.route("/chat", methods=["POST"])
def chat_message():
    try:
        # ----------------------------------------------------
        # AUTHENTICATION
        # ----------------------------------------------------

        user_id = get_current_user_id()

        if not user_id:
            return jsonify({
                "success": False,
                "error": "Authentication required.",
            }), 401

        # ----------------------------------------------------
        # GROQ
        # ----------------------------------------------------

        if not GROQ_API_KEY or groq_client is None:
            return jsonify({
                "success": False,
                "error": (
                    "GROQ_API_KEY is not configured "
                    "in backend/.env"
                ),
            }), 500

        # ----------------------------------------------------
        # REQUEST
        # ----------------------------------------------------

        data = request.get_json(silent=True) or {}

        message = (
            data.get("message")
            or data.get("prompt")
            or data.get("text")
            or ""
        ).strip()

        if not message:
            return jsonify({
                "success": False,
                "error": "Message is required.",
            }), 400

        # ----------------------------------------------------
        # TRANSACTION COMMAND
        # ----------------------------------------------------

        transaction_command = extract_transaction_command(message)

        if transaction_command:
            transaction_result = save_transaction(
                user_id=user_id,
                amount=transaction_command["amount"],
                category=transaction_command["category"],
                description=transaction_command["description"],
            )

            if not transaction_result.get("success"):
                return jsonify({
                    "success": False,
                    "error": (
                        "I understood the transaction "
                        "but could not save it."
                    ),
                    "details": transaction_result.get("error"),
                }), 500

            category = transaction_result["category"]
            amount = transaction_result["amount"]

            budget_result = check_spending_limit(
                user_id,
                category,
            )

            response_text = (
                f"✅ Added ₹{amount:,.0f} "
                f"to {category} expenses."
            )

            if budget_result.get("has_limit"):
                alert = budget_result.get("alert")

                if alert:
                    response_text += f"\n\n{alert}"

            return jsonify({
                "success": True,
                "message": response_text,
                "response": response_text,
                "reply": response_text,
                "user_id": user_id,
                "transaction_added": True,
                "transaction": {
                    "id": transaction_result.get("transaction_id"),
                    "amount": amount,
                    "category": category,
                    "type": "expense",
                },
                "budget_alert": budget_result,
                "model": GROQ_MODEL,
            }), 200

        # ----------------------------------------------------
        # FINANCIAL CONTEXT
        # ----------------------------------------------------

        financial_data = get_financial_context(user_id)

        context = f"""
USER ID:
{user_id}

CURRENT DATE:
{date.today().isoformat()}

TRANSACTIONS:
{financial_data["transactions"]}

GOALS:
{financial_data["goals"]}

SPENDING LIMITS:
{financial_data["limits"]}

IMPORTANT:
Use only the financial data above.
If the requested information is not present, say that it is not available.
Do not invent amounts or transactions.
"""

        # ----------------------------------------------------
        # OPTIONAL CONVERSATION HISTORY
        # ----------------------------------------------------

        history = data.get("conversation_history") or []

        messages = [
            {
                "role": "system",
                "content": SYSTEM_PROMPT,
            }
        ]

        if isinstance(history, list):
            for item in history[-8:]:
                if not isinstance(item, dict):
                    continue

                role = item.get("role")
                content = (
                    item.get("message")
                    or item.get("text")
                    or item.get("content")
                    or ""
                )

                if role in ("user", "assistant") and content:
                    messages.append({
                        "role": role,
                        "content": str(content),
                    })

        messages.append({
            "role": "user",
            "content": (
                context
                + "\n\nUSER MESSAGE:\n"
                + message
            ),
        })

        # ----------------------------------------------------
        # GROQ REQUEST
        # ----------------------------------------------------

        completion = groq_client.chat.completions.create(
            model=GROQ_MODEL,
            messages=messages,
            temperature=0.3,
            max_tokens=800,
        )

        answer = ""

        if completion.choices:
            answer = (
                completion.choices[0]
                .message
                .content
                or ""
            ).strip()

        if not answer:
            return jsonify({
                "success": False,
                "error": "Groq returned an empty response.",
            }), 500

        return jsonify({
            "success": True,
            "message": answer,
            "response": answer,
            "reply": answer,
            "user_id": user_id,
            "transaction_added": False,
            "transaction": None,
            "budget_alert": None,
            "model": GROQ_MODEL,
        }), 200

    except Exception as e:
        print("\n====================================")
        print("AMIVEST GROQ ERROR")
        print("====================================")
        traceback.print_exc()

        return jsonify({
            "success": False,
            "error": str(e),
        }), 500
