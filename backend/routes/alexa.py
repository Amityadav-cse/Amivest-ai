from flask import Blueprint, jsonify, request, session
from database.db import get_connection
from datetime import datetime, date
from werkzeug.security import generate_password_hash, check_password_hash
import re
import traceback

alexa = Blueprint("alexa", __name__, url_prefix="/alexa")

# Voice-triggered logout is locked out after this many wrong answers,
# so a stranger who picks up the mic cannot brute-force the question.
MAX_SECURITY_ATTEMPTS = 3


# ================================================================
# GENERAL HELPERS
# ================================================================

def _json_error(message, status=400, **extra):
    payload = {
        "success": False,
        "handled": True,
        "error": message,
    }
    payload.update(extra)
    return jsonify(payload), status


def _json_ok(message, **extra):
    payload = {
        "success": True,
        "handled": True,
        "message": message,
    }
    payload.update(extra)
    return jsonify(payload), 200


def _current_user_id():
    value = session.get("user_id")
    if value is None:
        return None

    try:
        return int(value)
    except Exception:
        return value


def _clean(value):
    if value is None:
        return ""
    return str(value).strip()


def _money(value):
    try:
        return float(value)
    except Exception:
        return 0.0


def _normalize(text):
    text = _clean(text).lower()
    text = text.replace("₹", " rs ")
    text = text.replace(",", "")
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def _extract_amount(text):
    normalized = _normalize(text)

    patterns = [
        r"(?:rs\.?|inr|rupees?)\s*([0-9]+(?:\.[0-9]+)?)",
        r"([0-9]+(?:\.[0-9]+)?)\s*(?:rs|inr|rupees?)",
        r"\b([0-9]+(?:\.[0-9]+)?)\b",
    ]

    for pattern in patterns:
        match = re.search(pattern, normalized)
        if match:
            try:
                return float(match.group(1))
            except Exception:
                pass

    return None


def _extract_date(text):
    normalized = _normalize(text)

    if "today" in normalized:
        return date.today().isoformat()

    if "yesterday" in normalized:
        from datetime import timedelta
        return (date.today() - timedelta(days=1)).isoformat()

    patterns = [
        r"\b(20\d{2}-\d{1,2}-\d{1,2})\b",
        r"\b(\d{1,2}/\d{1,2}/20\d{2})\b",
        r"\b(\d{1,2}-\d{1,2}-20\d{2})\b",
    ]

    for pattern in patterns:
        match = re.search(pattern, normalized)
        if not match:
            continue

        raw = match.group(1)

        for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"):
            try:
                return datetime.strptime(raw, fmt).date().isoformat()
            except Exception:
                pass

    return None


# ================================================================
# DATABASE SCHEMA DISCOVERY
#
# The project has evolved over time. Instead of hard-coding one
# exact schema, this module discovers the useful table/column names.
# This makes Alexa work with common variations such as:
#   goal / goals
#   transaction / transactions
#   budget / budgets
#   loan / loans
#   investment / investments
# ================================================================

TABLE_ALIASES = {
    "goals": [
        "goals",
        "goal",
        "financial_goals",
        "saving_goals",
    ],
    "transactions": [
        "transactions",
        "transaction",
        "expenses",
        "expense",
    ],
    "budgets": [
        "budgets",
        "budget",
        "monthly_budgets",
    ],
    "loans": [
        "loans",
        "loan",
    ],
    "investments": [
        "investments",
        "investment",
        "portfolio",
    ],
    "users": [
        "users",
        "user",
    ],
    "notifications": [
        "notifications",
        "notification",
    ],
}


COLUMN_ALIASES = {
    "id": [
        "id",
        "goal_id",
        "transaction_id",
        "expense_id",
        "budget_id",
        "loan_id",
        "investment_id",
        "user_id",
    ],
    "user_id": [
        "user_id",
        "userid",
        "userId",
        "owner_id",
        "account_id",
    ],
    "name": [
        "name",
        "goal_name",
        "title",
        "goal_title",
        "description",
        "label",
    ],
    "title": [
        "title",
        "name",
        "goal_name",
        "loan_name",
        "investment_name",
    ],
    "amount": [
        "amount",
        "value",
        "expense",
        "spent",
        "cost",
        "price",
        "transaction_amount",
    ],
    "target": [
        "target_amount",
        "target",
        "goal_amount",
        "target_value",
        "amount",
    ],
    "current": [
        "current_amount",
        "saved_amount",
        "saved",
        "current",
        "progress",
        "amount_saved",
    ],
    "category": [
        "category",
        "type",
        "expense_category",
        "transaction_type",
    ],
    "date": [
        "date",
        "expense_date",
        "transaction_date",
        "spent_at",
        "entry_date",
        "created_at",
    ],
    "deadline": [
        "deadline",
        "target_date",
        "due_date",
        "end_date",
    ],
    "description": [
        "description",
        "note",
        "notes",
        "remarks",
        "details",
    ],
    "created_at": [
        "created_at",
        "created",
        "created_on",
    ],
    "updated_at": [
        "updated_at",
        "updated",
        "updated_on",
    ],
}


