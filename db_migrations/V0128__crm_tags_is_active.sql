ALTER TABLE t_p99966623_warm_meetings_experi.crm_tags ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

UPDATE t_p99966623_warm_meetings_experi.crm_tags
SET is_active = false, name = SPLIT_PART(name, '__', 1)
WHERE name LIKE '%__%';
