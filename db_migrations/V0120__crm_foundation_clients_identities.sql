-- ============================================================
-- CRM Foundation: стабильный клиент (canonical) + идентичности
-- Безопасно: только добавляет новые таблицы и индексы.
-- ============================================================

CREATE TABLE IF NOT EXISTS crm_clients (
    id            BIGSERIAL PRIMARY KEY,
    owner_id      INTEGER NOT NULL,
    name          VARCHAR(255) NOT NULL DEFAULT '',
    phone         VARCHAR(50),
    phone_norm    VARCHAR(20),
    email         VARCHAR(255),
    email_norm    VARCHAR(255),
    telegram      VARCHAR(100),
    vk            VARCHAR(100),
    user_id       INTEGER,
    merged_into   BIGINT,
    created_at    TIMESTAMP NOT NULL DEFAULT now(),
    updated_at    TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_clients_owner       ON crm_clients(owner_id);
CREATE INDEX IF NOT EXISTS idx_crm_clients_owner_phone ON crm_clients(owner_id, phone_norm);
CREATE INDEX IF NOT EXISTS idx_crm_clients_owner_email ON crm_clients(owner_id, email_norm);
CREATE INDEX IF NOT EXISTS idx_crm_clients_owner_user  ON crm_clients(owner_id, user_id);
CREATE INDEX IF NOT EXISTS idx_crm_clients_merged      ON crm_clients(merged_into);

CREATE TABLE IF NOT EXISTS crm_client_identities (
    id            BIGSERIAL PRIMARY KEY,
    owner_id      INTEGER NOT NULL,
    client_id     BIGINT NOT NULL,
    identity_type VARCHAR(10) NOT NULL,
    identity_value VARCHAR(255) NOT NULL,
    created_at    TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE (owner_id, identity_type, identity_value)
);

CREATE INDEX IF NOT EXISTS idx_crm_identities_client ON crm_client_identities(client_id);
CREATE INDEX IF NOT EXISTS idx_crm_identities_lookup ON crm_client_identities(owner_id, identity_type, identity_value);

CREATE INDEX IF NOT EXISTS idx_signups_user  ON event_signups(user_id);
CREATE INDEX IF NOT EXISTS idx_signups_email ON event_signups(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_mbookings_client ON master_bookings(client_id);