def _all_tables(cursor):
    cursor.execute("SHOW TABLES")
    rows = cursor.fetchall() or []

    result = []

    for row in rows:
        if isinstance(row, dict):
            values = list(row.values())
            if values:
                result.append(str(values[0]))
        elif isinstance(row, (tuple, list)) and row:
            result.append(str(row[0]))

    return result


def _find_table(cursor, logical_name):
    tables = _all_tables(cursor)

    normalized = {
        _normalize(table).replace(" ", "_"): table
        for table in tables
    }

    for alias in TABLE_ALIASES.get(logical_name, []):
        key = _normalize(alias).replace(" ", "_")
        if key in normalized:
            return normalized[key]

    return None


def _columns(cursor, table):
    cursor.execute(f"SHOW COLUMNS FROM `{table}`")
    rows = cursor.fetchall() or []

    names = []

    for row in rows:
        if isinstance(row, dict):
            field = row.get("Field")
            if field:
                names.append(str(field))
        elif isinstance(row, (tuple, list)) and row:
            names.append(str(row[0]))

    return names


def _find_column(columns, logical_name, required=False):
    lower = {str(c).lower(): c for c in columns}

    for alias in COLUMN_ALIASES.get(logical_name, []):
        if alias.lower() in lower:
            return lower[alias.lower()]

    if required:
        return None

    return None


def _quote(identifier):
    return "`" + str(identifier).replace("`", "``") + "`"


def _table_info(cursor, logical_name):
    table = _find_table(cursor, logical_name)

    if not table:
        return None

    cols = _columns(cursor, table)

    info = {
        "table": table,
        "columns": cols,
        "id": _find_column(cols, "id"),
        "user_id": _find_column(cols, "user_id"),
        "name": _find_column(cols, "name"),
        "title": _find_column(cols, "title"),
        "amount": _find_column(cols, "amount"),
        "target": _find_column(cols, "target"),
        "current": _find_column(cols, "current"),
        "category": _find_column(cols, "category"),
        "date": _find_column(cols, "date"),
        "deadline": _find_column(cols, "deadline"),
        "description": _find_column(cols, "description"),
        "created_at": _find_column(cols, "created_at"),
        "updated_at": _find_column(cols, "updated_at"),
    }

    return info


# ================================================================
# USERS TABLE / SECURITY QUESTION
#
# Voice-triggered logout requires a stored security question and a
# HASHED answer (never the plaintext answer). These helpers look for
# literal `security_question` / `security_answer_hash` columns on the
# users table. If they are missing, voice logout is simply disabled
# with a clear message rather than silently accepting any answer.
# ================================================================

def _users_table_info(cursor):
    table = _find_table(cursor, "users")

    if not table:
        return None

    cols = _columns(cursor, table)
    lower = {c.lower(): c for c in cols}

    return {
        "table": table,
        "columns": cols,
        "id": _find_column(cols, "id"),
        "security_question": lower.get("security_question"),
        "security_answer_hash": lower.get("security_answer_hash"),
    }


def get_user_security_question(user_id):
    conn = get_connection()
    if not conn:
        return None

    cursor = None

    try:
        cursor = conn.cursor(dictionary=True)
        info = _users_table_info(cursor)

        if not info or not info.get("id") or not info.get("security_question"):
            return None

        cursor.execute(
            f"SELECT {_quote(info['security_question'])} AS q "
            f"FROM {_quote(info['table'])} "
            f"WHERE {_quote(info['id'])} = %s",
            (user_id,),
        )

        row = cursor.fetchone()
        question = row.get("q") if row else None

        return question or None

    except Exception:
        traceback.print_exc()
        return None

    finally:
        if cursor:
            cursor.close()
        conn.close()


def verify_user_security_answer(user_id, answer):
    conn = get_connection()
    if not conn:
        return False

    cursor = None

    try:
        cursor = conn.cursor(dictionary=True)
        info = _users_table_info(cursor)

        if not info or not info.get("id") or not info.get("security_answer_hash"):
            return False

        cursor.execute(
            f"SELECT {_quote(info['security_answer_hash'])} AS h "
            f"FROM {_quote(info['table'])} "
            f"WHERE {_quote(info['id'])} = %s",
            (user_id,),
        )

        row = cursor.fetchone()

        if not row or not row.get("h"):
            return False

        # Normalize the same way the answer was hashed when it was set.
        return check_password_hash(row["h"], _clean(answer).strip().lower())

    except Exception:
        traceback.print_exc()
        return False

    finally:
        if cursor:
            cursor.close()
        conn.close()


def set_user_security_question(user_id, question, answer):
    conn = get_connection()
    if not conn:
        return _json_error("Database unavailable.", 500)

    cursor = None

    try:
        cursor = conn.cursor(dictionary=True)
        info = _users_table_info(cursor)

        if not info or not info.get("id"):
            return _json_error("Users table was not found.", 404)

        if not info.get("security_question") or not info.get("security_answer_hash"):
            return _json_error(
                "Your users table needs security_question and "
                "security_answer_hash columns first. See the migration "
                "note in the setup docs."
            )

        answer_hash = generate_password_hash(answer.strip().lower())

        cursor.execute(
            f"UPDATE {_quote(info['table'])} "
            f"SET {_quote(info['security_question'])} = %s, "
            f"{_quote(info['security_answer_hash'])} = %s "
            f"WHERE {_quote(info['id'])} = %s",
            (question, answer_hash, user_id),
        )

        conn.commit()

        return _json_ok("Your security question has been saved.")

    except Exception as exc:
        conn.rollback()
        traceback.print_exc()
        return _json_error(str(exc), 500)

    finally:
        if cursor:
            cursor.close()
        conn.close()


