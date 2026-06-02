-- Приватные одобренные события должны быть видимы (is_visible = true)
UPDATE t_p99966623_warm_meetings_experi.events
SET is_visible = true
WHERE status = 'private' AND is_visible = false;