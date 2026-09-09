from flask import Blueprint, request, jsonify, session
from datetime import date, datetime
from database.db import get_connection
from decimal import Decimal
import traceback


transaction = Blueprint(
    "transaction",
    __name__
)


# =========================================================
# CURRENT USER
# =========================================================

def get_current_user_id():

    return session.get("user_id")


# =========================================================
# CREATE TRANSACTIONS TABLE
# =========================================================

def ensure_transactions_table(conn):

    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS transactions (

            id INT AUTO_INCREMENT PRIMARY KEY,

            user_id INT NOT NULL,

            type VARCHAR(30)
                NOT NULL
                DEFAULT 'expense',

            category VARCHAR(100)
                NOT NULL,

            amount DECIMAL(12,2)
                NOT NULL,

            description VARCHAR(255),

            transaction_date DATE
                NOT NULL,

            created_at TIMESTAMP
                DEFAULT CURRENT_TIMESTAMP,

            INDEX idx_transaction_user (
                user_id
            ),

            INDEX idx_transaction_date (
                transaction_date
            ),

            INDEX idx_transaction_category (
                user_id,
                category
            )

        )
    """)

    conn.commit()

    cursor.close()


# =========================================================
# GET TRANSACTIONS
# =========================================================

@transaction.route(
    "/transactions",
    methods=["GET"]
)
def get_transactions():

    conn = None
    cursor = None

    try:

        user_id = get_current_user_id()

        if not user_id:

            return jsonify({
                "success": False,
                "error": "Authentication required.",
                "transactions": []
            }), 401

        conn = get_connection()

        ensure_transactions_table(
            conn
        )

        cursor = conn.cursor(
            dictionary=True
        )

        cursor.execute("""
            SELECT

                id,

                type,

                category,

                amount,

                description,

                transaction_date,

                created_at

            FROM transactions

            WHERE user_id = %s

            ORDER BY
                transaction_date DESC,
                id DESC
        """, (
            user_id,
        ))

        rows = (
            cursor.fetchall()
            or []
        )

        # Convert database types
        # into JSON-safe values.

        for row in rows:

            if isinstance(
                row.get("amount"),
                Decimal
            ):

                row["amount"] = float(
                    row["amount"]
                )

            if isinstance(
                row.get(
                    "transaction_date"
                ),
                (
                    date,
                    datetime
                )
            ):

                row[
                    "transaction_date"
                ] = row[
                    "transaction_date"
                ].isoformat()

            if isinstance(
                row.get("created_at"),
                datetime
            ):

                row[
                    "created_at"
                ] = row[
                    "created_at"
                ].isoformat()

        return jsonify({

            "success":
                True,

            "transactions":
                rows

        }), 200

    except Exception as e:

        traceback.print_exc()

        return jsonify({

            "success":
                False,

            "error":
                str(e),

            "transactions":
                []

        }), 500

    finally:

        if cursor:

            try:
                cursor.close()
            except:
                pass

        if conn:

            try:
                conn.close()
            except:
                pass


# =========================================================
# ADD TRANSACTION
# =========================================================

@transaction.route(
    "/transactions",
    methods=["POST"]
)
def add_transaction():

    conn = None
    cursor = None

    try:

        # -------------------------------------------------
        # AUTHENTICATED USER
        # -------------------------------------------------

        user_id = get_current_user_id()

        if not user_id:

            return jsonify({
                "success": False,
                "error": "Authentication required."
            }), 401

        # -------------------------------------------------
        # JSON
        # -------------------------------------------------

        data = request.get_json(
            silent=True
        ) or {}

        # -------------------------------------------------
        # VALUES
        # -------------------------------------------------

        type_ = str(
            data.get(
                "type",
                "expense"
            )
        ).strip().lower()

        category = str(
            data.get(
                "category",
                ""
            )
        ).strip()

        description = str(
            data.get(
                "description",
                ""
            )
        ).strip()

        amount = data.get(
            "amount"
        )

        transaction_date = data.get(
            "transaction_date"
        )

        # -------------------------------------------------
        # VALIDATE TYPE
        # -------------------------------------------------

        if type_ not in [
            "expense",
            "income"
        ]:

            return jsonify({
                "success": False,
                "error": "Type must be expense or income."
            }), 400

        # -------------------------------------------------
        # VALIDATE CATEGORY
        # -------------------------------------------------

        if not category:

            return jsonify({
                "success": False,
                "error": "Category is required."
            }), 400

        # -------------------------------------------------
        # VALIDATE AMOUNT
        # -------------------------------------------------

        try:

            amount = float(
                amount
            )

        except (
            TypeError,
            ValueError
        ):

            return jsonify({
                "success": False,
                "error": "Invalid amount."
            }), 400

        if amount <= 0:

            return jsonify({
                "success": False,
                "error": "Amount must be greater than zero."
            }), 400

        # -------------------------------------------------
        # DATE
        # -------------------------------------------------

        if not transaction_date:

            transaction_date = (
                date.today()
                .isoformat()
            )

        try:

            datetime.strptime(
                transaction_date,
                "%Y-%m-%d"
            )

        except ValueError:

            return jsonify({
                "success": False,
                "error": "Date must be YYYY-MM-DD."
            }), 400

        # -------------------------------------------------
        # DATABASE
        # -------------------------------------------------

        conn = get_connection()

        ensure_transactions_table(
            conn
        )

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

            type_,

            category,

            amount,

            description
            or None,

            transaction_date

        ))

        transaction_id = (
            cursor.lastrowid
        )

        conn.commit()

        # =================================================
        # CALCULATE CURRENT MONTH SPENDING
        # =================================================

        cursor.execute("""
            SELECT
                COALESCE(
                    SUM(amount),
                    0
                ) AS spent

            FROM transactions

            WHERE

                user_id = %s

                AND type = 'expense'

                AND LOWER(category)
                    = LOWER(%s)

                AND YEAR(transaction_date)
                    = YEAR(CURDATE())

                AND MONTH(transaction_date)
                    = MONTH(CURDATE())
        """, (
            user_id,
            category
        ))

        spending_row = (
            cursor.fetchone()
        )

        spent = float(
            spending_row[0]
            or 0
        )

        # =================================================
        # GET USER LIMIT
        # =================================================

        monthly_limit = None

        try:

            cursor.execute("""
                SELECT
                    monthly_limit

                FROM spending_limits

                WHERE

                    user_id = %s

                    AND LOWER(category)
                        = LOWER(%s)

                LIMIT 1
            """, (
                user_id,
                category
            ))

            limit_row = (
                cursor.fetchone()
            )

            if limit_row:

                monthly_limit = float(
                    limit_row[0]
                )

        except Exception:

            monthly_limit = None

        # =================================================
        # CALCULATE LIMIT
        # =================================================

        percent_used = None

        remaining = None

        exceeded = False

        alert = None

        if (
            monthly_limit is not None
            and monthly_limit > 0
        ):

            percent_used = round(
                (
                    spent /
                    monthly_limit
                ) * 100,
                1
            )

            remaining = round(
                monthly_limit -
                spent,
                2
            )

            exceeded = (
                spent >
                monthly_limit
            )

            if exceeded:

                alert = (
                    f"🚨 {category} "
                    f"limit exceeded by "
                    f"₹{abs(remaining):,.0f}."
                )

            elif percent_used >= 90:

                alert = (
                    f"🚨 {percent_used:.0f}% "
                    f"of your {category} "
                    f"limit has been used. "
                    f"₹{remaining:,.0f} remains."
                )

            elif percent_used >= 80:

                alert = (
                    f"⚠️ {percent_used:.0f}% "
                    f"of your {category} "
                    f"limit has been used. "
                    f"₹{remaining:,.0f} remains."
                )

        # =================================================
        # RESPONSE
        # =================================================

        return jsonify({

            "success":
                True,

            "message":
                "Transaction added successfully.",

            "transaction": {

                "id":
                    transaction_id,

                "type":
                    type_,

                "category":
                    category,

                "amount":
                    amount,

                "description":
                    description,

                "transaction_date":
                    transaction_date

            },

            "category_summary": {

                "category":
                    category,

                "spent_this_month":
                    round(
                        spent,
                        2
                    ),

                "monthly_limit":
                    monthly_limit,

                "percent_used":
                    percent_used,

                "remaining":
                    remaining,

                "exceeded":
                    exceeded,

                "alert":
                    alert

            }

        }), 201

    except Exception as e:

        if conn:

            try:
                conn.rollback()
            except:
                pass

        traceback.print_exc()

        return jsonify({

            "success":
                False,

            "error":
                str(e)

        }), 500

    finally:

        if cursor:

            try:
                cursor.close()
            except:
                pass

        if conn:

            try:
                conn.close()
            except:
                pass


# =========================================================
# DELETE TRANSACTION
# =========================================================

@transaction.route(
    "/transactions/<int:transaction_id>",
    methods=["DELETE"]
)
def delete_transaction(
    transaction_id
):

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

        ensure_transactions_table(
            conn
        )

        cursor = conn.cursor()

        cursor.execute("""
            DELETE FROM transactions

            WHERE

                id = %s

                AND user_id = %s
        """, (
            transaction_id,
            user_id
        ))

        deleted = (
            cursor.rowcount
        )

        conn.commit()

        if deleted == 0:

            return jsonify({
                "success": False,
                "error": "Transaction not found."
            }), 404

        return jsonify({

            "success":
                True,

            "message":
                "Transaction deleted successfully."

        }), 200

    except Exception as e:

        if conn:

            try:
                conn.rollback()
            except:
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
            except:
                pass

        if conn:

            try:
                conn.close()
            except:
                pass