UPDATE t_p99966623_warm_meetings_experi.master_bookings
SET status = 'canceled',
    canceled_at = CURRENT_TIMESTAMP,
    cancel_reason = 'Тестовая запись без привязки к слоту (очистка)',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 30
  AND client_name = 'Тест 12.00-15.45'
  AND status = 'pending';