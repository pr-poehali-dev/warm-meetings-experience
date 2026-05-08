CREATE TABLE IF NOT EXISTS support_templates (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    category VARCHAR(64) DEFAULT 'other',
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO support_templates (title, body, category, sort_order) VALUES
('Приветствие', 'Здравствуйте! Спасибо за обращение в банный клуб «Спарком». Сейчас разберёмся с вашим вопросом.', 'other', 10),
('Уточнение деталей', 'Чтобы помочь быстрее, уточните, пожалуйста: какое именно событие, дата записи и что именно идёт не так? Если есть скриншот — пришлите.', 'other', 20),
('Проблема решена', 'Готово! Проверьте, пожалуйста, у себя — всё должно работать. Если что — пишите, мы рядом.', 'tech', 30),
('Возврат оформлен', 'Возврат оформили. Деньги вернутся на карту в течение 3–5 рабочих дней. Если не придут — дайте знать.', 'payment', 40),
('Напоминание о встрече', 'Напоминаем, что вы записаны на банную встречу. Парная ждёт, веники готовы. До скорого!', 'booking', 50),
('Закрытие обращения', 'Если больше вопросов нет — закрываем обращение. Будем рады видеть вас на следующих встречах. Лёгкого пара!', 'other', 90);