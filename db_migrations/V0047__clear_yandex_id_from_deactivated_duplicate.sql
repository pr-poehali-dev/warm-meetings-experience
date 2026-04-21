-- Убираем yandex_id с деактивированного дублирующего аккаунта,
-- чтобы поиск по yandex_id находил только активный аккаунт id=1
UPDATE users SET yandex_id = NULL WHERE id = 14;