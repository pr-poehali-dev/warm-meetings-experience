-- Поля для прозрачной верификации мастеров.
-- verification_note — комментарий админа (например, причина снятия / отказа).
-- verified_at      — когда последний раз меняли is_verified=true.
-- verification_requested_at — когда мастер сохранил профиль и автоматически
--                             отправил его на повторную проверку.
ALTER TABLE masters ADD COLUMN IF NOT EXISTS verification_note TEXT;
ALTER TABLE masters ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP;
ALTER TABLE masters ADD COLUMN IF NOT EXISTS verification_requested_at TIMESTAMP;
