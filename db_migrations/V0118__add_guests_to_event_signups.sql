ALTER TABLE t_p99966623_warm_meetings_experi.event_signups
ADD COLUMN IF NOT EXISTS guests JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN t_p99966623_warm_meetings_experi.event_signups.guests IS 'Дополнительные участники записи: массив объектов {name, phone}';