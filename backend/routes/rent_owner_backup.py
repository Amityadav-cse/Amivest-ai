from pathlib import Path
import json
import uuid

from flask import Blueprint, jsonify, request, session
from werkzeug.utils import secure_filename

from database.db import get_connection


rent_owner = Blueprint("rent_owner", __name__)

BASE_DIR = Path(__file__).resolve().parents[1]

UPLOAD_DIR = BASE_DIR / "uploads" / "rent"

IMAGE_EXTENSIONS = {
    "jpg",
    "jpeg",
    "png",
    "webp",
}

DOCUMENT_EXTENSIONS = {
    "jpg",
    "jpeg",
    "png",
    "webp",
    "pdf",
}

MAX_FILE_SIZE = 10 * 1024 * 1024


# ============================================================
# HELPERS
# ============================================================

def get_current_user_id():
    """
    Get the logged-in user from Flask session.

    IMPORTANT:
    Never trust user_id sent from React for authorization.
    """

    user_id = session.get("user_id")

    if user_id is None:
        return None

    try:
        return int(user_id)
    except (TypeError, ValueError):
        return None


def require_login():
    user_id = get_current_user_id()

    if not user_id:
        return None, (
            jsonify({
                "success": False,
                "error": "Please login first."
            }),
            401
        )

    return user_id, None


def clean(value, maximum=500):
    return str(value or "").strip()[:maximum]


def safe_int(value, default=0):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def safe_float(value, default=None):
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def get_extension(filename):
    if not filename or "." not in filename:
        return ""

    return filename.rsplit(".", 1)[1].lower()


def save_file(file, folder, allowed_extensions):
    if not file or not file.filename:
        raise ValueError("File is missing.")

    filename = secure_filename(file.filename)

    if not filename:
        raise ValueError("Invalid filename.")

    ext = get_extension(filename)

    if ext not in allowed_extensions:
        raise ValueError(
            "Unsupported file format. "
            "Allowed: "
            + ", ".join(sorted(allowed_extensions))
        )

    folder.mkdir(
        parents=True,
        exist_ok=True
    )

    new_filename = (
        f"{uuid.uuid4().hex}.{ext}"
    )

    target = folder / new_filename

    file.save(target)

    if target.stat().st_size > MAX_FILE_SIZE:
        target.unlink(missing_ok=True)

        raise ValueError(
            "File must be smaller than 10 MB."
        )

    return str(
        target.relative_to(BASE_DIR)
    )


def database():
    connection = get_connection()

    if not connection:
        raise RuntimeError(
            "Database connection failed."
        )

    return connection


# ============================================================
# HEALTH CHECK
# ============================================================

@rent_owner.get("/api/rent/owner/health")
def owner_health():

    return jsonify({
        "success": True,
        "service": "AmiVest Rent Owner",
        "version": "2.0",
        "status": "running"
    })


# ============================================================
# OWNER PROFILE
# ============================================================

@rent_owner.post("/api/rent/owner/profile")
def save_owner_profile():

    user_id, error = require_login()

    if error:
        return error

    data = request.get_json(
        silent=True
    ) or {}

    full_name = clean(
        data.get("full_name"),
        160
    )

    primary_mobile = clean(
        data.get("primary_mobile"),
        30
    )

    secondary_mobile = clean(
        data.get("secondary_mobile"),
        30
    )

    email = clean(
        data.get("email"),
        190
    )

    if not full_name:
        return jsonify({
            "success": False,
            "error": "Full name is required."
        }), 400

    if not primary_mobile:
        return jsonify({
            "success": False,
            "error": "Primary mobile is required."
        }), 400

    connection = None
    cursor = None

    try:

        connection = database()

        cursor = connection.cursor()

        cursor.execute(
            """
            INSERT INTO rent_owners
            (
                user_id,
                full_name,
                primary_mobile,
                secondary_mobile,
                email
            )
            VALUES
            (
                %s,
                %s,
                %s,
                %s,
                %s
            )

            ON DUPLICATE KEY UPDATE

                full_name =
                    VALUES(full_name),

                primary_mobile =
                    VALUES(primary_mobile),

                secondary_mobile =
                    VALUES(secondary_mobile),

                email =
                    VALUES(email)
            """,
            (
                user_id,
                full_name,
                primary_mobile,
                secondary_mobile or None,
                email or None,
            )
        )

        connection.commit()

        return jsonify({
            "success": True,
            "message": "Owner profile saved."
        })

    except Exception as e:

        if connection:
            connection.rollback()

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# ============================================================
# OWNER DOCUMENT
# ============================================================