# ================================================================
# SAFE USER FILTER
# ================================================================

def _user_where(info, user_id):
    column = info.get("user_id")

    if not column:
        return "", []

    return f" WHERE {_quote(column)} = %s ", [user_id]


def _entity_label(row, info):
    for key in ("name", "title", "description"):
        column = info.get(key)
        if column and row.get(column):
            return str(row.get(column))

    identifier = info.get("id")
    if identifier:
        return f"#{row.get(identifier)}"

    return "item"


# ================================================================
# GOALS
# ================================================================

def list_goals(user_id):
    conn = get_connection()
    if not conn:
        return _json_error("Database unavailable.", 500)

    cursor = None

    try:
        cursor = conn.cursor(dictionary=True)
        info = _table_info(cursor, "goals")

        if not info:
            return _json_error("Goals table was not found.", 404)

        columns = [
            info.get("id"),
            info.get("name"),
            info.get("title"),
            info.get("target"),
            info.get("current"),
            info.get("deadline"),
            info.get("description"),
        ]

        selected = []
        for column in columns:
            if column and column not in selected:
                selected.append(_quote(column))

        if not selected:
            selected = ["*"]

        where, params = _user_where(info, user_id)

        sql = (
            f"SELECT {', '.join(selected)} "
            f"FROM {_quote(info['table'])}"
            f"{where}"
        )

        if info.get("id"):
            sql += f" ORDER BY {_quote(info['id'])} DESC"

        cursor.execute(sql, params)
        rows = cursor.fetchall() or []

        result = []

        for row in rows:
            target = (
                _money(row.get(info["target"]))
                if info.get("target")
                else 0
            )

            current = (
                _money(row.get(info["current"]))
                if info.get("current")
                else 0
            )

            result.append({
                "id": row.get(info["id"]) if info.get("id") else None,
                "name": _entity_label(row, info),
                "target": target,
                "current": current,
                "remaining": max(target - current, 0),
                "progress": (
                    round((current / target) * 100, 2)
                    if target > 0
                    else 0
                ),
                "deadline": (
                    str(row.get(info["deadline"]))
                    if info.get("deadline") and row.get(info["deadline"])
                    else None
                ),
            })

        return _json_ok(
            f"You have {len(result)} goal(s).",
            action="list",
            entity="goals",
            items=result,
        )

    except Exception as exc:
        traceback.print_exc()
        return _json_error(str(exc), 500)

    finally:
        if cursor:
            cursor.close()
        conn.close()


def _fetch_goals(cursor, info, user_id):
    where, params = _user_where(info, user_id)

    selected = ["*"]

    sql = (
        f"SELECT {', '.join(selected)} "
        f"FROM {_quote(info['table'])}"
        f"{where}"
    )

    cursor.execute(sql, params)
    return cursor.fetchall() or []


def _match_goal(rows, info, query):
    query = _normalize(query)

    if not query:
        return None, rows

    exact = []
    partial = []

    for row in rows:
        label = _entity_label(row, info)
        normalized_label = _normalize(label)

        if normalized_label == query:
            exact.append(row)
        elif query in normalized_label or normalized_label in query:
            partial.append(row)

    if len(exact) == 1:
        return exact[0], exact

    if len(partial) == 1:
        return partial[0], partial

    if len(exact) > 1:
        return None, exact

    return None, partial


def _goal_amount(row, info):
    if not info.get("current"):
        return 0

    return _money(row.get(info["current"]))


