"""Единый валидатор бронирований/слотов мастера.

Гарантирует одинаковую логику конфликтов и доступности для всех точек входа:
- админ создаёт бронь вручную (handle_bookings POST)
- админ создаёт/двигает слот (handle_slots POST/PUT)
- клиент бронирует с публичной страницы (handle_public_book)
- мастер ставит выходной (handle_blocks POST)

Все ошибки возвращаются как dict с ключом 'error' и кодом — вызывающий код
формирует HTTP-ответ. Это позволяет одинаково обрабатывать конфликты везде.
"""

import json
from datetime import datetime, timedelta


def require_master_id(params, headers):
    """Извлекает обязательный master_id из query-параметров.
    Возвращает (master_id_int, None) при успехе или (None, http_response_dict) при ошибке.
    """
    raw = params.get('master_id')
    if not raw:
        return None, {
            'statusCode': 400,
            'headers': headers,
            'body': json.dumps({'error': 'master_id обязателен'}, ensure_ascii=False),
        }
    try:
        return int(raw), None
    except (TypeError, ValueError):
        return None, {
            'statusCode': 400,
            'headers': headers,
            'body': json.dumps({'error': 'master_id должен быть числом'}, ensure_ascii=False),
        }


def _parse_dt(value):
    """Парсит ISO-строку или объект datetime в naive datetime (для сравнения).
    timestamptz из БД приходит c offset, локальная строка от фронта — с offset.
    Приводим всё к naive UTC, чтобы сравнения были корректными.
    """
    if value is None:
        return None
    if isinstance(value, datetime):
        if value.tzinfo is not None:
            from datetime import timezone
            return value.astimezone(timezone.utc).replace(tzinfo=None)
        return value
    s = str(value).replace('Z', '+00:00')
    try:
        dt = datetime.fromisoformat(s)
        if dt.tzinfo is not None:
            from datetime import timezone
            return dt.astimezone(timezone.utc).replace(tzinfo=None)
        return dt
    except (ValueError, TypeError):
        return None


def acquire_master_lock(cur, master_id):
    """Advisory lock на мастера — снимется на commit/rollback.
    Гарантирует, что внутри одной транзакции никакой другой
    конкурентный запрос не сможет создать пересекающиеся брони.
    """
    cur.execute(f"SELECT pg_advisory_xact_lock({int(master_id)})")


def recalc_slot_status(cur, schema, slot_id):
    """Пересчитывает статус и booked_count слота по реально активным броням.

    Активные = pending/confirmed. Завершённые/отменённые/no_show освобождают место.
    Если active_count >= max_clients → 'booked'.
    Иначе если slot.status='booked' → 'available' (освобождаем).
    Slot со status='blocked'/'event' (ручная блокировка/перерыв) НЕ трогаем —
    у них своя семантика, бронь на них не должна была попасть.
    """
    cur.execute(f"""
        SELECT id, status, max_clients
        FROM {schema}.master_slots WHERE id = {int(slot_id)}
    """)
    s = cur.fetchone()
    if not s:
        return
    if s.get('status') in ('blocked', 'event'):
        return

    cur.execute(f"""
        SELECT COUNT(*) AS cnt FROM {schema}.master_bookings
        WHERE slot_id = {int(slot_id)} AND status IN ('pending', 'confirmed')
    """)
    cnt_row = cur.fetchone()
    active = int(cnt_row.get('cnt') or 0) if cnt_row else 0
    max_c = int(s.get('max_clients') or 1)
    new_status = 'booked' if active >= max_c else 'available'

    cur.execute(f"""
        UPDATE {schema}.master_slots
        SET booked_count = {active},
            status = '{new_status}',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = {int(slot_id)}
    """)


def get_buffer_minutes(cur, schema, master_id):
    """Возвращает буфер между сеансами из настроек мастера."""
    cur.execute(f"""
        SELECT COALESCE(break_between_slots, 0) AS buf
        FROM {schema}.master_calendar_settings
        WHERE master_id = {int(master_id)}
    """)
    row = cur.fetchone()
    if not row:
        return 0
    try:
        return int(row.get('buf') or 0)
    except (TypeError, ValueError):
        return 0


def check_day_blocked(cur, schema, master_id, dt_start, dt_end=None):
    """Проверяет, не попадает ли время в master_day_blocks (с reason != 'removed').
    Возвращает dict с подробностями блокировки или None.
    """
    start_d = str(dt_start)[:10]
    end_d = str(dt_end)[:10] if dt_end else start_d
    cur.execute(f"""
        SELECT id, block_date, reason, notes
        FROM {schema}.master_day_blocks
        WHERE master_id = {int(master_id)}
          AND COALESCE(reason, '') <> 'removed'
          AND block_date >= '{start_d}'
          AND block_date <= '{end_d}'
        ORDER BY block_date
        LIMIT 1
    """)
    return cur.fetchone()


