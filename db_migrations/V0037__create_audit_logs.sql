CREATE TABLE t_p99966623_warm_meetings_experi.audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER,
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100),
    resource_id INTEGER,
    ip_address VARCHAR(45),
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_user_id ON t_p99966623_warm_meetings_experi.audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON t_p99966623_warm_meetings_experi.audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON t_p99966623_warm_meetings_experi.audit_logs(created_at);
