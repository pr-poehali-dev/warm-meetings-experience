-- P0 индексы для устранения seq_scan по горячим таблицам
-- Все индексы IF NOT EXISTS для идемпотентности

-- 1. tg_linked_accounts: 98.9% seq_scan, поиск по user_id (для COALESCE с telegram_user_id)
CREATE INDEX IF NOT EXISTS idx_tg_linked_accounts_user_id
    ON tg_linked_accounts (user_id, linked_at DESC);

-- 2. event_pricing_tiers: 100% seq_scan, всегда читают по event_id с сортировкой
CREATE INDEX IF NOT EXISTS idx_event_pricing_tiers_event
    ON event_pricing_tiers (event_id, sort_order);

-- 3. support_tickets: 92.8% seq_scan
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned
    ON support_tickets (assigned_to)
    WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_support_tickets_status_created
    ON support_tickets (status, created_at DESC);

-- 4. event_questions: 94.2% seq_scan; есть индексы по event_id, organizer_id отдельно,
--    но нужны составные для частых сценариев — список вопросов с фильтром по статусу
CREATE INDEX IF NOT EXISTS idx_event_questions_event_status
    ON event_questions (event_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_questions_organizer_status
    ON event_questions (organizer_id, status, created_at DESC);

-- Дополнительно: master_services и event_pricing_tiers по списку для конкретного мастера/события
CREATE INDEX IF NOT EXISTS idx_master_services_master
    ON master_services (master_id, is_active);

-- Чистим dead tuples фоновой VACUUM (запускается автоматически, но даём подсказку планировщику)
ANALYZE tg_linked_accounts;
ANALYZE event_pricing_tiers;
ANALYZE support_tickets;
ANALYZE event_questions;
ANALYZE master_services;
