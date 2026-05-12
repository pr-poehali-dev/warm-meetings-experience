-- Заявки на возврат при отмене события в складчину
CREATE TABLE IF NOT EXISTS t_p99966623_warm_meetings_experi.refund_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES t_p99966623_warm_meetings_experi.users(id),
    signup_id INTEGER NOT NULL REFERENCES t_p99966623_warm_meetings_experi.event_signups(id),
    event_id INTEGER NOT NULL REFERENCES t_p99966623_warm_meetings_experi.events(id),
    amount INTEGER NOT NULL,
    method VARCHAR(20),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    reason VARCHAR(40) NOT NULL DEFAULT 'event_cancelled',
    card_payment_hint TEXT,
    chosen_at TIMESTAMP,
    processed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
COMMENT ON COLUMN t_p99966623_warm_meetings_experi.refund_requests.method IS 'bonus | card';
COMMENT ON COLUMN t_p99966623_warm_meetings_experi.refund_requests.status IS 'pending | done | rejected';

CREATE INDEX IF NOT EXISTS idx_refund_requests_user_pending
    ON t_p99966623_warm_meetings_experi.refund_requests(user_id, status);
CREATE INDEX IF NOT EXISTS idx_refund_requests_signup
    ON t_p99966623_warm_meetings_experi.refund_requests(signup_id);

-- Доп. поля у события для отслеживания отмены
ALTER TABLE t_p99966623_warm_meetings_experi.events
    ADD COLUMN IF NOT EXISTS cf_cancelled_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS cf_cancel_reason VARCHAR(60);
