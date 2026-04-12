CREATE TABLE IF NOT EXISTS email_verify_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    token VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_email_verify_tokens_token ON email_verify_tokens(token);
CREATE INDEX IF NOT EXISTS idx_email_verify_tokens_user_id ON email_verify_tokens(user_id);