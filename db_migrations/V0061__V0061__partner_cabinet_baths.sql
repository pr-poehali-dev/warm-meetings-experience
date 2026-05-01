-- Добавить владельца бани и верификацию
ALTER TABLE baths ADD COLUMN IF NOT EXISTS owner_id INTEGER REFERENCES users(id);
ALTER TABLE baths ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
ALTER TABLE baths ADD COLUMN IF NOT EXISTS verification_requested_at TIMESTAMP;
ALTER TABLE baths ADD COLUMN IF NOT EXISTS work_hours JSONB DEFAULT '{}';
ALTER TABLE baths ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}';

-- Индекс для быстрой выборки бань по владельцу
CREATE INDEX IF NOT EXISTS idx_baths_owner ON baths(owner_id);

-- Статистика просмотров бань
CREATE TABLE IF NOT EXISTS bath_views (
    id SERIAL PRIMARY KEY,
    bath_id INTEGER NOT NULL REFERENCES baths(id),
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_agent VARCHAR(512)
);
CREATE INDEX IF NOT EXISTS idx_bath_views_bath ON bath_views(bath_id);
CREATE INDEX IF NOT EXISTS idx_bath_views_date ON bath_views(viewed_at);
