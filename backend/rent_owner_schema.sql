-- ============================================================
-- AMIVEST RENT OWNER DATABASE
-- ============================================================

CREATE TABLE IF NOT EXISTS rent_owners (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,

    full_name VARCHAR(160) NOT NULL,
    primary_mobile VARCHAR(30) NOT NULL,
    secondary_mobile VARCHAR(30),
    email VARCHAR(190),

    phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
    identity_status VARCHAR(30) NOT NULL DEFAULT 'pending',
    status VARCHAR(30) NOT NULL DEFAULT 'pending',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_rent_owner_user (user_id),
    INDEX idx_rent_owner_status (status)
);


-- ============================================================
-- OWNER ID DOCUMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS rent_owner_documents (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    owner_id BIGINT NOT NULL,

    document_type VARCHAR(60) NOT NULL,

    front_path TEXT,
    back_path TEXT,

    verification_status VARCHAR(30)
        NOT NULL DEFAULT 'pending',

    verified_at DATETIME,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_owner_documents_owner (
        owner_id
    ),

    INDEX idx_owner_documents_status (
        verification_status
    )
);


-- ============================================================
-- PROPERTIES
-- ============================================================

CREATE TABLE IF NOT EXISTS rent_properties (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    owner_id BIGINT NOT NULL,

    property_type VARCHAR(30) NOT NULL,

    name VARCHAR(180) NOT NULL,

    address_text TEXT NOT NULL,

    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),

    total_rooms INT NOT NULL DEFAULT 1,

    security_deposit DECIMAL(12,2)
        NOT NULL DEFAULT 0,

    monthly_rent DECIMAL(12,2),

    nightly_rate DECIMAL(12,2),

    electricity_policy VARCHAR(40)
        NOT NULL DEFAULT 'separate',

    public_location_mode VARCHAR(30)
        NOT NULL DEFAULT 'approximate',

    agreement_path TEXT,

    status VARCHAR(30)
        NOT NULL DEFAULT 'draft',

    verification_status VARCHAR(30)
        NOT NULL DEFAULT 'pending',

    available_from DATE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_property_owner (
        owner_id
    ),

    INDEX idx_property_location (
        latitude,
        longitude
    ),

    INDEX idx_property_status (
        status,
        verification_status
    )
);


-- ============================================================
-- PROPERTY PHOTOS
-- ============================================================

CREATE TABLE IF NOT EXISTS rent_property_photos (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    property_id BIGINT NOT NULL,

    file_path TEXT NOT NULL,

    sort_order INT NOT NULL DEFAULT 0,

    verification_status VARCHAR(30)
        NOT NULL DEFAULT 'pending',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_property_photos_property (
        property_id
    )
);


-- ============================================================
-- PROPERTY AMENITIES
-- ============================================================

CREATE TABLE IF NOT EXISTS rent_property_amenities (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    property_id BIGINT NOT NULL,

    amenity_key VARCHAR(80) NOT NULL,

    amenity_value VARCHAR(160),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_property_amenities_property (
        property_id
    )
);


-- ============================================================
-- ROOMS
-- ============================================================

CREATE TABLE IF NOT EXISTS rent_rooms (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    property_id BIGINT NOT NULL,

    room_number VARCHAR(50) NOT NULL,

    room_type VARCHAR(40)
        NOT NULL DEFAULT 'shared',

    max_occupants INT
        NOT NULL DEFAULT 1,

    current_occupants INT
        NOT NULL DEFAULT 0,

    price_per_room DECIMAL(12,2),

    price_per_bed DECIMAL(12,2),

    gender_policy VARCHAR(30)
        NOT NULL DEFAULT 'all',

    status VARCHAR(30)
        NOT NULL DEFAULT 'vacant',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_property_room (
        property_id,
        room_number
    ),

    INDEX idx_room_property (
        property_id
    ),

    INDEX idx_room_status (
        status
    )
);


-- ============================================================
-- BOOKINGS
-- ============================================================

CREATE TABLE IF NOT EXISTS rent_bookings (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    property_id BIGINT NOT NULL,

    room_id BIGINT,

    tenant_user_id BIGINT NOT NULL,

    booking_type VARCHAR(30) NOT NULL,

    start_date DATE NOT NULL,

    end_date DATE,

    amount DECIMAL(12,2) NOT NULL,

    payment_status VARCHAR(35)
        NOT NULL DEFAULT 'pending',

    booking_status VARCHAR(35)
        NOT NULL DEFAULT 'pending',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_booking_property (
        property_id
    ),

    INDEX idx_booking_room (
        room_id
    ),

    INDEX idx_booking_tenant (
        tenant_user_id
    ),

    INDEX idx_booking_status (
        payment_status,
        booking_status
    )
);


