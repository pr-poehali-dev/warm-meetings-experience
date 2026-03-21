
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(10),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_roles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    role_id INTEGER NOT NULL REFERENCES roles(id),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    verified_at TIMESTAMP,
    data JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, role_id)
);

CREATE TABLE role_requirements (
    id SERIAL PRIMARY KEY,
    role_id INTEGER NOT NULL REFERENCES roles(id),
    type VARCHAR(50) NOT NULL,
    value INTEGER NOT NULL DEFAULT 1,
    description TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0
);

CREATE TABLE user_achievements (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    requirement_id INTEGER NOT NULL REFERENCES role_requirements(id),
    progress INTEGER DEFAULT 0,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, requirement_id)
);

CREATE TABLE badges (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(10),
    condition_type VARCHAR(50) NOT NULL,
    condition_value INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_badges (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    badge_id INTEGER NOT NULL REFERENCES badges(id),
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, badge_id)
);

CREATE TABLE role_applications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    role_id INTEGER NOT NULL REFERENCES roles(id),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    message TEXT,
    portfolio_data JSONB DEFAULT '{}',
    admin_comment TEXT,
    reviewed_by INTEGER REFERENCES users(id),
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_status ON user_roles(status);
CREATE INDEX idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX idx_role_applications_user_id ON role_applications(user_id);
CREATE INDEX idx_role_applications_status ON role_applications(status);

INSERT INTO roles (name, slug, description, icon, sort_order) VALUES
('Участник', 'member', 'Базовая роль — посещение событий и общение в сообществе', '👥', 1),
('Мастер', 'master', 'Проведение сеансов парения, работа с вениками и ритуалами', '🔥', 2),
('Партнёр', 'partner', 'Владелец бани — предоставление площадки для событий', '🏢', 3),
('Организатор', 'organizer', 'Создание и проведение событий сообщества', '📅', 4),
('Редактор', 'editor', 'Публикация статей и ведение блога сообщества', '✍️', 5);

INSERT INTO role_requirements (role_id, type, value, description, sort_order) VALUES
((SELECT id FROM roles WHERE slug = 'master'), 'min_reviews', 3, 'Получить 3 положительных отзыва от участников', 1),
((SELECT id FROM roles WHERE slug = 'master'), 'test_passed', 1, 'Пройти тест по основам парения', 2),
((SELECT id FROM roles WHERE slug = 'master'), 'portfolio', 1, 'Загрузить портфолио (сертификаты, видео)', 3),
((SELECT id FROM roles WHERE slug = 'organizer'), 'min_events', 5, 'Посетить 5 событий как участник', 1),
((SELECT id FROM roles WHERE slug = 'organizer'), 'course_passed', 1, 'Пройти курс организатора', 2),
((SELECT id FROM roles WHERE slug = 'partner'), 'bath_added', 1, 'Добавить баню в каталог', 1),
((SELECT id FROM roles WHERE slug = 'partner'), 'ownership_verified', 1, 'Подтвердить владение баней', 2),
((SELECT id FROM roles WHERE slug = 'partner'), 'agreement_signed', 1, 'Заключить электронный договор', 3),
((SELECT id FROM roles WHERE slug = 'editor'), 'min_comments', 10, 'Написать 10 качественных комментариев в блоге', 1),
((SELECT id FROM roles WHERE slug = 'editor'), 'article_approved', 1, 'Опубликовать пробную статью', 2);

INSERT INTO badges (name, slug, description, icon, condition_type, condition_value, sort_order) VALUES
('Первопроходец', 'pioneer', 'За первое посещение события', '🏔️', 'events_attended', 1, 1),
('Душа компании', 'social', 'За 10 отзывов о событиях', '💬', 'reviews_written', 10, 2),
('Знаток пара', 'steam_expert', 'За прохождение теста по парению', '♨️', 'test_passed', 1, 3),
('Собиратель круга', 'circle_builder', 'За организацию 3+ событий', '🔄', 'events_organized', 3, 4),
('Летописец', 'chronicler', 'За 5 статей в блоге', '📖', 'articles_published', 5, 5),
('Постоянный гость', 'regular', 'За 10 посещённых событий', '⭐', 'events_attended', 10, 6),
('Наставник', 'mentor', 'За 20 проведённых сеансов как мастер', '🎓', 'sessions_conducted', 20, 7),
('Амбассадор', 'ambassador', 'За 3 роли одновременно', '🏅', 'roles_count', 3, 8);

INSERT INTO user_roles (user_id, role_id, status, verified_at)
SELECT u.id, r.id, 'active', CURRENT_TIMESTAMP
FROM users u, roles r
WHERE r.slug = 'member';
