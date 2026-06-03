ALTER TABLE orders ADD COLUMN IF NOT EXISTS yookassa_payment_id VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_url TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP;
CREATE INDEX IF NOT EXISTS idx_orders_yookassa_payment_id ON orders(yookassa_payment_id);
