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

from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
import math
import re
import traceback

from flask import Blueprint, jsonify, request, session
from services.local_evidence import query_osm_local_evidence
from services.local_evidence import query_business_evidence
from services.google_places import get_business_intelligence


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
        "version": "financial-v2",
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

SCHEME_RULES = [
    {
        "id": "micro_finance",
        "name": "Micro Finance Scheme",
        "max_project_cost": Decimal("140000"),
        "interest_rate": Decimal("6.5"),
        "tenure_months": 36,
        "moratorium_months": 3,
    },
    {
        "id": "term_loan",
        "name": "Term Loan Scheme",
        "max_project_cost": None,
        "interest_rate": Decimal("8.0"),
        "tenure_months": 84,
        "moratorium_months": 6,
    },
]


def money_value(value):
    amount = Decimal(str(value))
    return amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def calculate_project_cost(available_capital):
    return money_value(available_capital / Decimal("0.10"))


def calculate_maximum_financing(project_cost):
    return money_value(project_cost * Decimal("0.90"))


def select_scheme(project_cost):
    for scheme in SCHEME_RULES:
        limit = scheme["max_project_cost"]

        if limit is None or project_cost <= limit:
            return scheme

    return SCHEME_RULES[-1]


def calculate_emi(principal, annual_rate, tenure_months):
    principal = Decimal(principal)
    annual_rate = Decimal(annual_rate)

    monthly_rate = annual_rate / Decimal("1200")

    if monthly_rate == 0:
        return money_value(principal / Decimal(tenure_months))

    factor = (Decimal("1") + monthly_rate) ** tenure_months

    emi = principal * monthly_rate * factor / (factor - Decimal("1"))

    return money_value(emi)


def calculate_financial_structure(available_capital):
    margin_capital = money_value(available_capital)

    contribution_rate = Decimal("0.10")
    financing_rate = Decimal("0.90")

    project_cost = calculate_project_cost(margin_capital)
    maximum_financing = calculate_maximum_financing(project_cost)

    scheme = select_scheme(project_cost)

    estimated_emi = calculate_emi(
        maximum_financing,
        scheme["interest_rate"],
        scheme["tenure_months"],
    )

    total_repayment = money_value(
        estimated_emi * Decimal(scheme["tenure_months"])
    )

    total_interest = money_value(
        total_repayment - maximum_financing
    )

    return {
        "margin_capital": float(margin_capital),
        "contribution_rate_percent": float(contribution_rate * 100),
        "financing_rate_percent": float(financing_rate * 100),
        "project_cost": float(project_cost),
        "maximum_financing": float(maximum_financing),
        "scheme": {
            "id": scheme["id"],
            "name": scheme["name"],
            "interest_rate_percent": float(scheme["interest_rate"]),
            "tenure_months": scheme["tenure_months"],
            "tenure_years": scheme["tenure_months"] // 12,
            "moratorium_months": scheme["moratorium_months"],
        },
        "repayment": {
            "estimated_emi": float(estimated_emi),
            "estimated_total_repayment": float(total_repayment),
            "estimated_total_interest": float(total_interest),
        },
        "validation": {
            "status": "requires_official_validation",
            "message": (
                "Scheme parameters are taken from the SIH26091 project "
                "brief used for this build. Current official eligibility "
                "must be verified before an application or borrowing decision."
            ),
        },
    }


def _get_connection():
    """
    Import the existing project's DB connector lazily.

    Lazy import is intentional: importing routes.business must
    never fail just because the database package/config is having
    a runtime problem.
    """
    from database.db import get_connection
    return get_connection()


@business.route("/business/financial-structure", methods=["POST"])
def financial_structure():
    user_id = current_user_id()

    if not user_id:
        return jsonify({
            "success": False,
            "error": "Authentication required."
        }), 401

    data = request.get_json(silent=True) or {}

    available_capital = parse_money(
        data.get("available_capital")
    )

    if available_capital is None or available_capital <= 0:
        return jsonify({
            "success": False,
            "error": "available_capital must be a positive number."
        }), 400

    financial_structure = calculate_financial_structure(
        available_capital
    )

    return jsonify({
        "success": True,
        "stage": "financial_structure_complete",
        "user_id": user_id,
        "financial_structure": financial_structure,
    }), 200


@business.route("/business/local-evidence", methods=["POST"])
def local_evidence():
    user_id = current_user_id()

    if not user_id:
        return jsonify({
            "success": False,
            "error": "Authentication required."
        }), 401

    data = request.get_json(silent=True) or {}

    latitude = data.get("latitude")
    longitude = data.get("longitude")
    radius_km = data.get("radius_km", 5)

    try:
        latitude = float(latitude)
        longitude = float(longitude)
        radius_km = float(radius_km)
    except (TypeError, ValueError):
        return jsonify({
            "success": False,
            "error": "Valid latitude, longitude and radius_km are required."
        }), 400

    if not (-90 <= latitude <= 90):
        return jsonify({
            "success": False,
            "error": "Invalid latitude."
        }), 400

    if not (-180 <= longitude <= 180):
        return jsonify({
            "success": False,
            "error": "Invalid longitude."
        }), 400

    if not (1 <= radius_km <= 10):
        return jsonify({
            "success": False,
            "error": "radius_km must be between 1 and 10."
        }), 400

    try:
        evidence = query_osm_local_evidence(
            latitude=latitude,
            longitude=longitude,
            radius_km=radius_km,
        )

        return jsonify({
            "success": True,
            "stage": "local_evidence_complete",
            "user_id": user_id,
            "local_evidence": evidence,
        }), 200

    except Exception as exc:
        print("Local evidence unavailable:", exc)

        return jsonify({
            "success": True,
            "stage": "local_evidence_unavailable",
            "user_id": user_id,
            "local_evidence": {
                "source": {
                    "provider": "OpenStreetMap",
                    "method": "Overpass API",
                    "status": "unavailable",
                    "message": (
                        "Local business data could not be "
                        "retrieved at this time."
                    )
                },
                "radius_km": radius_km,
                "direct_competitors": [],
                "related_competitors": [],
                "summary": {
                    "direct_competitor_count": 0,
                    "related_competitor_count": 0
                },
                "data_available": False,
                "analysis_note": (
                    "No local competitor data has been "
                    "assumed or fabricated."
                )
            }
        }), 200


