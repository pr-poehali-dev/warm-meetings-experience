ALTER TABLE t_p99966623_warm_meetings_experi.users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE t_p99966623_warm_meetings_experi.users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;

CREATE TABLE t_p99966623_warm_meetings_experi.refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_refresh_tokens_token_hash ON t_p99966623_warm_meetings_experi.refresh_tokens(token_hash);
CREATE INDEX idx_refresh_tokens_user_id ON t_p99966623_warm_meetings_experi.refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON t_p99966623_warm_meetings_experi.refresh_tokens(expires_at);