def add_to_goal(user_id, amount, goal_query=""):
    if amount is None or amount <= 0:
        return _json_error("Please provide a positive amount.")

    conn = get_connection()
    if not conn:
        return _json_error("Database unavailable.", 500)

    cursor = None

    try:
        cursor = conn.cursor(dictionary=True)
        info = _table_info(cursor, "goals")

        if not info:
            return _json_error("Goals table was not found.", 404)

        if not info.get("current"):
            return _json_error(
                "Your goals table has no current/saved amount column. "
                "Add one such as current_amount."
            )

        rows = _fetch_goals(cursor, info, user_id)

        if not rows:
            return _json_error(
                "You do not have any goals yet. Create a goal first."
            )

        row, matches = _match_goal(rows, info, goal_query)

        if row is None:
            if len(matches) > 1:
                choices = [
                    {
                        "id": r.get(info["id"]) if info.get("id") else None,
                        "name": _entity_label(r, info),
                    }
                    for r in matches
                ]

                return _json_ok(
                    "I found more than one matching goal. Please specify the goal name.",
                    action="choose_goal",
                    choices=choices,
                )

            # If no name was provided and there is only one goal,
            # use that goal automatically.
            if not goal_query and len(rows) == 1:
                row = rows[0]
            else:
                return _json_error(
                    "I could not find that goal. Say the exact goal name."
                )

        old_amount = _goal_amount(row, info)
        new_amount = old_amount + amount

        identifier = info.get("id")

        if not identifier:
            return _json_error("Goals table has no primary id column.")

        where = [_quote(identifier) + " = %s"]
        params = [row.get(identifier)]

        if info.get("user_id"):
            where.append(_quote(info["user_id"]) + " = %s")
            params.append(user_id)

        sql = (
            f"UPDATE {_quote(info['table'])} "
            f"SET {_quote(info['current'])} = %s"
        )
        update_params = [new_amount]

        if info.get("updated_at"):
            sql += f", {_quote(info['updated_at'])} = NOW()"

        sql += " WHERE " + " AND ".join(where)
        update_params.extend(params)

        cursor.execute(sql, update_params)
        conn.commit()

        label = _entity_label(row, info)

        return _json_ok(
            f"₹{amount:,.2f} added to {label}. New saved amount is ₹{new_amount:,.2f}.",
            action="add_to_goal",
            entity="goal",
            goal={
                "id": row.get(identifier),
                "name": label,
                "old_amount": old_amount,
                "added": amount,
                "current_amount": new_amount,
            },
            refresh=["goals", "dashboard"],
        )

    except Exception as exc:
        conn.rollback()
        traceback.print_exc()
        return _json_error(str(exc), 500)

    finally:
        if cursor:
            cursor.close()
        conn.close()


def delete_goal(user_id, goal_query):
    if not goal_query:
        return _json_error(
            "Tell me which goal to delete, for example: delete my Goa trip goal."
        )

    conn = get_connection()
    if not conn:
        return _json_error("Database unavailable.", 500)

    cursor = None

    try:
        cursor = conn.cursor(dictionary=True)
        info = _table_info(cursor, "goals")

        if not info:
            return _json_error("Goals table was not found.", 404)

        if not info.get("id"):
            return _json_error("Goals table has no id column.")

        rows = _fetch_goals(cursor, info, user_id)

        if not rows:
            return _json_error("You do not have any goals.")

        row, matches = _match_goal(rows, info, goal_query)

        if row is None:
            if len(matches) > 1:
                choices = [
                    {
                        "id": r.get(info["id"]),
                        "name": _entity_label(r, info),
                    }
                    for r in matches
                ]

                return _json_ok(
                    "I found multiple goals. Please specify which one to delete.",
                    action="choose_goal",
                    choices=choices,
                    requires_confirmation=False,
                )

            return _json_error(
                f"I could not find a goal matching '{goal_query}'."
            )

        label = _entity_label(row, info)
        identifier = row.get(info["id"])

        where = [_quote(info["id"]) + " = %s"]
        params = [identifier]

        if info.get("user_id"):
            where.append(_quote(info["user_id"]) + " = %s")
            params.append(user_id)

        # Destructive action is intentional because the user explicitly
        # requested deletion. The UI can still ask for confirmation.
        cursor.execute(
            f"DELETE FROM {_quote(info['table'])} "
            f"WHERE {' AND '.join(where)}",
            params,
        )

        conn.commit()

        return _json_ok(
            f"Goal '{label}' was deleted successfully.",
            action="delete",
            entity="goal",
            deleted={
                "id": identifier,
                "name": label,
            },
            refresh=["goals", "dashboard"],
        )

    except Exception as exc:
        conn.rollback()
        traceback.print_exc()
        return _json_error(str(exc), 500)

    finally:
        if cursor:
            cursor.close()
        conn.close()


# ================================================================
# TRANSACTIONS / EXPENSES
# ================================================================

def add_transaction(user_id, amount, category="other", description=""):
    if amount is None or amount <= 0:
        return _json_error("Please provide a positive transaction amount.")

    conn = get_connection()
    if not conn:
        return _json_error("Database unavailable.", 500)

    cursor = None

    try:
        cursor = conn.cursor(dictionary=True)
        info = _table_info(cursor, "transactions")

        if not info:
            return _json_error("Transactions table was not found.", 404)

        columns = info["columns"]

        values = {}
        if info.get("user_id"):
            values[info["user_id"]] = user_id

        if info.get("amount"):
            values[info["amount"]] = amount
        else:
            return _json_error("Transactions table has no amount column.")

        if info.get("category"):
            values[info["category"]] = category

        if info.get("description") and description:
            values[info["description"]] = description

        if info.get("date"):
            values[info["date"]] = _extract_date(
                description
            ) or date.today().isoformat()

        if not values:
            return _json_error("No writable transaction columns found.")

        names = list(values.keys())
        placeholders = ", ".join(["%s"] * len(names))

        sql = (
            f"INSERT INTO {_quote(info['table'])} "
            f"({', '.join(_quote(x) for x in names)}) "
            f"VALUES ({placeholders})"
        )

        cursor.execute(sql, [values[x] for x in names])
        conn.commit()

        new_id = cursor.lastrowid

        return _json_ok(
            f"₹{amount:,.2f} expense added successfully under {category}.",
            action="add",
            entity="transaction",
            transaction={
                "id": new_id,
                "amount": amount,
                "category": category,
                "description": description,
            },
            refresh=["transactions", "dashboard", "goals"],
        )

    except Exception as exc:
        conn.rollback()
        traceback.print_exc()
        return _json_error(str(exc), 500)

    finally:
        if cursor:
            cursor.close()
        conn.close()


