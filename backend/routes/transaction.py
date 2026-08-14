from flask import Blueprint, request, jsonify, session
from database.db import get_connection
import traceback


transaction = Blueprint("transaction", __name__)


# =====================================================
# GET CURRENT USER TRANSACTIONS
# =====================================================

@transaction.route("/transactions", methods=["GET"])
def get_transactions():

    conn = None
    cursor = None

    try:

        # NEVER trust user_id from URL.
        user_id = session.get("user_id")

        if not user_id:

            return jsonify({
                "success": False,
                "transactions": [],
                "error": "Authentication required."
            }), 401

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

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
            """,
            (user_id,)
        )

        rows = cursor.fetchall() or []

        return jsonify({
            "success": True,
            "transactions": rows
        }), 200

    except Exception as e:

        print("TRANSACTION ERROR")
        traceback.print_exc()

        return jsonify({
            "success": False,
            "transactions": [],
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


# =====================================================
# ADD TRANSACTION
# =====================================================

@transaction.route("/transactions", methods=["POST"])
def add_transaction():

    conn = None
    cursor = None

    try:

        # User comes from authenticated session.
        user_id = session.get("user_id")

        if not user_id:

            return jsonify({
                "success": False,
                "error": "Authentication required."
            }), 401

        data = request.get_json()

        if not data:

            return jsonify({
                "success": False,
                "error": "No JSON data received."
            }), 400

        type_ = data.get("type")
        category = data.get("category")
        amount = data.get("amount")
        description = data.get("description")
        transaction_date = data.get("transaction_date")

        conn = get_connection()
        cursor = conn.cursor()

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
                type_,
                category,
                amount,
                description,
                transaction_date
            )
        )

        conn.commit()

        return jsonify({
            "success": True,
            "message": "Transaction added successfully.",
            "transaction_id": cursor.lastrowid
        }), 201

    except Exception as e:

        if conn:
            conn.rollback()

        print("ADD TRANSACTION ERROR")
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