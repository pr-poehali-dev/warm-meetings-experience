UPDATE notification_templates SET recipient_roles = '["master"]' WHERE event_type = 'master_booking_new';
UPDATE notification_templates SET recipient_roles = '["organizer","partner"]' WHERE event_type = 'event_signup_new';
