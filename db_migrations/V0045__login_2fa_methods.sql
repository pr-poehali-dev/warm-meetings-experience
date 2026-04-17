ALTER TABLE users ADD COLUMN IF NOT EXISTS login_2fa_method VARCHAR(16) NULL;

CREATE TABLE IF NOT EXISTS login_2fa_email_codes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    pending_token VARCHAR(128) NOT NULL,
    code_hash VARCHAR(128) NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    email_masked VARCHAR(255),
    ip_address VARCHAR(45),
    user_agent TEXT,
    verified_at TIMESTAMP NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_login_2fa_email_codes_user ON login_2fa_email_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_login_2fa_email_codes_pending ON login_2fa_email_codes(pending_token);

CREATE TABLE IF NOT EXISTS login_2fa_oauth_states (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    pending_token VARCHAR(128) NOT NULL,
    provider VARCHAR(16) NOT NULL,
    state VARCHAR(128) NOT NULL,
    code_verifier VARCHAR(128) NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    used_at TIMESTAMP NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_login_2fa_oauth_states_state ON login_2fa_oauth_states(state);
CREATE INDEX IF NOT EXISTS idx_login_2fa_oauth_states_pending ON login_2fa_oauth_states(pending_token);

CREATE TABLE IF NOT EXISTS login_2fa_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NULL REFERENCES users(id),
    method VARCHAR(16) NOT NULL,
    event VARCHAR(64) NOT NULL,
    success BOOLEAN NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_login_2fa_log_user ON login_2fa_log(user_id);
CREATE INDEX IF NOT EXISTS idx_login_2fa_log_created ON login_2fa_log(created_at);