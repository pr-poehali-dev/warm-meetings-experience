ALTER TABLE email_verify_tokens ADD COLUMN IF NOT EXISTS code VARCHAR(6);
CREATE INDEX IF NOT EXISTS idx_email_verify_tokens_code ON email_verify_tokens(code) WHERE used = false;