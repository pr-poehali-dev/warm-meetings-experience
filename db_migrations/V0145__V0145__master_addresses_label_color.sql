ALTER TABLE t_p99966623_warm_meetings_experi.master_addresses
    ADD COLUMN IF NOT EXISTS label VARCHAR(60),
    ADD COLUMN IF NOT EXISTS color VARCHAR(20);