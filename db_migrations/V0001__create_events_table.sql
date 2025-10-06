CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    short_description VARCHAR(200),
    full_description TEXT,
    event_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    occupancy VARCHAR(50) DEFAULT 'low',
    image_url TEXT,
    is_visible BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_events_date ON events(event_date);
CREATE INDEX idx_events_visible ON events(is_visible);

COMMENT ON TABLE events IS 'Таблица для хранения мероприятий';
COMMENT ON COLUMN events.occupancy IS 'Уровень загруженности: low, medium, high, full';