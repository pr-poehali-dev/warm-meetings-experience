-- Универсальная таблица сообщений с клиентами для master_booking / ritual_booking
-- (для event_signup используется существующая guest_messages)

CREATE TABLE IF NOT EXISTS client_messages (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER NOT NULL REFERENCES users(id),
    source_type VARCHAR(20) NOT NULL,
    source_id INTEGER NOT NULL,
    direction VARCHAR(10) NOT NULL DEFAULT 'out',
    channel VARCHAR(20) NOT NULL DEFAULT 'site',
    body TEXT NOT NULL,
    delivered BOOLEAN NULL,
    read_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_client_messages_source
    ON client_messages(source_type, source_id);

CREATE INDEX IF NOT EXISTS idx_client_messages_owner
    ON client_messages(owner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_client_messages_unread
    ON client_messages(source_type, source_id, direction, read_at)
    WHERE direction = 'out' AND read_at IS NULL;

-- В notify_log добавляем универсальную привязку к источнику
ALTER TABLE notify_log
    ADD COLUMN IF NOT EXISTS source_type VARCHAR(20) DEFAULT 'event_signup',
    ADD COLUMN IF NOT EXISTS source_id INTEGER;

UPDATE notify_log
SET source_type = 'event_signup'
WHERE source_type IS NULL;

CREATE INDEX IF NOT EXISTS idx_notify_log_source
    ON notify_log(source_type, source_id);