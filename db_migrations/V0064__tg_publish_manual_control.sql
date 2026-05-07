
-- 1. events: поля для отложенной и ручной публикации
ALTER TABLE t_p99966623_warm_meetings_experi.events
  ADD COLUMN IF NOT EXISTS scheduled_publish_at TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS last_manual_publish_at TIMESTAMP NULL;

-- 2. tg_channels: тип канала (organizer / master / main)
ALTER TABLE t_p99966623_warm_meetings_experi.tg_channels
  ADD COLUMN IF NOT EXISTS channel_type VARCHAR(20) NOT NULL DEFAULT 'organizer';

-- Главный канал СПАРКОМ — вставляем если нет записи с type=main
-- (chat_id будет задан вручную через бот)
INSERT INTO t_p99966623_warm_meetings_experi.tg_channels
  (user_id, chat_id, chat_title, chat_type, is_active, channel_type)
SELECT 1, 0, 'Главный канал СПАРКОМ', 'channel', false, 'main'
WHERE NOT EXISTS (
  SELECT 1 FROM t_p99966623_warm_meetings_experi.tg_channels WHERE channel_type = 'main'
);

-- 3. tg_publications: тип публикации и флаг отложенности
ALTER TABLE t_p99966623_warm_meetings_experi.tg_publications
  ADD COLUMN IF NOT EXISTS publication_type VARCHAR(20) NOT NULL DEFAULT 'first',
  ADD COLUMN IF NOT EXISTS is_scheduled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS published_by INTEGER NULL;

-- 4. organizer_profiles: настройка автопубликации
ALTER TABLE t_p99966623_warm_meetings_experi.organizer_profiles
  ADD COLUMN IF NOT EXISTS auto_publish_tg BOOLEAN NOT NULL DEFAULT false;
