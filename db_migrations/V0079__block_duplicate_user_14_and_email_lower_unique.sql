-- Блокируем дубликат-аккаунт id=14 (Dschikin@yandex.ru с заглавной D)
-- и защищаемся от появления подобных дубликатов в будущем.

-- 1. Блокируем аккаунт. После этого get_user_from_token его не пропустит
--    (там стоит фильтр u.is_active = true). Email "сдвигаем", чтобы он
--    не мешал восстановлению/созданию нормального аккаунта.
UPDATE users
SET is_active = false,
    email = email || '.blocked.dup14',
    updated_at = NOW()
WHERE id = 14 AND is_active = true;

-- 2. Гасим срок жизни всех сессий этого пользователя.
UPDATE user_sessions
SET expires_at = NOW() - INTERVAL '1 second'
WHERE user_id = 14;

-- 3. Уникальный индекс по LOWER(email) только для активных пользователей.
--    Заблокированные дубли не мешают создавать новые активные аккаунты,
--    но два активных аккаунта с одинаковым email (в любом регистре)
--    создать больше нельзя.
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_active_unique_idx
    ON users (LOWER(email))
    WHERE is_active = true;