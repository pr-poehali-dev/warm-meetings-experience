CREATE TABLE IF NOT EXISTS event_media (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL,
    s3_key TEXT NOT NULL,
    url TEXT NOT NULL,
    media_type VARCHAR(20) NOT NULL DEFAULT 'photo',
    mime_type VARCHAR(100),
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_event_media_event_id ON event_media(event_id);