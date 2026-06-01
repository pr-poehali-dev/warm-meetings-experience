-- Обращения гостей к мастеру без брони («задать вопрос мастеру»).
-- Переписка ведётся в client_messages с source_type='master_inquiry', source_id=master_inquiries.id
CREATE TABLE IF NOT EXISTS master_inquiries (
    id SERIAL PRIMARY KEY,
    master_id INTEGER NOT NULL REFERENCES masters(id),
    guest_name VARCHAR(200) NOT NULL,
    guest_contact VARCHAR(200) NOT NULL,
    contact_type VARCHAR(20) NOT NULL DEFAULT 'email',
    reply_token VARCHAR(40) NOT NULL DEFAULT md5(random()::text || clock_timestamp()::text),
    status VARCHAR(20) NOT NULL DEFAULT 'new',
    ip_address VARCHAR(64),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_master_inquiries_reply_token
    ON master_inquiries(reply_token);

CREATE INDEX IF NOT EXISTS idx_master_inquiries_master
    ON master_inquiries(master_id, created_at DESC);