-- ============================================================
-- PAYMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS rent_payments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    booking_id BIGINT NOT NULL,

    amount DECIMAL(12,2) NOT NULL,

    utr VARCHAR(120),

    proof_path TEXT,

    provider_reference VARCHAR(150),

    status VARCHAR(35)
        NOT NULL DEFAULT 'pending_verification',

    verified_at DATETIME,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_payment_booking (
        booking_id
    ),

    INDEX idx_payment_utr (
        utr
    ),

    INDEX idx_payment_status (
        status
    )
);


-- ============================================================
-- ELECTRICITY BILLS
-- ============================================================

CREATE TABLE IF NOT EXISTS rent_electricity_bills (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    booking_id BIGINT NOT NULL,

    billing_month DATE NOT NULL,

    amount DECIMAL(12,2) NOT NULL,

    proof_path TEXT,

    status VARCHAR(30)
        NOT NULL DEFAULT 'payment_pending',

    due_date DATE,

    paid_at DATETIME,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uq_bill_booking_month (
        booking_id,
        billing_month
    ),

    INDEX idx_electricity_booking (
        booking_id
    )
);


-- ============================================================
-- MESSAGES
-- ============================================================

CREATE TABLE IF NOT EXISTS rent_messages (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    property_id BIGINT NOT NULL,

    booking_id BIGINT,

    sender_user_id BIGINT NOT NULL,

    receiver_user_id BIGINT NOT NULL,

    message_text TEXT,

    attachment_path TEXT,

    is_read BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_messages_booking (
        booking_id
    ),

    INDEX idx_messages_sender_receiver (
        sender_user_id,
        receiver_user_id
    )
);


-- ============================================================
-- TENANT REMOVAL / NOTICE
-- ============================================================

CREATE TABLE IF NOT EXISTS rent_removal_requests (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    booking_id BIGINT NOT NULL,

    owner_user_id BIGINT NOT NULL,

    tenant_user_id BIGINT NOT NULL,

    reason TEXT,

    notice_date DATE NOT NULL,

    proposed_move_out_date DATE NOT NULL,

    status VARCHAR(35)
        NOT NULL DEFAULT 'submitted',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_removal_booking (
        booking_id
    ),

    INDEX idx_removal_status (
        status
    )
);


-- ============================================================
-- REVIEWS
-- ============================================================

CREATE TABLE IF NOT EXISTS rent_reviews (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    booking_id BIGINT NOT NULL,

    reviewer_user_id BIGINT NOT NULL,

    reviewed_user_id BIGINT,

    property_id BIGINT NOT NULL,

    rating DECIMAL(2,1) NOT NULL,

    review_text TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_reviews_property (
        property_id
    ),

    INDEX idx_reviews_booking (
        booking_id
    )
);


-- ============================================================
-- REPORTS / FRAUD / SCAM
-- ============================================================

CREATE TABLE IF NOT EXISTS rent_reports (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    reporter_user_id BIGINT NOT NULL,

    property_id BIGINT,

    booking_id BIGINT,

    report_type VARCHAR(60) NOT NULL,

    description TEXT,

    status VARCHAR(30)
        NOT NULL DEFAULT 'open',

    resolved_at DATETIME,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_reports_property (
        property_id
    ),

    INDEX idx_reports_status (
        status
    )
);


-- ============================================================
-- AUDIT LOG
-- ============================================================

CREATE TABLE IF NOT EXISTS rent_audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    actor_user_id BIGINT,

    action VARCHAR(80) NOT NULL,

    entity_type VARCHAR(50) NOT NULL,

    entity_id BIGINT NOT NULL,

    before_json JSON,

    after_json JSON,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_audit_entity (
        entity_type,
        entity_id
    ),

    INDEX idx_audit_actor (
        actor_user_id
    )
);


-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS rent_notifications (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    user_id BIGINT NOT NULL,

    type VARCHAR(50) NOT NULL,

    title VARCHAR(160) NOT NULL,

    body TEXT NOT NULL,

    related_entity_type VARCHAR(50),

    related_entity_id BIGINT,

    is_read BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_notifications_user (
        user_id,
        is_read
    )
);