def check_booking_conflict(cur, schema, master_id, dt_start, dt_end,
                            buffer_minutes=0, exclude_booking_id=None):
    """Ищет активные брони, которые пересекаются с указанным диапазоном
    (с учётом буфера). Возвращает первый конфликт или None.
    """
    s = _parse_dt(dt_start)
    e = _parse_dt(dt_end)
    if not s or not e:
        return None
    check_s = (s - timedelta(minutes=buffer_minutes)).isoformat()
    check_e = (e + timedelta(minutes=buffer_minutes)).isoformat()
    exclude_sql = f" AND id <> {int(exclude_booking_id)}" if exclude_booking_id else ""
    cur.execute(f"""
        SELECT id, client_name, client_phone, datetime_start, datetime_end, status
        FROM {schema}.master_bookings
        WHERE master_id = {int(master_id)}
          AND status IN ('pending', 'confirmed')
          AND datetime_start < '{check_e}'
          AND datetime_end > '{check_s}'
          {exclude_sql}
        ORDER BY datetime_start
        LIMIT 1
    """)
    return cur.fetchone()


def check_slot_conflict(cur, schema, master_id, dt_start, dt_end, exclude_slot_id=None):
    """Ищет пересекающийся слот любого типа (включая blocked) — для админского
    создания/переноса слота. Возвращает первый конфликт или None.
    """
    exclude_sql = f" AND id <> {int(exclude_slot_id)}" if exclude_slot_id else ""
    cur.execute(f"""
        SELECT id, status, datetime_start, datetime_end, notes
        FROM {schema}.master_slots
        WHERE master_id = {int(master_id)}
          AND datetime_start < '{dt_start}'::timestamptz
          AND datetime_end > '{dt_end}'::timestamptz IS NOT TRUE
          AND datetime_start < '{dt_end}'
          AND datetime_end > '{dt_start}'
          {exclude_sql}
        LIMIT 1
    """)
    return cur.fetchone()


def validate_booking_create(cur, schema, master_id, dt_start, dt_end,
                             exclude_booking_id=None, ignore_buffer=False):
    """Универсальная проверка перед созданием/переносом брони.

    Returns:
        None — если всё ок (можно вставлять)
        dict с ключами {error, message, details} — если найден конфликт
    """
    # 1. Валидность дат
    s = _parse_dt(dt_start)
    e = _parse_dt(dt_end)
    if not s or not e:
        return {'error': 'invalid_datetime', 'message': 'Неверный формат даты/времени'}
    if e <= s:
        return {'error': 'invalid_range', 'message': 'Время окончания должно быть позже начала'}

    # 2. Выходной мастера
    blocked = check_day_blocked(cur, schema, master_id, dt_start, dt_end)
    if blocked:
        return {
            'error': 'day_blocked',
            'message': f"Мастер не работает {blocked['block_date']}: {blocked.get('reason') or 'выходной'}",
            'details': {
                'block_date': str(blocked['block_date']),
                'reason': blocked.get('reason'),
            },
        }

    # 3. Буфер
    buf = 0 if ignore_buffer else get_buffer_minutes(cur, schema, master_id)

    # 4. Пересечение с другой бронью
    conflict = check_booking_conflict(
        cur, schema, master_id, dt_start, dt_end,
        buffer_minutes=buf, exclude_booking_id=exclude_booking_id,
    )
    if conflict:
        return {
            'error': 'booking_conflict',
            'message': 'Это время уже занято другой записью' + (
                f' (с учётом буфера {buf} мин)' if buf else ''
            ),
            'details': {
                'conflict_booking_id': conflict['id'],
                'client_name': conflict.get('client_name'),
                'datetime_start': str(conflict['datetime_start']),
                'datetime_end': str(conflict['datetime_end']),
            },
        }

    # 5. Пересечение с заблокированным слотом (мастер вручную закрыл время)
    cur.execute(f"""
        SELECT id, notes, datetime_start, datetime_end
        FROM {schema}.master_slots
        WHERE master_id = {int(master_id)}
          AND status = 'blocked'
          AND datetime_start < '{dt_end}'
          AND datetime_end > '{dt_start}'
        LIMIT 1
    """)
    blk_slot = cur.fetchone()
    if blk_slot:
        return {
            'error': 'time_blocked',
            'message': 'Это время заблокировано мастером',
            'details': {
                'slot_id': blk_slot['id'],
                'notes': blk_slot.get('notes'),
            },
        }

    return None