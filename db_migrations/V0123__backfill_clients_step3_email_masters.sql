-- Backfill step 3a: event_signups только с email (без user_id и телефона)
INSERT INTO crm_clients (owner_id, name, email, email_norm, telegram)
SELECT DISTINCT ON (e.organizer_id, LOWER(TRIM(s.email)))
       e.organizer_id, COALESCE(s.name,''), s.email, LOWER(TRIM(s.email)), s.telegram
FROM event_signups s
JOIN events e ON e.id = s.event_id
WHERE s.user_id IS NULL
  AND e.organizer_id IS NOT NULL
  AND (s.phone IS NULL OR LENGTH(REGEXP_REPLACE(COALESCE(s.phone,''),'[^0-9]','','g')) < 10)
  AND s.email IS NOT NULL AND TRIM(s.email) <> ''
  AND NOT EXISTS (
      SELECT 1 FROM crm_client_identities i
      WHERE i.owner_id = e.organizer_id AND i.identity_type = 'email'
        AND i.identity_value = LOWER(TRIM(s.email))
  )
ORDER BY e.organizer_id, LOWER(TRIM(s.email)), s.id;

-- Backfill step 3b: master_bookings по client_id (user) — owner = masters.user_id
INSERT INTO crm_clients (owner_id, name, phone, phone_norm, email, email_norm, user_id)
SELECT DISTINCT ON (m.user_id, mb.client_id)
       m.user_id, COALESCE(mb.client_name,''), mb.client_phone,
       NULLIF(RIGHT(REGEXP_REPLACE(COALESCE(mb.client_phone,''),'[^0-9]','','g'),10),''),
       mb.client_email, NULLIF(LOWER(TRIM(COALESCE(mb.client_email,''))),''),
       mb.client_id
FROM master_bookings mb
JOIN masters m ON m.id = mb.master_id
WHERE mb.client_id IS NOT NULL
  AND m.user_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM crm_client_identities i
      WHERE i.owner_id = m.user_id AND i.identity_type = 'user'
        AND i.identity_value = mb.client_id::text
  )
ORDER BY m.user_id, mb.client_id, mb.id;

-- Backfill step 3c: master_bookings без client_id, но с телефоном
INSERT INTO crm_clients (owner_id, name, phone, phone_norm, email, email_norm)
SELECT DISTINCT ON (m.user_id, RIGHT(REGEXP_REPLACE(mb.client_phone,'[^0-9]','','g'),10))
       m.user_id, COALESCE(mb.client_name,''), mb.client_phone,
       RIGHT(REGEXP_REPLACE(mb.client_phone,'[^0-9]','','g'),10),
       mb.client_email, NULLIF(LOWER(TRIM(COALESCE(mb.client_email,''))),'')
FROM master_bookings mb
JOIN masters m ON m.id = mb.master_id
WHERE mb.client_id IS NULL
  AND m.user_id IS NOT NULL
  AND mb.client_phone IS NOT NULL
  AND LENGTH(REGEXP_REPLACE(mb.client_phone,'[^0-9]','','g')) >= 10
  AND NOT EXISTS (
      SELECT 1 FROM crm_client_identities i
      WHERE i.owner_id = m.user_id AND i.identity_type = 'phone'
        AND i.identity_value = RIGHT(REGEXP_REPLACE(mb.client_phone,'[^0-9]','','g'),10)
  )
ORDER BY m.user_id, RIGHT(REGEXP_REPLACE(mb.client_phone,'[^0-9]','','g'),10), mb.id;

-- Дозаполняем идентичности для всех новых клиентов
INSERT INTO crm_client_identities (owner_id, client_id, identity_type, identity_value)
SELECT c.owner_id, c.id, 'user', c.user_id::text
FROM crm_clients c WHERE c.user_id IS NOT NULL
ON CONFLICT (owner_id, identity_type, identity_value) DO NOTHING;

INSERT INTO crm_client_identities (owner_id, client_id, identity_type, identity_value)
SELECT c.owner_id, c.id, 'phone', c.phone_norm
FROM crm_clients c WHERE c.phone_norm IS NOT NULL AND c.phone_norm <> ''
ON CONFLICT (owner_id, identity_type, identity_value) DO NOTHING;

INSERT INTO crm_client_identities (owner_id, client_id, identity_type, identity_value)
SELECT c.owner_id, c.id, 'email', c.email_norm
FROM crm_clients c WHERE c.email_norm IS NOT NULL AND c.email_norm <> ''
ON CONFLICT (owner_id, identity_type, identity_value) DO NOTHING;
