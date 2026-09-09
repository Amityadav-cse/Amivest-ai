# ============================================================
# AMIRENT - OWNER ROUTES
# ============================================================
#
# Features:
#
# 1. Owner profile
# 2. Owner identity documents
# 3. Property creation
# 4. Minimum 5 property photos
# 5. Agreement upload
# 6. Property amenities
# 7. Room management
# 8. Owner dashboard
# 9. Renter applications
# 10. Accept application
# 11. Reject application
# 12. Automatic room occupancy
# 13. Payment tracking
# 14. Notifications
# 15. Audit logs
#
# IMPORTANT:
# Every query is restricted using the logged-in user.
# This prevents Owner A from seeing Owner B's data.
# ============================================================


import os
import json
import uuid
from pathlib import Path
from datetime import datetime, date

from flask import (
    Blueprint,
    request,
    jsonify,
    session,
)

from werkzeug.utils import secure_filename


# ============================================================
# DATABASE
# ============================================================

try:

    from database.db import database

except Exception:

    database = None


# ============================================================
# BLUEPRINT
# ============================================================

rent_owner = Blueprint(
    "rent_owner",
    __name__
)


# ============================================================
# BASE DIRECTORIES
# ============================================================

BASE_DIR = Path(
    __file__
).resolve().parent.parent


UPLOAD_DIR = Path(
    os.getenv(
        "UPLOAD_DIR",
        BASE_DIR / "uploads"
    )
)


UPLOAD_DIR.mkdir(
    parents=True,
    exist_ok=True
)


# ============================================================
# ALLOWED FILE TYPES
# ============================================================

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


# ============================================================
# GENERAL HELPERS
# ============================================================

def clean(value, max_length=None):

    if value is None:

        return ""

    value = str(
        value
    ).strip()

    if max_length:

        value = value[
            :max_length
        ]

    return value


def safe_int(
    value,
    default=0
):

    try:

        if value is None:
            return default

        return int(
            float(value)
        )

    except (
        TypeError,
        ValueError
    ):

        return default


def safe_float(
    value,
    default=None
):

    try:

        if value is None:
            return default

        if str(value).strip() == "":
            return default

        return float(
            value
        )

    except (
        TypeError,
        ValueError
    ):

        return default


def get_extension(filename):

    if not filename:
        return ""

    filename = secure_filename(
        filename
    )

    if "." not in filename:
        return ""

    return (
        filename
        .rsplit(
            ".",
            1
        )[1]
        .lower()
    )


def save_file(
    file,
    directory,
    allowed_extensions
):

    if not file:

        raise ValueError(
            "File is required."
        )

    original_name = secure_filename(
        file.filename or ""
    )

    if not original_name:

        raise ValueError(
            "Invalid filename."
        )

    extension = get_extension(
        original_name
    )

    if extension not in allowed_extensions:

        raise ValueError(
            "Unsupported file type."
        )

    directory = Path(
        directory
    )

    directory.mkdir(
        parents=True,
        exist_ok=True
    )

    unique_name = (
        uuid.uuid4().hex
        + "."
        + extension
    )

    destination = (
        directory
        / unique_name
    )

    file.save(
        str(destination)
    )

    # Store relative path in database.
    relative_path = destination.relative_to(
        BASE_DIR
    )

    return str(
        relative_path
    )


# ============================================================
# LOGIN
# ============================================================

def require_login():

    user_id = session.get(
        "user_id"
    )

    if not user_id:

        return (
            None,
            (
                jsonify({
                    "success": False,
                    "error":
                        "Login required."
                }),
                401
            )
        )

    return (
        safe_int(
            user_id
        ),
        None
    )


# ============================================================
# DATABASE CHECK
# ============================================================

def require_database():

    if database is None:

        raise RuntimeError(
            "Database module is unavailable."
        )

    return database()


# ============================================================
# AUDIT LOG
# ============================================================

def create_audit_log(
    cursor,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    before_data=None,
    after_data=None,
):

    cursor.execute(
        """
        INSERT INTO rent_audit_logs
        (
            actor_user_id,
            action,
            entity_type,
            entity_id,
            before_json,
            after_json
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
        """,
        (
            actor_user_id,
            clean(action, 80),
            clean(entity_type, 50),
            entity_id,
            json.dumps(
                before_data,
                default=str
            )
            if before_data is not None
            else None,
            json.dumps(
                after_data,
                default=str
            )
            if after_data is not None
            else None,
        )
    )


# ============================================================
# NOTIFICATION
# ============================================================

def create_notification(
    cursor,
    user_id,
    notification_type,
    title,
    body,
    entity_type=None,
    entity_id=None,
):

    cursor.execute(
        """
        INSERT INTO rent_notifications
        (
            user_id,
            type,
            title,
            body,
            related_entity_type,
            related_entity_id,
            is_read
        )
        VALUES
        (
            %s,
            %s,
            %s,
            %s,
            %s,
            %s,
            0
        )
        """,
        (
            user_id,
            clean(
                notification_type,
                50
            ),
            clean(
                title,
                160
            ),
            body,
            clean(
                entity_type,
                50
            )
            if entity_type
            else None,
            entity_id,
        )
    )


# ============================================================
# OWNER PROFILE
# ============================================================

