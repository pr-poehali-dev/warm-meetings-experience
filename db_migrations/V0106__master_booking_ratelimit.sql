-- Таблица rate-limit публичных бронирований
-- Хранит счётчики попыток по (master_id, identifier, window_start)
-- identifier = IP клиента (или ip+phone для более точной защиты)
CREATE TABLE IF NOT EXISTS t_p99966623_warm_meetings_experi.master_booking_ratelimit (
    id BIGSERIAL PRIMARY KEY,
    identifier TEXT NOT NULL,
    master_id INTEGER NOT NULL,
    action TEXT NOT NULL DEFAULT 'public_book',
    window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    attempts INTEGER NOT NULL DEFAULT 1,
    last_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    blocked_until TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brl_lookup
    ON t_p99966623_warm_meetings_experi.master_booking_ratelimit (identifier, master_id, action, window_start DESC);

CREATE INDEX IF NOT EXISTS idx_brl_cleanup
    ON t_p99966623_warm_meetings_experi.master_booking_ratelimit (window_start);
