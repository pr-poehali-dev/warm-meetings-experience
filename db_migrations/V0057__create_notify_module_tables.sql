
CREATE TABLE notify_scenarios (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER NOT NULL REFERENCES users(id),
    owner_role VARCHAR(20) NOT NULL DEFAULT 'organizer',
    name VARCHAR(255) NOT NULL,
    trigger_type VARCHAR(50) NOT NULL DEFAULT 'manual',
    trigger_hours INTEGER DEFAULT NULL,
    trigger_status VARCHAR(50) DEFAULT NULL,
    channels JSONB NOT NULL DEFAULT '["email"]',
    subject VARCHAR(500) DEFAULT '',
    body_html TEXT NOT NULL DEFAULT '',
    body_text TEXT NOT NULL DEFAULT '',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE notify_log (
    id BIGSERIAL PRIMARY KEY,
    scenario_id INTEGER REFERENCES notify_scenarios(id),
    owner_id INTEGER NOT NULL REFERENCES users(id),
    event_id INTEGER REFERENCES events(id),
    channel VARCHAR(20) NOT NULL,
    recipient_user_id INTEGER REFERENCES users(id),
    recipient_email VARCHAR(255),
    recipient_name VARCHAR(255),
    subject VARCHAR(500),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    error_text TEXT,
    sent_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notify_scenarios_owner ON notify_scenarios(owner_id);
CREATE INDEX idx_notify_log_owner ON notify_log(owner_id);
CREATE INDEX idx_notify_log_event ON notify_log(event_id);
CREATE INDEX idx_notify_log_scenario ON notify_log(scenario_id);
