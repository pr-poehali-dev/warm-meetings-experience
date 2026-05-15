-- CRM модуль: теги, заметки, внешние клиенты, сегменты

-- 1. Теги (создаются бизнес-пользователем)
CREATE TABLE IF NOT EXISTS crm_tags (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER NOT NULL,
    name VARCHAR(64) NOT NULL,
    color VARCHAR(20) DEFAULT '#888888',
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(owner_id, name)
);
CREATE INDEX IF NOT EXISTS idx_crm_tags_owner ON crm_tags(owner_id);

-- 2. Связь тегов с клиентами.
-- client_key = "user:{id}" | "signup:{id}" | "ext:{id}" — универсальная ссылка
CREATE TABLE IF NOT EXISTS crm_guest_tags (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    client_key VARCHAR(64) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(owner_id, tag_id, client_key)
);
CREATE INDEX IF NOT EXISTS idx_crm_guest_tags_owner_client ON crm_guest_tags(owner_id, client_key);
CREATE INDEX IF NOT EXISTS idx_crm_guest_tags_tag ON crm_guest_tags(tag_id);

-- 3. Заметки бизнес-пользователя о клиенте
CREATE TABLE IF NOT EXISTS crm_notes (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER NOT NULL,
    client_key VARCHAR(64) NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_crm_notes_owner_client ON crm_notes(owner_id, client_key);

-- 4. Внешние клиенты (добавленные вручную или из CSV)
CREATE TABLE IF NOT EXISTS crm_external_guests (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255),
    telegram VARCHAR(100),
    vk VARCHAR(100),
    source VARCHAR(50) DEFAULT 'manual',
    merged_into_user_id INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_crm_ext_owner ON crm_external_guests(owner_id);
CREATE INDEX IF NOT EXISTS idx_crm_ext_phone ON crm_external_guests(owner_id, phone);
CREATE INDEX IF NOT EXISTS idx_crm_ext_email ON crm_external_guests(owner_id, email);

-- 5. Сегменты (сохранённые фильтры для рассылок)
CREATE TABLE IF NOT EXISTS crm_segments (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER NOT NULL,
    name VARCHAR(128) NOT NULL,
    filters JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_crm_segments_owner ON crm_segments(owner_id);