@rent_owner.post("/api/rent/owner/document")
def upload_owner_document():

    user_id, error = require_login()

    if error:
        return error

    document = request.files.get(
        "document"
    )

    document_type = clean(
        request.form.get(
            "document_type"
        ),
        60
    )

    if not document:
        return jsonify({
            "success": False,
            "error": "Document is required."
        }), 400

    if not document_type:
        return jsonify({
            "success": False,
            "error": "Document type is required."
        }), 400

    connection = None
    cursor = None

    try:

        connection = database()

        cursor = connection.cursor(
            dictionary=True
        )

        cursor.execute(
            """
            SELECT id
            FROM rent_owners
            WHERE user_id = %s
            LIMIT 1
            """,
            (user_id,)
        )

        owner = cursor.fetchone()

        if not owner:

            return jsonify({
                "success": False,
                "error": (
                    "Create owner profile first."
                )
            }), 400

        file_path = save_file(
            document,
            UPLOAD_DIR
            / str(user_id)
            / "identity",
            DOCUMENT_EXTENSIONS
        )

        cursor.execute(
            """
            INSERT INTO rent_owner_documents
            (
                owner_id,
                document_type,
                front_path,
                verification_status
            )
            VALUES
            (
                %s,
                %s,
                %s,
                'pending'
            )
            """,
            (
                owner["id"],
                document_type,
                file_path,
            )
        )

        connection.commit()

        return jsonify({
            "success": True,
            "message": (
                "Document uploaded for verification."
            ),
            "document_id": cursor.lastrowid,
            "status": "pending"
        }), 201

    except ValueError as e:

        if connection:
            connection.rollback()

        return jsonify({
            "success": False,
            "error": str(e)
        }), 400

    except Exception as e:

        if connection:
            connection.rollback()

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# ============================================================
# CREATE PROPERTY
# ============================================================

