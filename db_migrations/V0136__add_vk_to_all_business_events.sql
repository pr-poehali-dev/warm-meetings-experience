UPDATE notification_templates
SET default_channels = '["telegram","email","vk"]'
WHERE event_type IN ('booking_reschedule_requested','booking_confirmation_expired','review_new','booking_paid','booking_rescheduled')
AND audience = 'business';
