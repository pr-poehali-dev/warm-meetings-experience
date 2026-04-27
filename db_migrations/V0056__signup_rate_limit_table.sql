CREATE TABLE IF NOT EXISTS signup_rate_limit (
    id SERIAL PRIMARY KEY,
    ip_address VARCHAR(64) NOT NULL,
    event_id INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_signup_rate_limit_ip_time ON signup_rate_limit(ip_address, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_signup_rate_limit_created ON signup_rate_limit(created_at);