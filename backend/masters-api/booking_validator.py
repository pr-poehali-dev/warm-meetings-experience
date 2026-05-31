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


def _client_ip(event):
    """Достаём IP клиента из event. Возвращаем 'unknown' если не нашли."""
    try:
        ctx = event.get('requestContext') or {}
        ident = ctx.get('identity') or {}
        ip = ident.get('sourceIp')
        if ip:
            return str(ip)[:64]
    except Exception:
        pass
    try:
        h = event.get('headers') or {}
        xff = h.get('x-forwarded-for') or h.get('X-Forwarded-For') or ''
        if xff:
            return str(xff).split(',')[0].strip()[:64]
    except Exception:
        pass
    return 'unknown'


# Лимит: N броней в скользящем окне M минут с одного IP.
RATELIMIT_MAX = 5
RATELIMIT_WINDOW_MIN = 60


def check_public_booking_ratelimit(cur, schema, event, master_id, extra_key=''):
    """Защита от спама публичных броней.

    Возвращает (True, None) если можно продолжить.
    Возвращает (False, dict-response 429) если лимит превышен.
    """
    ip = _client_ip(event)
    ident = f"{ip}|{extra_key}" if extra_key else ip
    ident_safe = ident.replace("'", "''")[:128]
    mid = int(master_id) if master_id else 0

    cur.execute(f"""
        SELECT COALESCE(SUM(attempts), 0) AS total
        FROM {schema}.master_booking_ratelimit
        WHERE identifier = '{ident_safe}'
          AND action = 'public_book'
          AND window_start > NOW() - INTERVAL '{RATELIMIT_WINDOW_MIN} minutes'
    """)
    row = cur.fetchone()
    total = int(row.get('total') or 0) if row else 0

    if total >= RATELIMIT_MAX:
        return False, {
            'statusCode': 429,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json',
                'Retry-After': str(RATELIMIT_WINDOW_MIN * 60),
            },
            'body': json.dumps({
                'error': 'rate_limit_exceeded',
                'message': f'Слишком много попыток бронирования. Попробуйте через {RATELIMIT_WINDOW_MIN} минут.',
                'retry_after_minutes': RATELIMIT_WINDOW_MIN,
            }, ensure_ascii=False),
        }

    cur.execute(f"""
        INSERT INTO {schema}.master_booking_ratelimit
            (identifier, master_id, action, window_start, attempts, last_attempt_at)
        VALUES ('{ident_safe}', {mid}, 'public_book', NOW(), 1, NOW())
    """)

    # Подчищаем старьё (старше суток) — раз в 5 попыток
    if total % 5 == 0:
        cur.execute(f"""
            DELETE FROM {schema}.master_booking_ratelimit
            WHERE window_start < NOW() - INTERVAL '1 day'
        """)

    return True, None


def ensure_master_access(cur, schema, event, master_id, headers):
    """Проверяет, что вызывающий имеет право управлять данным master_id.
    Разрешено: сам владелец (user_id мастера = текущий пользователь) ИЛИ глобальный админ.
    Возвращает (True, None) при успехе или (False, http_response_dict) при отказе.
    """
    from shared import get_user_from_token, verify_admin_token, get_token
    headers_in = event.get('headers') or {}
    admin_token = headers_in.get('X-Admin-Token') or headers_in.get('x-admin-token') or ''
    token = get_token(event)

    # 1. Глобальный админ — может всё
    try:
        if admin_token and verify_admin_token(admin_token):
            return True, None
    except Exception:
        pass

    # 2. Иначе — должен быть владельцем профиля
    try:
        user = get_user_from_token(cur, schema, token)
    except Exception:
        user = None
    if not user:
        return False, {
            'statusCode': 401, 'headers': headers,
            'body': json.dumps({'error': 'Не авторизован'}, ensure_ascii=False),
        }

    cur.execute(f"""
        SELECT user_id FROM {schema}.masters WHERE id = {int(master_id)}
    """)
    row = cur.fetchone()
    if not row:
        return False, {
            'statusCode': 404, 'headers': headers,
            'body': json.dumps({'error': 'Мастер не найден'}, ensure_ascii=False),
        }
    if row.get('user_id') != user.get('id'):
        return False, {
            'statusCode': 403, 'headers': headers,
            'body': json.dumps({'error': 'Нет доступа к этому мастеру'}, ensure_ascii=False),
        }
    return True, None


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


def acquire_master_lock(cur, master_id, schema=None):
    """Эксклюзивный lock на мастера в рамках транзакции.

    Раньше использовался pg_advisory_xact_lock, но эта функция запрещена
    хостинг-провайдером. Заменили на row-level lock через SELECT ... FOR UPDATE
    по строке мастера в таблице masters. Lock держится до commit/rollback,
    блокирует параллельные транзакции, которые пытаются взять lock на ту же
    строку — это даёт ту же гарантию защиты от гонок.

    schema опциональна — если не задана, используем search_path по умолчанию.
    """
    target = f"{schema}.masters" if schema else "masters"
    cur.execute(f"SELECT id FROM {target} WHERE id = {int(master_id)} FOR UPDATE")
    cur.fetchone()


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
          AND archived_at IS NULL
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
          AND archived_at IS NULL
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


def check_inside_working_slot(cur, schema, master_id, dt_start, dt_end):
    """Проверяет, что интервал [dt_start, dt_end] полностью укладывается
    в один из рабочих слотов мастера (статус available или booked).
    Возвращает найденный слот (dict) или None.
    """
    cur.execute(f"""
        SELECT id, status, max_clients, datetime_start, datetime_end
        FROM {schema}.master_slots
        WHERE master_id = {int(master_id)}
          AND status IN ('available', 'booked')
          AND datetime_start <= '{dt_start}'
          AND datetime_end >= '{dt_end}'
        ORDER BY datetime_start
        LIMIT 1
    """)
    return cur.fetchone()


def validate_booking_create(cur, schema, master_id, dt_start, dt_end,
                             exclude_booking_id=None, ignore_buffer=False,
                             require_within_slot=False):
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

    # 6. Опционально: проверить, что время попадает в рабочий слот мастера
    if require_within_slot:
        inside = check_inside_working_slot(cur, schema, master_id, dt_start, dt_end)
        if not inside:
            return {
                'error': 'outside_working_hours',
                'message': 'Это время вне рабочих часов мастера. Сначала создайте рабочий слот.',
            }

    return None