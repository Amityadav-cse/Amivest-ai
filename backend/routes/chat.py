"""
AmiVest Alexa AI - FULL chat.py replacement

- Groq text chat
- Live financial context from the database
- Safe handling of NULL / None values
- Short answers
- Direct "add 500 in food" transaction support
- Current balance calculation from all transactions
- Optional stored dashboard/account balance detection
- No <think> output
"""

from __future__ import annotations

import logging
import os
import re
import time
from datetime import date
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from flask import Blueprint, jsonify, request, session
from groq import Groq

from database.db import get_connection


# ============================================================
# ENVIRONMENT
# ============================================================

BASE_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BASE_DIR / ".env")
load_dotenv(BASE_DIR.parent / ".env")

logger = logging.getLogger("amivest.chat")

if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(
        logging.Formatter(
            "[%(levelname)s] %(name)s: %(message)s"
        )
    )
    logger.addHandler(handler)

logger.setLevel(
    os.getenv("LOG_LEVEL", "INFO").upper()
)


# ============================================================
# BLUEPRINT
# ============================================================

chat = Blueprint("chat", __name__)


# ============================================================
# GROQ
# ============================================================

GROQ_API_KEY = os.getenv(
    "GROQ_API_KEY",
    ""
).strip()

GROQ_MODEL = os.getenv(
    "GROQ_MODEL",
    ""
).strip()

MAX_MESSAGE_LENGTH = 2000
MAX_HISTORY_ITEMS = 8

MODEL_PRIORITY = [
    "openai/gpt-oss-20b",
    "llama-3.1-8b-instant",
    "llama-3.3-70b-versatile",
    "qwen/qwen3.6-27b",
]

EXCLUDED_MODEL_WORDS = (
    "whisper",
    "guard",
    "safeguard",
    "speech",
    "audio",
    "tts",
    "embed",
)

groq_client = None

if GROQ_API_KEY:
    try:
        groq_client = Groq(
            api_key=GROQ_API_KEY
        )
    except Exception:
        logger.exception(
            "Could not initialize Groq."
        )
else:
    logger.warning(
        "GROQ_API_KEY is missing."
    )


_model_cache = {
    "ids": [],
    "fetched_at": 0.0,
}


# ============================================================
# SAFE VALUE HELPERS
# ============================================================

def safe_decimal(value) -> Decimal:
    """
    Convert None / Decimal / int / float / string safely.

    NEVER raises because of None.
    """

    if value is None:
        return Decimal("0")

    if isinstance(value, Decimal):
        return value

    try:
        return Decimal(str(value))
    except (
        InvalidOperation,
        ValueError,
        TypeError,
    ):
        return Decimal("0")


def safe_float(value) -> float:
    return float(safe_decimal(value))


def money(value) -> str:
    """
    Safe currency formatter.

    This is the important fix for:
    unsupported format string passed to NoneType.__format__
    """

    amount = safe_decimal(value)

    return f"₹{amount:,.2f}"


def clean_text(value) -> str:
    if value is None:
        return ""

    return str(value).strip()


def clean_ai_answer(answer) -> str:
    """
    Remove accidental chain-of-thought wrappers.
    """

    text = clean_text(answer)

    text = re.sub(
        r"<think>.*?</think>",
        "",
        text,
        flags=re.IGNORECASE | re.DOTALL,
    )

    text = re.sub(
        r"^\s*<think>.*$",
        "",
        text,
        flags=re.IGNORECASE | re.DOTALL,
    )

    text = text.replace(
        "```text",
        ""
    ).replace(
        "```",
        ""
    )

    return text.strip()


# ============================================================
# CURRENT USER
# ============================================================

def get_current_user_id():
    """
    Support the session names used by AmiVest.
    """

    user_id = (
        session.get("user_id")
        or session.get("userId")
        or session.get("id")
    )

    if user_id:
        try:
            return int(user_id)
        except (
            ValueError,
            TypeError,
        ):
            return user_id

    return None


# ============================================================
# DATABASE HELPERS
# ============================================================