def list_transactions(user_id):
    conn = get_connection()
    if not conn:
        return _json_error("Database unavailable.", 500)

    cursor = None

    try:
        cursor = conn.cursor(dictionary=True)
        info = _table_info(cursor, "transactions")

        if not info:
            return _json_error("Transactions table was not found.", 404)

        where, params = _user_where(info, user_id)

        sql = (
            f"SELECT * FROM {_quote(info['table'])}"
            f"{where}"
        )

        if info.get("id"):
            sql += f" ORDER BY {_quote(info['id'])} DESC"

        sql += " LIMIT 25"

        cursor.execute(sql, params)
        rows = cursor.fetchall() or []

        result = []

        for row in rows:
            result.append({
                "id": row.get(info["id"]) if info.get("id") else None,
                "amount": (
                    _money(row.get(info["amount"]))
                    if info.get("amount")
                    else 0
                ),
                "category": (
                    row.get(info["category"])
                    if info.get("category")
                    else "other"
                ),
                "description": (
                    row.get(info["description"])
                    if info.get("description")
                    else ""
                ),
                "date": (
                    str(row.get(info["date"]))
                    if info.get("date") and row.get(info["date"])
                    else None
                ),
            })

        return _json_ok(
            f"Found {len(result)} recent transaction(s).",
            action="list",
            entity="transactions",
            items=result,
        )

    except Exception as exc:
        traceback.print_exc()
        return _json_error(str(exc), 500)

    finally:
        if cursor:
            cursor.close()
        conn.close()


def delete_transaction(user_id, transaction_query):
    conn = get_connection()
    if not conn:
        return _json_error("Database unavailable.", 500)

    cursor = None

    try:
        cursor = conn.cursor(dictionary=True)
        info = _table_info(cursor, "transactions")

        if not info or not info.get("id"):
            return _json_error("Transactions table/id was not found.", 404)

        rows = _fetch_transactions_for_delete(cursor, info, user_id)

        if not rows:
            return _json_error("No transactions were found.")

        selected = None

        query = _normalize(transaction_query)

        # Numeric ID is supported.
        if query.isdigit():
            for row in rows:
                if str(row.get(info["id"])) == query:
                    selected = row
                    break

        # Otherwise match description/category/amount.
        if selected is None:
            candidates = []

            for row in rows:
                label_parts = []

                for key in ("category", "description"):
                    column = info.get(key)
                    if column and row.get(column):
                        label_parts.append(str(row.get(column)))

                if info.get("amount"):
                    label_parts.append(str(row.get(info["amount"])))

                label = _normalize(" ".join(label_parts))

                if query and query in label:
                    candidates.append(row)

            if len(candidates) == 1:
                selected = candidates[0]
            elif len(candidates) > 1:
                return _json_ok(
                    "I found multiple matching transactions. Please specify the amount or description.",
                    action="choose_transaction",
                    choices=[
                        {
                            "id": r.get(info["id"]),
                            "amount": _money(r.get(info["amount"])),
                            "category": r.get(info["category"]) if info.get("category") else "",
                            "description": r.get(info["description"]) if info.get("description") else "",
                        }
                        for r in candidates[:10]
                    ],
                )

        if selected is None:
            return _json_error("I could not find that transaction.")

        where = [_quote(info["id"]) + " = %s"]
        params = [selected.get(info["id"])]

        if info.get("user_id"):
            where.append(_quote(info["user_id"]) + " = %s")
            params.append(user_id)

        cursor.execute(
            f"DELETE FROM {_quote(info['table'])} "
            f"WHERE {' AND '.join(where)}",
            params,
        )

        conn.commit()

        return _json_ok(
            "Transaction deleted successfully.",
            action="delete",
            entity="transaction",
            deleted_id=selected.get(info["id"]),
            refresh=["transactions", "dashboard"],
        )

    except Exception as exc:
        conn.rollback()
        traceback.print_exc()
        return _json_error(str(exc), 500)

    finally:
        if cursor:
            cursor.close()
        conn.close()


def _fetch_transactions_for_delete(cursor, info, user_id):
    where, params = _user_where(info, user_id)

    sql = (
        f"SELECT * FROM {_quote(info['table'])}"
        f"{where}"
    )

    if info.get("id"):
        sql += f" ORDER BY {_quote(info['id'])} DESC"

    sql += " LIMIT 100"

    cursor.execute(sql, params)
    return cursor.fetchall() or []


# ================================================================
# BUDGETS
# ================================================================

