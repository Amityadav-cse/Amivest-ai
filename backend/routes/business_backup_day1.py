"""
AmiVest Business Advisor - Day 1
--------------------------------

This file fixes the import error:
    ImportError: cannot import name 'business' from 'routes.business'

The Flask blueprint is intentionally named exactly:
    business = Blueprint("business", __name__)

Routes:
    GET  /business/health
    GET  /business/modes
    POST /business/analyze-intake
    GET  /business/profile
    POST /business/profile

Day 1 only collects and validates the business request.
It does NOT invent population, competitors, rent, demand or profit.
Those engines will be added in later stages.
"""

from __future__ import annotations

from decimal import Decimal, InvalidOperation
import math
import re
import traceback

from flask import Blueprint, jsonify, request, session


# ============================================================
# BLUEPRINT
# ============================================================

business = Blueprint("business", __name__)


# ============================================================
# CONSTANTS
# ============================================================

BUSINESS_TYPES = {
    "retail",
    "food",
    "poultry",
    "dairy",
    "agriculture",
    "electrical",
    "electronics",
    "services",
    "manufacturing",
    "other",
}


# ============================================================
# SAFE HELPERS
# ============================================================

def current_user_id():
    """Read the authenticated user from the Flask session."""
    value = session.get("user_id")

    if value is None:
        return None

    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def clean_text(value, max_length=250):
    """Normalize user-entered text without throwing."""
    if value is None:
        return ""

    text = re.sub(r"\s+", " ", str(value)).strip()
    return text[:max_length]


def parse_money(value):
    """Convert ₹/comma formatted input into Decimal safely."""
    if value is None or value == "":
        return None

    try:
        text = (
            str(value)
            .replace(",", "")
            .replace("₹", "")
            .strip()
        )

        number = Decimal(text)

        if not number.is_finite() or number < 0:
            return None

        return number.quantize(Decimal("0.01"))

    except (InvalidOperation, ValueError, TypeError):
        return None


def parse_radius(value):
    """Keep the analysis radius between 1 and 10 km."""
    if value in (None, ""):
        return 5.0

    try:
        radius = float(value)
    except (TypeError, ValueError):
        return 5.0

    if not math.isfinite(radius):
        return 5.0

    return round(max(1.0, min(radius, 10.0)), 1)


# ============================================================
# HEALTH
# ============================================================

@business.route("/business/health", methods=["GET"])
def business_health():
    return jsonify({
        "success": True,
        "service": "AmiVest Business Advisor",
        "status": "ready",
        "version": "day-1",
    }), 200


# ============================================================
# MODE LIST
# ============================================================

@business.route("/business/modes", methods=["GET"])
def business_modes():
    return jsonify({
        "success": True,
        "modes": [
            {
                "id": "finance",
                "name": "AmiVest Finance",
                "icon": "💰",
                "path": "/dashboard",
            },
            {
                "id": "rent",
                "name": "AmiVest Rent",
                "icon": "🏠",
                "path": "/rent",
            },
            {
                "id": "business",
                "name": "AmiVest Business",
                "icon": "🏪",
                "path": "/business",
            },
        ],
    }), 200


# ============================================================
# BUSINESS INTAKE
# ============================================================

@business.route("/business/analyze-intake", methods=["POST"])
def analyze_intake():
    """
    Capture the initial business idea.

    Example:
        {
          "business_type": "electrical",
          "location_text": "Pipcho, Hazaribagh",
          "available_capital": 200000,
          "experience_level": "beginner",
          "radius_km": 5
        }
    """

    user_id = current_user_id()

    if not user_id:
        return jsonify({
            "success": False,
            "error": "Authentication required.",
        }), 401

    data = request.get_json(silent=True) or {}

    business_type = clean_text(
        data.get("business_type"),
        60,
    ).lower()

    location = clean_text(
        data.get("location_text"),
        250,
    )

    capital = parse_money(
        data.get("available_capital")
    )

    experience = clean_text(
        data.get("experience_level"),
        50,
    ).lower()

    radius_km = parse_radius(
        data.get("radius_km")
    )

    if business_type not in BUSINESS_TYPES:
        return jsonify({
            "success": False,
            "error": "Please select a valid business type.",
        }), 400

    if not location:
        return jsonify({
            "success": False,
            "error": "Location is required.",
        }), 400

    if capital is None or capital <= 0:
        return jsonify({
            "success": False,
            "error": "Available capital must be greater than ₹0.",
        }), 400

    return jsonify({
        "success": True,
        "stage": "intake_complete",
        "user_id": user_id,
        "intake": {
            "business_type": business_type,
            "location": location,
            "available_capital": float(capital),
            "experience_level": experience or "not specified",
            "radius_km": radius_km,
        },
        "next_modules": [
            "location_resolution",
            "5km_business_search",
            "population_households",
            "demand_signals",
            "competitor_density",
            "rent_research",
            "supplier_price_research",
            "financial_model",
            "scheme_router",
        ],
        "message": (
            "Business idea captured. "
            "No feasibility result has been invented yet."
        ),
    }), 200


