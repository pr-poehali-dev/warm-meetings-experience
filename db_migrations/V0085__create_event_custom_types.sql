CREATE TABLE event_custom_types (
  id SERIAL PRIMARY KEY,
  value VARCHAR(100) NOT NULL UNIQUE,
  label VARCHAR(100) NOT NULL,
  icon VARCHAR(50) NOT NULL DEFAULT 'Circle',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO event_custom_types (value, label, icon, sort_order) VALUES
  ('знакомство', 'Знакомство', 'Users', 1),
  ('свидание', 'Свидание', 'Heart', 2),
  ('обучение', 'Обучение', 'GraduationCap', 3),
  ('встреча', 'Встреча', 'Coffee', 4),
  ('вечеринка', 'Вечеринка', 'PartyPopper', 5),
  ('спорт', 'Спорт', 'Dumbbell', 6),
  ('другое', 'Другое', 'Circle', 7);
