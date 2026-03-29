CREATE TABLE IF NOT EXISTS t_p99966623_warm_meetings_experi.specializations (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0
);

INSERT INTO t_p99966623_warm_meetings_experi.specializations (slug, name, description, sort_order) VALUES
('parilshchik', 'Парильщик', 'Специалист по банным процедурам и парению', 1),
('venik-master', 'Мастер веника', 'Эксперт по вениковым процедурам и заготовке веников', 2),
('massazhist', 'Массажист', 'Специалист по массажу и телесным практикам', 3),
('aromaterapeut', 'Ароматерапевт', 'Мастер ароматических процедур и ароматов пара', 4),
('instruktor', 'Инструктор по закаливанию', 'Специалист по контрастным процедурам и закаливанию', 5),
('bar-master', 'Бар-мастер', 'Эксперт по чайным церемониям и банным напиткам', 6)
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS t_p99966623_warm_meetings_experi.masters (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    tagline VARCHAR(500),
    bio TEXT,
    experience_years INTEGER DEFAULT 0,
    city VARCHAR(100) DEFAULT 'Москва',
    phone VARCHAR(50),
    telegram VARCHAR(100),
    instagram VARCHAR(100),
    avatar TEXT,
    photos JSONB DEFAULT '[]',
    portfolio JSONB DEFAULT '[]',
    specialization_ids JSONB DEFAULT '[]',
    rating NUMERIC(3,2) DEFAULT 0,
    reviews_count INTEGER DEFAULT 0,
    price_from INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p99966623_warm_meetings_experi.master_baths (
    id SERIAL PRIMARY KEY,
    master_id INTEGER NOT NULL REFERENCES t_p99966623_warm_meetings_experi.masters(id),
    bath_id INTEGER NOT NULL REFERENCES t_p99966623_warm_meetings_experi.baths(id),
    schedule TEXT,
    UNIQUE(master_id, bath_id)
);
