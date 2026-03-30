-- Добавляем organizer_id в events (связь события с организатором-пользователем)
ALTER TABLE events ADD COLUMN IF NOT EXISTS organizer_id INTEGER REFERENCES users(id);

-- Таблица профилей организаторов (расширенная информация)
CREATE TABLE IF NOT EXISTS organizer_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    display_name VARCHAR(255),
    bio TEXT,
    photo_url TEXT,
    telegram_chat_id BIGINT,
    vk_group_id BIGINT,
    vk_access_token TEXT,
    is_verified BOOLEAN DEFAULT false,
    total_events INTEGER DEFAULT 0,
    total_participants INTEGER DEFAULT 0,
    avg_rating NUMERIC(3,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_events_organizer_id ON events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_organizer_profiles_user_id ON organizer_profiles(user_id);
