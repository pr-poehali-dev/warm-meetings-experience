ALTER TABLE t_p99966623_warm_meetings_experi.users
ADD COLUMN IF NOT EXISTS vk_notify_allowed BOOLEAN DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS t_p99966623_warm_meetings_experi.notification_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    channel VARCHAR(20) NOT NULL DEFAULT 'vk',
    notify_service BOOLEAN DEFAULT TRUE,
    notify_reminders BOOLEAN DEFAULT TRUE,
    notify_marketing BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, channel)
);