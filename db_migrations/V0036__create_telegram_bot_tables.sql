
CREATE TABLE IF NOT EXISTS t_p99966623_warm_meetings_experi.tg_verify_codes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES t_p99966623_warm_meetings_experi.users(id),
    code VARCHAR(20) NOT NULL UNIQUE,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS t_p99966623_warm_meetings_experi.tg_linked_accounts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES t_p99966623_warm_meetings_experi.users(id),
    telegram_user_id BIGINT NOT NULL UNIQUE,
    telegram_username VARCHAR(255),
    telegram_first_name VARCHAR(255),
    linked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS t_p99966623_warm_meetings_experi.tg_channels (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES t_p99966623_warm_meetings_experi.users(id),
    chat_id BIGINT NOT NULL,
    chat_title VARCHAR(500),
    chat_type VARCHAR(50) NOT NULL DEFAULT 'channel',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    template TEXT,
    include_photo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, chat_id)
);

CREATE TABLE IF NOT EXISTS t_p99966623_warm_meetings_experi.tg_publications (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES t_p99966623_warm_meetings_experi.events(id),
    channel_id INTEGER NOT NULL REFERENCES t_p99966623_warm_meetings_experi.tg_channels(id),
    message_id BIGINT,
    status VARCHAR(50) NOT NULL DEFAULT 'sent',
    error_text TEXT,
    published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tg_verify_codes_code ON t_p99966623_warm_meetings_experi.tg_verify_codes(code);
CREATE INDEX IF NOT EXISTS idx_tg_linked_accounts_tg_user ON t_p99966623_warm_meetings_experi.tg_linked_accounts(telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_tg_channels_user ON t_p99966623_warm_meetings_experi.tg_channels(user_id);
CREATE INDEX IF NOT EXISTS idx_tg_publications_event ON t_p99966623_warm_meetings_experi.tg_publications(event_id);