@business.route("/business/business-evidence", methods=["POST"])
def business_evidence():
    user_id = current_user_id()

    if not user_id:
        return jsonify({
            "success": False,
            "error": "Authentication required."
        }), 401

    data = request.get_json(silent=True) or {}

    business_type = clean_text(
        data.get("business_type"),
        50
    ).lower()

    try:
        latitude = float(data.get("latitude"))
        longitude = float(data.get("longitude"))
        radius_km = float(data.get("radius_km", 5))
    except (TypeError, ValueError):
        return jsonify({
            "success": False,
            "error": (
                "Valid business_type, latitude, "
                "longitude and radius_km are required."
            )
        }), 400

    if business_type not in BUSINESS_TYPES:
        return jsonify({
            "success": False,
            "error": "Unsupported business type."
        }), 400

    if not -90 <= latitude <= 90:
        return jsonify({
            "success": False,
            "error": "Invalid latitude."
        }), 400

    if not -180 <= longitude <= 180:
        return jsonify({
            "success": False,
            "error": "Invalid longitude."
        }), 400

    if not 1 <= radius_km <= 10:
        return jsonify({
            "success": False,
            "error": "radius_km must be between 1 and 10."
        }), 400

    try:
        intelligence = get_business_intelligence(
            latitude=latitude,
            longitude=longitude,
            business_type=business_type,
            radius_km=radius_km,
        )

        return jsonify({
            "success": True,
            "stage": "business_specific_evidence_complete",
            "user_id": user_id,
            "business_evidence": intelligence,
        }), 200

    except Exception as exc:
        print("Google Places business evidence error:", exc)

        return jsonify({
            "success": True,
            "stage": "business_specific_evidence_unavailable",
            "user_id": user_id,
            "business_evidence": {
                "success": False,
                "source": {
                    "provider": "Google Places API (New)",
                    "available": False,
                },
                "business_type": business_type,
                "radius_km": radius_km,
                "places": [],
                "summary": {
                    "business_count": 0,
                    "average_rating": None,
                    "total_reviews": 0,
                    "competition_pressure": "Unknown",
                },
                "data_quality": {
                    "provider_available": False,
                    "note": (
                        "Google Places data could not be retrieved. "
                        "AmiBusiness will not invent local business data."
                    ),
                },
            },
        }), 200
def business_evidence():
    user_id = current_user_id()

    if not user_id:
        return jsonify({
            "success": False,
            "error": "Authentication required."
        }), 401

    data = request.get_json(silent=True) or {}

    business_type = clean_text(
        data.get("business_type"),
        50
    ).lower()

    try:
        latitude = float(data.get("latitude"))
        longitude = float(data.get("longitude"))
        radius_km = float(data.get("radius_km", 5))
    except (TypeError, ValueError):
        return jsonify({
            "success": False,
            "error": "Valid business_type, latitude, longitude and radius_km are required."
        }), 400

    if business_type not in BUSINESS_TYPES:
        return jsonify({
            "success": False,
            "error": "Unsupported business type."
        }), 400

    if not -90 <= latitude <= 90:
        return jsonify({
            "success": False,
            "error": "Invalid latitude."
        }), 400

    if not -180 <= longitude <= 180:
        return jsonify({
            "success": False,
            "error": "Invalid longitude."
        }), 400

    if not 1 <= radius_km <= 10:
        return jsonify({
            "success": False,
            "error": "radius_km must be between 1 and 10."
        }), 400

    try:
        evidence = query_business_evidence(
            latitude=latitude,
            longitude=longitude,
            business_type=business_type,
            radius_km=radius_km,
        )

        return jsonify({
            "success": True,
            "stage": "business_specific_evidence_complete",
            "user_id": user_id,
            "business_evidence": evidence,
        }), 200

    except Exception as exc:
        print("Business evidence unavailable:", exc)

        return jsonify({
            "success": True,
            "stage": "business_specific_evidence_unavailable",
            "user_id": user_id,
            "business_evidence": {
                "source": {
                    "provider": "OpenStreetMap",
                    "method": "Overpass API",
                    "status": "unavailable",
                    "message": (
                        "Local competitor data could not be "
                        "retrieved at this time."
                    )
                },
                "business_type": business_type,
                "radius_km": radius_km,
                "direct_competitors": [],
                "related_competitors": [],
                "summary": {
                    "direct_competitor_count": 0,
                    "related_competitor_count": 0
                },
                "data_available": False,
                "analysis_note": (
                    "Competitor analysis requires external "
                    "local business data. No competitor data "
                    "has been assumed or fabricated."
                )
            }
        }), 200


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
