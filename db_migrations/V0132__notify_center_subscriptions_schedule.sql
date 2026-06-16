-- Единый центр настройки уведомлений для бизнес-пользователей.
-- Реализует: подписки на типы событий + расписание (тихие часы).
-- Каналы (вкл/выкл) уже хранятся в users.notify_* и notification_preferences.

-- 1. Какой аудитории показывать тип уведомления в настройках кабинета.
-- 'business' — мастера/организаторы/партнёры. NULL/'' = всем ролям.
ALTER TABLE notification_templates
    ADD COLUMN IF NOT EXISTS audience VARCHAR(20) NOT NULL DEFAULT 'business';

-- 2. Подписки пользователя на конкретные типы событий.
-- Модель opt-out: если записи нет — пользователь подписан (enabled=true по умолчанию).
-- Запись появляется только когда пользователь ЯВНО отключил/включил событие.
CREATE TABLE IF NOT EXISTS notify_event_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    -- по каждому каналу: получать ли это событие в данный канал
    -- если канал не указан в JSON — берём дефолт (true)
    channels JSONB NOT NULL DEFAULT '{}',  -- {"telegram": true, "email": false, "vk": true}
    enabled BOOLEAN NOT NULL DEFAULT TRUE, -- общий тумблер события (выкл = не слать никуда)
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, event_type)
);

CREATE INDEX IF NOT EXISTS idx_notify_event_sub_user
    ON notify_event_subscriptions(user_id);

-- 3. Расписание получения уведомлений (тихие часы + таймзона).
CREATE TABLE IF NOT EXISTS notify_schedule (
    user_id INTEGER PRIMARY KEY,
    timezone VARCHAR(64) NOT NULL DEFAULT 'Europe/Moscow',
    quiet_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    quiet_from SMALLINT NOT NULL DEFAULT 22,  -- час начала тишины (0-23)
    quiet_to SMALLINT NOT NULL DEFAULT 8,     -- час конца тишины (0-23)
    -- что делать с уведомлением в тихие часы: 'hold' пока не реализуем, по умолчанию 'skip'
    quiet_mode VARCHAR(10) NOT NULL DEFAULT 'skip',
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
