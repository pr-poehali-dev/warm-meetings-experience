-- Клиент для гостя без контактов (Сергей Гостев, signup:26, owner 2)
INSERT INTO crm_clients (owner_id, name)
SELECT 2, 'Сергей Гостев'
WHERE NOT EXISTS (
  SELECT 1 FROM crm_clients WHERE owner_id = 2 AND name = 'Сергей Гостев'
);

-- Привязываем заметку signup:26 к этому клиенту
UPDATE crm_notes n
SET client_key = 'cid:' || c.id
FROM crm_clients c
WHERE n.id = 3 AND c.owner_id = 2 AND c.name = 'Сергей Гостев'
  AND n.client_key = 'signup:26';
