-- Добавляем поле attended (отметка посещаемости) в event_signups
ALTER TABLE event_signups ADD COLUMN IF NOT EXISTS attended BOOLEAN DEFAULT NULL;
