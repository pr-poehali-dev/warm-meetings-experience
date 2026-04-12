
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret VARCHAR(64) NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_backup_codes TEXT NULL;

CREATE TABLE IF NOT EXISTS user_login_devices (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    device_fingerprint VARCHAR(64) NOT NULL,
    user_agent TEXT,
    ip_address VARCHAR(45),
    last_login_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    first_login_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_trusted BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_login_devices_user_id ON user_login_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_login_devices_fingerprint ON user_login_devices(user_id, device_fingerprint);