def list_budgets(user_id):
    conn = get_connection()
    if not conn:
        return _json_error("Database unavailable.", 500)

    cursor = None

    try:
        cursor = conn.cursor(dictionary=True)
        info = _table_info(cursor, "budgets")

        if not info:
            return _json_error("Budget table was not found.", 404)

        where, params = _user_where(info, user_id)

        cursor.execute(
            f"SELECT * FROM {_quote(info['table'])}{where}",
            params,
        )

        rows = cursor.fetchall() or []

        items = []

        for row in rows:
            items.append({
                "id": row.get(info["id"]) if info.get("id") else None,
                "name": _entity_label(row, info),
                "amount": (
                    _money(row.get(info["amount"]))
                    if info.get("amount")
                    else 0
                ),
                "category": (
                    row.get(info["category"])
                    if info.get("category")
                    else None
                ),
            })

        return _json_ok(
            f"Found {len(items)} budget item(s).",
            action="list",
            entity="budgets",
            items=items,
        )

    except Exception as exc:
        traceback.print_exc()
        return _json_error(str(exc), 500)

    finally:
        if cursor:
            cursor.close()
        conn.close()


# ================================================================
# GENERIC LISTING
# ================================================================

def list_entity(user_id, logical_name):
    conn = get_connection()
    if not conn:
        return _json_error("Database unavailable.", 500)

    cursor = None

    try:
        cursor = conn.cursor(dictionary=True)
        info = _table_info(cursor, logical_name)

        if not info:
            return _json_error(
                f"{logical_name.title()} table was not found.",
                404,
            )

        where, params = _user_where(info, user_id)

        sql = f"SELECT * FROM {_quote(info['table'])}{where}"

        if info.get("id"):
            sql += f" ORDER BY {_quote(info['id'])} DESC"

        sql += " LIMIT 50"

        cursor.execute(sql, params)
        rows = cursor.fetchall() or []

        safe_rows = []

        for row in rows:
            clean_row = {}

            for key, value in row.items():
                if isinstance(value, (datetime, date)):
                    clean_row[key] = value.isoformat()
                else:
                    clean_row[key] = value

            safe_rows.append(clean_row)

        return _json_ok(
            f"Found {len(safe_rows)} {logical_name}.",
            action="list",
            entity=logical_name,
            items=safe_rows,
        )

    except Exception as exc:
        traceback.print_exc()
        return _json_error(str(exc), 500)

    finally:
        if cursor:
            cursor.close()
        conn.close()


# ================================================================
# INTENT PARSER
# ================================================================

def _extract_goal_query(text):
    normalized = _normalize(text)

    # Examples handled:
    #   delete my Goa goal
    #   remove the laptop goal
    #   delete goal Goa Trip
    #   add 500 to my Goa goal
    #   save 1000 in emergency fund goal
    #   add 500 to goal called Goa Trip

    patterns = [
        # Destructive commands first.
        r"\b(?:delete|remove|erase|clear)\s+(?:my|the|a|an)?\s*(.+?)\s+goal\b",
        r"\b(?:delete|remove|erase|clear)\s+(?:goal|goals)\s+(?:called|named)?\s*(.+)$",

        # Explicitly named goal.
        r"\b(?:goal|goals)\s+(?:called|named)\s+(.+)$",

        # "add 500 to my Goa goal"
        r"\b(?:to|for|into|toward|towards|in)\s+(?:my|the|a|an)?\s*(.+?)\s+goal\b",

        # "add 500 to Goa"
        r"\b(?:to|for|into|toward|towards|in)\s+(?:my|the|a|an)?\s*(.+)$",

        # "goal Goa Trip"
        r"\b(?:goal|goals)\s+(?:my|the|a|an)?\s*(.+)$",
    ]

    for pattern in patterns:
        match = re.search(pattern, normalized)

        if not match:
            continue

        value = match.group(1).strip()

        value = re.sub(
            r"\b(please|now|today|from my goals|my|the|a|an)\b",
            " ",
            value,
        )

        # Remove amounts accidentally captured by a broad pattern.
        value = re.sub(
            r"\b(?:rs|inr|rupees)\s*\d+(?:\.\d+)?\b",
            " ",
            value,
        )

        value = re.sub(
            r"\b\d+(?:\.\d+)?\b",
            " ",
            value,
        )

        value = re.sub(
            r"\s+",
            " ",
            value,
        ).strip()

        value = re.sub(
            r"\b(goal|goals)\b$",
            "",
            value,
        ).strip()

        if value and value not in {
            "my",
            "the",
            "a",
            "an",
            "goal",
            "goals",
        }:
            return value

    return ""


def _extract_category(text):
    normalized = _normalize(text)

    known = [
        "food",
        "travel",
        "shopping",
        "rent",
        "education",
        "health",
        "medicine",
        "transport",
        "fuel",
        "bills",
        "entertainment",
        "groceries",
        "salary",
        "investment",
        "other",
    ]

    for category in known:
        if re.search(rf"\b{re.escape(category)}\b", normalized):
            return category

    return "other"


def _is_delete(text):
    normalized = _normalize(text)

    return bool(
        re.search(
            r"\b(delete|remove|erase|clear)\b",
            normalized,
        )
    )


def _is_goal(text):
    normalized = _normalize(text)

    return bool(
        re.search(
            r"\b(goal|goals|target|saving goal)\b",
            normalized,
        )
    )


def _is_transaction(text):
    normalized = _normalize(text)

    return bool(
        re.search(
            r"\b(transaction|transactions|expense|expenses|spend|spent|payment|payments)\b",
            normalized,
        )
    )


def _is_budget(text):
    normalized = _normalize(text)

    return bool(
        re.search(
            r"\b(budget|budgets|limit|spending limit)\b",
            normalized,
        )
    )


