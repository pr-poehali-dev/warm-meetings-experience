-- Fix event id=41: застряло в статусе published+is_visible=false из-за таймаута при одобрении
UPDATE t_p99966623_warm_meetings_experi.events
SET is_visible = true,
    has_pending_changes = false,
    pending_changed_fields = NULL,
    last_moderated_at = CURRENT_TIMESTAMP
WHERE id = 41
  AND status = 'published'
  AND is_visible = false;