from flask import Blueprint, jsonify, request, session
from database.db import get_connection


rent_renter = Blueprint(
    "rent_renter",
    __name__
)


# ============================================================
# HELPERS
# ============================================================

def database():
    return get_connection()


def require_login():

    user_id = session.get("user_id")

    if not user_id:

        return None, (
            jsonify({
                "success": False,
                "error": "Login required."
            }),
            401
        )

    return user_id, None


def safe_int(value, default=None):

    try:
        return int(value)

    except (TypeError, ValueError):

        return default


# ============================================================
# PROPERTY SEARCH
# ============================================================

@rent_renter.get("/api/rent/properties")
def search_properties():

    connection = None
    cursor = None

    try:

        property_type = request.args.get(
            "property_type"
        )

        gender_policy = request.args.get(
            "gender_policy"
        )

        max_rent = request.args.get(
            "max_rent"
        )

        location = request.args.get(
            "location"
        )

        connection = database()

        cursor = connection.cursor(
            dictionary=True
        )

        query = """
            SELECT
                p.id,
                p.owner_id,
                p.property_type,
                p.name,
                p.address_text,
                p.latitude,
                p.longitude,
                p.total_rooms,
                p.security_deposit,
                p.monthly_rent,
                p.nightly_rate,
                p.electricity_policy,
                p.public_location_mode,
                p.status,
                p.verification_status,
                p.available_from

            FROM rent_properties p

            WHERE p.status != 'removed'
              AND p.verification_status
                    IN ('verified', 'approved', 'pending')
        """

        params = []

        # ----------------------------------------------------
        # Property type
        # ----------------------------------------------------

        if property_type:

            query += """
                AND p.property_type = %s
            """

            params.append(
                property_type
            )

        # ----------------------------------------------------
        # Rent filter
        # ----------------------------------------------------

        if max_rent:

            try:

                max_rent_value = float(
                    max_rent
                )

                query += """
                    AND (
                        p.monthly_rent IS NULL
                        OR p.monthly_rent <= %s
                    )
                """

                params.append(
                    max_rent_value
                )

            except ValueError:

                pass

        # ----------------------------------------------------
        # Location
        # ----------------------------------------------------

        if location:

            query += """
                AND p.address_text LIKE %s
            """

            params.append(
                f"%{location}%"
            )

        query += """
            ORDER BY p.id DESC
            LIMIT 100
        """

        cursor.execute(
            query,
            tuple(params)
        )

        properties = (
            cursor.fetchall()
            or []
        )

        # ----------------------------------------------------
        # Attach rooms/photos
        # ----------------------------------------------------

        for property_item in properties:

            property_id = property_item["id"]

            cursor.execute(
                """
                SELECT
                    id,
                    room_number,
                    room_type,
                    max_occupants,
                    current_occupants,
                    price_per_room,
                    price_per_bed,
                    gender_policy,
                    status

                FROM rent_rooms

                WHERE property_id = %s

                ORDER BY id ASC
                """,
                (property_id,)
            )

            rooms = (
                cursor.fetchall()
                or []
            )

            # Gender filtering is room based
            if gender_policy:

                rooms = [
                    room
                    for room in rooms
                    if room["gender_policy"]
                    in (
                        gender_policy,
                        "all"
                    )
                ]

            property_item["rooms"] = rooms

            cursor.execute(
                """
                SELECT
                    id,
                    file_path,
                    sort_order

                FROM rent_property_photos

                WHERE property_id = %s

                ORDER BY sort_order ASC
                """,
                (property_id,)
            )

            property_item["photos"] = (
                cursor.fetchall()
                or []
            )

        return jsonify({
            "success": True,
            "count": len(properties),
            "properties": properties
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
# PROPERTY DETAILS
# ============================================================

@rent_renter.get(
    "/api/rent/property/<int:property_id>"
)
def property_details(property_id):

    connection = None
    cursor = None

    try:

        connection = database()

        cursor = connection.cursor(
            dictionary=True
        )

        # ----------------------------------------------------
        # Property
        # ----------------------------------------------------

        cursor.execute(
            """
            SELECT
                p.*,
                o.full_name AS owner_name,
                o.primary_mobile AS owner_mobile,
                o.secondary_mobile AS owner_secondary_mobile,
                o.email AS owner_email,
                o.status AS owner_status

            FROM rent_properties p

            INNER JOIN rent_owners o
                ON o.id = p.owner_id

            WHERE p.id = %s

            LIMIT 1
            """,
            (property_id,)
        )

        property_item = cursor.fetchone()

        if not property_item:

            return jsonify({
                "success": False,
                "error": "Property not found."
            }), 404

        # ----------------------------------------------------
        # Rooms
        # ----------------------------------------------------

        cursor.execute(
            """
            SELECT
                id,
                room_number,
                room_type,
                max_occupants,
                current_occupants,
                price_per_room,
                price_per_bed,
                gender_policy,
                status

            FROM rent_rooms

            WHERE property_id = %s

            ORDER BY room_number
            """,
            (property_id,)
        )

        rooms = (
            cursor.fetchall()
            or []
        )

        # ----------------------------------------------------
        # Photos
        # ----------------------------------------------------

        cursor.execute(
            """
            SELECT
                id,
                file_path,
                sort_order,
                verification_status

            FROM rent_property_photos

            WHERE property_id = %s

            ORDER BY sort_order
            """,
            (property_id,)
        )

        photos = (
            cursor.fetchall()
            or []
        )

        # ----------------------------------------------------
        # Amenities
        # ----------------------------------------------------

        cursor.execute(
            """
            SELECT
                amenity_key,
                amenity_value

            FROM rent_property_amenities

            WHERE property_id = %s
            """,
            (property_id,)
        )

        amenities = (
            cursor.fetchall()
            or []
        )

        property_item["rooms"] = rooms
        property_item["photos"] = photos
        property_item["amenities"] = amenities

        return jsonify({
            "success": True,
            "property": property_item
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
# APPLY FOR ROOM
# ============================================================

@rent_renter.post(
    "/api/rent/booking/apply"
)
def apply_for_room():

    user_id, error = require_login()

    if error:

        return error

    data = request.get_json(
        silent=True
    ) or {}

    property_id = safe_int(
        data.get("property_id")
    )

    room_id = safe_int(
        data.get("room_id")
    )

    booking_type = (
        str(
            data.get(
                "booking_type",
                "monthly"
            )
        )
        .strip()
        .lower()
    )

    start_date = (
        str(
            data.get(
                "start_date",
                ""
            )
        )
        .strip()
    )

    end_date = (
        str(
            data.get(
                "end_date",
                ""
            )
        )
        .strip()
        or None
    )

    amount = data.get(
        "amount"
    )

    if not property_id:

        return jsonify({
            "success": False,
            "error": "Property ID is required."
        }), 400

    if not room_id:

        return jsonify({
            "success": False,
            "error": "Room ID is required."
        }), 400

    if not start_date:

        return jsonify({
            "success": False,
            "error": "Start date is required."
        }), 400

    try:

        amount = float(
            amount
        )

        if amount < 0:

            raise ValueError

    except (TypeError, ValueError):

        return jsonify({
            "success": False,
            "error": "Valid amount is required."
        }), 400

    connection = None
    cursor = None

    try:

        connection = database()

        cursor = connection.cursor(
            dictionary=True
        )

        # ----------------------------------------------------
        # Check room
        # ----------------------------------------------------

        cursor.execute(
            """
            SELECT
                r.id,
                r.property_id,
                r.max_occupants,
                r.current_occupants,
                r.status,
                p.status AS property_status

            FROM rent_rooms r

            INNER JOIN rent_properties p
                ON p.id = r.property_id

            WHERE r.id = %s
              AND r.property_id = %s

            LIMIT 1
            """,
            (
                room_id,
                property_id
            )
        )

        room = cursor.fetchone()

        if not room:

            return jsonify({
                "success": False,
                "error": "Room not found."
            }), 404

        if room["status"] == "full":

            return jsonify({
                "success": False,
                "error": "This room is full."
            }), 409

        # ----------------------------------------------------
        # Prevent duplicate active booking
        # ----------------------------------------------------

        cursor.execute(
            """
            SELECT id

            FROM rent_bookings

            WHERE tenant_user_id = %s
              AND room_id = %s

              AND booking_status
                    IN (
                        'pending',
                        'accepted',
                        'active'
                    )

            LIMIT 1
            """,
            (
                user_id,
                room_id
            )
        )

        existing = cursor.fetchone()

        if existing:

            return jsonify({
                "success": False,
                "error": (
                    "You already have an "
                    "active application for this room."
                ),
                "booking_id": existing["id"]
            }), 409

        # ----------------------------------------------------
        # Create booking/application
        # ----------------------------------------------------

        cursor.execute(
            """
            INSERT INTO rent_bookings
            (
                property_id,
                room_id,
                tenant_user_id,
                booking_type,
                start_date,
                end_date,
                amount,
                payment_status,
                booking_status
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
                'pending',
                'pending'
            )
            """,
            (
                property_id,
                room_id,
                user_id,
                booking_type,
                start_date,
                end_date,
                amount
            )
        )

        booking_id = cursor.lastrowid

        connection.commit()

        return jsonify({
            "success": True,
            "message": (
                "Application submitted successfully."
            ),
            "booking_id": booking_id,
            "booking_status": "pending",
            "payment_status": "pending"
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
# MY BOOKINGS
# ============================================================

@rent_renter.get(
    "/api/rent/my-bookings"
)
def my_bookings():

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

        cursor.execute(
            """
            SELECT

                b.id,
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
                p.latitude,
                p.longitude,

                r.room_number,
                r.room_type,
                r.gender_policy

            FROM rent_bookings b

            INNER JOIN rent_properties p
                ON p.id = b.property_id

            LEFT JOIN rent_rooms r
                ON r.id = b.room_id

            WHERE b.tenant_user_id = %s

            ORDER BY b.id DESC
            """,
            (user_id,)
        )

        bookings = (
            cursor.fetchall()
            or []
        )

        return jsonify({
            "success": True,
            "count": len(bookings),
            "bookings": bookings
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
# BOOKING DETAILS
# ============================================================

@rent_renter.get(
    "/api/rent/my-booking/<int:booking_id>"
)
def booking_details(booking_id):

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

        cursor.execute(
            """
            SELECT

                b.*,

                p.name AS property_name,
                p.property_type,
                p.address_text,
                p.latitude,
                p.longitude,
                p.monthly_rent,
                p.nightly_rate,
                p.security_deposit,
                p.electricity_policy,

                r.room_number,
                r.room_type,
                r.max_occupants,
                r.current_occupants,
                r.price_per_room,
                r.price_per_bed,
                r.gender_policy,
                r.status AS room_status,

                o.full_name AS owner_name,
                o.primary_mobile AS owner_mobile,
                o.email AS owner_email

            FROM rent_bookings b

            INNER JOIN rent_properties p
                ON p.id = b.property_id

            LEFT JOIN rent_rooms r
                ON r.id = b.room_id

            INNER JOIN rent_owners o
                ON o.id = p.owner_id

            WHERE b.id = %s
              AND b.tenant_user_id = %s

            LIMIT 1
            """,
            (
                booking_id,
                user_id
            )
        )

        booking = cursor.fetchone()

        if not booking:

            return jsonify({
                "success": False,
                "error": "Booking not found."
            }), 404

        # ----------------------------------------------------
        # Payments belonging to this booking
        # ----------------------------------------------------

        cursor.execute(
            """
            SELECT
                id,
                amount,
                utr,
                proof_path,
                provider_reference,
                status,
                verified_at,
                created_at

            FROM rent_payments

            WHERE booking_id = %s

            ORDER BY id DESC
            """,
            (booking_id,)
        )

        payments = (
            cursor.fetchall()
            or []
        )

        booking["payments"] = payments

        return jsonify({
            "success": True,
            "booking": booking
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