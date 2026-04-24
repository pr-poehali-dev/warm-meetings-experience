CREATE TABLE t_p99966623_warm_meetings_experi.guest_messages (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES t_p99966623_warm_meetings_experi.events(id),
    signup_id INTEGER NOT NULL REFERENCES t_p99966623_warm_meetings_experi.event_signups(id),
    direction VARCHAR(10) NOT NULL DEFAULT 'out' CHECK (direction IN ('out', 'in')),
    channel VARCHAR(20) NOT NULL DEFAULT 'site' CHECK (channel IN ('telegram', 'vk', 'email', 'sms', 'site')),
    body TEXT NOT NULL,
    delivered BOOLEAN DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_guest_messages_signup ON t_p99966623_warm_meetings_experi.guest_messages(signup_id);
CREATE INDEX idx_guest_messages_event ON t_p99966623_warm_meetings_experi.guest_messages(event_id);

ALTER TABLE t_p99966623_warm_meetings_experi.event_signups
    ADD COLUMN IF NOT EXISTS preferred_channel VARCHAR(20) DEFAULT 'site',
    ADD COLUMN IF NOT EXISTS wrote_at TIMESTAMP DEFAULT NULL;
