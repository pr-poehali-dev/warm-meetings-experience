-- Backfill step 2: canonical clients из event_signups без user_id, но с телефоном.
-- Группируем по нормализованному телефону в рамках владельца.
INSERT INTO crm_clients (owner_id, name, phone, phone_norm, email, email_norm, telegram)
SELECT DISTINCT ON (e.organizer_id, RIGHT(REGEXP_REPLACE(s.phone,'[^0-9]','','g'),10))
       e.organizer_id, COALESCE(s.name,''), s.phone,
       RIGHT(REGEXP_REPLACE(s.phone,'[^0-9]','','g'),10),
       s.email, NULLIF(LOWER(TRIM(COALESCE(s.email,''))),''),
       s.telegram
FROM event_signups s
JOIN events e ON e.id = s.event_id
WHERE s.user_id IS NULL
  AND e.organizer_id IS NOT NULL
  AND s.phone IS NOT NULL
  AND RIGHT(REGEXP_REPLACE(s.phone,'[^0-9]','','g'),10) <> ''
  AND LENGTH(REGEXP_REPLACE(s.phone,'[^0-9]','','g')) >= 10
  AND NOT EXISTS (
      SELECT 1 FROM crm_client_identities i
      WHERE i.owner_id = e.organizer_id AND i.identity_type = 'phone'
        AND i.identity_value = RIGHT(REGEXP_REPLACE(s.phone,'[^0-9]','','g'),10)
  )
ORDER BY e.organizer_id, RIGHT(REGEXP_REPLACE(s.phone,'[^0-9]','','g'),10), s.id;

INSERT INTO crm_client_identities (owner_id, client_id, identity_type, identity_value)
SELECT c.owner_id, c.id, 'phone', c.phone_norm
FROM crm_clients c
WHERE c.phone_norm IS NOT NULL AND c.phone_norm <> ''
ON CONFLICT (owner_id, identity_type, identity_value) DO NOTHING;
