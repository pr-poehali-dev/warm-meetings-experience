-- Создаём role_applications для существующих заявок организаторов из organizer_requests,
-- у которых ещё нет соответствующей записи в role_applications
INSERT INTO role_applications (user_id, role_id, status, message, created_at)
SELECT u.id, 4, 'pending',
       'Город: ' || COALESCE(orq.city, '—') || E'\n' ||
       'Своя баня: ' || CASE orq.has_own_bath WHEN 'yes' THEN 'Да' WHEN 'no' THEN 'Нет' WHEN 'in_progress' THEN 'В процессе' ELSE COALESCE(orq.has_own_bath, '—') END || E'\n' ||
       'Формат: ' || COALESCE(NULLIF(orq.event_format, ''), '—') || E'\n' ||
       'Доп. инфо: ' || COALESCE(NULLIF(orq.additional_info, ''), '—'),
       orq.created_at
FROM organizer_requests orq
JOIN users u ON LOWER(u.email) = LOWER(orq.email)
WHERE NOT EXISTS (
    SELECT 1 FROM role_applications ra
    WHERE ra.user_id = u.id AND ra.role_id = 4
);
