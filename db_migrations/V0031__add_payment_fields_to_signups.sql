ALTER TABLE event_signups
  ADD COLUMN IF NOT EXISTS payment_type VARCHAR(20) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS payment_amount INTEGER DEFAULT 0;

COMMENT ON COLUMN event_signups.payment_type IS 'Тип оплаты: prepaid (предоплата), full (полная), custom (индивидуальная)';
COMMENT ON COLUMN event_signups.payment_amount IS 'Сумма оплаты в рублях';