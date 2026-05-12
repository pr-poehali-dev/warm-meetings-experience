-- Расширение events для режима «вскладчину» (crowdfund)
ALTER TABLE t_p99966623_warm_meetings_experi.events
    ADD COLUMN IF NOT EXISTS pricing_mode VARCHAR(20) NOT NULL DEFAULT 'fixed',
    ADD COLUMN IF NOT EXISTS cf_target_amount INTEGER,
    ADD COLUMN IF NOT EXISTS cf_min_participants INTEGER,
    ADD COLUMN IF NOT EXISTS cf_max_participants INTEGER,
    ADD COLUMN IF NOT EXISTS cf_club_fee INTEGER DEFAULT 500,
    ADD COLUMN IF NOT EXISTS cf_fee_mode VARCHAR(20) DEFAULT 'fixed',
    ADD COLUMN IF NOT EXISTS cf_fee_percent NUMERIC(5,2) DEFAULT 20.00,
    ADD COLUMN IF NOT EXISTS cf_commission_percent NUMERIC(5,2) DEFAULT 15.00,
    ADD COLUMN IF NOT EXISTS cf_freeze_hours INTEGER DEFAULT 48,
    ADD COLUMN IF NOT EXISTS cf_status VARCHAR(20) DEFAULT 'collecting',
    ADD COLUMN IF NOT EXISTS cf_final_price INTEGER,
    ADD COLUMN IF NOT EXISTS cf_frozen_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS cf_extra_costs INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS cf_topup_deadline_hours INTEGER DEFAULT 24;

COMMENT ON COLUMN t_p99966623_warm_meetings_experi.events.pricing_mode IS 'fixed | crowdfund';
COMMENT ON COLUMN t_p99966623_warm_meetings_experi.events.cf_fee_mode IS 'fixed | percent (от макс. цены, округление вверх до 50₽)';
COMMENT ON COLUMN t_p99966623_warm_meetings_experi.events.cf_status IS 'collecting | confirmed | cancelled';

-- Расширение event_signups
ALTER TABLE t_p99966623_warm_meetings_experi.event_signups
    ADD COLUMN IF NOT EXISTS joined_after_freeze BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS club_fee_paid INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS club_fee_paid_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS final_price_due INTEGER,
    ADD COLUMN IF NOT EXISTS topup_amount INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS topup_paid_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS topup_method VARCHAR(20),
    ADD COLUMN IF NOT EXISTS cf_overpayment_bonus INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_events_cf_status_date
    ON t_p99966623_warm_meetings_experi.events(cf_status, event_date)
    WHERE pricing_mode = 'crowdfund';
