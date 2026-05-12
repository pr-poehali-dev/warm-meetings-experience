CREATE TABLE IF NOT EXISTS t_p99966623_warm_meetings_experi.event_questions (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES t_p99966623_warm_meetings_experi.events(id),
    organizer_id INTEGER REFERENCES t_p99966623_warm_meetings_experi.users(id),
    guest_user_id INTEGER REFERENCES t_p99966623_warm_meetings_experi.users(id),
    guest_name VARCHAR(200) NOT NULL,
    guest_contact VARCHAR(200) NOT NULL,
    contact_type VARCHAR(20) NOT NULL DEFAULT 'email',
    message TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'new',
    email_sent BOOLEAN DEFAULT FALSE,
    ip_address VARCHAR(64),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP,
    answered_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_event_questions_event_id 
    ON t_p99966623_warm_meetings_experi.event_questions(event_id);

CREATE INDEX IF NOT EXISTS idx_event_questions_organizer_id 
    ON t_p99966623_warm_meetings_experi.event_questions(organizer_id);

CREATE INDEX IF NOT EXISTS idx_event_questions_created_at 
    ON t_p99966623_warm_meetings_experi.event_questions(created_at DESC);
