from flask import Blueprint, request, jsonify
from datetime import datetime
from services.gemini_service import ask_financial_ai
from database.db import get_connection

goals = Blueprint("goals", __name__)


# ===================================================
# GET /goals?user_id=1
# Returns all goals (active + completed) for a user
# ===================================================
@goals.route("/goals", methods=["GET"])
def list_goals():
    try:
        user_id = request.args.get("user_id", 1)

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT id, goal_name, category, target_amount, current_saved,
                   target_date, monthly_saving, status, created_at
            FROM goals
            WHERE user_id = %s
            ORDER BY created_at DESC
        """, (user_id,))

        rows = cursor.fetchall()

        cursor.close()
        conn.close()

        # Normalize date/decimal fields so the frontend gets plain JSON-safe values
        for r in rows:
            if r.get("target_date"):
                r["target_date"] = str(r["target_date"])
            if r.get("created_at"):
                r["created_at"] = str(r["created_at"])
            r["target_amount"] = float(r["target_amount"] or 0)
            r["current_saved"] = float(r["current_saved"] or 0)
            r["monthly_saving"] = float(r["monthly_saving"] or 0)

        return jsonify({"success": True, "goals": rows})

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ===================================================
# POST /goals
# Create a new goal
# ===================================================
@goals.route("/goals", methods=["POST"])
def create_goal():
    try:
        data = request.json

        user_id = data.get("user_id", 1)
        goal_name = data.get("goal_name")
        category = data.get("category")
        target_amount = float(data.get("target_amount", 0))
        target_date = data.get("target_date")
        monthly_saving = float(data.get("monthly_saving", 0) or 0)

        if not goal_name or not target_amount or not target_date:
            return jsonify({"success": False, "error": "goal_name, target_amount and target_date are required."}), 400

        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO goals
            (user_id, goal_name, category, target_amount, current_saved, target_date, monthly_saving, status, created_at)
            VALUES (%s, %s, %s, %s, 0, %s, %s, 'Active', %s)
        """, (
            user_id, goal_name, category, target_amount, target_date,
            monthly_saving, datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        ))

        conn.commit()
        new_id = cursor.lastrowid

        cursor.close()
        conn.close()

        return jsonify({"success": True, "id": new_id, "message": "Goal created."})

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ===================================================
# POST /goals/<id>/add-money
# Add money to a goal's saved progress, auto-completing it
# once the target is reached
# ===================================================
@goals.route("/goals/<int:goal_id>/add-money", methods=["POST"])
def add_money(goal_id):
    try:
        data = request.json
        amount = float(data.get("amount", 0))

        if amount <= 0:
            return jsonify({"success": False, "error": "Amount must be greater than 0."}), 400

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT target_amount, current_saved FROM goals WHERE id = %s", (goal_id,))
        goal = cursor.fetchone()

        if not goal:
            cursor.close()
            conn.close()
            return jsonify({"success": False, "error": "Goal not found."}), 404

        new_saved = float(goal["current_saved"] or 0) + amount
        new_status = "Completed" if new_saved >= float(goal["target_amount"]) else "Active"

        cursor.execute("""
            UPDATE goals
            SET current_saved = %s, status = %s
            WHERE id = %s
        """, (new_saved, new_status, goal_id))

        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({"success": True, "current_saved": new_saved, "status": new_status})

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ===================================================
# POST /goals/suggest-plan
# Ask the AI to suggest a monthly saving amount for a
# not-yet-created goal, based on target amount + date
# ===================================================
@goals.route("/goals/suggest-plan", methods=["POST"])
def suggest_plan():
    try:
        data = request.json
        target_amount = float(data.get("target_amount", 0))
        target_date = data.get("target_date")
        goal_name = data.get("goal_name", "this goal")

        months_remaining = 1
        if target_date:
            try:
                target = datetime.strptime(target_date, "%Y-%m-%d")
                now = datetime.now()
                months_remaining = max(1, (target.year - now.year) * 12 + (target.month - now.month))
            except ValueError:
                pass

        # Straightforward math baseline — the AI is used to sanity-check
        # and phrase it, not to invent the number.
        baseline_monthly = round(target_amount / months_remaining, -2) if months_remaining else target_amount

        prompt = f"""A user wants to save ₹{target_amount:.0f} for "{goal_name}" in {months_remaining} months.
A simple even split suggests saving ₹{baseline_monthly:.0f} per month.
Reply with ONLY a number (the recommended monthly saving amount in rupees, no currency symbol, no commas, no text)."""

        try:
            ai_reply = ask_financial_ai(prompt, "")
            digits = "".join(ch for ch in ai_reply if ch.isdigit())
            monthly_saving = int(digits) if digits else int(baseline_monthly)
        except Exception:
            monthly_saving = int(baseline_monthly)

        return jsonify({"success": True, "monthly_saving": monthly_saving, "months_remaining": months_remaining})

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ===================================================
# GET /goals/suggest-allocation?user_id=1
# Looks at the person's actual net savings from their
# transactions, subtracts what's already committed to
# monthly goal plans, and proposes splitting whatever is
# left across active goals (biggest gap first).
# ===================================================
@goals.route("/goals/suggest-allocation", methods=["GET"])
def suggest_allocation():
    try:
        user_id = request.args.get("user_id", 1)

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        # Sign-based, not label-based — matches how the Dashboard actually
        # computes income/expense, so this never disagrees with what's on screen.
        cursor.execute("""
            SELECT
                IFNULL(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) AS income,
                IFNULL(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0) AS expense
            FROM transactions
            WHERE user_id = %s
        """, (user_id,))
        totals = cursor.fetchone()
        net_savings = float(totals["income"]) - float(totals["expense"])

        cursor.execute("""
            SELECT id, goal_name, target_amount, current_saved, monthly_saving
            FROM goals
            WHERE user_id = %s AND status = 'Active'
            ORDER BY (target_amount - current_saved) ASC
        """, (user_id,))
        active_goals = cursor.fetchall()

        cursor.close()
        conn.close()

        committed = sum(float(g["monthly_saving"] or 0) for g in active_goals)
        available = round(net_savings - committed, 2)

        suggestions = []
        if available > 0 and active_goals:
            # Prioritize goals closest to completion first so people see a
            # goal cross the finish line sooner, then split the remainder.
            remaining_pool = available
            for g in active_goals:
                if remaining_pool <= 0:
                    break
                gap = float(g["target_amount"]) - float(g["current_saved"])
                if gap <= 0:
                    continue
                share = min(gap, remaining_pool, round(available / len(active_goals), -1) or remaining_pool)
                if share >= 100:  # skip suggesting trivially small amounts
                    suggestions.append({
                        "goal_id": g["id"],
                        "goal_name": g["goal_name"],
                        "suggested_amount": round(share, -1),
                    })
                    remaining_pool -= share

        return jsonify({
            "success": True,
            "net_savings": net_savings,
            "committed_monthly": committed,
            "available_amount": max(0, available),
            "suggestions": suggestions,
        })

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ===================================================
# PUT /goals/<id>
# Edit an existing goal's details
# ===================================================
@goals.route("/goals/<int:goal_id>", methods=["PUT"])
def update_goal(goal_id):
    try:
        data = request.json

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT id FROM goals WHERE id = %s", (goal_id,))
        if not cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({"success": False, "error": "Goal not found."}), 404

        # Only update fields that were actually sent, so a partial edit
        # doesn't wipe out the rest of the goal.
        fields = []
        values = []
        for key in ["goal_name", "category", "target_amount", "target_date", "monthly_saving", "status"]:
            if key in data:
                fields.append(f"{key} = %s")
                values.append(data[key])

        if not fields:
            cursor.close()
            conn.close()
            return jsonify({"success": False, "error": "No fields provided to update."}), 400

        values.append(goal_id)
        cursor.execute(f"UPDATE goals SET {', '.join(fields)} WHERE id = %s", tuple(values))
        conn.commit()

        cursor.close()
        conn.close()

        return jsonify({"success": True, "message": "Goal updated."})

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ===================================================
# DELETE /goals/<id>
# Remove a goal entirely
# ===================================================
@goals.route("/goals/<int:goal_id>", methods=["DELETE"])
def delete_goal(goal_id):
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT id FROM goals WHERE id = %s", (goal_id,))
        if not cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({"success": False, "error": "Goal not found."}), 404

        cursor.execute("DELETE FROM goals WHERE id = %s", (goal_id,))
        conn.commit()

        cursor.close()
        conn.close()

        return jsonify({"success": True, "message": "Goal deleted."})

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ===================================================
# GET /goals/summary?user_id=1
# Aggregate stats for a dashboard widget:
# total goals, total saved, completed count, overall progress
# ===================================================
@goals.route("/goals/summary", methods=["GET"])
def goals_summary():
    try:
        user_id = request.args.get("user_id", 1)

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT target_amount, current_saved, status
            FROM goals
            WHERE user_id = %s
        """, (user_id,))
        rows = cursor.fetchall()

        cursor.close()
        conn.close()

        total_goals = len(rows)
        total_saved = sum(float(r["current_saved"] or 0) for r in rows)
        total_target = sum(float(r["target_amount"] or 0) for r in rows)
        completed_goals = sum(
            1 for r in rows
            if r["target_amount"] and float(r["current_saved"] or 0) >= float(r["target_amount"])
        )
        overall_progress = round((total_saved / total_target) * 100, 1) if total_target > 0 else 0

        return jsonify({
            "success": True,
            "total_goals": total_goals,
            "total_saved": total_saved,
            "completed_goals": completed_goals,
            "overall_progress": overall_progress,
        })

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ===================================================
# GET /goals/<id>/tips
# AI-generated tips to reach the goal faster, or a
# suggestion for the next goal if this one is complete
# ===================================================
@goals.route("/goals/<int:goal_id>/tips", methods=["GET"])
def goal_tips(goal_id):
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT goal_name, category, target_amount, current_saved, target_date, monthly_saving, status
            FROM goals WHERE id = %s
        """, (goal_id,))
        goal = cursor.fetchone()

        cursor.close()
        conn.close()

        if not goal:
            return jsonify({"success": False, "error": "Goal not found."}), 404

        percent = (float(goal["current_saved"]) / float(goal["target_amount"]) * 100) if goal["target_amount"] else 0

        if percent >= 100:
            prompt = (
                f"The user just completed their goal \"{goal['goal_name']}\" "
                f"({goal['category']}) of ₹{goal['target_amount']:.0f}. "
                f"Congratulate them briefly, then suggest one sensible next financial goal "
                f"and why, in under 80 words."
            )
        else:
            prompt = (
                f"The user is saving for \"{goal['goal_name']}\" ({goal['category']}). "
                f"Target: ₹{goal['target_amount']:.0f}, saved so far: ₹{goal['current_saved']:.0f} "
                f"({percent:.0f}%), target date: {goal['target_date']}, "
                f"current monthly plan: ₹{goal['monthly_saving']:.0f}. "
                f"Give 2-3 short, practical tips to help them reach this faster, under 80 words."
            )

        tips = ask_financial_ai(prompt, "")

        return jsonify({"success": True, "tips": tips})

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