# ============================================================
# PROFILE - OPTIONAL DATABASE PERSISTENCE
# ============================================================

def _get_connection():
    """
    Import the existing project's DB connector lazily.

    Lazy import is intentional: importing routes.business must
    never fail just because the database package/config is having
    a runtime problem.
    """
    from database.db import get_connection
    return get_connection()


@business.route("/business/profile", methods=["GET"])
def get_business_profile():
    user_id = current_user_id()

    if not user_id:
        return jsonify({
            "success": False,
            "authenticated": False,
            "error": "Authentication required.",
        }), 401

    conn = None
    cursor = None

    try:
        conn = _get_connection()

        if not conn:
            return jsonify({
                "success": False,
                "error": "Database unavailable.",
            }), 500

        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                id,
                user_id,
                business_type,
                business_name,
                location_text,
                latitude,
                longitude,
                available_capital,
                experience_level,
                radius_km,
                status
            FROM business_profiles
            WHERE user_id = %s
            ORDER BY id DESC
            LIMIT 1
            """,
            (user_id,),
        )

        row = cursor.fetchone()

        return jsonify({
            "success": True,
            "profile": row,
        }), 200

    except Exception as exc:
        traceback.print_exc()

        return jsonify({
            "success": False,
            "error": str(exc),
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


@business.route("/business/profile", methods=["POST"])
def save_business_profile():
    user_id = current_user_id()

    if not user_id:
        return jsonify({
            "success": False,
            "authenticated": False,
            "error": "Authentication required.",
        }), 401

    data = request.get_json(silent=True) or {}

    business_type = clean_text(
        data.get("business_type"),
        60,
    ).lower()

    business_name = clean_text(
        data.get("business_name"),
        120,
    )

    location = clean_text(
        data.get("location_text"),
        250,
    )

    capital = parse_money(
        data.get("available_capital")
    )

    experience = clean_text(
        data.get("experience_level"),
        50,
    )

    radius_km = parse_radius(
        data.get("radius_km")
    )

    if business_type not in BUSINESS_TYPES:
        return jsonify({
            "success": False,
            "error": "Please select a valid business type.",
        }), 400

    if not location:
        return jsonify({
            "success": False,
            "error": "Location is required.",
        }), 400

    if capital is None or capital <= 0:
        return jsonify({
            "success": False,
            "error": "Available capital must be greater than ₹0.",
        }), 400

    try:
        latitude = data.get("latitude")
        longitude = data.get("longitude")

        latitude = (
            float(latitude)
            if latitude not in (None, "")
            else None
        )

        longitude = (
            float(longitude)
            if longitude not in (None, "")
            else None
        )
    except (TypeError, ValueError):
        return jsonify({
            "success": False,
            "error": "Invalid latitude or longitude.",
        }), 400

    conn = None
    cursor = None

    try:
        conn = _get_connection()

        if not conn:
            return jsonify({
                "success": False,
                "error": "Database unavailable.",
            }), 500

        cursor = conn.cursor()

        cursor.execute(
            """
            INSERT INTO business_profiles
            (
                user_id,
                business_type,
                business_name,
                location_text,
                latitude,
                longitude,
                available_capital,
                experience_level,
                radius_km,
                status
            )
            VALUES
            (
                %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s
            )
            """,
            (
                user_id,
                business_type,
                business_name or None,
                location,
                latitude,
                longitude,
                capital,
                experience or None,
                radius_km,
                "intake_complete",
            ),
        )

        conn.commit()

        return jsonify({
            "success": True,
            "message": "Business profile saved.",
            "profile_id": cursor.lastrowid,
        }), 201

    except Exception as exc:
        if conn:
            try:
                conn.rollback()
            except Exception:
                pass

        traceback.print_exc()

        return jsonify({
            "success": False,
            "error": str(exc),
            "hint": (
                "Run backend/business_schema.sql after checking "
                "your existing database schema."
            ),
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
