ALTER TABLE t_p99966623_warm_meetings_experi.master_bookings
ADD COLUMN IF NOT EXISTS reminder_24h_sent_at TIMESTAMP NULL;

CREATE INDEX IF NOT EXISTS idx_master_bookings_reminder_24h
ON t_p99966623_warm_meetings_experi.master_bookings (datetime_start)
WHERE reminder_24h_sent_at IS NULL;