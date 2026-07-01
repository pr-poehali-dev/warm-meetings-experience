ALTER TABLE t_p99966623_warm_meetings_experi.master_bookings
    ADD COLUMN IF NOT EXISTS reminder_1h_sent_at timestamp without time zone NULL;

ALTER TABLE t_p99966623_warm_meetings_experi.master_calendar_settings
    ADD COLUMN IF NOT EXISTS notify_1h_reminder boolean NULL DEFAULT true;