ALTER TABLE users ADD COLUMN IF NOT EXISTS consent_photo VARCHAR(3) NULL;
COMMENT ON COLUMN users.consent_photo IS 'yes = согласен на фото в рекламе, no = запрещает, NULL = не указал';