CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY,
    external_id VARCHAR(255),
    package_id VARCHAR(100) NOT NULL,
    service_area_id VARCHAR(100) NOT NULL,
    persons INTEGER NOT NULL,
    start_at TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER NOT NULL,
    prep_minutes INTEGER NOT NULL,
    cleanup_minutes INTEGER NOT NULL,
    total_block_from TIMESTAMPTZ NOT NULL,
    total_block_to TIMESTAMPTZ NOT NULL,
    status VARCHAR(50) NOT NULL,
    hold_expires_at TIMESTAMPTZ,
    price NUMERIC(10, 2) NOT NULL,
    deposit_amount NUMERIC(10, 2),
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    customer_email VARCHAR(255),
    notes TEXT,
    addons TEXT,
    promo_code VARCHAR(50),
    provider_location_id VARCHAR(100),
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    confirmed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS booking_events (
    id UUID PRIMARY KEY,
    booking_id UUID NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload TEXT,
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS buffers_config (
    id UUID PRIMARY KEY,
    scope_type VARCHAR(50) NOT NULL,
    scope_id VARCHAR(100),
    prep_minutes INTEGER NOT NULL,
    cleanup_minutes INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS calendar_blocks (
    id UUID PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    reason TEXT,
    block_from TIMESTAMPTZ NOT NULL,
    block_to TIMESTAMPTZ NOT NULL,
    created_by VARCHAR(100),
    scope VARCHAR(50),
    scope_id VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);