@rent_owner.post("/api/rent/owner/property")
def create_property():

    user_id, error = require_login()

    if error:
        return error

    data = request.form

    property_type = clean(
        data.get("property_type"),
        30
    )

    property_name = clean(
        data.get("name"),
        180
    )

    address = clean(
        data.get("address_text"),
        1000
    )

    if property_type not in {
        "pg",
        "room",
        "flat",
        "short_stay"
    }:

        return jsonify({
            "success": False,
            "error": "Invalid property type."
        }), 400

    if not property_name:

        return jsonify({
            "success": False,
            "error": "Property name is required."
        }), 400

    if not address:

        return jsonify({
            "success": False,
            "error": "Address is required."
        }), 400

    photos = [
        file
        for file in request.files.getlist(
            "photos"
        )
        if file and file.filename
    ]

    # ========================================================
    # FIVE PHOTO MINIMUM
    # ========================================================

    if len(photos) < 5:

        return jsonify({
            "success": False,
            "error": (
                "Minimum 5 property images "
                "are required."
            )
        }), 400

    if len(photos) > 20:

        return jsonify({
            "success": False,
            "error": (
                "Maximum 20 property images "
                "are allowed."
            )
        }), 400

    latitude = safe_float(
        data.get("latitude")
    )

    longitude = safe_float(
        data.get("longitude")
    )

    total_rooms = max(
        1,
        safe_int(
            data.get(
                "total_rooms"
            ),
            1
        )
    )

    security_deposit = max(
        0,
        safe_float(
            data.get(
                "security_deposit"
            ),
            0
        )
    )

    monthly_rent = safe_float(
        data.get(
            "monthly_rent"
        )
    )

    nightly_rate = safe_float(
        data.get(
            "nightly_rate"
        )
    )

    electricity_policy = (
        clean(
            data.get(
                "electricity_policy"
            ),
            40
        )
        or "separate"
    )

    public_location_mode = (
        clean(
            data.get(
                "public_location_mode"
            ),
            30
        )
        or "approximate"
    )

    available_from = (
        data.get(
            "available_from"
        )
        or None
    )

    amenities_json = clean(
        data.get(
            "amenities_json"
        ),
        12000
    )

    agreement = request.files.get(
        "agreement"
    )

    connection = None
    cursor = None

    try:

        connection = database()

        cursor = connection.cursor(
            dictionary=True
        )

        # ----------------------------------------------------
        # Find owner from logged-in user
        # ----------------------------------------------------

        cursor.execute(
            """
            SELECT id
            FROM rent_owners
            WHERE user_id = %s
            LIMIT 1
            """,
            (user_id,)
        )

        owner = cursor.fetchone()

        if not owner:

            return jsonify({
                "success": False,
                "error": (
                    "Owner profile not found. "
                    "Create it first."
                )
            }), 400

        # ----------------------------------------------------
        # Property
        # ----------------------------------------------------

        cursor.execute(
            """
            INSERT INTO rent_properties
            (
                owner_id,
                property_type,
                name,
                address_text,
                latitude,
                longitude,
                total_rooms,
                security_deposit,
                monthly_rent,
                nightly_rate,
                electricity_policy,
                public_location_mode,
                status,
                verification_status,
                available_from
            )
            VALUES
            (
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                'draft',
                'pending',
                %s
            )
            """,
            (
                owner["id"],
                property_type,
                property_name,
                address,
                latitude,
                longitude,
                total_rooms,
                security_deposit,
                monthly_rent,
                nightly_rate,
                electricity_policy,
                public_location_mode,
                available_from,
            )
        )

        property_id = cursor.lastrowid

        # ----------------------------------------------------
        # Agreement
        # ----------------------------------------------------

        if agreement and agreement.filename:

            agreement_path = save_file(
                agreement,
                UPLOAD_DIR
                / str(user_id)
                / "agreements",
                DOCUMENT_EXTENSIONS
            )

            cursor.execute(
                """
                UPDATE rent_properties
                SET agreement_path = %s
                WHERE id = %s
                  AND owner_id = %s
                """,
                (
                    agreement_path,
                    property_id,
                    owner["id"],
                )
            )

        # ----------------------------------------------------
        # Photos
        # ----------------------------------------------------

        for index, photo in enumerate(
            photos
        ):

            photo_path = save_file(
                photo,
                UPLOAD_DIR
                / str(user_id)
                / "properties"
                / str(property_id),
                IMAGE_EXTENSIONS
            )

            cursor.execute(
                """
                INSERT INTO
                    rent_property_photos
                (
                    property_id,
                    file_path,
                    sort_order,
                    verification_status
                )
                VALUES
                (
                    %s,
                    %s,
                    %s,
                    'pending'
                )
                """,
                (
                    property_id,
                    photo_path,
                    index,
                )
            )

        # ----------------------------------------------------
        # Amenities
        # ----------------------------------------------------

        if amenities_json:

            try:

                amenities = json.loads(
                    amenities_json
                )

                if isinstance(
                    amenities,
                    dict
                ):

                    for key, enabled in (
                        amenities.items()
                    ):

                        if not enabled:
                            continue

                        cursor.execute(
                            """
                            INSERT INTO
                                rent_property_amenities
                            (
                                property_id,
                                amenity_key,
                                amenity_value
                            )
                            VALUES
                            (
                                %s,
                                %s,
                                'yes'
                            )
                            """,
                            (
                                property_id,
                                clean(
                                    key,
                                    80
                                ),
                            )
                        )

            except json.JSONDecodeError:
                pass

        connection.commit()

        return jsonify({
            "success": True,
            "message": (
                "Property submitted "
                "for verification."
            ),
            "property_id": property_id,
            "photos": len(photos),
            "status": "pending"
        }), 201

    except ValueError as e:

        if connection:
            connection.rollback()

        return jsonify({
            "success": False,
            "error": str(e)
        }), 400

    except Exception as e:

        if connection:
            connection.rollback()

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# ============================================================
# ADD ROOM
# ============================================================

