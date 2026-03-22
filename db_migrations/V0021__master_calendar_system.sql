
CREATE TABLE IF NOT EXISTS master_services (
    id SERIAL PRIMARY KEY,
    master_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    max_clients INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS master_slots (
    id SERIAL PRIMARY KEY,
    master_id INTEGER NOT NULL,
    service_id INTEGER,
    datetime_start TIMESTAMPTZ NOT NULL,
    datetime_end TIMESTAMPTZ NOT NULL,
    max_clients INTEGER NOT NULL DEFAULT 1,
    booked_count INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'available',
    source VARCHAR(50) DEFAULT 'manual',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_master_slots_master ON master_slots(master_id);
CREATE INDEX IF NOT EXISTS idx_master_slots_datetime ON master_slots(datetime_start, datetime_end);
CREATE INDEX IF NOT EXISTS idx_master_slots_status ON master_slots(status);

CREATE TABLE IF NOT EXISTS master_schedule_templates (
    id SERIAL PRIMARY KEY,
    master_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS master_template_rules (
    id SERIAL PRIMARY KEY,
    template_id INTEGER NOT NULL,
    day_of_week INTEGER NOT NULL,
    time_start TIME NOT NULL,
    time_end TIME NOT NULL,
    service_id INTEGER,
    max_clients INTEGER NOT NULL DEFAULT 1,
    is_day_off BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_template_rules_template ON master_template_rules(template_id);

CREATE TABLE IF NOT EXISTS master_bookings (
    id SERIAL PRIMARY KEY,
    slot_id INTEGER,
    master_id INTEGER NOT NULL,
    client_id INTEGER,
    client_name VARCHAR(255) NOT NULL,
    client_phone VARCHAR(50) NOT NULL,
    client_email VARCHAR(255),
    service_id INTEGER,
    datetime_start TIMESTAMPTZ NOT NULL,
    datetime_end TIMESTAMPTZ NOT NULL,
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    source VARCHAR(50) DEFAULT 'direct',
    event_id INTEGER,
    comment TEXT,
    cancel_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP,
    canceled_at TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_master_bookings_master ON master_bookings(master_id);
CREATE INDEX IF NOT EXISTS idx_master_bookings_slot ON master_bookings(slot_id);
CREATE INDEX IF NOT EXISTS idx_master_bookings_status ON master_bookings(status);
CREATE INDEX IF NOT EXISTS idx_master_bookings_datetime ON master_bookings(datetime_start);

CREATE TABLE IF NOT EXISTS master_calendar_settings (
    id SERIAL PRIMARY KEY,
    master_id INTEGER NOT NULL UNIQUE,
    default_slot_duration INTEGER NOT NULL DEFAULT 60,
    break_between_slots INTEGER NOT NULL DEFAULT 15,
    prep_time INTEGER NOT NULL DEFAULT 15,
    max_clients_per_day INTEGER NOT NULL DEFAULT 5,
    auto_confirm BOOLEAN DEFAULT false,
    notify_new_booking BOOLEAN DEFAULT true,
    notify_24h_reminder BOOLEAN DEFAULT true,
    notify_cancellation BOOLEAN DEFAULT true,
    timezone VARCHAR(50) DEFAULT 'Europe/Moscow',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS master_day_blocks (
    id SERIAL PRIMARY KEY,
    master_id INTEGER NOT NULL,
    block_date DATE NOT NULL,
    block_end_date DATE,
    reason VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(master_id, block_date)
);

CREATE INDEX IF NOT EXISTS idx_master_day_blocks_master ON master_day_blocks(master_id);
CREATE INDEX IF NOT EXISTS idx_master_day_blocks_date ON master_day_blocks(block_date);
