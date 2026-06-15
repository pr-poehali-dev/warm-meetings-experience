-- Backfill step 1: canonical clients из event_signups по user_id (owner = организатор)
INSERT INTO crm_clients (owner_id, name, phone, phone_norm, email, email_norm, telegram, user_id)
SELECT DISTINCT ON (e.organizer_id, s.user_id)
       e.organizer_id, COALESCE(s.name,''), s.phone,
       NULLIF(RIGHT(REGEXP_REPLACE(COALESCE(s.phone,''),'[^0-9]','','g'),10),''),
       s.email, NULLIF(LOWER(TRIM(COALESCE(s.email,''))),''),
       s.telegram, s.user_id
FROM event_signups s
JOIN events e ON e.id = s.event_id
WHERE s.user_id IS NOT NULL
  AND e.organizer_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM crm_client_identities i
      WHERE i.owner_id = e.organizer_id AND i.identity_type = 'user'
        AND i.identity_value = s.user_id::text
  )
ORDER BY e.organizer_id, s.user_id, s.id;

INSERT INTO crm_client_identities (owner_id, client_id, identity_type, identity_value)
SELECT c.owner_id, c.id, 'user', c.user_id::text
FROM crm_clients c
WHERE c.user_id IS NOT NULL
ON CONFLICT (owner_id, identity_type, identity_value) DO NOTHING;
