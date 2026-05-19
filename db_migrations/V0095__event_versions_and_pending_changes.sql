-- Версии событий (snapshot после каждого одобрения админом) и поле для трекинга ожидающих изменений
CREATE TABLE IF NOT EXISTS t_p99966623_warm_meetings_experi.event_versions (
  id SERIAL PRIMARY KEY,
  event_id INT NOT NULL,
  snapshot JSONB NOT NULL,
  approved_by INT,
  approved_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reason VARCHAR(50) DEFAULT 'approve'
);

CREATE INDEX IF NOT EXISTS idx_event_versions_event_id ON t_p99966623_warm_meetings_experi.event_versions(event_id);
CREATE INDEX IF NOT EXISTS idx_event_versions_approved_at ON t_p99966623_warm_meetings_experi.event_versions(approved_at DESC);

ALTER TABLE t_p99966623_warm_meetings_experi.events
  ADD COLUMN IF NOT EXISTS has_pending_changes BOOLEAN DEFAULT false;

ALTER TABLE t_p99966623_warm_meetings_experi.events
  ADD COLUMN IF NOT EXISTS pending_changed_fields TEXT[];

ALTER TABLE t_p99966623_warm_meetings_experi.events
  ADD COLUMN IF NOT EXISTS last_moderated_at TIMESTAMP;
