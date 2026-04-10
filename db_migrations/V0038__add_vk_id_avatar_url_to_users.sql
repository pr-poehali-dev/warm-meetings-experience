ALTER TABLE t_p99966623_warm_meetings_experi.users ADD COLUMN IF NOT EXISTS vk_id VARCHAR(50);
ALTER TABLE t_p99966623_warm_meetings_experi.users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
CREATE INDEX IF NOT EXISTS idx_users_vk_id ON t_p99966623_warm_meetings_experi.users(vk_id);
