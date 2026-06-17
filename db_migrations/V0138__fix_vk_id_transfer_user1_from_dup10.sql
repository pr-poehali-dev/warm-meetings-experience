-- Перенос vk_id с деактивированного дубля #10 на основной аккаунт #1 (Дмитрий Чикин)
UPDATE t_p99966623_warm_meetings_experi.users
SET vk_id = '288600750', updated_at = NOW()
WHERE id = 1;

UPDATE t_p99966623_warm_meetings_experi.users
SET vk_id = NULL, updated_at = NOW()
WHERE id = 10;