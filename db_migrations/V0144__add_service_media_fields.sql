-- Добавляем поля для расширенного описания услуги
ALTER TABLE master_services
  ADD COLUMN IF NOT EXISTS rich_description TEXT,
  ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS video_url TEXT;
