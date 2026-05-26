-- Добавляем поля для фиксации согласия клиента с противопоказаниями
ALTER TABLE master_bookings
  ADD COLUMN IF NOT EXISTS contraindications_accepted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS contraindications_accepted_at TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS contraindications_accepted_ip VARCHAR(64) NULL,
  ADD COLUMN IF NOT EXISTS contraindications_snapshot TEXT NULL;

COMMENT ON COLUMN master_bookings.contraindications_accepted IS 'Клиент подтвердил, что ознакомился с противопоказаниями';
COMMENT ON COLUMN master_bookings.contraindications_accepted_at IS 'Время подтверждения согласия';
COMMENT ON COLUMN master_bookings.contraindications_accepted_ip IS 'IP клиента в момент согласия (юр. фиксация)';
COMMENT ON COLUMN master_bookings.contraindications_snapshot IS 'Текст противопоказаний, с которым согласился клиент';
