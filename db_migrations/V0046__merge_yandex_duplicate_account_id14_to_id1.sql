-- Привязываем yandex_id от дублирующего аккаунта id=14 к основному аккаунту id=1
UPDATE users SET yandex_id = '252912878' WHERE id = 1;

-- Деактивируем дублирующий аккаунт id=14 (email с заглавной буквой, создан через Яндекс)
UPDATE users SET is_active = false WHERE id = 14;

-- Инвалидируем сессии дублирующего аккаунта
UPDATE user_sessions SET expires_at = CURRENT_TIMESTAMP WHERE user_id = 14;