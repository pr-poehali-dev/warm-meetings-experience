CREATE TABLE IF NOT EXISTS baths (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    address VARCHAR(500),
    city VARCHAR(100) DEFAULT 'Москва',
    lat DECIMAL(10, 7),
    lng DECIMAL(10, 7),
    phone VARCHAR(50),
    website VARCHAR(255),
    photos JSONB DEFAULT '[]',
    features JSONB DEFAULT '[]',
    bath_types JSONB DEFAULT '[]',
    capacity_min INT DEFAULT 1,
    capacity_max INT DEFAULT 20,
    price_from INT DEFAULT 0,
    price_per_hour INT DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 0,
    reviews_count INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO baths (slug, name, description, address, city, lat, lng, phone, photos, features, bath_types, capacity_min, capacity_max, price_from, price_per_hour, rating, reviews_count) VALUES
('banya-v-centre', 'Баня в Центре', 'Классическая русская баня в самом центре города. Просторный зал с дровяной печью, купель с ледяной водой, уютная комната отдыха.', 'ул. Тверская, 12', 'Москва', 55.7558, 37.6176, '+7 (999) 123-45-67', '[]', '["Дровяная печь", "Купель", "Комната отдыха", "Веники"]', '["Русская парная", "Хамам"]', 2, 15, 3000, 1500, 4.80, 42),
('sauny-podmoskovya', 'Загородная сауна', 'Финская сауна за городом. Свежий воздух, сосновый лес, открытый бассейн. Идеально для компании.', 'Рублёво-Успенское ш., 45', 'Москва', 55.7312, 37.2589, '+7 (999) 234-56-78', '[]', '["Финская печь", "Бассейн", "Мангал", "Парковка"]', '["Финская сауна"]', 4, 20, 5000, 2500, 4.60, 28),
('banya-na-vode', 'Баня на воде', 'Уникальная плавучая баня на Москве-реке. Незабываемые виды, прыжки в воду, настоящая русская парная.', 'Причал Фрунзенская', 'Москва', 55.7266, 37.5939, '+7 (999) 345-67-89', '[]', '["Прыжки в воду", "Открытая палуба", "Панорамный вид", "Русская печь"]', '["Русская парная"]', 2, 10, 4500, 2000, 4.90, 67);