@rent_owner.post("/api/rent/owner/room")
def add_room():

    user_id, error = require_login()

    if error:
        return error

    data = request.get_json(
        silent=True
    ) or {}

    property_id = safe_int(
        data.get("property_id")
    )

    room_number = clean(
        data.get("room_number"),
        50
    )

    room_type = (
        clean(
            data.get("room_type"),
            40
        )
        or "shared"
    )

    gender_policy = (
        clean(
            data.get("gender_policy"),
            30
        )
        or "all"
    )

    max_occupants = max(
        1,
        safe_int(
            data.get(
                "max_occupants"
            ),
            1
        )
    )

    current_occupants = max(
        0,
        safe_int(
            data.get(
                "current_occupants"
            ),
            0
        )
    )

    price_per_room = safe_float(
        data.get(
            "price_per_room"
        )
    )

    price_per_bed = safe_float(
        data.get(
            "price_per_bed"
        )
    )

    if not property_id:

        return jsonify({
            "success": False,
            "error": "Property ID is required."
        }), 400

    if not room_number:

        return jsonify({
            "success": False,
            "error": "Room number is required."
        }), 400

    if current_occupants > max_occupants:

        return jsonify({
            "success": False,
            "error": (
                "Occupants cannot be greater "
                "than room capacity."
            )
        }), 400

    if gender_policy not in {
        "men",
        "women",
        "all",
        "family"
    }:

        return jsonify({
            "success": False,
            "error": "Invalid stay policy."
        }), 400

    if current_occupants == 0:
        status = "vacant"

    elif current_occupants >= max_occupants:
        status = "full"

    else:
        status = "occupied"

    connection = None
    cursor = None

    try:

        connection = database()

        cursor = connection.cursor(
            dictionary=True
        )

        # ----------------------------------------------------
        # Make sure this property belongs to owner
        # ----------------------------------------------------

        cursor.execute(
            """
            SELECT p.id
            FROM rent_properties p

            INNER JOIN rent_owners o
                ON o.id = p.owner_id

            WHERE p.id = %s
              AND o.user_id = %s

            LIMIT 1
            """,
            (
                property_id,
                user_id,
            )
        )

        property_row = cursor.fetchone()

        if not property_row:

            return jsonify({
                "success": False,
                "error": (
                    "Property not found "
                    "or not owned by you."
                )
            }), 403

        cursor.execute(
            """
            INSERT INTO rent_rooms
            (
                property_id,
                room_number,
                room_type,
                max_occupants,
                current_occupants,
                price_per_room,
                price_per_bed,
                gender_policy,
                status
            )
            VALUES
            (
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s
            )
            """,
            (
                property_id,
                room_number,
                room_type,
                max_occupants,
                current_occupants,
                price_per_room,
                price_per_bed,
                gender_policy,
                status,
            )
        )

        room_id = cursor.lastrowid

        connection.commit()

        return jsonify({
            "success": True,
            "room_id": room_id,
            "status": status
        }), 201

    except Exception as e:

        if connection:
            connection.rollback()

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# ============================================================
# OWNER DASHBOARD
# ============================================================

@rent_owner.get("/api/rent/owner/dashboard")
def owner_dashboard():

    user_id, error = require_login()

    if error:
        return error

    connection = None
    cursor = None

    try:

        connection = database()

        cursor = connection.cursor(
            dictionary=True
        )

        # ----------------------------------------------------
        # Owner
        # ----------------------------------------------------

        cursor.execute(
            """
            SELECT
                id,
                user_id,
                full_name,
                primary_mobile,
                secondary_mobile,
                email,
                phone_verified,
                identity_status,
                status

            FROM rent_owners

            WHERE user_id = %s

            LIMIT 1
            """,
            (user_id,)
        )

        owner = cursor.fetchone()

        if not owner:

            return jsonify({
                "success": True,
                "owner": None,
                "properties": [],
                "rooms": [],
                "summary": {
                    "properties": 0,
                    "rooms": 0,
                    "capacity": 0,
                    "occupied": 0,
                    "vacant_beds": 0
                }
            })

        # ----------------------------------------------------
        # Properties
        # ----------------------------------------------------

        cursor.execute(
            """
            SELECT
                id,
                name,
                property_type,
                total_rooms,
                security_deposit,
                monthly_rent,
                nightly_rate,
                electricity_policy,
                status,
                verification_status,
                available_from,
                address_text,
                latitude,
                longitude

            FROM rent_properties

            WHERE owner_id = %s

            ORDER BY id DESC
            """,
            (owner["id"],)
        )

        properties = (
            cursor.fetchall()
            or []
        )

        property_ids = [
            item["id"]
            for item in properties
        ]

        rooms = []

        # ----------------------------------------------------
        # Rooms
        # ----------------------------------------------------

        if property_ids:

            placeholders = ",".join(
                ["%s"] * len(property_ids)
            )

            cursor.execute(
                f"""
                SELECT
                    id,
                    property_id,
                    room_number,
                    room_type,
                    max_occupants,
                    current_occupants,
                    price_per_room,
                    price_per_bed,
                    gender_policy,
                    status

                FROM rent_rooms

                WHERE property_id
                    IN ({placeholders})

                ORDER BY
                    property_id,
                    room_number
                """,
                tuple(property_ids)
            )

            rooms = (
                cursor.fetchall()
                or []
            )

        capacity = sum(
            safe_int(
                room.get(
                    "max_occupants"
                )
            )
            for room in rooms
        )

        occupied = sum(
            safe_int(
                room.get(
                    "current_occupants"
                )
            )
            for room in rooms
        )

        return jsonify({
            "success": True,

            "owner": owner,

            "properties": properties,

            "rooms": rooms,

            "summary": {
                "properties": len(
                    properties
                ),

                "rooms": len(
                    rooms
                ),

                "capacity": capacity,

                "occupied": occupied,

                "vacant_beds": max(
                    capacity - occupied,
                    0
                )
            }
        })

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()