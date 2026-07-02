CREATE TABLE IF NOT EXISTS error_logs (
    id BIGSERIAL PRIMARY KEY,
    source VARCHAR(16) NOT NULL DEFAULT 'frontend',
    level VARCHAR(16) NOT NULL DEFAULT 'error',
    message TEXT NOT NULL,
    stack TEXT,
    url TEXT,
    function_name VARCHAR(120),
    user_agent TEXT,
    user_id INTEGER,
    fingerprint VARCHAR(64),
    context JSONB,
    count INTEGER NOT NULL DEFAULT 1,
    resolved BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_error_logs_created ON error_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_fingerprint ON error_logs (fingerprint);
CREATE INDEX IF NOT EXISTS idx_error_logs_source ON error_logs (source, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON error_logs (resolved, created_at DESC);