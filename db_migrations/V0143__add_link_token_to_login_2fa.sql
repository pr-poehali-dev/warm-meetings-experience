ALTER TABLE login_2fa_email_codes ADD COLUMN IF NOT EXISTS link_token VARCHAR(96);
CREATE INDEX IF NOT EXISTS idx_login_2fa_link_token ON login_2fa_email_codes(link_token) WHERE verified_at IS NULL;