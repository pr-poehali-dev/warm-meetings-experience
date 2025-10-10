-- Создание таблиц для системы калькулятора и заявок

-- Таблица пакетов
CREATE TABLE IF NOT EXISTS packages (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    base_price DECIMAL(10,2) NOT NULL,
    duration_hours INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица аддонов
CREATE TABLE IF NOT EXISTS addons (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица зон обслуживания
CREATE TABLE IF NOT EXISTS service_areas (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    multiplier DECIMAL(5,3) NOT NULL DEFAULT 1.0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица мультипликаторов по типам (день недели, количество человек, длительность)
CREATE TABLE IF NOT EXISTS multipliers (
    id SERIAL PRIMARY KEY,
    multiplier_type VARCHAR(50) NOT NULL, -- 'day_type', 'person_count', 'duration'
    condition_key VARCHAR(100) NOT NULL, -- например: 'weekend', '10-20', '4h'
    condition_label VARCHAR(255) NOT NULL,
    multiplier DECIMAL(5,3) NOT NULL DEFAULT 1.0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица праздничного календаря
CREATE TABLE IF NOT EXISTS holiday_calendar (
    id SERIAL PRIMARY KEY,
    holiday_date DATE NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    multiplier DECIMAL(5,3) NOT NULL DEFAULT 1.5,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица промо-кодов
CREATE TABLE IF NOT EXISTS promo_codes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    discount_type VARCHAR(20) NOT NULL, -- 'percentage', 'fixed'
    discount_value DECIMAL(10,2) NOT NULL,
    valid_from DATE NOT NULL,
    valid_to DATE NOT NULL,
    usage_limit INTEGER,
    used_count INTEGER DEFAULT 0,
    max_discount DECIMAL(10,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица заявок
CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    client_name VARCHAR(255) NOT NULL,
    client_phone VARCHAR(50) NOT NULL,
    event_date DATE NOT NULL,
    package_id INTEGER REFERENCES packages(id),
    service_area_id INTEGER REFERENCES service_areas(id),
    person_count INTEGER NOT NULL,
    selected_addons JSONB, -- массив ID аддонов
    promo_code VARCHAR(50),
    base_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    calculation_details JSONB, -- детали расчета с мультипликаторами
    status VARCHAR(50) DEFAULT 'new', -- 'new', 'confirmed', 'cancelled', 'completed'
    consent_given BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица настроек прайса
CREATE TABLE IF NOT EXISTS price_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица логов изменений цен
CREATE TABLE IF NOT EXISTS price_change_logs (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL, -- 'package', 'addon', 'multiplier', etc.
    entity_id INTEGER NOT NULL,
    old_value JSONB,
    new_value JSONB,
    changed_by VARCHAR(100),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица для интеграций (CRM, платежи, аналитика)
CREATE TABLE IF NOT EXISTS integrations (
    id SERIAL PRIMARY KEY,
    integration_type VARCHAR(50) NOT NULL UNIQUE, -- 'crm', 'payment', 'analytics'
    config JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_bookings_event_date ON bookings(event_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at);
CREATE INDEX IF NOT EXISTS idx_holiday_calendar_date ON holiday_calendar(holiday_date);
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_valid_dates ON promo_codes(valid_from, valid_to);

-- Вставка начальных данных настроек
INSERT INTO price_settings (setting_key, setting_value, description) VALUES
    ('deposit_rate', '0.30', 'Процент депозита от общей суммы (30%)'),
    ('rounding_rule', 'nearest_100', 'Правило округления: nearest_100, nearest_50, none'),
    ('tax_enabled', 'false', 'Включен ли налог'),
    ('tax_rate', '0.20', 'Ставка налога (20%)')
ON CONFLICT (setting_key) DO NOTHING;

-- Вставка начальных данных пакетов (из существующего калькулятора)
INSERT INTO packages (name, description, base_price, duration_hours) VALUES
    ('Легкое знакомство', 'Базовый пакет для первого свидания', 25000, 2),
    ('Романтический вечер', 'Расширенный пакет с романтической программой', 45000, 3),
    ('VIP свидание', 'Премиум пакет с полным сервисом', 75000, 4)
ON CONFLICT DO NOTHING;

-- Вставка начальных аддонов
INSERT INTO addons (name, description, price) VALUES
    ('Фотограф (1 час)', 'Профессиональная фотосессия', 8000),
    ('Букет цветов', 'Красивый букет по сезону', 3000),
    ('Шампанское', 'Бутылка премиум шампанского', 5000),
    ('Торт', 'Праздничный торт', 4000),
    ('Живая музыка', 'Музыкант на мероприятии', 15000)
ON CONFLICT DO NOTHING;

-- Вставка зон обслуживания
INSERT INTO service_areas (name, multiplier) VALUES
    ('Центр города', 1.0),
    ('Ближайшие районы', 1.2),
    ('Удаленные районы', 1.5)
ON CONFLICT DO NOTHING;

-- Вставка мультипликаторов
INSERT INTO multipliers (multiplier_type, condition_key, condition_label, multiplier) VALUES
    ('day_type', 'weekday', 'Будний день', 1.0),
    ('day_type', 'weekend', 'Выходной день', 1.3),
    ('person_count', '2-5', '2-5 человек', 1.0),
    ('person_count', '6-10', '6-10 человек', 1.2),
    ('person_count', '11-20', '11-20 человек', 1.4),
    ('person_count', '20+', 'Более 20 человек', 1.6),
    ('duration', '2h', '2 часа', 1.0),
    ('duration', '3h', '3 часа', 1.2),
    ('duration', '4h', '4 часа или более', 1.4)
ON CONFLICT DO NOTHING;