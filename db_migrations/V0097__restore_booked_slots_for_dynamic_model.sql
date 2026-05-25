-- Переход на модель «вычисление на лету»:
-- master_slots больше не режутся при бронированиях, их статус 'booked' — реликт старой логики.
-- Возвращаем все ранее «закрытые» слоты в available и пересчитываем счётчики.

-- 1. Возвращаем все booked слоты обратно в available
UPDATE t_p99966623_warm_meetings_experi.master_slots
SET status = 'available',
    updated_at = CURRENT_TIMESTAMP
WHERE status = 'booked';

-- 2. Помечаем split-слоты как blocked, чтобы они не отображались гостям
-- (split — артефакты старой модели разрезания, физически удалить нельзя)
UPDATE t_p99966623_warm_meetings_experi.master_slots
SET status = 'blocked',
    notes = COALESCE(notes, '') || ' [legacy split slot]',
    updated_at = CURRENT_TIMESTAMP
WHERE source = 'split';

-- 3. Пересчитываем booked_count из активных броней (pending + confirmed)
UPDATE t_p99966623_warm_meetings_experi.master_slots s
SET booked_count = COALESCE((
    SELECT COUNT(*)
    FROM t_p99966623_warm_meetings_experi.master_bookings b
    WHERE b.slot_id = s.id
      AND b.status IN ('pending', 'confirmed')
), 0);
