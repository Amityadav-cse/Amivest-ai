from flask import Blueprint, request, jsonify
from database.db import get_connection
import traceback

transaction = Blueprint("transaction", __name__)

# ======================================================
# GET ALL TRANSACTIONS
# ======================================================
@transaction.route("/transactions", methods=["GET"])
def get_transactions():
    conn = None
    cursor = None

    try:
        print("✅ /transactions API Called")

        user_id = request.args.get("user_id", 1)

        conn = get_connection()

        if conn is None:
            return jsonify({
                "success": False,
                "transactions": [],
                "error": "Unable to connect to MySQL database."
            }), 500

        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                id,
                type,
                category,
                amount,
                description,
                transaction_date
            FROM transactions
            WHERE user_id=%s
            ORDER BY transaction_date DESC, id DESC
        """, (user_id,))

        rows = cursor.fetchall()

        if rows is None:
            rows = []

        return jsonify({
            "success": True,
            "transactions": rows
        }), 200

    except Exception as e:
        print("❌ TRANSACTION ERROR")
        traceback.print_exc()

        return jsonify({
            "success": False,
            "transactions": [],
            "error": str(e)
        }), 500

    finally:
        try:
            if cursor:
                cursor.close()
        except:
            pass

        try:
            if conn:
                conn.close()
        except:
            pass


# ======================================================
# ADD TRANSACTION
# ======================================================
@transaction.route("/transactions", methods=["POST"])
def add_transaction():

    conn = None
    cursor = None

    try:
        data = request.get_json()

        if not data:
            return jsonify({
                "success": False,
                "error": "No JSON data received."
            }), 400

        user_id = data.get("user_id", 1)
        type_ = data.get("type")
        category = data.get("category")
        amount = data.get("amount")
        description = data.get("description")
        transaction_date = data.get("transaction_date")

        conn = get_connection()

        if conn is None:
            return jsonify({
                "success": False,
                "error": "Database connection failed."
            }), 500

        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO transactions
            (user_id, type, category, amount, description, transaction_date)
            VALUES (%s,%s,%s,%s,%s,%s)
        """, (
            user_id,
            type_,
            category,
            amount,
            description,
            transaction_date
        ))

        conn.commit()

        return jsonify({
            "success": True,
            "message": "Transaction added successfully."
        }), 201

    except Exception as e:
        print("❌ ADD TRANSACTION ERROR")
        traceback.print_exc()

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

    finally:
        try:
            if cursor:
                cursor.close()
        except:
            pass

        try:
            if conn:
                conn.close()
        except:
            pass