def _is_add(text):
    normalized = _normalize(text)

    return bool(
        re.search(
            r"\b(add|save|deposit|put|record|enter|increase|contribute)\b",
            normalized,
        )
    )


def _is_list(text):
    normalized = _normalize(text)

    return bool(
        re.search(
            r"\b(show|list|view|see|display|check|what are|how much)\b",
            normalized,
        )
    )


def _is_logout(text):
    normalized = _normalize(text)

    return bool(
        re.search(
            r"\b(log\s*out|logout|sign\s*out|signout)\b",
            normalized,
        )
    )


# Splits one spoken sentence into several sub-commands, so
# "add 500 to food, then show my goals" runs as two actions.
# This is intentionally simple regex splitting, not NLP, so it can
# occasionally over-split a goal name that happens to contain "and"
# (e.g. "my mom and dad fund goal"). Keep goal/category names short
# and specific to avoid that edge case.
_SPLIT_PATTERN = re.compile(
    r"\s*(?:,|\band\s+then\b|\bthen\b|\band\b|\baur\b|\bfir\b)\s*",
    re.IGNORECASE,
)


def _split_commands(text):
    parts = [
        part.strip()
        for part in _SPLIT_PATTERN.split(text)
        if part and part.strip()
    ]

    return parts if len(parts) > 1 else [text.strip()]


# ================================================================
# COMMAND ROUTER
# ================================================================

def execute_command(user_id, text):
    normalized = _normalize(text)

    # ------------------------------------------------------------
    # LOGOUT (security-question protected)
    #
    # This never logs the user out directly. It only issues a
    # challenge; the actual logout happens in /alexa/verify-logout
    # after the correct answer is confirmed.
    # ------------------------------------------------------------
    if _is_logout(normalized):
        question = get_user_security_question(user_id)

        if not question:
            return _json_ok(
                "Voice logout needs a security question set up first. "
                "Please set one in your profile settings, or use the "
                "logout button instead.",
                action="security_unavailable",
            )

        return _json_ok(
            question,
            action="security_challenge",
            challenge="logout",
        )

    # ------------------------------------------------------------
    # GOAL DELETE
    # ------------------------------------------------------------
    if _is_delete(normalized) and _is_goal(normalized):
        query = _extract_goal_query(normalized)

        # Remove common leading words that are not part of goal name.
        query = re.sub(
            r"^(my|the|a|an)\s+",
            "",
            query,
        ).strip()

        return delete_goal(user_id, query)

    # ------------------------------------------------------------
    # GOAL ADD / SAVE
    # ------------------------------------------------------------
    if _is_goal(normalized) and _is_add(normalized):
        amount = _extract_amount(normalized)

        query = _extract_goal_query(normalized)

        # Clean "500" and generic words from query.
        query = re.sub(
            r"\b(?:rs|inr|rupees)\b\s*\d+(?:\.\d+)?",
            "",
            query,
        )
        query = re.sub(
            r"\b\d+(?:\.\d+)?\b",
            "",
            query,
        )
        query = re.sub(
            r"^(my|the|a|an)\s+",
            "",
            query,
        ).strip()

        return add_to_goal(
            user_id,
            amount,
            query,
        )

    # ------------------------------------------------------------
    # GOAL LIST
    # ------------------------------------------------------------
    if _is_goal(normalized) and _is_list(normalized):
        return list_goals(user_id)

    # ------------------------------------------------------------
    # EXPENSE ADD
    # ------------------------------------------------------------
    if _is_transaction(normalized) and _is_add(normalized):
        amount = _extract_amount(normalized)

        if amount is None:
            return _json_error(
                "Tell me the amount, for example: add ₹500 in food."
            )

        category = _extract_category(normalized)

        return add_transaction(
            user_id,
            amount,
            category,
            normalized,
        )

    # ------------------------------------------------------------
    # TRANSACTION DELETE
    # ------------------------------------------------------------
    if _is_delete(normalized) and _is_transaction(normalized):
        query = re.sub(
            r"^(delete|remove|erase|clear)\s+",
            "",
            normalized,
        )

        query = re.sub(
            r"\b(my|the|a|an|transaction|transactions|expense|expenses)\b",
            " ",
            query,
        ).strip()

        return delete_transaction(
            user_id,
            query,
        )

    # ------------------------------------------------------------
    # TRANSACTION LIST
    # ------------------------------------------------------------
    if _is_transaction(normalized) and _is_list(normalized):
        return list_transactions(user_id)

    # ------------------------------------------------------------
    # BUDGET LIST
    # ------------------------------------------------------------
    if _is_budget(normalized) and _is_list(normalized):
        return list_budgets(user_id)

    # ------------------------------------------------------------
    # GENERIC ENTITY LIST
    # ------------------------------------------------------------
    if _is_list(normalized):
        if "investment" in normalized:
            return list_entity(
                user_id,
                "investments",
            )

        if "loan" in normalized:
            return list_entity(
                user_id,
                "loans",
            )

        if "profile" in normalized or "account" in normalized:
            return list_entity(
                user_id,
                "users",
            )

    return None


# ================================================================
# API
# ================================================================

