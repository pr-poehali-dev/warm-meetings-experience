-- Универсальная система публикаций в Telegram
-- Расширяем tg_channels: добавляем поддержку разных типов контента и ролей пользователя

ALTER TABLE t_p99966623_warm_meetings_experi.tg_channels
  ALTER COLUMN channel_type SET DEFAULT 'organizer',
  ADD COLUMN IF NOT EXISTS content_types TEXT[] DEFAULT ARRAY['event']::TEXT[],
  ADD COLUMN IF NOT EXISTS auto_publish BOOLEAN NOT NULL DEFAULT FALSE;

-- Универсальная таблица публикаций (заменяет event_id на content_type + content_id)
CREATE TABLE IF NOT EXISTS t_p99966623_warm_meetings_experi.tg_pub_universal (
  id                SERIAL PRIMARY KEY,
  user_id           INTEGER NOT NULL REFERENCES t_p99966623_warm_meetings_experi.users(id),
  channel_id        INTEGER NOT NULL REFERENCES t_p99966623_warm_meetings_experi.tg_channels(id),
  content_type      VARCHAR(30) NOT NULL,   -- 'event' | 'master_service' | 'bath' | 'article'
  content_id        INTEGER NOT NULL,
  message_id        BIGINT,
  status            VARCHAR(20) NOT NULL DEFAULT 'sent',  -- 'sent' | 'error' | 'scheduled'
  error_text        TEXT,
  scheduled_at      TIMESTAMP,
  published_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  published_by      INTEGER REFERENCES t_p99966623_warm_meetings_experi.users(id),
  publication_type  VARCHAR(20) NOT NULL DEFAULT 'manual', -- 'manual' | 'auto' | 'repeat'
  UNIQUE(channel_id, content_type, content_id, publication_type)
);

CREATE INDEX IF NOT EXISTS idx_tg_pub_universal_content
  ON t_p99966623_warm_meetings_experi.tg_pub_universal(content_type, content_id);

CREATE INDEX IF NOT EXISTS idx_tg_pub_universal_user
  ON t_p99966623_warm_meetings_experi.tg_pub_universal(user_id);

CREATE INDEX IF NOT EXISTS idx_tg_pub_universal_scheduled
  ON t_p99966623_warm_meetings_experi.tg_pub_universal(scheduled_at)
  WHERE status = 'scheduled';

-- Шаблоны публикаций по типу контента (на уровне пользователя)
CREATE TABLE IF NOT EXISTS t_p99966623_warm_meetings_experi.tg_content_templates (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES t_p99966623_warm_meetings_experi.users(id),
  content_type  VARCHAR(30) NOT NULL,
  template      TEXT NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, content_type)
);
