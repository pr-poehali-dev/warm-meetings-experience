-- Связь событий и ритуал-локаций с банями (для рассылок партнёра)

ALTER TABLE events
    ADD COLUMN IF NOT EXISTS bath_id INTEGER REFERENCES baths(id);

CREATE INDEX IF NOT EXISTS idx_events_bath ON events(bath_id);

ALTER TABLE ritual_locations
    ADD COLUMN IF NOT EXISTS bath_id INTEGER REFERENCES baths(id);

CREATE INDEX IF NOT EXISTS idx_ritual_locations_bath ON ritual_locations(bath_id);