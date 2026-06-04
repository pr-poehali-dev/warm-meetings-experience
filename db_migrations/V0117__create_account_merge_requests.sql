-- Таблица запросов на объединение аккаунтов
-- source_user_id  — дубликат (который будет деактивирован, данные перенесены)
-- target_user_id  — основной (к которому присоединяем)
-- triggered_by    — 'vk_login' (авто-обнаружение при входе VK) | 'admin' (инициировано из админки)
-- status          — pending_email (ждём подтверждения кодом) | confirmed | cancelled | completed
-- confirm_code_hash — SHA-256 кода из письма (6 цифр, TTL 15 мин)
-- confirmed_at / completed_at / cancelled_at — временные метки

CREATE TABLE IF NOT EXISTS t_p99966623_warm_meetings_experi.account_merge_requests (
    id                  SERIAL PRIMARY KEY,
    source_user_id      INTEGER NOT NULL REFERENCES t_p99966623_warm_meetings_experi.users(id),
    target_user_id      INTEGER NOT NULL REFERENCES t_p99966623_warm_meetings_experi.users(id),
    triggered_by        VARCHAR(20)  NOT NULL DEFAULT 'vk_login',
    status              VARCHAR(30)  NOT NULL DEFAULT 'pending_email',
    confirm_code_hash   VARCHAR(64),
    confirm_email       VARCHAR(255),
    ip_address          VARCHAR(64),
    admin_user_id       INTEGER REFERENCES t_p99966623_warm_meetings_experi.users(id),
    merge_summary       JSONB,
    confirmed_at        TIMESTAMP,
    completed_at        TIMESTAMP,
    cancelled_at        TIMESTAMP,
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_different_users CHECK (source_user_id <> target_user_id)
);

CREATE INDEX IF NOT EXISTS idx_merge_req_source  ON t_p99966623_warm_meetings_experi.account_merge_requests (source_user_id);
CREATE INDEX IF NOT EXISTS idx_merge_req_target  ON t_p99966623_warm_meetings_experi.account_merge_requests (target_user_id);
CREATE INDEX IF NOT EXISTS idx_merge_req_status  ON t_p99966623_warm_meetings_experi.account_merge_requests (status);