@alexa.route("/command", methods=["POST"])
def command():
    user_id = _current_user_id()

    if not user_id:
        return _json_error(
            "Authentication required. Please login again.",
            401,
            authenticated=False,
        )

    data = request.get_json(silent=True) or {}
    text = _clean(
        data.get("message")
        or data.get("text")
        or data.get("command")
    )

    if not text:
        return _json_error("Message is required.")

    try:
        sub_commands = _split_commands(text)

        # Single command: behave exactly as before.
        if len(sub_commands) == 1:
            result = execute_command(user_id, sub_commands[0])

            if result is not None:
                return result

            return _json_ok(
                "I understand normal financial questions, but I did not find a safe action for that command.",
                action="fallback",
                use_chat=True,
            )

        # Multi-action command: run each part in order.
        messages = []
        combined_refresh = []
        any_handled = False

        for sub_text in sub_commands:
            result = execute_command(user_id, sub_text)

            if result is None:
                messages.append(
                    f'"{sub_text}": I did not find a safe action for this part.'
                )
                continue

            response_obj, _status = result
            body = response_obj.get_json() or {}
            any_handled = True

            # A security challenge (e.g. logout) always takes over the
            # whole request — nothing after it should run until the
            # security answer is verified.
            if body.get("action") == "security_challenge":
                return result

            messages.append(body.get("message", "Done."))

            for key in body.get("refresh", []) or []:
                if key not in combined_refresh:
                    combined_refresh.append(key)

        return _json_ok(
            "\n".join(f"• {m}" for m in messages) if messages else "Nothing was executed.",
            action="multi",
            handled=any_handled,
            refresh=combined_refresh,
        )

    except Exception as exc:
        traceback.print_exc()

        return _json_error(
            str(exc),
            500,
        )


@alexa.route("/verify-logout", methods=["POST"])
def verify_logout():
    """
    Second step of voice logout. The frontend sends whatever the user
    said after being asked the security question here — never the
    logout command text itself.
    """
    user_id = _current_user_id()

    if not user_id:
        return _json_error(
            "Authentication required.",
            401,
            authenticated=False,
        )

    data = request.get_json(silent=True) or {}
    answer = _clean(
        data.get("answer")
        or data.get("message")
        or data.get("text")
    )

    if not answer:
        return _json_error("Please say your security answer.")

    attempts = session.get("alexa_security_attempts", 0)

    if verify_user_security_answer(user_id, answer):
        session.pop("alexa_security_attempts", None)
        session.clear()

        return _json_ok(
            "Security answer verified. You have been logged out.",
            action="logout",
            logged_out=True,
        )

    attempts += 1
    session["alexa_security_attempts"] = attempts

    if attempts >= MAX_SECURITY_ATTEMPTS:
        session.pop("alexa_security_attempts", None)

        return _json_error(
            "Too many incorrect attempts. Voice logout has been "
            "cancelled for your safety. Please use the logout button "
            "instead.",
            403,
            action="security_locked",
        )

    remaining = MAX_SECURITY_ATTEMPTS - attempts

    return _json_error(
        f"That answer does not match. {remaining} attempt(s) left.",
        401,
        action="security_retry",
    )


@alexa.route("/security-question", methods=["POST"])
def security_question_setup():
    """
    Lets an already-logged-in user set (or change) the security
    question used to protect voice logout. Call this from a normal
    settings page — it is a typed/clicked action, not a voice command,
    since the answer must never be spoken aloud where it was set.
    """
    user_id = _current_user_id()

    if not user_id:
        return _json_error("Authentication required.", 401, authenticated=False)

    data = request.get_json(silent=True) or {}
    question = _clean(data.get("question"))
    answer = _clean(data.get("answer"))

    if not question or not answer:
        return _json_error("Both a question and an answer are required.")

    return set_user_security_question(user_id, question, answer)


@alexa.route("/session", methods=["GET"])
def alexa_session():
    user_id = _current_user_id()

    return jsonify({
        "success": True,
        "authenticated": bool(user_id),
        "user_id": user_id,
        "user_name": session.get("user_name"),
        "user_email": session.get("user_email"),
    })


@alexa.route("/health", methods=["GET"])
def alexa_health():
    return jsonify({
        "success": True,
        "service": "AmiVest Alexa Pro",
        "status": "ready",
    })


@alexa.route("/schema", methods=["GET"])
def alexa_schema():
    """
    Development helper. It returns only table/column metadata and
    never returns financial rows.
    """
    user_id = _current_user_id()

    if not user_id:
        return _json_error(
            "Authentication required.",
            401,
        )

    conn = get_connection()

    if not conn:
        return _json_error(
            "Database unavailable.",
            500,
        )

    cursor = None

    try:
        cursor = conn.cursor()

        result = {}

        for logical_name in TABLE_ALIASES:
            info = _table_info(
                cursor,
                logical_name,
            )

            if info:
                result[logical_name] = {
                    "table": info["table"],
                    "columns": info["columns"],
                }

        return jsonify({
            "success": True,
            "schema": result,
        })

    except Exception as exc:
        traceback.print_exc()

        return _json_error(
            str(exc),
            500,
        )

    finally:
        if cursor:
            cursor.close()

        conn.close()