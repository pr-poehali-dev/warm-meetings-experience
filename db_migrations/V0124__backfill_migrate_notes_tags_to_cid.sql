-- Перевод заметок на canonical cid: по идентичностям
UPDATE crm_notes n
SET client_key = 'cid:' || i.client_id
FROM crm_client_identities i
WHERE n.owner_id = i.owner_id
  AND n.client_key = (i.identity_type || ':' || i.identity_value)
  AND n.client_key NOT LIKE 'cid:%';

-- Перевод тегов на canonical cid: (с защитой от конфликта уникальности)
UPDATE crm_guest_tags gt
SET client_key = 'cid:' || i.client_id
FROM crm_client_identities i
WHERE gt.owner_id = i.owner_id
  AND gt.client_key = (i.identity_type || ':' || i.identity_value)
  AND gt.client_key NOT LIKE 'cid:%'
  AND NOT EXISTS (
      SELECT 1 FROM crm_guest_tags x
      WHERE x.owner_id = gt.owner_id AND x.tag_id = gt.tag_id
        AND x.client_key = 'cid:' || i.client_id
  );
