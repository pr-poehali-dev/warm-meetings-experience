ALTER TABLE events ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'draft';

UPDATE events SET status = 'published' WHERE is_visible = true;
UPDATE events SET status = 'draft' WHERE is_visible = false;

CREATE TABLE IF NOT EXISTS event_moderation_logs (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES events(id),
    admin_id INTEGER REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_moderation_logs_event_id ON event_moderation_logs(event_id);