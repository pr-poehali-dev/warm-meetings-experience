-- Этап 1: 2FA для заявок на роли

-- 1. Добавляем yandex_id в users
ALTER TABLE users ADD COLUMN IF NOT EXISTS yandex_id VARCHAR(50);
CREATE INDEX IF NOT EXISTS idx_users_yandex_id ON users(yandex_id);

-- 2. Расширяем role_applications для 2FA
ALTER TABLE role_applications ADD COLUMN IF NOT EXISTS tfa_method VARCHAR(20);
ALTER TABLE role_applications ADD COLUMN IF NOT EXISTS tfa_verified_at TIMESTAMP;
ALTER TABLE role_applications ADD COLUMN IF NOT EXISTS tfa_expires_at TIMESTAMP;
ALTER TABLE role_applications ADD COLUMN IF NOT EXISTS tfa_identifier VARCHAR(255);

UPDATE role_applications SET tfa_method = 'legacy', tfa_verified_at = created_at WHERE tfa_method IS NULL;

-- 3. Email-коды для заявок
CREATE TABLE IF NOT EXISTS role_application_email_codes (
  id SERIAL PRIMARY KEY,
  application_id INTEGER NOT NULL,
  email VARCHAR(255) NOT NULL,
  code_hash VARCHAR(128) NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMP NOT NULL,
  locked_until TIMESTAMP NULL,
  verified_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL
);
CREATE INDEX IF NOT EXISTS idx_role_app_email_codes_app ON role_application_email_codes(application_id);
CREATE INDEX IF NOT EXISTS idx_role_app_email_codes_expires ON role_application_email_codes(expires_at);

-- 4. Аудит-лог 2FA для заявок
CREATE TABLE IF NOT EXISTS role_application_2fa_log (
  id SERIAL PRIMARY KEY,
  application_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  method VARCHAR(20) NOT NULL,
  event VARCHAR(40) NOT NULL,
  success BOOLEAN NOT NULL,
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  details JSONB NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_role_app_2fa_log_app ON role_application_2fa_log(application_id);
CREATE INDEX IF NOT EXISTS idx_role_app_2fa_log_user ON role_application_2fa_log(user_id);
