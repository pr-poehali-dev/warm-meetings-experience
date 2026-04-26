-- Добавляем поле short_code для коротких ссылок на события
ALTER TABLE events ADD COLUMN IF NOT EXISTS short_code VARCHAR(8) UNIQUE;

-- Генерируем short_code для всех существующих событий
UPDATE events
SET short_code = LOWER(SUBSTRING(MD5(id::text || slug || RANDOM()::text), 1, 6))
WHERE short_code IS NULL;

-- Создаём уникальный индекс для быстрого поиска
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_short_code ON events (short_code);
