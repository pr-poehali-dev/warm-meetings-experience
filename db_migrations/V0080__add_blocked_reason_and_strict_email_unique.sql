-- Добавляем различение причины блокировки:
--   blocked_reason NULL      — аккаунт активен или дубликат-мусор
--   blocked_reason 'banned'  — заблокирован за нарушение (повторная регистрация запрещена)
--   blocked_reason 'duplicate' — технический дубликат (повторная регистрация разрешена)

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS blocked_reason VARCHAR(50) DEFAULT NULL;

-- Помечаем наш конкретный дубликат-мусор id=14
UPDATE users SET blocked_reason = 'duplicate' WHERE id = 14;

-- Убираем старый индекс (он разрешал любым заблокированным регистрироваться снова)
DROP INDEX IF EXISTS users_email_lower_active_unique_idx;

-- Новый индекс: блокирует email если аккаунт АКТИВЕН
-- или заблокирован за нарушение ('banned').
-- Технические дубликаты ('duplicate') из индекса исключены.
CREATE UNIQUE INDEX users_email_lower_strict_unique_idx
    ON users (LOWER(email))
    WHERE is_active = true OR blocked_reason = 'banned';