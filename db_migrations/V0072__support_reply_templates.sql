CREATE TABLE IF NOT EXISTS support_reply_templates (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO support_reply_templates (title, body, sort_order) VALUES
('Приветствие', 'Здравствуйте! Спасибо, что написали в банный клуб. Уже разбираемся с вашим вопросом и скоро вернёмся с ответом.', 10),
('Запрос деталей', 'Спасибо за обращение. Чтобы помочь точнее, подскажите, пожалуйста: на какой странице возникла проблема, в каком браузере и какое сообщение появляется?', 20),
('Решено', 'Готово! Если вопрос ещё актуален — напишите, пожалуйста, в этом же обращении. Хорошего пара!', 30),
('Передано в работу', 'Передали ваш вопрос профильному специалисту. Ответим в течение 24 часов.', 40);
