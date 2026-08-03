from flask import Blueprint, request, jsonify
from services.gemini_service import ask_financial_ai
from database.db import get_connection
import traceback

chat = Blueprint("chat", __name__)


# ==========================================================
# AI Chat Endpoint
# ==========================================================
@chat.route("/chat", methods=["POST"])
def chat_ai():
    conn = None
    cursor = None

    try:
        data = request.get_json(silent=True)

        if not data:
            return jsonify({
                "success": False,
                "error": "Invalid JSON request."
            }), 400

        user_id = data.get("user_id", 1)

        question = (
            data.get("message")
            or data.get("question")
            or data.get("text")
            or ""
        ).strip()

        conversation_history = data.get("conversation_history", [])

        if not question:
            return jsonify({
                "success": False,
                "error": "Message is required."
            }), 400

        # =====================================================
        # Fetch latest transactions
        # =====================================================
        context = "No recent financial records."

        try:
            conn = get_connection()
            cursor = conn.cursor(dictionary=True)

            cursor.execute(
                """
                SELECT amount, category
                FROM transactions
                WHERE user_id=%s
                ORDER BY id DESC
                LIMIT 5
                """,
                (user_id,)
            )

            rows = cursor.fetchall()

            if rows:
                context = "Recent Transactions:\n"

                for row in rows:
                    context += f"₹{row['amount']} - {row['category']}\n"

        except Exception as db_error:
            print("Database Context Error:", db_error)

        finally:
            try:
                if cursor:
                    cursor.close()
                if conn:
                    conn.close()
            except:
                pass

        # =====================================================
        # Previous conversation
        # =====================================================
        if conversation_history:

            history = []

            for item in conversation_history[-5:]:

                role = item.get("role", "user")
                text = item.get("message") or item.get("text", "")

                history.append(f"{role}: {text}")

            context += "\n\nConversation History:\n"
            context += "\n".join(history)

        # =====================================================
        # AI Response
        # =====================================================
        answer = ask_financial_ai(
            question=question,
            context=context
        )

        # =====================================================
        # Save Chat History
        # =====================================================
        try:
            conn = get_connection()
            cursor = conn.cursor()

            cursor.execute(
                """
                INSERT INTO ai_chat_history
                (user_id, role, message)
                VALUES (%s,%s,%s)
                """,
                (user_id, "user", question),
            )

            cursor.execute(
                """
                INSERT INTO ai_chat_history
                (user_id, role, message)
                VALUES (%s,%s,%s)
                """,
                (user_id, "assistant", answer),
            )

            conn.commit()

        except Exception as e:
            print("History Save Error:", e)

        finally:
            try:
                if cursor:
                    cursor.close()
                if conn:
                    conn.close()
            except:
                pass

        return jsonify({
            "success": True,
            "reply": answer
        })

    except Exception as e:

        traceback.print_exc()

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# ==========================================================
# Chat History
# ==========================================================
@chat.route("/chat/history", methods=["GET"])
def chat_history():

    conn = None
    cursor = None

    try:

        user_id = request.args.get("user_id", 1)

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT role,message
            FROM ai_chat_history
            WHERE user_id=%s
            ORDER BY id ASC
            """,
            (user_id,),
        )

        rows = cursor.fetchall()

        messages = []

        for row in rows:

            messages.append({
                "role": row["role"],
                "text": row["message"]
            })

        return jsonify({
            "success": True,
            "messages": messages
        })

    except Exception as e:

        traceback.print_exc()

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

    finally:
        try:
            if cursor:
                cursor.close()
            if conn:
                conn.close()
        except:
            pass