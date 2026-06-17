-- Добавляем поле recipient_roles в notification_templates
-- Роли: master, organizer, partner, client, admin
ALTER TABLE notification_templates
    ADD COLUMN IF NOT EXISTS recipient_roles JSONB NOT NULL DEFAULT '["master","organizer","partner"]';

-- Проставляем роли для каждого типа события согласно ТЗ
UPDATE notification_templates SET recipient_roles = '["master","organizer","partner"]'
WHERE event_type IN ('master_booking_new', 'event_signup_new', 'booking_cancelled');

UPDATE notification_templates SET recipient_roles = '["master","organizer"]'
WHERE event_type IN (
    'booking_confirmed',
    'booking_reminder',
    'booking_rescheduled',
    'booking_paid',
    'review_new',
    'booking_confirmation_expired',
    'booking_reschedule_requested'
);
