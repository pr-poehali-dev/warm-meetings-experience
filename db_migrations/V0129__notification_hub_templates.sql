-- Notification Hub: централизованные шаблоны уведомлений
-- Каналы хранятся в JSONB bodies (telegram/email/vk сейчас, push/sms/max — позже без миграций)

CREATE TABLE IF NOT EXISTS notification_templates (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    category VARCHAR(30) NOT NULL DEFAULT 'service',
    -- какие переменные доступны в шаблоне (для подсказок в админке)
    variables JSONB NOT NULL DEFAULT '[]',
    -- тело сообщения по каналам:
    -- { "telegram": {"text": "..."},
    --   "email": {"subject": "...", "html": "..."},
    --   "vk": {"text": "..."} }
    bodies JSONB NOT NULL DEFAULT '{}',
    -- каналы по умолчанию, если вызывающий не указал явно
    default_channels JSONB NOT NULL DEFAULT '["telegram","email"]',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_tpl_event ON notification_templates(event_type);
CREATE INDEX IF NOT EXISTS idx_notif_tpl_active ON notification_templates(is_active);

-- В лог добавим template_id для связи отправки с шаблоном (опционально)
ALTER TABLE notification_log ADD COLUMN IF NOT EXISTS template_id INTEGER;
