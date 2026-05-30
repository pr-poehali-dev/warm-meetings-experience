-- Этап 1: Адреса мастера

-- 1.1. Таблица адресов мастера (master_id ссылается на masters.id)
CREATE TABLE IF NOT EXISTS t_p99966623_warm_meetings_experi.master_addresses (
    id SERIAL PRIMARY KEY,
    master_id INT NOT NULL REFERENCES t_p99966623_warm_meetings_experi.masters(id),
    address_text TEXT NOT NULL,
    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),
    is_primary BOOLEAN DEFAULT false,
    address_type VARCHAR(30) DEFAULT 'other',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_master_addresses_master
    ON t_p99966623_warm_meetings_experi.master_addresses (master_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_master_addresses_primary
    ON t_p99966623_warm_meetings_experi.master_addresses (master_id)
    WHERE is_primary;

-- 1.2. Привязка адреса к слотам и правилам шаблона расписания
ALTER TABLE t_p99966623_warm_meetings_experi.master_slots
    ADD COLUMN IF NOT EXISTS address_id INT
    REFERENCES t_p99966623_warm_meetings_experi.master_addresses(id);

ALTER TABLE t_p99966623_warm_meetings_experi.master_template_rules
    ADD COLUMN IF NOT EXISTS address_id INT
    REFERENCES t_p99966623_warm_meetings_experi.master_addresses(id);