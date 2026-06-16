-- Персональные шаблоны уведомлений на уровне владельца (бизнес-пользователя).
-- Если владелец задал свой текст для event_type — он переопределяет глобальный.

CREATE TABLE IF NOT EXISTS notification_templates_owner (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    -- тело по каналам, та же структура что в notification_templates.bodies:
    -- { "telegram": {"text": "..."}, "email": {"subject": "...","html": "..."}, "vk": {"text": "..."} }
    bodies JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(owner_id, event_type)
);

CREATE INDEX IF NOT EXISTS idx_notif_tpl_owner ON notification_templates_owner(owner_id, event_type);

-- Какие event_type разрешено настраивать бизнес-пользователям (флаг в глобальном шаблоне)
ALTER TABLE notification_templates ADD COLUMN IF NOT EXISTS owner_editable BOOLEAN NOT NULL DEFAULT FALSE;

-- Разрешаем владельцам редактировать события и записи к мастеру
UPDATE notification_templates SET owner_editable = TRUE
WHERE event_type IN ('master_booking_new', 'event_signup_new', 'booking_confirmed', 'booking_reminder');
