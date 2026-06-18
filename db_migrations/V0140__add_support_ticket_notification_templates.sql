INSERT INTO t_p99966623_warm_meetings_experi.notification_templates
  (event_type, name, description, category, variables, bodies, default_channels, is_active, owner_editable, is_urgent, audience, recipient_roles)
VALUES
(
  'support_ticket_new',
  'Новое обращение в поддержку',
  'Клиент создал тикет — уведомление администратору',
  'support',
  '["ticket_id","subject","name","email","category","priority","message"]',
  '{
    "telegram": {
      "text": "🛟 <b>Новое обращение #{ticket_id}</b>\n<b>Тема:</b> {subject}\n<b>От:</b> {name} ({email})\n<b>Категория:</b> {category} · <b>Приоритет:</b> {priority}\n\n{message}"
    }
  }',
  '["telegram"]',
  true, false, true, 'admin', '["admin"]'
),
(
  'support_ticket_user_reply',
  'Ответ пользователя в тикете',
  'Пользователь написал сообщение в тикет — уведомление администратору',
  'support',
  '["ticket_id","subject","name","email"]',
  '{
    "telegram": {
      "text": "💬 <b>Новый ответ в обращении #{ticket_id}</b>\n<b>Тема:</b> {subject}\n<b>От:</b> {name} ({email})"
    }
  }',
  '["telegram"]',
  true, false, true, 'admin', '["admin"]'
)
ON CONFLICT DO NOTHING;