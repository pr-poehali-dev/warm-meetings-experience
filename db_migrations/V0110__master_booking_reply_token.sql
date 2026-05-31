-- Чат мастер↔гость: персональный токен для публичного доступа гостя к диалогу по брони
ALTER TABLE master_bookings
  ADD COLUMN IF NOT EXISTS reply_token VARCHAR(40);

-- Генерируем токен для существующих броней
UPDATE master_bookings
  SET reply_token = md5(random()::text || clock_timestamp()::text || id::text)
  WHERE reply_token IS NULL;

-- Новые брони получают токен автоматически
ALTER TABLE master_bookings
  ALTER COLUMN reply_token SET DEFAULT md5(random()::text || clock_timestamp()::text);

CREATE UNIQUE INDEX IF NOT EXISTS uq_master_bookings_reply_token
  ON master_bookings(reply_token);