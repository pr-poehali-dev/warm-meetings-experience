# Архив: старый календарь мастера

**Заархивировано:** 2026-06-18  
**Причина:** заменён на `src/components/admin/calendar-dnd/MasterCalendarDnd.tsx`

## Проблемы старого кода

Все файлы использовали `new Date(iso)` без учёта часового пояса мастера:
- `useCalendarData.ts:159` — `formatDateISO(new Date(slot.datetime_start))` → сдвиг дня
- `useCalendarData.ts:195-196` — создание слота без offset → бэк трактовал как UTC
- `CalendarWeekGrid.tsx` — та же проблема с фильтрацией слотов по дню

## Файлы

- `MasterCalendar.tsx` — главный компонент (обёртка)
- `calendar/useCalendarData.ts` — хук состояния недели
- `calendar/CalendarWeekGrid.tsx` — сетка недели (drag-to-create)
- `calendar/CalendarHeader.tsx` — шапка с навигацией
- `calendar/CalendarStatsPanel.tsx` — панель статистики
- `calendar/CalendarDialogs.tsx` — диалоги создания слотов/блоков
- `calendar/SlotDetailDialog.tsx` — детали слота
- `calendar/calendarUtils.ts` — утилиты форматирования

## Правильная замена

`MasterCalendarDnd` использует `masterTime.ts` с явными offset-ами и `FullCalendar.formatIso()` — экранное время мастера не зависит от часового пояса браузера.