def fetch_all(
    cursor,
    query: str,
    params=(),
):
    try:
        cursor.execute(
            query,
            params,
        )
        return cursor.fetchall() or []
    except Exception:
        logger.exception(
            "Database query failed."
        )
        return []


def table_columns(cursor, table_name: str) -> set[str]:
    """
    Discover columns safely so this chat route can work with
    slightly different versions of the AmiVest database.
    """

    try:
        cursor.execute(
            """
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = %s
            """,
            (table_name,),
        )

        rows = cursor.fetchall() or []

        result = set()

        for row in rows:
            if isinstance(row, dict):
                value = row.get("COLUMN_NAME")
            else:
                value = row[0] if row else None

            if value:
                result.add(str(value))

        return result

    except Exception:
        return set()


# ============================================================
# TRANSACTIONS
# ============================================================

def get_transactions(
    cursor,
    user_id,
    limit=100,
):
    return fetch_all(
        cursor,
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
        LIMIT %s
        """,
        (
            user_id,
            int(limit),
        ),
    )


def calculate_transaction_balance(
    cursor,
    user_id,
):
    """
    Calculate balance from the complete transaction ledger.

    Positive amount = income
    Negative amount = expense
    """

    try:
        cursor.execute(
            """
            SELECT
                COALESCE(SUM(amount), 0) AS balance,

                COALESCE(
                    SUM(
                        CASE
                            WHEN amount > 0
                            THEN amount
                            ELSE 0
                        END
                    ),
                    0
                ) AS income,

                COALESCE(
                    SUM(
                        CASE
                            WHEN amount < 0
                            THEN ABS(amount)
                            ELSE 0
                        END
                    ),
                    0
                ) AS expenses

            FROM transactions
            WHERE user_id = %s
            """,
            (user_id,),
        )

        row = cursor.fetchone() or {}

        return {
            "balance": safe_decimal(
                row.get("balance")
                if isinstance(row, dict)
                else 0
            ),
            "income": safe_decimal(
                row.get("income")
                if isinstance(row, dict)
                else 0
            ),
            "expenses": safe_decimal(
                row.get("expenses")
                if isinstance(row, dict)
                else 0
            ),
        }

    except Exception:
        logger.exception(
            "Could not calculate transaction balance."
        )

        return {
            "balance": Decimal("0"),
            "income": Decimal("0"),
            "expenses": Decimal("0"),
        }


# ============================================================
# STORED DASHBOARD BALANCE
# ============================================================

def get_stored_balance(
    cursor,
    user_id,
):
    """
    If the users table contains a dashboard/account balance,
    use it as the primary balance.

    Different project versions may use different column names.
    """

    columns = table_columns(
        cursor,
        "users",
    )

    possible_columns = [
        "current_balance",
        "balance",
        "account_balance",
        "available_balance",
        "total_balance",
    ]

    selected = next(
        (
            column
            for column in possible_columns
            if column in columns
        ),
        None,
    )

    if not selected:
        return None

    # Column name comes from INFORMATION_SCHEMA, not user input.
    query = f"""
        SELECT `{selected}` AS dashboard_balance
        FROM users
        WHERE id = %s
        LIMIT 1
    """

    try:
        cursor.execute(
            query,
            (user_id,),
        )

        row = cursor.fetchone()

        if not row:
            return None

        value = (
            row.get("dashboard_balance")
            if isinstance(row, dict)
            else row[0]
        )

        if value is None:
            return None

        return safe_decimal(value)

    except Exception:
        logger.exception(
            "Could not read stored dashboard balance."
        )
        return None


# ============================================================
# MONTHLY SUMMARY
# ============================================================

def get_month_summary(
    cursor,
    user_id,
):
    try:
        month_start = date.today().replace(
            day=1
        )

        cursor.execute(
            """
            SELECT
                COALESCE(
                    SUM(
                        CASE
                            WHEN amount > 0
                            THEN amount
                            ELSE 0
                        END
                    ),
                    0
                ) AS income,

                COALESCE(
                    SUM(
                        CASE
                            WHEN amount < 0
                            THEN ABS(amount)
                            ELSE 0
                        END
                    ),
                    0
                ) AS expenses

            FROM transactions
            WHERE user_id = %s
              AND transaction_date >= %s
            """,
            (
                user_id,
                month_start,
            ),
        )

        row = cursor.fetchone() or {}

        return {
            "income": safe_decimal(
                row.get("income")
                if isinstance(row, dict)
                else 0
            ),
            "expenses": safe_decimal(
                row.get("expenses")
                if isinstance(row, dict)
                else 0
            ),
        }

    except Exception:
        logger.exception(
            "Could not calculate monthly summary."
        )

        return {
            "income": Decimal("0"),
            "expenses": Decimal("0"),
        }


# ============================================================
# GOALS
# ============================================================

def get_goals(
    cursor,
    user_id,
):
    return fetch_all(
        cursor,
        """
        SELECT *
        FROM goals
        WHERE user_id = %s
        ORDER BY id DESC
        LIMIT 50
        """,
        (user_id,),
    )


# ============================================================
# SPENDING LIMITS
# ============================================================

def get_limits(
    cursor,
    user_id,
):
    columns = table_columns(
        cursor,
        "spending_limits",
    )

    if not columns:
        return []

    # Keep compatibility with common versions.
    if "monthly_limit" in columns:
        return fetch_all(
            cursor,
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

    if "limit_amount" in columns:
        return fetch_all(
            cursor,
            """
            SELECT
                id,
                category,
                limit_amount AS monthly_limit
            FROM spending_limits
            WHERE user_id = %s
            ORDER BY category
            """,
            (user_id,),
        )

    return fetch_all(
        cursor,
        """
        SELECT *
        FROM spending_limits
        WHERE user_id = %s
        LIMIT 50
        """,
        (user_id,),
    )


# ============================================================
# LIVE FINANCIAL CONTEXT
# ============================================================

def get_financial_context(
    user_id,
):
    conn = None
    cursor = None

    try:
        conn = get_connection()

        if conn is None:
            raise RuntimeError(
                "Database connection failed."
            )

        cursor = conn.cursor(
            dictionary=True
        )

        ledger = calculate_transaction_balance(
            cursor,
            user_id,
        )

        stored_balance = get_stored_balance(
            cursor,
            user_id,
        )

        # Stored dashboard balance wins if it exists.
        if stored_balance is not None:
            current_balance = stored_balance
            balance_source = "dashboard"
        else:
            current_balance = ledger["balance"]
            balance_source = "transactions"

        month = get_month_summary(
            cursor,
            user_id,
        )

        transactions = get_transactions(
            cursor,
            user_id,
        )

        goals = get_goals(
            cursor,
            user_id,
        )

        limits = get_limits(
            cursor,
            user_id,
        )

        return {
            "current_balance": current_balance,
            "balance_source": balance_source,

            "total_income": ledger["income"],
            "total_expenses": ledger["expenses"],

            "monthly_income": month["income"],
            "monthly_expenses": month["expenses"],

            "transactions": transactions,
            "goals": goals,
            "limits": limits,
        }

    except Exception:
        logger.exception(
            "Financial context failed."
        )

        return {
            "current_balance": Decimal("0"),
            "balance_source": "unavailable",

            "total_income": Decimal("0"),
            "total_expenses": Decimal("0"),

            "monthly_income": Decimal("0"),
            "monthly_expenses": Decimal("0"),

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
# SYSTEM PROMPT
# ============================================================

SYSTEM_PROMPT = """
You are AmiVest Alexa AI inside FinSaathi.

You are connected to the user's LIVE financial data supplied by
the backend.

IMPORTANT:
Use LIVE FINANCIAL DATA directly.

Never say:
"I don't have access to your balance"
when CURRENT BALANCE is supplied.

Never invent financial numbers.

RESPONSE STYLE:
- Answer the exact question.
- Keep normal answers to 1-3 short sentences.
- Do not show reasoning.
- Never output <think>...</think>.
- Do not give long disclaimers.
- Use ₹ for Indian currency.
- Reply in English, Hindi or Hinglish according to the user.

PURCHASE QUESTIONS:
If the user asks whether they can buy something:
- Use the current balance.
- If a price is given, calculate the remaining balance.
- Consider active goals and spending commitments when useful.
- Give a direct YES / NO / NEED PRICE answer.

Example:
User: Can I buy an iPhone for ₹70000?
Assistant: Your current balance is ₹95,000, so yes—you would have ₹25,000 left.

If insufficient:
Assistant: No. Your current balance is ₹45,000, so you're ₹25,000 short.

If price is missing:
Assistant: Your current balance is ₹95,000. Tell me the iPhone price and I'll check it.

FINANCIAL SAFETY:
- Do not claim to be a licensed financial advisor.
- Do not promise investment returns.
- Investment answers are general educational information.

TRANSACTION COMMANDS:
If the backend reports that a transaction was successfully saved,
tell the user it was saved.
Never claim a transaction was saved if it failed.
"""


# ============================================================
# BUILD GROQ CONTEXT
# ============================================================

def build_context(
    user_id,
    financial,
):
    return f"""
LIVE FINANCIAL DATA FOR USER {user_id}

CURRENT BALANCE:
{money(financial.get("current_balance"))}

BALANCE SOURCE:
{financial.get("balance_source", "unavailable")}

TOTAL INCOME:
{money(financial.get("total_income"))}

TOTAL EXPENSES:
{money(financial.get("total_expenses"))}

THIS MONTH INCOME:
{money(financial.get("monthly_income"))}

THIS MONTH EXPENSES:
{money(financial.get("monthly_expenses"))}

ACTIVE GOALS:
{financial.get("goals")}

SPENDING LIMITS:
{financial.get("limits")}

RECENT TRANSACTIONS:
{financial.get("transactions")}

IMPORTANT:
These values come from the user's backend database.
Use them directly.
"""


# ============================================================
# GROQ MODEL SELECTION
# ============================================================

def get_model_ids(
    force_refresh=False,
):
    if groq_client is None:
        return []

    now = time.monotonic()

    stale = (
        now - _model_cache["fetched_at"]
        > 300
    )

    if (
        not force_refresh
        and not stale
        and _model_cache["ids"]
    ):
        return _model_cache["ids"]

    try:
        result = groq_client.models.list()

        ids = []

        for model in getattr(
            result,
            "data",
            [],
        ):
            model_id = getattr(
                model,
                "id",
                None,
            )

            if not model_id:
                continue

            model_id = str(model_id)

            lowered = model_id.lower()

            if any(
                word in lowered
                for word in EXCLUDED_MODEL_WORDS
            ):
                continue

            ids.append(model_id)

        _model_cache["ids"] = ids
        _model_cache["fetched_at"] = now

        return ids

    except Exception:
        logger.exception(
            "Could not list Groq models."
        )

        return []


def choose_models():
    available = get_model_ids()

    if GROQ_MODEL:
        if not available or GROQ_MODEL in available:
            return [GROQ_MODEL]

    selected = [
        model
        for model in MODEL_PRIORITY
        if not available
        or model in available
    ]

    if selected:
        return selected

    return available[:5]


# ============================================================
# GROQ CHAT
# ============================================================

def groq_chat(
    messages,
):
    if groq_client is None:
        raise RuntimeError(
            "Groq client is not available."
        )

    models = choose_models()

    if not models:
        raise RuntimeError(
            "No compatible Groq chat model is available."
        )

    last_error = None

    for model in models:

        try:
            completion = groq_client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=0.2,
                max_tokens=250,
            )

            choices = getattr(
                completion,
                "choices",
                [],
            )

            if not choices:
                last_error = (
                    f"{model}: no choices returned"
                )
                continue

            message = getattr(
                choices[0],
                "message",
                None,
            )

            answer = clean_ai_answer(
                getattr(
                    message,
                    "content",
                    "",
                )
            )

            if answer:
                return answer, model

            last_error = (
                f"{model}: empty answer"
            )

        except Exception as exc:
            last_error = str(exc)

            logger.warning(
                "Groq model %s failed: %s",
                model,
                exc,
            )

            continue

    raise RuntimeError(
        last_error
        or "Groq request failed."
    )


# ============================================================
# DIRECT TRANSACTION PARSER
# ============================================================

def parse_transaction_command(
    message,
):
    """
    Supports examples:

    add 500 in food
    add ₹500 food
    spent 500 on food
    expense 500 for travel
    """

    text = clean_text(
        message
    ).lower()

    patterns = [
        r"^\s*(?:add|spent|spend|expense|paid)\s+₹?\s*([\d,]+(?:\.\d+)?)\s+(?:in|on|for)\s+(.+?)\s*$",
        r"^\s*(?:add|spent|spend|expense|paid)\s+(.+?)\s+₹?\s*([\d,]+(?:\.\d+)?)\s*$",
    ]

    for index, pattern in enumerate(patterns):

        match = re.match(
            pattern,
            text,
        )

        if not match:
            continue

        if index == 0:
            amount_text = match.group(1)
            category = match.group(2)
        else:
            category = match.group(1)
            amount_text = match.group(2)

        amount_text = amount_text.replace(
            ",",
            "",
        )

        try:
            amount = Decimal(
                amount_text
            )
        except InvalidOperation:
            return None

        if amount <= 0:
            return None

        category = re.sub(
            r"\s+",
            " ",
            category,
        ).strip()

        if not category:
            return None

        return {
            "amount": amount,
            "category": category[:100],
        }

    return None


# ============================================================
# SAVE TRANSACTION
# ============================================================

def save_expense(
    user_id,
    amount,
    category,
    description=None,
):
    conn = None
    cursor = None

    try:
        conn = get_connection()

        if conn is None:
            raise RuntimeError(
                "Database unavailable."
            )

        cursor = conn.cursor()

        # Expenses are stored as negative amounts.
        negative_amount = -abs(
            safe_decimal(amount)
        )

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
            (
                %s,
                'expense',
                %s,
                %s,
                %s,
                %s
            )
            """,
            (
                user_id,
                category,
                negative_amount,
                description
                or f"{category} expense",
                date.today(),
            ),
        )

        conn.commit()

        transaction_id = cursor.lastrowid

        return {
            "success": True,
            "id": transaction_id,
        }

    except Exception:
        if conn:
            try:
                conn.rollback()
            except Exception:
                pass

        logger.exception(
            "Could not save transaction."
        )

        return {
            "success": False,
            "id": None,
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
# TRANSACTION RESPONSE
# ============================================================

def direct_transaction_response(
    user_id,
    message,
):
    parsed = parse_transaction_command(
        message
    )

    if parsed is None:
        return None

    amount = parsed["amount"]
    category = parsed["category"]

    result = save_expense(
        user_id=user_id,
        amount=amount,
        category=category,
    )

    if not result["success"]:
        return (
            {
                "success": False,
                "error": "I couldn't save that expense.",
                "transaction_added": False,
            },
            500,
        )

    # Fresh balance after saving.
    fresh = get_financial_context(
        user_id
    )

    balance = fresh.get(
        "current_balance"
    )

    response_text = (
        f"Done. Added {money(amount)} "
        f"to {category}."
    )

    # Only show balance if we have meaningful backend data.
    if (
        fresh.get("balance_source")
        != "unavailable"
    ):
        response_text += (
            f" Your current balance is "
            f"{money(balance)}."
        )

    return (
        {
            "success": True,
            "message": response_text,
            "response": response_text,
            "reply": response_text,
            "answer": response_text,
            "transaction_added": True,
            "transaction": {
                "id": result["id"],
                "amount": float(amount),
                "category": category,
                "type": "expense",
            },
            "model": "direct-transaction",
        },
        200,
    )


# ============================================================
# BUILD MESSAGES
# ============================================================

def build_messages(
    user_id,
    message,
    history,
):
    financial = get_financial_context(
        user_id
    )

    context = build_context(
        user_id,
        financial,
    )

    messages = [
        {
            "role": "system",
            "content": SYSTEM_PROMPT,
        }
    ]

    if isinstance(
        history,
        list,
    ):
        for item in history[
            -MAX_HISTORY_ITEMS:
        ]:

            if not isinstance(
                item,
                dict,
            ):
                continue

            role = item.get(
                "role"
            )

            content = (
                item.get("message")
                or item.get("text")
                or item.get("content")
                or ""
            )

            if (
                role in (
                    "user",
                    "assistant",
                )
                and content
            ):
                messages.append(
                    {
                        "role": role,
                        "content": clean_text(
                            content
                        ),
                    }
                )

    messages.append(
        {
            "role": "user",
            "content": (
                context
                + "\n\nUSER MESSAGE:\n"
                + message
                + "\n\nGive ONLY the short final answer."
            ),
        }
    )

    return messages


# ============================================================
# CHAT ENDPOINT
# ============================================================

@chat.route(
    "/chat",
    methods=["POST"],
)
def chat_message():

    try:

        user_id = get_current_user_id()

        if not user_id:
            return jsonify({
                "success": False,
                "error": (
                    "Authentication required. "
                    "Please login again."
                ),
                "code": "authentication_required",
            }), 401

        if not GROQ_API_KEY:
            return jsonify({
                "success": False,
                "error": (
                    "GROQ_API_KEY is missing "
                    "from backend/.env"
                ),
                "code": "groq_key_missing",
            }), 500

        if groq_client is None:
            return jsonify({
                "success": False,
                "error": (
                    "Groq client could not be initialized."
                ),
            }), 500

        data = request.get_json(
            silent=True
        ) or {}

        message = clean_text(
            data.get("message")
            or data.get("prompt")
            or data.get("text")
        )

        if not message:
            return jsonify({
                "success": False,
                "error": "Message is required.",
            }), 400

        if len(message) > MAX_MESSAGE_LENGTH:
            return jsonify({
                "success": False,
                "error": (
                    f"Message is too long "
                    f"(max {MAX_MESSAGE_LENGTH} characters)."
                ),
            }), 400

        # Direct transaction command.
        direct = direct_transaction_response(
            user_id,
            message,
        )

        if direct is not None:
            body, status = direct

            return jsonify(
                body
            ), status

        history = data.get(
            "conversation_history"
        ) or []

        messages = build_messages(
            user_id,
            message,
            history,
        )

        answer, model_used = groq_chat(
            messages
        )

        return jsonify({
            "success": True,
            "message": answer,
            "response": answer,
            "reply": answer,
            "answer": answer,
            "user_id": user_id,
            "transaction_added": False,
            "transaction": None,
            "budget_alert": None,
            "model": model_used,
        }), 200

    except Exception as exc:

        logger.exception(
            "Unhandled /chat error"
        )

        # Do not expose a Python traceback to the UI.
        return jsonify({
            "success": False,
            "error": str(exc),
            "code": "groq_chat_error",
        }), 500


# ============================================================
# LIVE DASHBOARD CONTEXT DEBUG ENDPOINT
# ============================================================

@chat.route(
    "/chat/dashboard-context",
    methods=["GET"],
)
def dashboard_context():

    try:

        user_id = get_current_user_id()

        if not user_id:
            return jsonify({
                "success": False,
                "error": "Authentication required.",
            }), 401

        financial = get_financial_context(
            user_id
        )

        return jsonify({
            "success": True,
            "dashboard": {
                "current_balance": float(
                    safe_decimal(
                        financial.get(
                            "current_balance"
                        )
                    )
                ),
                "balance_source": financial.get(
                    "balance_source"
                ),
                "total_income": float(
                    safe_decimal(
                        financial.get(
                            "total_income"
                        )
                    )
                ),
                "total_expenses": float(
                    safe_decimal(
                        financial.get(
                            "total_expenses"
                        )
                    )
                ),
                "monthly_income": float(
                    safe_decimal(
                        financial.get(
                            "monthly_income"
                        )
                    )
                ),
                "monthly_expenses": float(
                    safe_decimal(
                        financial.get(
                            "monthly_expenses"
                        )
                    )
                ),
                "goals": financial.get(
                    "goals"
                ),
                "limits": financial.get(
                    "limits"
                ),
            },
        }), 200

    except Exception as exc:

        logger.exception(
            "Dashboard context failed."
        )

        return jsonify({
            "success": False,
            "error": str(exc),
        }), 500
