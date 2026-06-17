-- Добавляем новые типы событий уведомлений и обновляем существующие

-- 1. Обновляем существующие: добавляем audience/category/default_channels по ролям
UPDATE notification_templates SET
    name        = 'Новая запись',
    description = 'Клиент забронировал услугу — уведомление мастеру',
    category    = 'booking',
    default_channels = '["telegram","email","vk"]',
    audience    = 'business'
WHERE event_type = 'master_booking_new';

UPDATE notification_templates SET
    name        = 'Новая запись на событие',
    description = 'Гость записался на событие — уведомление организатору/партнёру',
    category    = 'booking',
    default_channels = '["telegram","email","vk"]',
    audience    = 'business'
WHERE event_type = 'event_signup_new';

UPDATE notification_templates SET
    name        = 'Подтверждение записи',
    description = 'Гость подтвердил бронь (при ручном подтверждении) — уведомление мастеру/организатору',
    category    = 'booking',
    default_channels = '["telegram","email","vk"]',
    audience    = 'business'
WHERE event_type = 'booking_confirmed';

UPDATE notification_templates SET
    name        = 'Напоминание о предстоящей записи',
    description = 'За 24 ч и за 1 ч до события — мастеру/организатору',
    category    = 'reminder',
    default_channels = '["telegram","email","vk"]',
    audience    = 'business'
WHERE event_type = 'booking_reminder';

-- 2. Добавляем новые типы событий
INSERT INTO notification_templates
    (event_type, name, description, category, variables, bodies, default_channels, is_active, owner_editable, audience)
VALUES
(
    'booking_cancelled',
    'Отмена записи',
    'Гость отменил бронь — уведомление мастеру/организатору/партнёру',
    'booking',
    '["client_name","service_name","date","time","master_name"]',
    '{
        "telegram": {"text": "❌ Отмена записи\n\nКлиент: {client_name}\nУслуга: {service_name}\nДата: {date} в {time}"},
        "email": {"subject": "Отмена записи — {client_name}", "html": "<p>Клиент <b>{client_name}</b> отменил запись на <b>{service_name}</b> ({date} в {time}).</p>"},
        "vk": {"text": "❌ Отмена записи\nКлиент: {client_name}\nУслуга: {service_name}\nДата: {date} в {time}"}
    }',
    '["telegram","email","vk"]',
    TRUE, TRUE, 'business'
),
(
    'booking_rescheduled',
    'Перенос записи',
    'Гость перенёс запись — уведомление мастеру/организатору',
    'booking',
    '["client_name","service_name","old_date","old_time","new_date","new_time"]',
    '{
        "telegram": {"text": "🔄 Перенос записи\n\nКлиент: {client_name}\nУслуга: {service_name}\nБыло: {old_date} в {old_time}\nСтало: {new_date} в {new_time}"},
        "email": {"subject": "Перенос записи — {client_name}", "html": "<p>Клиент <b>{client_name}</b> перенёс запись на <b>{service_name}</b>.<br>Было: {old_date} в {old_time}<br>Стало: {new_date} в {new_time}</p>"},
        "vk": {"text": "🔄 Перенос записи\nКлиент: {client_name}\nБыло: {old_date} в {old_time}\nСтало: {new_date} в {new_time}"}
    }',
    '["telegram","email"]',
    TRUE, TRUE, 'business'
),
(
    'booking_paid',
    'Оплата получена',
    'Прошла оплата (клубный взнос или полная стоимость) — уведомление мастеру/организатору',
    'payment',
    '["client_name","service_name","amount","date"]',
    '{
        "telegram": {"text": "💰 Оплата получена\n\nКлиент: {client_name}\nУслуга: {service_name}\nСумма: {amount} ₽\nДата: {date}"},
        "email": {"subject": "Оплата от {client_name}", "html": "<p>Клиент <b>{client_name}</b> оплатил <b>{service_name}</b> на сумму <b>{amount} ₽</b>.</p>"},
        "vk": {"text": "💰 Оплата {amount} ₽\nКлиент: {client_name}\nУслуга: {service_name}"}
    }',
    '["telegram","email"]',
    TRUE, TRUE, 'business'
),
(
    'review_new',
    'Новый отзыв',
    'Гость оставил отзыв — уведомление мастеру/организатору',
    'service',
    '["client_name","rating","text","service_name"]',
    '{
        "telegram": {"text": "⭐ Новый отзыв\n\nОт: {client_name}\nОценка: {rating}/5\n{text}"},
        "email": {"subject": "Новый отзыв от {client_name}", "html": "<p>Клиент <b>{client_name}</b> оставил отзыв (оценка {rating}/5):<br><em>{text}</em></p>"},
        "vk": {"text": "⭐ Новый отзыв от {client_name}\nОценка: {rating}/5\n{text}"}
    }',
    '["telegram","email"]',
    TRUE, TRUE, 'business'
),
(
    'booking_confirmation_expired',
    'Истёк срок подтверждения',
    'Гость не подтвердил запись в срок — уведомление организатору/мастеру',
    'booking',
    '["client_name","service_name","date","time"]',
    '{
        "telegram": {"text": "⏰ Истёк срок подтверждения\n\nКлиент: {client_name}\nУслуга: {service_name}\nДата: {date} в {time}\n\nЗапись будет автоматически отменена."},
        "email": {"subject": "Срок подтверждения истёк — {client_name}", "html": "<p>Клиент <b>{client_name}</b> не подтвердил запись на <b>{service_name}</b> ({date} в {time}). Запись будет автоматически отменена.</p>"},
        "vk": {"text": "⏰ Истёк срок подтверждения\nКлиент: {client_name}\nУслуга: {service_name}\nДата: {date} в {time}"}
    }',
    '["telegram","email"]',
    TRUE, FALSE, 'business'
),
(
    'booking_reschedule_requested',
    'Запрос на перенос',
    'Гость запросил перенос записи — уведомление мастеру/организатору',
    'booking',
    '["client_name","service_name","date","time","requested_date","requested_time"]',
    '{
        "telegram": {"text": "📅 Запрос на перенос\n\nКлиент: {client_name}\nУслуга: {service_name}\nТекущая дата: {date} в {time}\nЖелаемая дата: {requested_date} в {requested_time}"},
        "email": {"subject": "Запрос на перенос от {client_name}", "html": "<p>Клиент <b>{client_name}</b> запросил перенос записи на <b>{service_name}</b>.<br>Текущая дата: {date} в {time}<br>Желаемая дата: {requested_date} в {requested_time}</p>"},
        "vk": {"text": "📅 Запрос на перенос\nКлиент: {client_name}\nЖелаемая дата: {requested_date} в {requested_time}"}
    }',
    '["telegram","email"]',
    TRUE, TRUE, 'business'
)
ON CONFLICT (event_type) DO NOTHING;
