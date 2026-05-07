CREATE TABLE IF NOT EXISTS t_p99966623_warm_meetings_experi.videos (
    id SERIAL PRIMARY KEY,
    owner_type VARCHAR(20) NOT NULL CHECK (owner_type IN ('master', 'bath', 'event')),
    owner_id INTEGER NOT NULL,
    provider VARCHAR(20) NOT NULL CHECK (provider IN ('vk_video', 'rutube', 'direct')),
    external_id VARCHAR(500) NULL,
    embed_url TEXT NOT NULL,
    thumbnail_url TEXT NULL,
    title VARCHAR(500) NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS videos_owner_idx ON t_p99966623_warm_meetings_experi.videos (owner_type, owner_id, status);
