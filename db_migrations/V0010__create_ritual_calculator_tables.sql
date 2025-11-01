-- Таблица форматов ритуалов
CREATE TABLE ritual_formats (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    duration_hours DECIMAL(3,1) NOT NULL,
    base_price INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица дополнительных опций
CREATE TABLE ritual_options (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица локаций
CREATE TABLE ritual_locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price_per_hour INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица временных слотов
CREATE TABLE ritual_time_slots (
    id SERIAL PRIMARY KEY,
    time_label VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица бронирований ритуалов
CREATE TABLE ritual_bookings (
    id SERIAL PRIMARY KEY,
    client_name VARCHAR(255) NOT NULL,
    client_phone VARCHAR(50) NOT NULL,
    client_email VARCHAR(255) NOT NULL,
    ritual_format_id INTEGER REFERENCES ritual_formats(id),
    location_id INTEGER REFERENCES ritual_locations(id),
    selected_date DATE NOT NULL,
    time_slot_id INTEGER REFERENCES ritual_time_slots(id),
    selected_options INTEGER[] DEFAULT '{}',
    total_price INTEGER NOT NULL,
    comment TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Заполнение начальными данными
INSERT INTO ritual_formats (name, description, duration_hours, base_price, sort_order) VALUES
('Ритуал «Ближе»', '2 часа', 2.0, 12000, 1),
('Тепло в тишине', '2 часа', 2.0, 15000, 2),
('Парный ритуал обучения парению', '2.5 часа', 2.5, 18000, 3),
('Свидание с ужином и чаем', '3 часа', 3.0, 22000, 4),
('Свадебный пар', '3 часа', 3.0, 28000, 5);

INSERT INTO ritual_options (name, price, sort_order) VALUES
('Букет цветов', 3000, 1),
('Фруктовая тарелка / сырная тарелка', 2500, 2),
('Фото-съемка (мини-сессия до 30 мин)', 5000, 3),
('Ароматические свечи / ритуальные травы', 1500, 4),
('Расширение времени на 30 минут', 2000, 5);

INSERT INTO ritual_locations (name, price_per_hour, sort_order) VALUES
('Баня №1', 3000, 1),
('Баня №2', 4000, 2),
('Выезд в другую баню', 2000, 3);

INSERT INTO ritual_time_slots (time_label, sort_order) VALUES
('10:00', 1),
('13:00', 2),
('17:00', 3),
('20:00', 4);

-- Индексы для производительности
CREATE INDEX idx_ritual_bookings_date ON ritual_bookings(selected_date);
CREATE INDEX idx_ritual_bookings_status ON ritual_bookings(status);
CREATE INDEX idx_ritual_bookings_email ON ritual_bookings(client_email);