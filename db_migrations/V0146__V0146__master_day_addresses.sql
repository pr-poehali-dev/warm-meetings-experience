CREATE TABLE IF NOT EXISTS t_p99966623_warm_meetings_experi.master_day_addresses (
    id SERIAL PRIMARY KEY,
    master_id INTEGER NOT NULL REFERENCES t_p99966623_warm_meetings_experi.masters(id),
    day_date DATE NOT NULL,
    address_id INTEGER REFERENCES t_p99966623_warm_meetings_experi.master_addresses(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(master_id, day_date)
);

CREATE INDEX IF NOT EXISTS idx_master_day_addresses_lookup
    ON t_p99966623_warm_meetings_experi.master_day_addresses(master_id, day_date);