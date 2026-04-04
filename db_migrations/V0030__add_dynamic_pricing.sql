ALTER TABLE events ADD COLUMN IF NOT EXISTS pricing_type VARCHAR(20) DEFAULT 'fixed' NOT NULL;

CREATE TABLE IF NOT EXISTS event_pricing_tiers (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL,
    label VARCHAR(200) NOT NULL,
    price_amount INTEGER NOT NULL,
    valid_until DATE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);