@rent_owner.post(
    "/api/rent/owner/profile"
)
def create_owner_profile():

    user_id, error = require_login()

    if error:
        return error

    data = (
        request.get_json(
            silent=True
        )
        or request.form
    )

    full_name = clean(
        data.get(
            "full_name"
        ),
        160
    )

    primary_mobile = clean(
        data.get(
            "primary_mobile"
        ),
        30
    )

    secondary_mobile = clean(
        data.get(
            "secondary_mobile"
        ),
        30
    )

    email = clean(
        data.get(
            "email"
        ),
        190
    )

    if not full_name:

        return jsonify({
            "success": False,
            "error":
                "Full name is required."
        }), 400

    if not primary_mobile:

        return jsonify({
            "success": False,
            "error":
                "Primary mobile is required."
        }), 400

    connection = None
    cursor = None

    try:

        connection = require_database()

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
            (
                user_id,
            )
        )

        existing = cursor.fetchone()

        if existing:

            cursor.execute(
                """
                UPDATE rent_owners
                SET
                    full_name = %s,
                    primary_mobile = %s,
                    secondary_mobile = %s,
                    email = %s
                WHERE user_id = %s
                """,
                (
                    full_name,
                    primary_mobile,
                    secondary_mobile
                    or None,
                    email
                    or None,
                    user_id,
                )
            )

            owner_id = existing["id"]

            message = (
                "Owner profile updated."
            )

        else:

            cursor.execute(
                """
                INSERT INTO rent_owners
                (
                    user_id,
                    full_name,
                    primary_mobile,
                    secondary_mobile,
                    email,
                    phone_verified,
                    identity_status,
                    status
                )
                VALUES
                (
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    0,
                    'pending',
                    'pending'
                )
                """,
                (
                    user_id,
                    full_name,
                    primary_mobile,
                    secondary_mobile
                    or None,
                    email
                    or None,
                )
            )

            owner_id = cursor.lastrowid

            message = (
                "Owner profile created."
            )

        connection.commit()

        return jsonify({
            "success": True,
            "message": message,
            "owner_id": owner_id
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
# OWNER DOCUMENT
# ============================================================

@rent_owner.post(
    "/api/rent/owner/document"
)
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
            "error":
                "Document is required."
        }), 400

    if not document_type:

        return jsonify({
            "success": False,
            "error":
                "Document type is required."
        }), 400

    connection = None
    cursor = None

    try:

        connection = require_database()

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
            (
                user_id,
            )
        )

        owner = cursor.fetchone()

        if not owner:

            return jsonify({
                "success": False,
                "error":
                    "Create owner profile first."
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

        document_id = cursor.lastrowid

        connection.commit()

        return jsonify({
            "success": True,
            "message":
                "Document uploaded for verification.",
            "document_id":
                document_id,
            "status":
                "pending"
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
# OWNER DOCUMENTS
# ============================================================

@rent_owner.get(
    "/api/rent/owner/documents"
)
def owner_documents():

    user_id, error = require_login()

    if error:
        return error

    connection = None
    cursor = None

    try:

        connection = require_database()

        cursor = connection.cursor(
            dictionary=True
        )

        cursor.execute(
            """
            SELECT
                d.id,
                d.owner_id,
                d.document_type,
                d.front_path,
                d.back_path,
                d.verification_status,
                d.verified_at,
                d.created_at
            FROM rent_owner_documents d
            INNER JOIN rent_owners o
                ON o.id = d.owner_id
            WHERE o.user_id = %s
            ORDER BY d.id DESC
            """,
            (
                user_id,
            )
        )

        documents = (
            cursor.fetchall()
            or []
        )

        return jsonify({
            "success": True,
            "documents": documents
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


# ============================================================
# CREATE PROPERTY
# ============================================================

@rent_owner.post(
    "/api/rent/owner/property"
)
def create_property():

    user_id, error = require_login()

    if error:
        return error

    data = request.form

    property_type = clean(
        data.get(
            "property_type"
        ),
        30
    )

    property_name = clean(
        data.get(
            "name"
        ),
        180
    )

    address = clean(
        data.get(
            "address_text"
        ),
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
            "error":
                "Invalid property type."
        }), 400

    if not property_name:

        return jsonify({
            "success": False,
            "error":
                "Property name is required."
        }), 400

    if not address:

        return jsonify({
            "success": False,
            "error":
                "Address is required."
        }), 400

    photos = [
        file
        for file in request.files.getlist(
            "photos"
        )
        if file
        and file.filename
    ]

    if len(photos) < 5:

        return jsonify({
            "success": False,
            "error":
                "Minimum 5 property images are required."
        }), 400

    if len(photos) > 20:

        return jsonify({
            "success": False,
            "error":
                "Maximum 20 property images are allowed."
        }), 400

    latitude = safe_float(
        data.get(
            "latitude"
        )
    )

    longitude = safe_float(
        data.get(
            "longitude"
        )
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

        connection = require_database()

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
            (
                user_id,
            )
        )

        owner = cursor.fetchone()

        if not owner:

            return jsonify({
                "success": False,
                "error":
                    "Owner profile not found. Create it first."
            }), 400

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
        # AGREEMENT
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
        # PHOTOS
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
                INSERT INTO rent_property_photos
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
        # AMENITIES
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

                        amenity_key = clean(
                            key,
                            80
                        )

                        if not amenity_key:
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
                                amenity_key,
                            )
                        )

            except json.JSONDecodeError:

                pass

        create_audit_log(
            cursor,
            user_id,
            "PROPERTY_CREATED",
            "property",
            property_id,
            None,
            {
                "property_id":
                    property_id,
                "name":
                    property_name,
                "type":
                    property_type,
                "photos":
                    len(photos),
            }
        )

        connection.commit()

        return jsonify({
            "success": True,
            "message":
                "Property submitted for verification.",
            "property_id":
                property_id,
            "photos":
                len(photos),
            "status":
                "pending"
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

@rent_owner.post(
    "/api/rent/owner/room"
)
def add_room():

    user_id, error = require_login()

    if error:
        return error

    data = (
        request.get_json(
            silent=True
        )
        or {}
    )

    property_id = safe_int(
        data.get(
            "property_id"
        )
    )

    room_number = clean(
        data.get(
            "room_number"
        ),
        50
    )

    room_type = (
        clean(
            data.get(
                "room_type"
            ),
            40
        )
        or "shared"
    )

    gender_policy = (
        clean(
            data.get(
                "gender_policy"
            ),
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
            "error":
                "Property ID is required."
        }), 400

    if not room_number:

        return jsonify({
            "success": False,
            "error":
                "Room number is required."
        }), 400

    if current_occupants > max_occupants:

        return jsonify({
            "success": False,
            "error":
                "Occupants cannot be greater than room capacity."
        }), 400

    if gender_policy not in {
        "men",
        "women",
        "all",
        "family"
    }:

        return jsonify({
            "success": False,
            "error":
                "Invalid stay policy."
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

        connection = require_database()

        cursor = connection.cursor(
            dictionary=True
        )

        cursor.execute(
            """
            SELECT
                p.id
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
                "error":
                    "Property not found or not owned by you."
            }), 403

        cursor.execute(
            """
            SELECT id
            FROM rent_rooms
            WHERE property_id = %s
              AND room_number = %s
            LIMIT 1
            """,
            (
                property_id,
                room_number,
            )
        )

        existing = cursor.fetchone()

        if existing:

            return jsonify({
                "success": False,
                "error":
                    "Room number already exists."
            }), 409

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

        create_audit_log(
            cursor,
            user_id,
            "ROOM_CREATED",
            "room",
            room_id,
            None,
            {
                "property_id":
                    property_id,
                "room_number":
                    room_number,
                "capacity":
                    max_occupants,
            }
        )

        connection.commit()

        return jsonify({
            "success": True,
            "room_id":
                room_id,
            "status":
                status
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
# OWNER APPLICATIONS
# ============================================================

@rent_owner.get(
    "/api/rent/owner/applications"
)
def owner_applications():

    user_id, error = require_login()

    if error:
        return error

    connection = None
    cursor = None

    try:

        connection = require_database()

        cursor = connection.cursor(
            dictionary=True
        )

        # ====================================================
        # IMPORTANT:
        # We join through rent_owners.
        #
        # Therefore the owner can ONLY see their own
        # properties and applications.
        # ====================================================

        cursor.execute(
            """
            SELECT

                b.id AS booking_id,

                b.property_id,

                b.room_id,

                b.tenant_user_id,

                b.booking_type,

                b.start_date,

                b.end_date,

                b.amount,

                b.payment_status,

                b.booking_status,

                b.created_at,

                b.updated_at,

                p.name AS property_name,

                p.property_type,

                p.address_text,

                p.security_deposit,

                p.monthly_rent,

                r.room_number,

                r.room_type,

                r.max_occupants,

                r.current_occupants,

                r.gender_policy,

                u.name AS renter_name,

                u.email AS renter_email

            FROM rent_bookings b

            INNER JOIN rent_properties p
                ON p.id = b.property_id

            INNER JOIN rent_owners o
                ON o.id = p.owner_id

            LEFT JOIN rent_rooms r
                ON r.id = b.room_id

            INNER JOIN users u
                ON u.id = b.tenant_user_id

            WHERE o.user_id = %s

            ORDER BY
                b.created_at DESC
            """,
            (
                user_id,
            )
        )

        applications = (
            cursor.fetchall()
            or []
        )

        # ====================================================
        # Additional renter information
        # ====================================================

        for application in applications:

            renter_id = application.get(
                "tenant_user_id"
            )

            application[
                "renter"
            ] = {

                "id":
                    renter_id,

                "name":
                    application.get(
                        "renter_name"
                    ),

                "email":
                    application.get(
                        "renter_email"
                    ),

            }

        return jsonify({

            "success":
                True,

            "applications":
                applications,

            "count":
                len(applications),

        }), 200

    except Exception as e:

        return jsonify({

            "success":
                False,

            "error":
                str(e),

            "applications":
                [],

        }), 500

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# ============================================================
# SINGLE APPLICATION
# ============================================================

@rent_owner.get(
    "/api/rent/owner/applications/<int:booking_id>"
)
def owner_application_detail(
    booking_id
):

    user_id, error = require_login()

    if error:
        return error

    connection = None
    cursor = None

    try:

        connection = require_database()

        cursor = connection.cursor(
            dictionary=True
        )

        cursor.execute(
            """
            SELECT

                b.*,

                p.name AS property_name,

                p.property_type,

                p.address_text,

                p.latitude,

                p.longitude,

                p.security_deposit,

                p.monthly_rent,

                p.electricity_policy,

                r.room_number,

                r.room_type,

                r.max_occupants,

                r.current_occupants,

                r.price_per_room,

                r.price_per_bed,

                r.gender_policy,

                u.name AS renter_name,

                u.email AS renter_email

            FROM rent_bookings b

            INNER JOIN rent_properties p
                ON p.id = b.property_id

            INNER JOIN rent_owners o
                ON o.id = p.owner_id

            LEFT JOIN rent_rooms r
                ON r.id = b.room_id

            INNER JOIN users u
                ON u.id = b.tenant_user_id

            WHERE b.id = %s

              AND o.user_id = %s

            LIMIT 1
            """,
            (
                booking_id,
                user_id,
            )
        )

        application = cursor.fetchone()

        if not application:

            return jsonify({

                "success":
                    False,

                "error":
                    "Application not found."

            }), 404

        return jsonify({

            "success":
                True,

            "application":
                application,

        }), 200

    except Exception as e:

        return jsonify({

            "success":
                False,

            "error":
                str(e)

        }), 500

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# ============================================================
# ACCEPT APPLICATION
# ============================================================

@rent_owner.post(
    "/api/rent/owner/applications/<int:booking_id>/accept"
)
def accept_application(
    booking_id
):

    user_id, error = require_login()

    if error:
        return error

    connection = None
    cursor = None

    try:

        connection = require_database()

        # ====================================================
        # Transaction starts
        # ====================================================

        connection.start_transaction()

        cursor = connection.cursor(
            dictionary=True
        )

        # ====================================================
        # Lock application
        # ====================================================

        cursor.execute(
            """
            SELECT

                b.*,

                p.name AS property_name,

                p.owner_id,

                r.room_number,

                r.max_occupants,

                r.current_occupants,

                r.status AS room_status

            FROM rent_bookings b

            INNER JOIN rent_properties p
                ON p.id = b.property_id

            INNER JOIN rent_owners o
                ON o.id = p.owner_id

            LEFT JOIN rent_rooms r
                ON r.id = b.room_id

            WHERE b.id = %s

              AND o.user_id = %s

            LIMIT 1

            FOR UPDATE
            """,
            (
                booking_id,
                user_id,
            )
        )

        booking = cursor.fetchone()

        if not booking:

            connection.rollback()

            return jsonify({

                "success":
                    False,

                "error":
                    "Application not found."

            }), 404

        # ====================================================
        # Already accepted
        # ====================================================

        if booking[
            "booking_status"
        ] == "accepted":

            connection.rollback()

            return jsonify({

                "success":
                    False,

                "error":
                    "Application is already accepted."

            }), 409

        # ====================================================
        # Already rejected
        # ====================================================

        if booking[
            "booking_status"
        ] == "rejected":

            connection.rollback()

            return jsonify({

                "success":
                    False,

                "error":
                    "Application has already been rejected."

            }), 409

        # ====================================================
        # Room must exist for normal room booking
        # ====================================================

        room_id = booking.get(
            "room_id"
        )

        if not room_id:

            connection.rollback()

            return jsonify({

                "success":
                    False,

                "error":
                    "This application does not have a room assigned."

            }), 400

        # ====================================================
        # Check room capacity
        # ====================================================

        max_occupants = safe_int(
            booking.get(
                "max_occupants"
            ),
            1
        )

        current_occupants = safe_int(
            booking.get(
                "current_occupants"
            ),
            0
        )

        if current_occupants >= max_occupants:

            connection.rollback()

            return jsonify({

                "success":
                    False,

                "error":
                    "This room is already full."

            }), 409

        # ====================================================
        # Save old state for audit
        # ====================================================

        before_booking = {

            "booking_status":
                booking[
                    "booking_status"
                ],

            "payment_status":
                booking[
                    "payment_status"
                ],

            "room_id":
                room_id,

            "room_number":
                booking[
                    "room_number"
                ],

            "current_occupants":
                current_occupants,

        }

        # ====================================================
        # Accept booking
        # ====================================================

        cursor.execute(
            """
            UPDATE rent_bookings
            SET
                booking_status = 'accepted'
            WHERE id = %s
              AND booking_status = 'pending'
            """,
            (
                booking_id,
            )
        )

        if cursor.rowcount != 1:

            connection.rollback()

            return jsonify({

                "success":
                    False,

                "error":
                    "Application could not be accepted."

            }), 409

        # ====================================================
        # Increase room occupancy
        # ====================================================

        new_occupants = (
            current_occupants
            + 1
        )

        if new_occupants >= max_occupants:

            new_room_status = "full"

        else:

            new_room_status = "occupied"

        cursor.execute(
            """
            UPDATE rent_rooms
            SET
                current_occupants = %s,
                status = %s
            WHERE id = %s
            """,
            (
                new_occupants,
                new_room_status,
                room_id,
            )
        )

        # ====================================================
        # After state
        # ====================================================

        after_booking = {

            "booking_status":
                "accepted",

            "payment_status":
                booking[
                    "payment_status"
                ],

            "room_id":
                room_id,

            "room_number":
                booking[
                    "room_number"
                ],

            "current_occupants":
                new_occupants,

            "room_status":
                new_room_status,

        }

        # ====================================================
        # Audit
        # ====================================================

        create_audit_log(

            cursor,

            user_id,

            "APPLICATION_ACCEPTED",

            "booking",

            booking_id,

            before_booking,

            after_booking,

        )

        # ====================================================
        # Notify renter
        # ====================================================

        create_notification(

            cursor,

            booking[
                "tenant_user_id"
            ],

            "booking_accepted",

            "Application Accepted",

            (
                "Your application for "
                +
                str(
                    booking[
                        "property_name"
                    ]
                )
                +
                " has been accepted. "
                +
                "Room "
                +
                str(
                    booking[
                        "room_number"
                    ]
                )
                +
                " is assigned to you."
            ),

            "booking",

            booking_id,

        )

        # ====================================================
        # Notify owner
        # ====================================================

        create_notification(

            cursor,

            user_id,

            "booking_update",

            "Renter Accepted",

            (
                "The renter application has "
                "been accepted successfully."
            ),

            "booking",

            booking_id,

        )

        connection.commit()

        return jsonify({

            "success":
                True,

            "message":
                "Application accepted successfully.",

            "booking_id":
                booking_id,

            "booking_status":
                "accepted",

            "room": {

                "room_id":
                    room_id,

                "room_number":
                    booking[
                        "room_number"
                    ],

                "current_occupants":
                    new_occupants,

                "max_occupants":
                    max_occupants,

                "status":
                    new_room_status,

            },

        }), 200

    except Exception as e:

        if connection:

            connection.rollback()

        return jsonify({

            "success":
                False,

            "error":
                str(e)

        }), 500

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# ============================================================
# REJECT APPLICATION
# ============================================================

@rent_owner.post(
    "/api/rent/owner/applications/<int:booking_id>/reject"
)
def reject_application(
    booking_id
):

    user_id, error = require_login()

    if error:
        return error

    data = (
        request.get_json(
            silent=True
        )
        or {}
    )

    reason = clean(
        data.get(
            "reason"
        ),
        1000
    )

    connection = None
    cursor = None

    try:

        connection = require_database()

        connection.start_transaction()

        cursor = connection.cursor(
            dictionary=True
        )

        # ====================================================
        # Find application belonging to this owner
        # ====================================================

        cursor.execute(
            """
            SELECT

                b.*,

                p.name AS property_name,

                r.room_number

            FROM rent_bookings b

            INNER JOIN rent_properties p
                ON p.id = b.property_id

            INNER JOIN rent_owners o
                ON o.id = p.owner_id

            LEFT JOIN rent_rooms r
                ON r.id = b.room_id

            WHERE b.id = %s

              AND o.user_id = %s

            LIMIT 1

            FOR UPDATE
            """,
            (
                booking_id,
                user_id,
            )
        )

        booking = cursor.fetchone()

        if not booking:

            connection.rollback()

            return jsonify({

                "success":
                    False,

                "error":
                    "Application not found."

            }), 404

        if booking[
            "booking_status"
        ] != "pending":

            connection.rollback()

            return jsonify({

                "success":
                    False,

                "error":
                    (
                        "Only pending applications "
                        "can be rejected."
                    )

            }), 409

        # ====================================================
        # Update
        # ====================================================

        cursor.execute(
            """
            UPDATE rent_bookings
            SET
                booking_status = 'rejected'
            WHERE id = %s
              AND booking_status = 'pending'
            """,
            (
                booking_id,
            )
        )

        # ====================================================
        # Audit
        # ====================================================

        create_audit_log(

            cursor,

            user_id,

            "APPLICATION_REJECTED",

            "booking",

            booking_id,

            {
                "booking_status":
                    "pending"
            },

            {
                "booking_status":
                    "rejected",

                "reason":
                    reason
                    or None,
            }

        )

        # ====================================================
        # Notify renter
        # ====================================================

        notification_body = (

            "Your application for "

            +
            str(
                booking[
                    "property_name"
                ]
            )

            +
            " has been rejected."

        )

        if reason:

            notification_body += (

                " Reason: "
                +
                reason

            )

        create_notification(

            cursor,

            booking[
                "tenant_user_id"
            ],

            "booking_rejected",

            "Application Rejected",

            notification_body,

            "booking",

            booking_id,

        )

        connection.commit()

        return jsonify({

            "success":
                True,

            "message":
                "Application rejected.",

            "booking_id":
                booking_id,

            "booking_status":
                "rejected",

        }), 200

    except Exception as e:

        if connection:

            connection.rollback()

        return jsonify({

            "success":
                False,

            "error":
                str(e)

        }), 500

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# ============================================================
# OWNER ACTIVE TENANTS
# ============================================================

@rent_owner.get(
    "/api/rent/owner/tenants"
)
def owner_tenants():

    user_id, error = require_login()

    if error:
        return error

    connection = None
    cursor = None

    try:

        connection = require_database()

        cursor = connection.cursor(
            dictionary=True
        )

        cursor.execute(
            """
            SELECT

                b.id AS booking_id,

                b.tenant_user_id,

                b.property_id,

                b.room_id,

                b.start_date,

                b.end_date,

                b.amount,

                b.payment_status,

                b.booking_status,

                p.name AS property_name,

                p.address_text,

                r.room_number,

                r.room_type,

                r.max_occupants,

                r.current_occupants,

                u.name AS tenant_name,

                u.email AS tenant_email

            FROM rent_bookings b

            INNER JOIN rent_properties p
                ON p.id = b.property_id

            INNER JOIN rent_owners o
                ON o.id = p.owner_id

            LEFT JOIN rent_rooms r
                ON r.id = b.room_id

            INNER JOIN users u
                ON u.id = b.tenant_user_id

            WHERE o.user_id = %s

              AND b.booking_status = 'accepted'

            ORDER BY
                b.start_date DESC,
                b.id DESC
            """,
            (
                user_id,
            )
        )

        tenants = (
            cursor.fetchall()
            or []
        )

        return jsonify({

            "success":
                True,

            "tenants":
                tenants,

            "count":
                len(tenants),

        }), 200

    except Exception as e:

        return jsonify({

            "success":
                False,

            "error":
                str(e)

        }), 500

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# ============================================================
# OWNER PAYMENTS
# ============================================================

@rent_owner.get(
    "/api/rent/owner/payments"
)
def owner_payments():

    user_id, error = require_login()

    if error:
        return error

    connection = None
    cursor = None

    try:

        connection = require_database()

        cursor = connection.cursor(
            dictionary=True
        )

        cursor.execute(
            """
            SELECT

                rp.id,

                rp.booking_id,

                rp.amount,

                rp.utr,

                rp.proof_path,

                rp.provider_reference,

                rp.status,

                rp.verified_at,

                rp.created_at,

                b.tenant_user_id,

                b.property_id,

                b.room_id,

                p.name AS property_name,

                r.room_number,

                u.name AS tenant_name,

                u.email AS tenant_email

            FROM rent_payments rp

            INNER JOIN rent_bookings b
                ON b.id = rp.booking_id

            INNER JOIN rent_properties p
                ON p.id = b.property_id

            INNER JOIN rent_owners o
                ON o.id = p.owner_id

            LEFT JOIN rent_rooms r
                ON r.id = b.room_id

            INNER JOIN users u
                ON u.id = b.tenant_user_id

            WHERE o.user_id = %s

            ORDER BY
                rp.created_at DESC
            """,
            (
                user_id,
            )
        )

        payments = (
            cursor.fetchall()
            or []
        )

        return jsonify({

            "success":
                True,

            "payments":
                payments,

            "count":
                len(payments),

        }), 200

    except Exception as e:

        return jsonify({

            "success":
                False,

            "error":
                str(e)

        }), 500

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# ============================================================
# VERIFY PAYMENT
# ============================================================

@rent_owner.post(
    "/api/rent/owner/payments/<int:payment_id>/verify"
)
def verify_payment(
    payment_id
):

    user_id, error = require_login()

    if error:
        return error

    connection = None
    cursor = None

    try:

        connection = require_database()

        connection.start_transaction()

        cursor = connection.cursor(
            dictionary=True
        )

        cursor.execute(
            """
            SELECT

                rp.*,

                b.tenant_user_id,

                b.property_id,

                p.name AS property_name

            FROM rent_payments rp

            INNER JOIN rent_bookings b
                ON b.id = rp.booking_id

            INNER JOIN rent_properties p
                ON p.id = b.property_id

            INNER JOIN rent_owners o
                ON o.id = p.owner_id

            WHERE rp.id = %s

              AND o.user_id = %s

            LIMIT 1

            FOR UPDATE
            """,
            (
                payment_id,
                user_id,
            )
        )

        payment = cursor.fetchone()

        if not payment:

            connection.rollback()

            return jsonify({

                "success":
                    False,

                "error":
                    "Payment not found."

            }), 404

        if payment[
            "status"
        ] == "verified":

            connection.rollback()

            return jsonify({

                "success":
                    False,

                "error":
                    "Payment already verified."

            }), 409

        cursor.execute(
            """
            UPDATE rent_payments
            SET
                status = 'verified',
                verified_at = NOW()
            WHERE id = %s
            """,
            (
                payment_id,
            )
        )

        create_audit_log(

            cursor,

            user_id,

            "PAYMENT_VERIFIED",

            "payment",

            payment_id,

            {
                "status":
                    payment[
                        "status"
                    ]
            },

            {
                "status":
                    "verified"
            }

        )

        create_notification(

            cursor,

            payment[
                "tenant_user_id"
            ],

            "payment_verified",

            "Payment Verified",

            (
                "Your payment of ₹"
                +
                str(
                    payment[
                        "amount"
                    ]
                )
                +
                " has been verified by the owner."
            ),

            "payment",

            payment_id,

        )

        connection.commit()

        return jsonify({

            "success":
                True,

            "message":
                "Payment verified.",

            "payment_id":
                payment_id,

            "status":
                "verified",

        }), 200

    except Exception as e:

        if connection:
            connection.rollback()

        return jsonify({

            "success":
                False,

            "error":
                str(e)

        }), 500

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# ============================================================
# OWNER MESSAGES
# ============================================================

@rent_owner.get(
    "/api/rent/owner/messages"
)
def owner_messages():

    user_id, error = require_login()

    if error:
        return error

    connection = None
    cursor = None

    try:

        connection = require_database()

        cursor = connection.cursor(
            dictionary=True
        )

        cursor.execute(
            """
            SELECT

                m.id,

                m.property_id,

                m.booking_id,

                m.sender_user_id,

                m.receiver_user_id,

                m.message_text,

                m.attachment_path,

                m.is_read,

                m.created_at,

                p.name AS property_name,

                u.name AS sender_name,

                u.email AS sender_email

            FROM rent_messages m

            INNER JOIN rent_properties p
                ON p.id = m.property_id

            INNER JOIN rent_owners o
                ON o.id = p.owner_id

            INNER JOIN users u
                ON u.id = m.sender_user_id

            WHERE
                o.user_id = %s

            ORDER BY
                m.created_at ASC
            """,
            (
                user_id,
            )
        )

        messages = (
            cursor.fetchall()
            or []
        )

        return jsonify({

            "success":
                True,

            "messages":
                messages,

            "count":
                len(messages),

        }), 200

    except Exception as e:

        return jsonify({

            "success":
                False,

            "error":
                str(e)

        }), 500

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# ============================================================
# OWNER SEND MESSAGE
# ============================================================

@rent_owner.post(
    "/api/rent/owner/messages"
)
def owner_send_message():

    user_id, error = require_login()

    if error:
        return error

    data = (
        request.get_json(
            silent=True
        )
        or {}
    )

    property_id = safe_int(
        data.get(
            "property_id"
        )
    )

    receiver_user_id = safe_int(
        data.get(
            "receiver_user_id"
        )
    )

    booking_id = safe_int(
        data.get(
            "booking_id"
        )
    )

    message_text = clean(
        data.get(
            "message_text"
        ),
        5000
    )

    if not property_id:

        return jsonify({

            "success":
                False,

            "error":
                "Property ID is required."

        }), 400

    if not receiver_user_id:

        return jsonify({

            "success":
                False,

            "error":
                "Receiver is required."

        }), 400

    if not message_text:

        return jsonify({

            "success":
                False,

            "error":
                "Message cannot be empty."

        }), 400

    connection = None
    cursor = None

    try:

        connection = require_database()

        cursor = connection.cursor(
            dictionary=True
        )

        # ====================================================
        # Verify property belongs to owner
        # ====================================================

        cursor.execute(
            """
            SELECT
                p.id,
                p.name
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

                "success":
                    False,

                "error":
                    "Property not found."

            }), 403

        # ====================================================
        # Verify booking if supplied
        # ====================================================

        if booking_id:

            cursor.execute(
                """
                SELECT id
                FROM rent_bookings
                WHERE id = %s
                  AND property_id = %s
                  AND tenant_user_id = %s
                LIMIT 1
                """,
                (
                    booking_id,
                    property_id,
                    receiver_user_id,
                )
            )

            booking = cursor.fetchone()

            if not booking:

                return jsonify({

                    "success":
                        False,

                    "error":
                        "Booking does not belong to this renter."

                }), 403

        # ====================================================
        # Insert message
        # ====================================================

        cursor.execute(
            """
            INSERT INTO rent_messages
            (
                property_id,
                booking_id,
                sender_user_id,
                receiver_user_id,
                message_text,
                is_read
            )
            VALUES
            (
                %s,
                %s,
                %s,
                %s,
                %s,
                0
            )
            """,
            (
                property_id,
                booking_id
                if booking_id
                else None,
                user_id,
                receiver_user_id,
                message_text,
            )
        )

        message_id = cursor.lastrowid

        create_notification(

            cursor,

            receiver_user_id,

            "new_message",

            "New AmiRent Message",

            message_text,

            "message",

            message_id,

        )

        connection.commit()

        return jsonify({

            "success":
                True,

            "message_id":
                message_id,

            "message":
                "Message sent."

        }), 201

    except Exception as e:

        if connection:
            connection.rollback()

        return jsonify({

            "success":
                False,

            "error":
                str(e)

        }), 500

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# ============================================================
# OWNER ELECTRICITY BILLS
# ============================================================

@rent_owner.post(
    "/api/rent/owner/electricity"
)
def create_electricity_bill():

    user_id, error = require_login()

    if error:
        return error

    data = request.form

    booking_id = safe_int(
        data.get(
            "booking_id"
        )
    )

    amount = safe_float(
        data.get(
            "amount"
        )
    )

    billing_month = clean(
        data.get(
            "billing_month"
        ),
        20
    )

    due_date = (
        clean(
            data.get(
                "due_date"
            ),
            20
        )
        or None
    )

    proof = request.files.get(
        "proof"
    )

    if not booking_id:

        return jsonify({

            "success":
                False,

            "error":
                "Booking ID is required."

        }), 400

    if amount is None or amount < 0:

        return jsonify({

            "success":
                False,

            "error":
                "Valid electricity amount is required."

        }), 400

    if not billing_month:

        return jsonify({

            "success":
                False,

            "error":
                "Billing month is required."

        }), 400

    connection = None
    cursor = None

    try:

        connection = require_database()

        cursor = connection.cursor(
            dictionary=True
        )

        # ====================================================
        # Verify owner owns booking
        # ====================================================

        cursor.execute(
            """
            SELECT

                b.id,

                b.tenant_user_id,

                b.property_id,

                p.name AS property_name

            FROM rent_bookings b

            INNER JOIN rent_properties p
                ON p.id = b.property_id

            INNER JOIN rent_owners o
                ON o.id = p.owner_id

            WHERE b.id = %s

              AND o.user_id = %s

            LIMIT 1
            """,
            (
                booking_id,
                user_id,
            )
        )

        booking = cursor.fetchone()

        if not booking:

            return jsonify({

                "success":
                    False,

                "error":
                    "Booking not found."

            }), 403

        proof_path = None

        if proof and proof.filename:

            proof_path = save_file(

                proof,

                UPLOAD_DIR
                / str(user_id)
                / "electricity",

                IMAGE_EXTENSIONS,

            )

        cursor.execute(
            """
            INSERT INTO rent_electricity_bills
            (
                booking_id,
                billing_month,
                amount,
                proof_path,
                status,
                due_date
            )
            VALUES
            (
                %s,
                %s,
                %s,
                %s,
                'payment_pending',
                %s
            )
            """,
            (
                booking_id,
                billing_month,
                amount,
                proof_path,
                due_date,
            )
        )

        bill_id = cursor.lastrowid

        create_notification(

            cursor,

            booking[
                "tenant_user_id"
            ],

            "electricity_bill",

            "New Electricity Bill",

            (
                "A new electricity bill of ₹"
                +
                str(amount)
                +
                " has been added for "
                +
                str(
                    booking[
                        "property_name"
                    ]
                )
                +
                "."
            ),

            "electricity_bill",

            bill_id,

        )

        create_audit_log(

            cursor,

            user_id,

            "ELECTRICITY_BILL_CREATED",

            "electricity_bill",

            bill_id,

            None,

            {
                "booking_id":
                    booking_id,

                "amount":
                    amount,

                "billing_month":
                    billing_month,
            }

        )

        connection.commit()

        return jsonify({

            "success":
                True,

            "message":
                "Electricity bill created.",

            "bill_id":
                bill_id,

        }), 201

    except Exception as e:

        if connection:
            connection.rollback()

        return jsonify({

            "success":
                False,

            "error":
                str(e)

        }), 500

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# ============================================================
# OWNER ELECTRICITY BILLS LIST
# ============================================================

@rent_owner.get(
    "/api/rent/owner/electricity"
)
def owner_electricity_bills():

    user_id, error = require_login()

    if error:
        return error

    connection = None
    cursor = None

    try:

        connection = require_database()

        cursor = connection.cursor(
            dictionary=True
        )

        cursor.execute(
            """
            SELECT

                eb.*,

                b.tenant_user_id,

                b.property_id,

                b.room_id,

                p.name AS property_name,

                r.room_number,

                u.name AS tenant_name,

                u.email AS tenant_email

            FROM rent_electricity_bills eb

            INNER JOIN rent_bookings b
                ON b.id = eb.booking_id

            INNER JOIN rent_properties p
                ON p.id = b.property_id

            INNER JOIN rent_owners o
                ON o.id = p.owner_id

            LEFT JOIN rent_rooms r
                ON r.id = b.room_id

            INNER JOIN users u
                ON u.id = b.tenant_user_id

            WHERE o.user_id = %s

            ORDER BY
                eb.billing_month DESC,
                eb.id DESC
            """,
            (
                user_id,
            )
        )

        bills = (
            cursor.fetchall()
            or []
        )

        return jsonify({

            "success":
                True,

            "bills":
                bills,

            "count":
                len(bills),

        }), 200

    except Exception as e:

        return jsonify({

            "success":
                False,

            "error":
                str(e)

        }), 500

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# ============================================================
# OWNER REMOVAL REQUEST
# ============================================================

@rent_owner.post(
    "/api/rent/owner/removal-request"
)
def create_removal_request():

    user_id, error = require_login()

    if error:
        return error

    data = (
        request.get_json(
            silent=True
        )
        or {}
    )

    booking_id = safe_int(
        data.get(
            "booking_id"
        )
    )

    reason = clean(
        data.get(
            "reason"
        ),
        2000
    )

    proposed_move_out_date = clean(
        data.get(
            "proposed_move_out_date"
        ),
        20
    )

    if not booking_id:

        return jsonify({

            "success":
                False,

            "error":
                "Booking ID is required."

        }), 400

    if not proposed_move_out_date:

        return jsonify({

            "success":
                False,

            "error":
                "Move-out date is required."

        }), 400

    connection = None
    cursor = None

    try:

        connection = require_database()

        cursor = connection.cursor(
            dictionary=True
        )

        # ====================================================
        # Verify ownership
        # ====================================================

        cursor.execute(
            """
            SELECT

                b.id,

                b.tenant_user_id,

                b.property_id,

                p.name AS property_name

            FROM rent_bookings b

            INNER JOIN rent_properties p
                ON p.id = b.property_id

            INNER JOIN rent_owners o
                ON o.id = p.owner_id

            WHERE b.id = %s

              AND o.user_id = %s

              AND b.booking_status = 'accepted'

            LIMIT 1
            """,
            (
                booking_id,
                user_id,
            )
        )

        booking = cursor.fetchone()

        if not booking:

            return jsonify({

                "success":
                    False,

                "error":
                    "Active booking not found."

            }), 404

        # ====================================================
        # Notice date
        # ====================================================

        notice_date = date.today()

        cursor.execute(
            """
            INSERT INTO rent_removal_requests
            (
                booking_id,
                owner_user_id,
                tenant_user_id,
                reason,
                notice_date,
                proposed_move_out_date,
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
                'submitted'
            )
            """,
            (
                booking_id,
                user_id,
                booking[
                    "tenant_user_id"
                ],
                reason
                or None,
                notice_date,
                proposed_move_out_date,
            )
        )

        request_id = cursor.lastrowid

        create_notification(

            cursor,

            booking[
                "tenant_user_id"
            ],

            "removal_request",

            "Move-out Notice",

            (
                "The owner has submitted a move-out "
                "request for "
                +
                str(
                    booking[
                        "property_name"
                    ]
                )
                +
                ". Proposed move-out date: "
                +
                proposed_move_out_date
                +
                "."
            ),

            "removal_request",

            request_id,

        )

        create_audit_log(

            cursor,

            user_id,

            "REMOVAL_REQUEST_CREATED",

            "removal_request",

            request_id,

            None,

            {
                "booking_id":
                    booking_id,

                "proposed_move_out_date":
                    proposed_move_out_date,

                "reason":
                    reason
                    or None,
            }

        )

        connection.commit()

        return jsonify({

            "success":
                True,

            "message":
                "Removal request submitted.",

            "request_id":
                request_id,

        }), 201

    except Exception as e:

        if connection:
            connection.rollback()

        return jsonify({

            "success":
                False,

            "error":
                str(e)

        }), 500

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# ============================================================
# OWNER REMOVAL REQUESTS
# ============================================================

@rent_owner.get(
    "/api/rent/owner/removal-requests"
)
def owner_removal_requests():

    user_id, error = require_login()

    if error:
        return error

    connection = None
    cursor = None

    try:

        connection = require_database()

        cursor = connection.cursor(
            dictionary=True
        )

        cursor.execute(
            """
            SELECT

                rr.*,

                p.name AS property_name,

                r.room_number,

                u.name AS tenant_name,

                u.email AS tenant_email

            FROM rent_removal_requests rr

            INNER JOIN rent_bookings b
                ON b.id = rr.booking_id

            INNER JOIN rent_properties p
                ON p.id = b.property_id

            INNER JOIN rent_owners o
                ON o.id = p.owner_id

            LEFT JOIN rent_rooms r
                ON r.id = b.room_id

            INNER JOIN users u
                ON u.id = rr.tenant_user_id

            WHERE o.user_id = %s

            ORDER BY
                rr.created_at DESC
            """,
            (
                user_id,
            )
        )

        requests = (
            cursor.fetchall()
            or []
        )

        return jsonify({

            "success":
                True,

            "requests":
                requests,

            "count":
                len(requests),

        }), 200

    except Exception as e:

        return jsonify({

            "success":
                False,

            "error":
                str(e)

        }), 500

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# ============================================================
# OWNER DASHBOARD
# ============================================================

@rent_owner.get(
    "/api/rent/owner/dashboard"
)
def owner_dashboard():

    user_id, error = require_login()

    if error:
        return error

    connection = None
    cursor = None

    try:

        connection = require_database()

        cursor = connection.cursor(
            dictionary=True
        )

        # ====================================================
        # OWNER
        # ====================================================

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

                status,

                created_at,

                updated_at

            FROM rent_owners

            WHERE user_id = %s

            LIMIT 1
            """,
            (
                user_id,
            )
        )

        owner = cursor.fetchone()

        if not owner:

            return jsonify({

                "success":
                    True,

                "owner":
                    None,

                "properties":
                    [],

                "rooms":
                    [],

                "applications":
                    [],

                "tenants":
                    [],

                "summary": {

                    "properties":
                        0,

                    "rooms":
                        0,

                    "capacity":
                        0,

                    "occupied":
                        0,

                    "vacant_beds":
                        0,

                    "pending_applications":
                        0,

                    "active_tenants":
                        0,

                }

            }), 200

        # ====================================================
        # PROPERTIES
        # ====================================================

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

                longitude,

                agreement_path,

                created_at,

                updated_at

            FROM rent_properties

            WHERE owner_id = %s

            ORDER BY id DESC
            """,
            (
                owner["id"],
            )
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

        applications = []

        tenants = []

        # ====================================================
        # ROOMS
        # ====================================================

        if property_ids:

            placeholders = ",".join(
                ["%s"]
                *
                len(property_ids)
            )

            cursor.execute(
                f"""
                SELECT

                    r.id,

                    r.property_id,

                    r.room_number,

                    r.room_type,

                    r.max_occupants,

                    r.current_occupants,

                    r.price_per_room,

                    r.price_per_bed,

                    r.gender_policy,

                    r.status,

                    p.name AS property_name

                FROM rent_rooms r

                INNER JOIN rent_properties p
                    ON p.id = r.property_id

                WHERE r.property_id
                    IN ({placeholders})

                ORDER BY
                    r.property_id,
                    r.room_number
                """,
                tuple(
                    property_ids
                )
            )

            rooms = (
                cursor.fetchall()
                or []
            )

            # =================================================
            # APPLICATIONS
            # =================================================

            cursor.execute(
                f"""
                SELECT

                    b.id AS booking_id,

                    b.property_id,

                    b.room_id,

                    b.tenant_user_id,

                    b.booking_type,

                    b.start_date,

                    b.end_date,

                    b.amount,

                    b.payment_status,

                    b.booking_status,

                    b.created_at,

                    p.name AS property_name,

                    r.room_number,

                    r.room_type,

                    u.name AS renter_name,

                    u.email AS renter_email

                FROM rent_bookings b

                INNER JOIN rent_properties p
                    ON p.id = b.property_id

                LEFT JOIN rent_rooms r
                    ON r.id = b.room_id

                INNER JOIN users u
                    ON u.id = b.tenant_user_id

                WHERE b.property_id
                    IN ({placeholders})

                ORDER BY
                    b.created_at DESC
                """,
                tuple(
                    property_ids
                )
            )

            applications = (
                cursor.fetchall()
                or []
            )

            # =================================================
            # ACTIVE TENANTS
            # =================================================

            cursor.execute(
                f"""
                SELECT

                    b.id AS booking_id,

                    b.property_id,

                    b.room_id,

                    b.tenant_user_id,

                    b.start_date,

                    b.end_date,

                    b.amount,

                    b.payment_status,

                    p.name AS property_name,

                    r.room_number,

                    r.room_type,

                    r.max_occupants,

                    r.current_occupants,

                    u.name AS tenant_name,

                    u.email AS tenant_email

                FROM rent_bookings b

                INNER JOIN rent_properties p
                    ON p.id = b.property_id

                LEFT JOIN rent_rooms r
                    ON r.id = b.room_id

                INNER JOIN users u
                    ON u.id = b.tenant_user_id

                WHERE b.property_id
                    IN ({placeholders})

                  AND b.booking_status = 'accepted'

                ORDER BY
                    b.start_date DESC
                """,
                tuple(
                    property_ids
                )
            )

            tenants = (
                cursor.fetchall()
                or []
            )

        # ====================================================
        # SUMMARY
        # ====================================================

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

        pending_applications = sum(

            1

            for application in applications

            if application.get(
                "booking_status"
            ) == "pending"

        )

        active_tenants = sum(

            1

            for tenant in tenants

            if tenant.get(
                "booking_status"
            ) == "accepted"

        )

        # ====================================================
        # ROOM DETAILS WITH TENANTS
        # ====================================================

        for room in rooms:

            room["tenants"] = [

                {

                    "booking_id":
                        tenant[
                            "booking_id"
                        ],

                    "user_id":
                        tenant[
                            "tenant_user_id"
                        ],

                    "name":
                        tenant[
                            "tenant_name"
                        ],

                    "email":
                        tenant[
                            "tenant_email"
                        ],

                    "start_date":
                        tenant[
                            "start_date"
                        ],

                }

                for tenant in tenants

                if tenant.get(
                    "room_id"
                )
                ==
                room.get(
                    "id"
                )

            ]

        return jsonify({

            "success":
                True,

            "owner":
                owner,

            "properties":
                properties,

            "rooms":
                rooms,

            "applications":
                applications,

            "tenants":
                tenants,

            "summary": {

                "properties":
                    len(
                        properties
                    ),

                "rooms":
                    len(
                        rooms
                    ),

                "capacity":
                    capacity,

                "occupied":
                    occupied,

                "vacant_beds":
                    max(
                        capacity
                        -
                        occupied,
                        0
                    ),

                "pending_applications":
                    pending_applications,

                "active_tenants":
                    active_tenants,

            }

        }), 200

    except Exception as e:

        return jsonify({

            "success":
                False,

            "error":
                str(e)

        }), 500

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# ============================================================
# OWNER SUMMARY
# ============================================================

@rent_owner.get(
    "/api/rent/owner/summary"
)
def owner_summary():

    user_id, error = require_login()

    if error:
        return error

    connection = None
    cursor = None

    try:

        connection = require_database()

        cursor = connection.cursor(
            dictionary=True
        )

        cursor.execute(
            """
            SELECT
                o.id AS owner_id
            FROM rent_owners o
            WHERE o.user_id = %s
            LIMIT 1
            """,
            (
                user_id,
            )
        )

        owner = cursor.fetchone()

        if not owner:

            return jsonify({

                "success":
                    True,

                "summary": {

                    "properties":
                        0,

                    "rooms":
                        0,

                    "capacity":
                        0,

                    "occupied":
                        0,

                    "vacant":
                        0,

                    "applications":
                        0,

                    "pending_applications":
                        0,

                    "active_tenants":
                        0,

                }

            })

        owner_id = owner[
            "owner_id"
        ]

        cursor.execute(
            """
            SELECT
                COUNT(*) AS total
            FROM rent_properties
            WHERE owner_id = %s
            """,
            (
                owner_id,
            )
        )

        properties_count = safe_int(
            cursor.fetchone()[
                "total"
            ]
        )

        cursor.execute(
            """
            SELECT

                COUNT(*) AS rooms,

                COALESCE(
                    SUM(max_occupants),
                    0
                ) AS capacity,

                COALESCE(
                    SUM(current_occupants),
                    0
                ) AS occupied

            FROM rent_rooms r

            INNER JOIN rent_properties p
                ON p.id = r.property_id

            WHERE p.owner_id = %s
            """,
            (
                owner_id,
            )
        )

        room_summary = (
            cursor.fetchone()
            or {}
        )

        cursor.execute(
            """
            SELECT

                COUNT(*) AS total,

                SUM(
                    CASE
                        WHEN b.booking_status = 'pending'
                        THEN 1
                        ELSE 0
                    END
                ) AS pending,

                SUM(
                    CASE
                        WHEN b.booking_status = 'accepted'
                        THEN 1
                        ELSE 0
                    END
                ) AS active

            FROM rent_bookings b

            INNER JOIN rent_properties p
                ON p.id = b.property_id

            WHERE p.owner_id = %s
            """,
            (
                owner_id,
            )
        )

        booking_summary = (
            cursor.fetchone()
            or {}
        )

        rooms_count = safe_int(
            room_summary.get(
                "rooms"
            )
        )

        capacity = safe_int(
            room_summary.get(
                "capacity"
            )
        )

        occupied = safe_int(
            room_summary.get(
                "occupied"
            )
        )

        applications = safe_int(
            booking_summary.get(
                "total"
            )
        )

        pending = safe_int(
            booking_summary.get(
                "pending"
            )
        )

        active = safe_int(
            booking_summary.get(
                "active"
            )
        )

        return jsonify({

            "success":
                True,

            "summary": {

                "properties":
                    properties_count,

                "rooms":
                    rooms_count,

                "capacity":
                    capacity,

                "occupied":
                    occupied,

                "vacant":
                    max(
                        capacity
                        -
                        occupied,
                        0
                    ),

                "applications":
                    applications,

                "pending_applications":
                    pending,

                "active_tenants":
                    active,

            }

        }), 200

    except Exception as e:

        return jsonify({

            "success":
                False,

            "error":
                str(e)

        }), 500

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()