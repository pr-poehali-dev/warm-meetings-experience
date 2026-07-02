ALTER TABLE t_p99966623_warm_meetings_experi.events
  ADD COLUMN IF NOT EXISTS event_parent_type character varying(100) DEFAULT NULL;