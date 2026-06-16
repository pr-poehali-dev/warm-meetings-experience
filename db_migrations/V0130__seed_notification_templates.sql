-- Базовые шаблоны Notification Hub

INSERT INTO notification_templates (event_type, name, description, category, variables, bodies, default_channels)
VALUES
(
  'master_booking_new',
  'Новая запись к мастеру',
  'Уведомление мастеру о новой брони на сеанс',
  'booking',
  '["service_name","date","time","price","client_name","client_phone","status"]'::jsonb,
  '{
    "telegram": {"text": "🎫 <b>Новая запись на сеанс</b>\n\n📌 {service_name}\n📅 {date} {time}\n💰 {price} ₽\n\n👤 <b>{client_name}</b>\n📞 {client_phone}\n\n<i>Статус: {status}</i>"},
    "email": {"subject": "Новая запись: {client_name} на {date}", "html": "<h2>Новая запись на сеанс</h2><p><b>{service_name}</b></p><p>📅 {date} {time}<br>💰 {price} ₽</p><p>👤 {client_name}<br>📞 {client_phone}</p><p><i>Статус: {status}</i></p>"},
    "vk": {"text": "🎫 Новая запись на сеанс\n\n📌 {service_name}\n📅 {date} {time}\n💰 {price} ₽\n\n👤 {client_name}\n📞 {client_phone}\n\nСтатус: {status}"}
  }'::jsonb,
  '["telegram","email","vk"]'::jsonb
),
(
  'event_signup_new',
  'Новая запись на событие',
  'Уведомление организатору о новой записи гостя на событие',
  'booking',
  '["event_name","date","time","guest_name","guest_phone","spots_left"]'::jsonb,
  '{
    "telegram": {"text": "🔥 <b>Новая запись на событие</b>\n\n📌 {event_name}\n📅 {date} в {time}\n\n👤 <b>{guest_name}</b>\n📞 {guest_phone}\n\n<i>Осталось мест: {spots_left}</i>"},
    "email": {"subject": "Новая запись на «{event_name}»", "html": "<h2>Новая запись на событие</h2><p><b>{event_name}</b></p><p>📅 {date} в {time}</p><p>👤 {guest_name}<br>📞 {guest_phone}</p><p><i>Осталось мест: {spots_left}</i></p>"}
  }'::jsonb,
  '["telegram","email"]'::jsonb
),
(
  'booking_confirmed',
  'Подтверждение записи (гостю)',
  'Уведомление гостю о подтверждении его записи',
  'booking',
  '["guest_name","event_name","date","time","address"]'::jsonb,
  '{
    "telegram": {"text": "✅ <b>Запись подтверждена</b>\n\nЗдравствуйте, {guest_name}!\nВаша запись на <b>{event_name}</b> подтверждена.\n\n📅 {date} в {time}\n📍 {address}"},
    "email": {"subject": "Запись на «{event_name}» подтверждена", "html": "<h2>Запись подтверждена</h2><p>Здравствуйте, {guest_name}!</p><p>Ваша запись на <b>{event_name}</b> подтверждена.</p><p>📅 {date} в {time}<br>📍 {address}</p>"},
    "vk": {"text": "✅ Запись подтверждена\n\nЗдравствуйте, {guest_name}!\nВаша запись на {event_name} подтверждена.\n\n📅 {date} в {time}\n📍 {address}"}
  }'::jsonb,
  '["telegram","email","vk"]'::jsonb
),
(
  'booking_reminder',
  'Напоминание о записи',
  'Напоминание гостю перед событием',
  'reminder',
  '["guest_name","event_name","date","time","address"]'::jsonb,
  '{
    "telegram": {"text": "⏰ <b>Напоминание</b>\n\n{guest_name}, напоминаем о записи на <b>{event_name}</b>.\n\n📅 {date} в {time}\n📍 {address}"},
    "email": {"subject": "Напоминание: «{event_name}» {date}", "html": "<h2>Напоминание о записи</h2><p>{guest_name}, напоминаем о записи на <b>{event_name}</b>.</p><p>📅 {date} в {time}<br>📍 {address}</p>"},
    "vk": {"text": "⏰ Напоминание\n\n{guest_name}, напоминаем о записи на {event_name}.\n\n📅 {date} в {time}\n📍 {address}"}
  }'::jsonb,
  '["telegram","email","vk"]'::jsonb
)
ON CONFLICT (event_type) DO NOTHING;
