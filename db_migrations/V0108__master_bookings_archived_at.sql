ALTER TABLE t_p99966623_warm_meetings_experi.master_bookings
    ADD COLUMN IF NOT EXISTS archived_at timestamp without time zone NULL;

CREATE INDEX IF NOT EXISTS idx_master_bookings_archived_at
    ON t_p99966623_warm_meetings_experi.master_bookings (master_id, archived_at);