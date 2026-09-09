from flask import Blueprint, request, jsonify, session
from database.db import get_connection
from datetime import date
from decimal import Decimal
import traceback


budget = Blueprint("budget", __name__)


# ============================================================
# AUTH
# ============================================================

def get_current_user_id():
    user_id = session.get("user_id")

    if not user_id:
        return None

    try:
        return int(user_id)
    except Exception:
        return None


# ============================================================
# HELPERS
# ============================================================

def safe_float(value):
    try:
        if isinstance(value, Decimal):
            return float(value)
        return float(value or 0)
    except Exception:
        return 0.0


# ============================================================
# GET LIMITS
# ============================================================

@budget.route("/budget/limits", methods=["GET"])
def list_limits():

    conn = None
    cursor = None

    try:

        user_id = get_current_user_id()

        if not user_id:
            return jsonify({
                "success": False,
                "error": "Authentication required."
            }), 401

        conn = get_connection()

        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                id,
                category,
                monthly_limit
            FROM spending_limits
            WHERE user_id = %s
            ORDER BY category ASC
        """, (user_id,))

        limits = cursor.fetchall() or []

        results = []

        today = date.today()

        month_start = today.replace(day=1)

        for limit in limits:

            category = limit["category"]

            monthly_limit = safe_float(
                limit["monthly_limit"]
            )

            # IMPORTANT:
            # Your transactions use NEGATIVE amounts
            # for expenses.

            cursor.execute("""
                SELECT
                    COALESCE(
                        SUM(ABS(amount)),
                        0
                    ) AS spent
                FROM transactions
                WHERE user_id = %s
                  AND LOWER(TRIM(category))
                      = LOWER(TRIM(%s))
                  AND amount < 0
                  AND transaction_date >= %s
            """, (
                user_id,
                category,
                month_start
            ))

            row = cursor.fetchone() or {}

            spent = safe_float(
                row.get("spent", 0)
            )

            percent = (
                (spent / monthly_limit) * 100
                if monthly_limit > 0
                else 0
            )

            remaining = max(
                monthly_limit - spent,
                0
            )

            exceeded = (
                spent > monthly_limit
            )

            if exceeded:

                over = (
                    spent - monthly_limit
                )

                alert = (
                    f"⚠️ {category} limit exceeded "
                    f"by ₹{over:,.0f}."
                )

                status = "exceeded"

            elif percent >= 80:

                alert = (
                    f"⚠️ You have used "
                    f"{percent:.0f}% of your "
                    f"{category} limit. "
                    f"₹{remaining:,.0f} remains."
                )

                status = "warning"

            else:

                alert = (
                    f"✅ ₹{remaining:,.0f} remains "
                    f"in your {category} limit."
                )

                status = "safe"

            results.append({

                "id": limit["id"],

                "category": category,

                "monthly_limit":
                    round(monthly_limit, 2),

                "spent_this_month":
                    round(spent, 2),

                "spent":
                    round(spent, 2),

                "remaining":
                    round(remaining, 2),

                "percent_used":
                    round(percent, 1),

                "percentage":
                    round(percent, 1),

                "exceeded":
                    exceeded,

                "status":
                    status,

                "alert":
                    alert
            })


        return jsonify({
            "success": True,
            "limits": results
        }), 200


    except Exception as e:

        traceback.print_exc()

        return jsonify({
            "success": False,
            "error": str(e),
            "limits": []
        }), 500


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
# CREATE / UPDATE LIMIT
# ============================================================

@budget.route(
    "/budget/limits",
    methods=["POST"]
)
def set_limit():

    conn = None
    cursor = None

    try:

        user_id = get_current_user_id()

        if not user_id:
            return jsonify({
                "success": False,
                "error": "Authentication required."
            }), 401


        data = request.get_json(
            silent=True
        ) or {}


        category = str(
            data.get(
                "category",
                ""
            )
        ).strip()


        monthly_limit = data.get(
            "monthly_limit",
            data.get(
                "limit",
                0
            )
        )


        if not category:

            return jsonify({
                "success": False,
                "error": "Category is required."
            }), 400


        try:

            monthly_limit = float(
                monthly_limit
            )

        except Exception:

            monthly_limit = 0


        if monthly_limit <= 0:

            return jsonify({
                "success": False,
                "error":
                    "Monthly limit must be greater than ₹0."
            }), 400


        conn = get_connection()

        cursor = conn.cursor()


        # Don't use updated_at.
        # Your table does not contain it.

        cursor.execute("""
            SELECT id
            FROM spending_limits
            WHERE user_id = %s
              AND LOWER(TRIM(category))
                  = LOWER(TRIM(%s))
            LIMIT 1
        """, (
            user_id,
            category
        ))

        existing = cursor.fetchone()


        if existing:

            cursor.execute("""
                UPDATE spending_limits
                SET
                    category = %s,
                    monthly_limit = %s
                WHERE id = %s
                  AND user_id = %s
            """, (
                category,
                monthly_limit,
                existing[0],
                user_id
            ))

            limit_id = existing[0]

            message = (
                f"{category} limit updated "
                f"to ₹{monthly_limit:,.0f}."
            )

        else:

            cursor.execute("""
                INSERT INTO spending_limits
                (
                    user_id,
                    category,
                    monthly_limit
                )
                VALUES
                (
                    %s,
                    %s,
                    %s
                )
            """, (
                user_id,
                category,
                monthly_limit
            ))

            limit_id = cursor.lastrowid

            message = (
                f"{category} limit set "
                f"to ₹{monthly_limit:,.0f}."
            )


        conn.commit()


        return jsonify({

            "success": True,

            "message": message,

            "limit": {

                "id": limit_id,

                "category": category,

                "monthly_limit":
                    monthly_limit

            }

        }), 200


    except Exception as e:

        if conn:

            try:
                conn.rollback()
            except Exception:
                pass

        traceback.print_exc()

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


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
# DELETE LIMIT
# ============================================================

@budget.route(
    "/budget/limits/<int:limit_id>",
    methods=["DELETE"]
)
def delete_limit(limit_id):

    conn = None
    cursor = None

    try:

        user_id = get_current_user_id()

        if not user_id:
            return jsonify({
                "success": False,
                "error": "Authentication required."
            }), 401


        conn = get_connection()

        cursor = conn.cursor()


        cursor.execute("""
            DELETE FROM spending_limits
            WHERE id = %s
              AND user_id = %s
        """, (
            limit_id,
            user_id
        ))


        conn.commit()


        return jsonify({
            "success": True,
            "message": "Limit deleted."
        }), 200


    except Exception as e:

        if conn:

            try:
                conn.rollback()
            except Exception:
                pass

        traceback.print_exc()

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


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
# ADD TODAY'S EXPENSE
# ============================================================

@budget.route(
    "/budget/expense",
    methods=["POST"]
)
def add_expense():

    conn = None
    cursor = None

    try:

        user_id = get_current_user_id()

        if not user_id:
            return jsonify({
                "success": False,
                "error": "Authentication required."
            }), 401


        data = request.get_json(
            silent=True
        ) or {}


        amount = data.get("amount")

        category = str(
            data.get(
                "category",
                "Other"
            )
        ).strip()

        description = str(
            data.get(
                "description",
                "Manual expense"
            )
        ).strip()


        try:

            amount = float(amount)

        except Exception:

            return jsonify({
                "success": False,
                "error":
                    "Enter a valid amount."
            }), 400


        if amount <= 0:

            return jsonify({
                "success": False,
                "error":
                    "Amount must be greater than ₹0."
            }), 400


        if not category:

            category = "Other"


        if not description:

            description = "Manual expense"


        # ====================================================
        # YOUR DATABASE CONVENTION:
        #
        # EXPENSE = NEGATIVE
        #
        # ₹500 expense -> -500
        # ====================================================

        expense_amount = -abs(amount)


        conn = get_connection()

        cursor = conn.cursor()


        cursor.execute("""
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
                %s,
                %s,
                %s,
                %s,
                %s
            )
        """, (
            user_id,
            "expense",
            category,
            expense_amount,
            description,
            date.today()
        ))


        transaction_id = cursor.lastrowid


        conn.commit()


        # ====================================================
        # CHECK LIMIT
        # ====================================================

        cursor.execute("""
            SELECT
                monthly_limit
            FROM spending_limits
            WHERE user_id = %s
              AND LOWER(TRIM(category))
                  = LOWER(TRIM(%s))
            LIMIT 1
        """, (
            user_id,
            category
        ))


        limit_row = cursor.fetchone()


        limit_data = None


        if limit_row:

            monthly_limit = safe_float(
                limit_row[0]
            )

            month_start = date.today().replace(
                day=1
            )


            cursor.execute("""
                SELECT
                    COALESCE(
                        SUM(ABS(amount)),
                        0
                    )
                FROM transactions
                WHERE user_id = %s
                  AND LOWER(TRIM(category))
                      = LOWER(TRIM(%s))
                  AND amount < 0
                  AND transaction_date >= %s
            """, (
                user_id,
                category,
                month_start
            ))


            spent = safe_float(
                cursor.fetchone()[0]
            )


            remaining = max(
                monthly_limit - spent,
                0
            )


            percent = (
                spent /
                monthly_limit *
                100
                if monthly_limit > 0
                else 0
            )


            if percent >= 100:

                status = "exceeded"

            elif percent >= 80:

                status = "warning"

            else:

                status = "safe"


            limit_data = {

                "monthly_limit":
                    monthly_limit,

                "spent":
                    round(spent, 2),

                "remaining":
                    round(remaining, 2),

                "percent_used":
                    round(percent, 1),

                "status":
                    status

            }


        message = (
            f"✅ ₹{amount:,.2f} expense "
            f"added successfully."
        )


        if limit_data:

            if limit_data["status"] == "exceeded":

                over = (
                    limit_data["spent"]
                    -
                    limit_data["monthly_limit"]
                )

                message += (
                    f" ⚠️ {category} limit "
                    f"exceeded by "
                    f"₹{over:,.0f}."
                )

            elif limit_data["status"] == "warning":

                message += (
                    f" ⚠️ {category}: "
                    f"{limit_data['percent_used']:.0f}% "
                    f"used. "
                    f"₹{limit_data['remaining']:,.0f} "
                    f"remaining."
                )


        return jsonify({

            "success": True,

            "message": message,

            "transaction": {

                "id":
                    transaction_id,

                "amount":
                    amount,

                "category":
                    category,

                "description":
                    description,

                "type":
                    "expense",

                "transaction_date":
                    str(date.today())

            },

            "limit":
                limit_data

        }), 201


    except Exception as e:

        if conn:

            try:
                conn.rollback()
            except Exception:
                pass

        traceback.print_exc()

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


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
# TODAY SUMMARY
# ============================================================

@budget.route(
    "/budget/expenses/today",
    methods=["GET"]
)
def today_expenses():

    conn = None
    cursor = None

    try:

        user_id = get_current_user_id()

        if not user_id:
            return jsonify({
                "success": False,
                "error": "Authentication required."
            }), 401


        conn = get_connection()

        cursor = conn.cursor(
            dictionary=True
        )


        cursor.execute("""
            SELECT
                id,
                category,
                amount,
                description,
                transaction_date
            FROM transactions
            WHERE user_id = %s
              AND amount < 0
              AND DATE(transaction_date)
                  = CURDATE()
            ORDER BY id DESC
        """, (
            user_id,
        ))


        rows = cursor.fetchall() or []


        expenses = []

        total = 0


        for row in rows:

            amount = abs(
                safe_float(row["amount"])
            )

            total += amount

            expenses.append({

                "id":
                    row["id"],

                "category":
                    row["category"],

                "amount":
                    amount,

                "description":
                    row["description"],

                "transaction_date":
                    str(
                        row["transaction_date"]
                    )

            })


        return jsonify({

            "success": True,

            "today_expense":
                round(total, 2),

            "total":
                round(total, 2),

            "expenses":
                expenses

        }), 200


    except Exception as e:

        traceback.print_exc()

        return jsonify({

            "success": False,

            "error": str(e),

            "today_expense": 0,

            "total": 0,

            "expenses": []

        }), 500


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
# MONTHLY SUMMARY
# ============================================================

@budget.route(
    "/budget/summary",
    methods=["GET"]
)
def budget_summary():

    conn = None
    cursor = None

    try:

        user_id = get_current_user_id()

        if not user_id:
            return jsonify({
                "success": False,
                "error": "Authentication required."
            }), 401


        conn = get_connection()

        cursor = conn.cursor(
            dictionary=True
        )


        cursor.execute("""
            SELECT
                COALESCE(
                    SUM(ABS(amount)),
                    0
                ) AS total
            FROM transactions
            WHERE user_id = %s
              AND amount < 0
              AND MONTH(transaction_date)
                  = MONTH(CURDATE())
              AND YEAR(transaction_date)
                  = YEAR(CURDATE())
        """, (
            user_id,
        ))


        total = safe_float(
            cursor.fetchone()["total"]
        )


        cursor.execute("""
            SELECT
                category,
                COALESCE(
                    SUM(ABS(amount)),
                    0
                ) AS spent
            FROM transactions
            WHERE user_id = %s
              AND amount < 0
              AND MONTH(transaction_date)
                  = MONTH(CURDATE())
              AND YEAR(transaction_date)
                  = YEAR(CURDATE())
            GROUP BY category
            ORDER BY spent DESC
        """, (
            user_id,
        ))


        rows = cursor.fetchall() or []


        categories = [

            {
                "category":
                    row["category"],

                "spent":
                    round(
                        safe_float(
                            row["spent"]
                        ),
                        2
                    )
            }

            for row in rows

        ]


        return jsonify({

            "success": True,

            "total":
                round(total, 2),

            "monthly_spending":
                round(total, 2),

            "categories":
                categories

        }), 200


    except Exception as e:

        traceback.print_exc()

        return jsonify({

            "success": False,

            "error": str(e),

            "total": 0,

            "monthly_spending": 0,

            "categories": []

        }), 500


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
# CATEGORIES
# ============================================================

@budget.route(
    "/budget/categories",
    methods=["GET"]
)
def categories():

    conn = None
    cursor = None

    try:

        user_id = get_current_user_id()

        if not user_id:
            return jsonify({
                "success": False,
                "error": "Authentication required."
            }), 401


        conn = get_connection()

        cursor = conn.cursor(
            dictionary=True
        )


        cursor.execute("""
            SELECT DISTINCT category
            FROM transactions
            WHERE user_id = %s
              AND category IS NOT NULL
              AND TRIM(category) != ''
            ORDER BY category
        """, (
            user_id,
        ))


        rows = cursor.fetchall() or []


        default_categories = [

            "Food",
            "Shopping",
            "Transport",
            "Bills",
            "Education",
            "Entertainment",
            "Health",
            "Travel",
            "Groceries",
            "Fuel",
            "Rent",
            "EMI",
            "Other"

        ]


        existing = [

            row["category"]
            for row in rows
            if row.get("category")

        ]


        final_categories = sorted(
            set(
                default_categories +
                existing
            )
        )


        return jsonify({

            "success": True,

            "categories":
                final_categories

        }), 200


    except Exception as e:

        traceback.print_exc()

        return jsonify({

            "success": False,

            "error": str(e),

            "categories": []

        }), 500


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