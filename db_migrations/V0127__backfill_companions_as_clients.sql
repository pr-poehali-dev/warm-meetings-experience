-- Backfill спутников (доп. гостей) как canonical-клиентов, owner = 1

-- Спутник signup 25: "Гость 2", телефон +7(956)256-36-52 -> phone 9562563652
INSERT INTO crm_clients (owner_id, name, phone, phone_norm)
SELECT 1, 'Гость 2', '+7(956)256-36-52', '9562563652'
WHERE NOT EXISTS (
  SELECT 1 FROM crm_client_identities
  WHERE owner_id = 1 AND identity_type = 'phone' AND identity_value = '9562563652'
);

INSERT INTO crm_client_identities (owner_id, client_id, identity_type, identity_value)
SELECT 1, c.id, 'phone', '9562563652'
FROM crm_clients c
WHERE c.owner_id = 1 AND c.phone_norm = '9562563652'
ON CONFLICT (owner_id, identity_type, identity_value) DO NOTHING;

-- Спутник signup 27: "Гость 2" без телефона -> companion:27:0
INSERT INTO crm_clients (owner_id, name)
SELECT 1, 'Гость 2'
WHERE NOT EXISTS (
  SELECT 1 FROM crm_client_identities
  WHERE owner_id = 1 AND identity_type = 'companion' AND identity_value = '27:0'
);

INSERT INTO crm_client_identities (owner_id, client_id, identity_type, identity_value)
SELECT 1, c.id, 'companion', '27:0'
FROM crm_clients c
WHERE c.owner_id = 1 AND c.name = 'Гость 2' AND c.phone_norm IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM crm_client_identities i2
    WHERE i2.owner_id = 1 AND i2.identity_type = 'companion' AND i2.identity_value = '27:0'
  )
ON CONFLICT (owner_id, identity_type, identity_value) DO NOTHING;
