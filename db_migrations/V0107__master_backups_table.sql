CREATE TABLE IF NOT EXISTS t_p99966623_warm_meetings_experi.master_backups (
    id serial PRIMARY KEY,
    master_id integer NOT NULL,
    reason character varying(50) NOT NULL DEFAULT 'manual',
    bookings_count integer NOT NULL DEFAULT 0,
    file_url text NULL,
    created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_master_backups_master
    ON t_p99966623_warm_meetings_experi.master_backups (master_id, created_at DESC);