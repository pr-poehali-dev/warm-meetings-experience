CREATE TABLE IF NOT EXISTS support_tickets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    subject VARCHAR(255) NOT NULL,
    category VARCHAR(64) DEFAULT 'other',
    status VARCHAR(32) NOT NULL DEFAULT 'open',
    priority VARCHAR(16) NOT NULL DEFAULT 'medium',
    assigned_to INTEGER REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_email ON support_tickets(email);

CREATE TABLE IF NOT EXISTS support_messages (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL REFERENCES support_tickets(id),
    author_type VARCHAR(16) NOT NULL,
    author_user_id INTEGER REFERENCES users(id),
    message TEXT NOT NULL,
    attachment_url TEXT,
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_support_messages_ticket ON support_messages(ticket_id);

CREATE TABLE IF NOT EXISTS support_faq (
    id SERIAL PRIMARY KEY,
    role VARCHAR(32) NOT NULL DEFAULT 'guest',
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_support_faq_role ON support_faq(role);

INSERT INTO support_faq (role, question, answer, sort_order) VALUES
('guest', 'Как записаться на банную встречу?', 'Откройте раздел «События», выберите подходящую встречу и нажмите «Записаться». Если у вас нет аккаунта — зарегистрируйтесь за минуту по email или через VK/Яндекс ID.', 10),
('guest', 'Сколько стоит участие?', 'Стоимость зависит от формата встречи и указана на странице каждого события. Часть встреч бесплатна для новичков клуба.', 20),
('guest', 'Можно ли отменить запись?', 'Да, в личном кабинете во вкладке «Мои события» можно отменить запись. Если до встречи менее 24 часов — свяжитесь с организатором.', 30),
('participant', 'Как изменить email или телефон?', 'В личном кабинете на вкладке «Профиль» нажмите «Редактировать», обновите данные и сохраните. На новый email придёт письмо для подтверждения.', 10),
('participant', 'Где посмотреть мои записи?', 'В личном кабинете во вкладке «Мои события» — там и ближайшие встречи, и история.', 20),
('participant', 'Как удалить аккаунт?', 'В Профиле есть кнопка «Удалить аккаунт». Удаление необратимо — все записи и данные пропадут.', 30),
('master', 'Как стать парным мастером?', 'Заполните анкету мастера в разделе «Стать мастером». После проверки модераторами ваш профиль появится в каталоге мастеров.', 10),
('organizer', 'Как опубликовать своё событие?', 'В рабочем кабинете организатора нажмите «Создать событие», заполните данные и отправьте на модерацию. Обычно проверяем за 1 рабочий день.', 10),
('partner', 'Как добавить свою баню в каталог?', 'Свяжитесь с нами через форму поддержки — мы пришлём анкету партнёра и расскажем об условиях размещения.', 10);