-- Убираем дублирующий телефон у более старого аккаунта
UPDATE t_p99966623_warm_meetings_experi.users
  SET phone = NULL WHERE id = 1;

-- Добавляем уникальность телефона
ALTER TABLE t_p99966623_warm_meetings_experi.users
  ADD CONSTRAINT users_phone_unique UNIQUE (phone);