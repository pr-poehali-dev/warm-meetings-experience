-- Заменить заблокированный дубль (id=14) на основной аккаунт (id=1) в соорганизаторах
UPDATE t_p99966623_warm_meetings_experi.event_co_organizers
SET user_id = 1
WHERE user_id = 14;