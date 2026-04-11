UPDATE t_p99966623_warm_meetings_experi.users
SET vk_id = NULL, updated_at = CURRENT_TIMESTAMP
WHERE id = 10;

UPDATE t_p99966623_warm_meetings_experi.users
SET vk_id = '288600750', email_verified = TRUE, updated_at = CURRENT_TIMESTAMP
WHERE id = 1;
