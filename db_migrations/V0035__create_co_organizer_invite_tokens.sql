CREATE TABLE IF NOT EXISTS t_p99966623_warm_meetings_experi.co_organizer_invite_tokens (
    id SERIAL PRIMARY KEY,
    token VARCHAR(128) NOT NULL UNIQUE,
    event_id INTEGER NOT NULL REFERENCES t_p99966623_warm_meetings_experi.events(id),
    invited_email VARCHAR(255) NOT NULL,
    invited_by INTEGER NOT NULL REFERENCES t_p99966623_warm_meetings_experi.users(id),
    used BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);