UPDATE t_p99966623_warm_meetings_experi.users
SET notify_vk = TRUE, vk_notify_allowed = TRUE
WHERE vk_id IS NOT NULL AND notify_vk = FALSE;