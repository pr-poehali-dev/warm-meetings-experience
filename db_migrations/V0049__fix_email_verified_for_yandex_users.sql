UPDATE t_p99966623_warm_meetings_experi.users
SET email_verified = TRUE
WHERE yandex_id IS NOT NULL AND email_verified = FALSE;