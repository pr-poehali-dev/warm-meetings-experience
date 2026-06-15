-- Идентичность signup для orphan-клиента, чтобы карточка резолвилась
INSERT INTO crm_client_identities (owner_id, client_id, identity_type, identity_value)
SELECT 2, c.id, 'signup', '26'
FROM crm_clients c
WHERE c.owner_id = 2 AND c.name = 'Сергей Гостев'
ON CONFLICT (owner_id, identity_type, identity_value) DO NOTHING;
