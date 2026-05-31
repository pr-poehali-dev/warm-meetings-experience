import json
import os
import io
import csv
import psycopg2.extras
from datetime import datetime, timedelta, date, time
from shared import CORS_HEADERS, get_conn, get_schema
from booking_validator import acquire_master_lock, check_day_blocked, require_master_id, ensure_master_access


def _backup_bookings_to_s3(cur, schema, master_id, reason, where_extra=""):
    """Сохраняет снимок записей мастера (CSV) в S3 и регистрирует его в master_backups.
    Возвращает (file_url, count). Не падает — при ошибке вернёт (None, count)."""
    cur.execute(f"""
        SELECT b.*, ms.name AS service_name
        FROM {schema}.master_bookings b
        LEFT JOIN {schema}.master_services ms ON ms.id = b.service_id
        WHERE b.master_id = {int(master_id)} AND b.archived_at IS NULL{where_extra}
        ORDER BY b.datetime_start
    """)
    rows = cur.fetchall()
    count = len(rows)
    file_url = None
    if count > 0:
        try:
            import boto3
            buf = io.StringIO()
            writer = csv.DictWriter(buf, fieldnames=list(rows[0].keys()))
            writer.writeheader()
            for r in rows:
                writer.writerow({k: ('' if v is None else v) for k, v in r.items()})
            data = buf.getvalue().encode('utf-8')
            ts = datetime.utcnow().strftime('%Y%m%d-%H%M%S')
            key = f"master-backups/{master_id}/{ts}-{reason}.csv"
            s3 = boto3.client(
                's3', endpoint_url='https://bucket.poehali.dev',
                aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
                aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
            )
            s3.put_object(Bucket='files', Key=key, Body=data, ContentType='text/csv')
            file_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"
        except Exception as ex:
            print(f'[backup] S3 failed: {type(ex).__name__}: {ex}')
    cur.execute(f"""
        INSERT INTO {schema}.master_backups (master_id, reason, bookings_count, file_url)
        VALUES ({int(master_id)}, '{reason}', {count}, {('NULL' if not file_url else chr(39)+file_url+chr(39))})
        RETURNING id, created_at
    """)
    return file_url, count
from time_utils import (
    fetch_master_tz, parse_client_dt, to_master_iso, wall_to_master_iso, localize_rows,
)


def handle_calendar(event, method, params, schema, headers):
    """Маршрутизация подресурсов календаря: slots/services/templates/settings/blocks/apply-template/week-view/clear"""
    sub = params.get('sub') or params.get('subresource') or 'slots'
    if sub == 'slots':
        return handle_slots(event, method, params, schema, headers)
    elif sub == 'services':
        return handle_services(event, method, params, schema, headers)
    elif sub == 'templates':
        return handle_templates(event, method, params, schema, headers)
    elif sub == 'settings':
        return handle_settings(event, method, params, schema, headers)
    elif sub == 'blocks':
        return handle_blocks(event, method, params, schema, headers)
    elif sub == 'apply-template':
        return handle_apply_template(event, method, params, schema, headers)
    elif sub == 'week-view':
        return handle_week_view(event, method, params, schema, headers)
    elif sub == 'clear':
        return handle_clear(event, method, params, schema, headers)
    elif sub == 'trash':
        return handle_trash(event, method, params, schema, headers)
    elif sub == 'restore':
        return handle_restore(event, method, params, schema, headers)
    elif sub == 'backup':
        return handle_backup(event, method, params, schema, headers)
    elif sub == 'addresses':
        return handle_addresses(event, method, params, schema, headers)
    elif sub == 'set-primary-address':
        return handle_set_primary_address(event, method, params, schema, headers)
    elif sub == 'maps-key':
        return handle_maps_key(event, method, params, schema, headers)
    elif sub == 'geocode':
        return handle_geocode(event, method, params, schema, headers)
    return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Unknown calendar sub'})}


def handle_maps_key(event, method, params, schema, headers):
    """GET — публичный ключ Яндекс.Карт для фронтенда (JS API)."""
    key = os.environ.get('YANDEX_MAPS_API_KEY', '')
    return {'statusCode': 200, 'headers': headers,
            'body': json.dumps({'apikey': key}, ensure_ascii=False)}


def handle_geocode(event, method, params, schema, headers):
    """GET — геокодирование через Яндекс HTTP Геокодер.
    Параметры: ?q=<текст адреса>  ИЛИ  ?lat=..&lng=.. (обратный геокодинг).
    Возвращает: { results: [ { address, lat, lng } ] }.
    """
    import urllib.request
    import urllib.parse

    q = (params.get('q') or '').strip()
    lat = params.get('lat')
    lng = params.get('lng')

    if lat and lng:
        geocode = f"{lng},{lat}"  # Яндекс ждёт долготу,широту
    elif q:
        geocode = q
    else:
        return {'statusCode': 400, 'headers': headers,
                'body': json.dumps({'error': 'q или lat/lng обязательны'}, ensure_ascii=False)}

    # У ключа карт подключены оба API (JS + Геокодер), поэтому он основной для геокодера.
    key = os.environ.get('YANDEX_MAPS_API_KEY') or os.environ.get('YANDEX_GEOCODER_API_KEY', '')
    if not key:
        return {'statusCode': 200, 'headers': headers,
                'body': json.dumps({'results': [], 'error': 'no_key'}, ensure_ascii=False)}

    url = 'https://geocode-maps.yandex.ru/1.x/?' + urllib.parse.urlencode({
        'apikey': key, 'geocode': geocode, 'format': 'json', 'results': 5, 'lang': 'ru_RU',
    })

    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'sparcom-masters'})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode('utf-8'))
    except Exception as e:
        return {'statusCode': 200, 'headers': headers,
                'body': json.dumps({'results': [], 'error': 'geocoder_failed',
                                    'detail': f'{type(e).__name__}: {e}'}, ensure_ascii=False)}

    results = []
    try:
        members = data['response']['GeoObjectCollection']['featureMember']
        for m in members:
            obj = m['GeoObject']
            pos = obj['Point']['pos'].split()  # "lng lat"
            results.append({
                'address': obj.get('metaDataProperty', {}).get('GeocoderMetaData', {}).get('text')
                           or obj.get('name', ''),
                'lat': float(pos[1]),
                'lng': float(pos[0]),
            })
    except (KeyError, IndexError, ValueError):
        pass

    return {'statusCode': 200, 'headers': headers,
            'body': json.dumps({'results': results}, ensure_ascii=False)}


def handle_trash(event, method, params, schema, headers):
    """GET — список записей клиентов в корзине (archived_at IS NOT NULL)."""
    if method != 'GET':
        return {'statusCode': 405, 'headers': headers, 'body': json.dumps({'error': 'Method not allowed'})}
    master_id, err = require_master_id(params, headers)
    if err:
        return err
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        cur.execute(f"""
            SELECT b.*, ms.name AS service_name
            FROM {schema}.master_bookings b
            LEFT JOIN {schema}.master_services ms ON ms.id = b.service_id
            WHERE b.master_id = {int(master_id)} AND b.archived_at IS NOT NULL
            ORDER BY b.archived_at DESC
        """)
        rows = cur.fetchall()
        cur.execute(f"""
            SELECT id, reason, bookings_count, file_url, created_at
            FROM {schema}.master_backups
            WHERE master_id = {int(master_id)}
            ORDER BY created_at DESC LIMIT 50
        """)
        backups = cur.fetchall()
    finally:
        conn.close()
    return {'statusCode': 200, 'headers': headers, 'body': json.dumps({
        'bookings': rows, 'backups': backups
    }, default=str)}


def handle_restore(event, method, params, schema, headers):
    """POST — восстановить записи из корзины. body: { master_id, ids?: [..] }.
    Если ids не переданы — восстанавливаются все архивные записи мастера."""
    if method != 'POST':
        return {'statusCode': 405, 'headers': headers, 'body': json.dumps({'error': 'Method not allowed'})}
    body = json.loads(event.get('body', '{}'))
    master_id = int(body.get('master_id', 0))
    if not master_id:
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'master_id required'})}
    ids = body.get('ids') or []
    where_ids = ""
    if ids:
        safe = ','.join(str(int(i)) for i in ids)
        where_ids = f" AND id IN ({safe})"
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        cur.execute(
            f"UPDATE {schema}.master_bookings SET archived_at = NULL, updated_at = CURRENT_TIMESTAMP "
            f"WHERE master_id = {master_id} AND archived_at IS NOT NULL{where_ids}"
        )
        restored = cur.rowcount
        conn.commit()
    finally:
        conn.close()
    return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'success': True, 'restored': restored})}


def handle_backup(event, method, params, schema, headers):
    """POST — создать резервную копию записей мастера прямо сейчас. body: { master_id }."""
    if method != 'POST':
        return {'statusCode': 405, 'headers': headers, 'body': json.dumps({'error': 'Method not allowed'})}
    body = json.loads(event.get('body', '{}'))
    master_id = int(body.get('master_id', 0))
    if not master_id:
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'master_id required'})}
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        file_url, count = _backup_bookings_to_s3(cur, schema, master_id, 'manual')
        conn.commit()
    finally:
        conn.close()
    return {'statusCode': 200, 'headers': headers, 'body': json.dumps({
        'success': True, 'backup_url': file_url, 'bookings_count': count
    })}


def handle_clear(event, method, params, schema, headers):
    """Очистка календаря мастера: удаляет слоты/блокировки/незавершённые брони за период.
    body: { master_id, date_from?, date_to?, scope: 'all'|'slots'|'bookings'|'blocks' }
    """
    if method != 'POST':
        return {'statusCode': 405, 'headers': headers, 'body': json.dumps({'error': 'Method not allowed'})}

    body = json.loads(event.get('body', '{}'))
    master_id = int(body.get('master_id', 0))
    if not master_id:
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'master_id required'})}

    date_from = body.get('date_from')
    date_to = body.get('date_to')
    scope = body.get('scope', 'all')

    where_period_slots = ""
    where_period_bookings = ""
    where_period_blocks = ""
    if date_from:
        where_period_slots += f" AND datetime_start >= '{date_from}'"
        where_period_bookings += f" AND datetime_start >= '{date_from}'"
        where_period_blocks += f" AND block_date >= '{date_from[:10]}'"
    if date_to:
        where_period_slots += f" AND datetime_start <= '{date_to}'"
        where_period_bookings += f" AND datetime_start <= '{date_to}'"
        where_period_blocks += f" AND block_date <= '{date_to[:10]}'"

    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    deleted = {'bookings': 0, 'slots': 0, 'blocks': 0}
    backup_url = None

    try:
        if scope in ('all', 'bookings'):
            # Сначала резервная копия записей клиентов, затем — мягкое скрытие в корзину.
            backup_url, _ = _backup_bookings_to_s3(
                cur, schema, master_id, 'clear', where_extra=where_period_bookings.replace('datetime_start', 'b.datetime_start')
            )
            cur.execute(
                f"UPDATE {schema}.master_bookings SET archived_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP "
                f"WHERE master_id = {master_id} AND archived_at IS NULL{where_period_bookings}"
            )
            deleted['bookings'] = cur.rowcount
        if scope in ('all', 'slots'):
            cur.execute(f"DELETE FROM {schema}.master_slots WHERE master_id = {master_id}{where_period_slots}")
            deleted['slots'] = cur.rowcount
        if scope in ('all', 'blocks'):
            cur.execute(f"DELETE FROM {schema}.master_day_blocks WHERE master_id = {master_id}{where_period_blocks}")
            deleted['blocks'] = cur.rowcount
        conn.commit()
    finally:
        conn.close()

    return {'statusCode': 200, 'headers': headers, 'body': json.dumps({
        'success': True, 'deleted': deleted, 'backup_url': backup_url,
        'note': 'Записи клиентов перемещены в корзину и сохранены в резервную копию.'
    })}


def handle_slots(event, method, params, schema, headers):
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    if method == 'GET':
        master_id, err = require_master_id(params, headers)
        if err:
            conn.close()
            return err
        date_from = params.get('date_from', '')
        date_to = params.get('date_to', '')

        query = f"""
            SELECT s.*, ms.name as service_name, ms.duration_minutes, ms.price as service_price
            FROM {schema}.master_slots s
            LEFT JOIN {schema}.master_services ms ON s.service_id = ms.id
            WHERE s.master_id = {int(master_id)}
        """
        if date_from:
            query += f" AND s.datetime_start >= '{date_from}'"
        if date_to:
            query += f" AND s.datetime_start <= '{date_to}'"
        query += " ORDER BY s.datetime_start"

        cur.execute(query)
        rows = cur.fetchall()
        slots_tz = fetch_master_tz(cur, schema, master_id)
        conn.close()
        localize_rows(rows, slots_tz)
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps(rows, default=str)}

    if method == 'POST':
        body = json.loads(event.get('body', '{}'))
        master_id = body.get('master_id')
        if not master_id:
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'master_id обязателен'})}
        service_id = body.get('service_id')
        # Канон времени: «голую» строку без offset трактуем как зону мастера,
        # затем сохраняем как ISO с явным offset (консистентно с чтением).
        slot_tz = fetch_master_tz(cur, schema, master_id)
        try:
            dt_start = to_master_iso(parse_client_dt(body['datetime_start'], slot_tz), slot_tz)
            dt_end = to_master_iso(parse_client_dt(body['datetime_end'], slot_tz), slot_tz)
        except (ValueError, TypeError, KeyError):
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({
                'error': 'invalid_datetime', 'message': 'Неверный формат времени'
            }, ensure_ascii=False)}
        max_clients = body.get('max_clients', 1)
        notes = body.get('notes', '')
        slot_status = body.get('status', 'available')
        address_id = body.get('address_id')

        # Защита от гонок
        acquire_master_lock(cur, master_id)

        # Пересечение со ВСЕМИ слотами (включая blocked) — два разных
        # назначения времени на одну точку недопустимы.
        cur.execute(f"""
            SELECT id, status, notes FROM {schema}.master_slots
            WHERE master_id = {int(master_id)}
              AND datetime_start < '{dt_end}'
              AND datetime_end > '{dt_start}'
            LIMIT 1
        """)
        existing = cur.fetchone()
        if existing:
            conn.close()
            label = 'заблокированным временем' if existing.get('status') == 'blocked' else 'другим слотом'
            return {'statusCode': 409, 'headers': headers, 'body': json.dumps({
                'error': 'slot_overlap',
                'message': f'Это время пересекается с {label}',
                'details': {'slot_id': existing['id'], 'status': existing.get('status')},
            }, ensure_ascii=False)}

        # Выходной день мастера
        blocked = check_day_blocked(cur, schema, master_id, dt_start, dt_end)
        if blocked:
            conn.close()
            return {'statusCode': 409, 'headers': headers, 'body': json.dumps({
                'error': 'day_blocked',
                'message': f"День {blocked['block_date']} заблокирован: {blocked.get('reason') or 'выходной'}",
            }, default=str, ensure_ascii=False)}

        service_val = f"{int(service_id)}" if service_id else "NULL"
        addr_val = f"{int(address_id)}" if address_id else "NULL"
        notes_escaped = notes.replace("'", "''")

        # Допустимые статусы при ручном создании слота админом/мастером.
        if slot_status not in ('available', 'blocked', 'event'):
            slot_status = 'available'

        cur.execute(f"""
            INSERT INTO {schema}.master_slots
            (master_id, service_id, datetime_start, datetime_end, max_clients, status, source, notes, address_id)
            VALUES ({int(master_id)}, {service_val}, '{dt_start}', '{dt_end}', {int(max_clients)}, '{slot_status}', 'manual', '{notes_escaped}', {addr_val})
            RETURNING *
        """)
        row = cur.fetchone()
        conn.commit()
        conn.close()
        localize_rows([row], slot_tz)
        return {'statusCode': 201, 'headers': headers, 'body': json.dumps(row, default=str)}

    if method == 'PUT':
        body = json.loads(event.get('body', '{}'))
        slot_id = int(body['id'])
        new_start = body.get('datetime_start')
        new_end = body.get('datetime_end')

        # Считаем текущее состояние слота — нужно для проверки конфликтов
        # и для синхронного переноса привязанной брони.
        cur.execute(f"""
            SELECT id, master_id, datetime_start, datetime_end, status
            FROM {schema}.master_slots WHERE id = {slot_id}
        """)
        current = cur.fetchone()
        if not current:
            conn.close()
            return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'Слот не найден'})}

        master_id = current['master_id']

        # Если меняется время — валидируем как новую бронь:
        # выходные, пересечения, blocked-слоты, буфер (если внутри есть активная бронь).
        if new_start or new_end:
            acquire_master_lock(cur, master_id, schema)
            check_s = new_start or current['datetime_start']
            check_e = new_end or current['datetime_end']

            # 1) Выходной мастера
            blocked_day = check_day_blocked(cur, schema, master_id, check_s, check_e)
            if blocked_day:
                conn.close()
                return {'statusCode': 409, 'headers': headers, 'body': json.dumps({
                    'error': 'day_blocked',
                    'message': f"День {blocked_day['block_date']} заблокирован: {blocked_day.get('reason') or 'выходной'}",
                }, default=str, ensure_ascii=False)}

            # 2) Пересечение с другим слотом
            cur.execute(f"""
                SELECT id, status FROM {schema}.master_slots
                WHERE master_id = {int(master_id)}
                  AND id <> {slot_id}
                  AND datetime_start < '{check_e}'
                  AND datetime_end > '{check_s}'
                LIMIT 1
            """)
            other = cur.fetchone()
            if other:
                conn.close()
                return {'statusCode': 409, 'headers': headers, 'body': json.dumps({
                    'error': 'slot_overlap',
                    'message': 'Это время пересекается с другим слотом',
                    'details': {'slot_id': other['id'], 'status': other.get('status')},
                }, ensure_ascii=False)}

            # 3) Пересечение с чужой активной бронью (свои брони этого слота двигаются вместе).
            cur.execute(f"""
                SELECT id, client_name FROM {schema}.master_bookings
                WHERE master_id = {int(master_id)}
                  AND status IN ('pending', 'confirmed')
                  AND (slot_id IS NULL OR slot_id <> {slot_id})
                  AND datetime_start < '{check_e}'
                  AND datetime_end > '{check_s}'
                LIMIT 1
            """)
            other_b = cur.fetchone()
            if other_b:
                conn.close()
                return {'statusCode': 409, 'headers': headers, 'body': json.dumps({
                    'error': 'booking_conflict',
                    'message': 'Это время уже занято другой записью',
                    'details': {'conflict_booking_id': other_b['id'], 'client_name': other_b.get('client_name')},
                }, ensure_ascii=False)}

        # Формируем UPDATE
        updates = []
        if 'service_id' in body:
            svc = body['service_id']
            updates.append(f"service_id = {int(svc) if svc else 'NULL'}")
        if new_start:
            updates.append(f"datetime_start = '{new_start}'")
        if new_end:
            updates.append(f"datetime_end = '{new_end}'")
        if 'max_clients' in body:
            updates.append(f"max_clients = {int(body['max_clients'])}")
        if 'status' in body and body['status'] in ('available', 'blocked', 'event', 'booked'):
            updates.append(f"status = '{body['status']}'")
        if 'notes' in body:
            notes_escaped = body['notes'].replace("'", "''")
            updates.append(f"notes = '{notes_escaped}'")
        if 'address_id' in body:
            addr = body['address_id']
            updates.append(f"address_id = {int(addr) if addr else 'NULL'}")

        if not updates:
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Nothing to update'})}

        updates.append("updated_at = CURRENT_TIMESTAMP")
        cur.execute(f"""
            UPDATE {schema}.master_slots SET {', '.join(updates)}
            WHERE id = {slot_id}
            RETURNING *
        """)
        row = cur.fetchone()

        # Синхронно двигаем брони, привязанные к этому слоту.
        # Сдвиг = (новый_старт - старый_старт). Применяется ко всем активным броням.
        if new_start:
            try:
                from datetime import timezone
                def _to_utc(v):
                    if hasattr(v, 'tzinfo') and v.tzinfo:
                        return v.astimezone(timezone.utc).replace(tzinfo=None)
                    return v
                ns = datetime.fromisoformat(str(new_start).replace('Z', '+00:00'))
                ns_naive = _to_utc(ns)
                old_s = _to_utc(current['datetime_start'])
                delta_seconds = int((ns_naive - old_s).total_seconds())
                if delta_seconds != 0:
                    cur.execute(f"""
                        UPDATE {schema}.master_bookings
                        SET datetime_start = datetime_start + interval '{delta_seconds} seconds',
                            datetime_end   = datetime_end   + interval '{delta_seconds} seconds',
                            updated_at = CURRENT_TIMESTAMP
                        WHERE slot_id = {slot_id}
                          AND status IN ('pending', 'confirmed')
                    """)
            except Exception as e:
                # Если что-то пошло не так с парсингом — откатим транзакцию,
                # иначе слот переедет, а брони останутся на старом месте.
                conn.rollback()
                conn.close()
                return {'statusCode': 400, 'headers': headers, 'body': json.dumps({
                    'error': 'datetime_parse_failed',
                    'message': f'Не удалось пересчитать сдвиг броней: {e}',
                })}

        conn.commit()
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps(row, default=str)}

    if method == 'DELETE':
        body = json.loads(event.get('body', '{}'))
        slot_id = body.get('id') or params.get('id')

        cur.execute(f"SELECT id, status FROM {schema}.master_slots WHERE id = {int(slot_id)}")
        slot = cur.fetchone()
        if not slot:
            conn.close()
            return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'Slot not found'})}

        if slot['status'] == 'booked':
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Нельзя удалить слот с записью. Сначала отмените запись.'})}

        cur.execute(f"DELETE FROM {schema}.master_slots WHERE id = {int(slot_id)}")
        conn.commit()
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'success': True})}

    conn.close()
    return {'statusCode': 405, 'headers': headers, 'body': json.dumps({'error': 'Method not allowed'})}


def handle_services(event, method, params, schema, headers):
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    if method == 'GET':
        master_id, err = require_master_id(params, headers)
        if err:
            conn.close()
            return err
        cur.execute(f"""
            SELECT * FROM {schema}.master_services
            WHERE master_id = {int(master_id)}
            ORDER BY sort_order, id
        """)
        rows = cur.fetchall()
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps(rows, default=str)}

    if method == 'POST':
        body = json.loads(event.get('body', '{}'))
        master_id = body.get('master_id', 1)
        name = body['name'].replace("'", "''")
        desc = (body.get('description') or '').replace("'", "''")
        duration = int(body.get('duration_minutes', 60))
        price = float(body.get('price', 0))
        max_cl = int(body.get('max_clients', 1))
        fmt = body.get('service_format') or 'on_site'
        if fmt not in ('on_site', 'at_home', 'by_agreement'):
            fmt = 'on_site'
        dep_addr = body.get('departure_address_id')
        dep_val = f"{int(dep_addr)}" if dep_addr else "NULL"

        cur.execute(f"""
            INSERT INTO {schema}.master_services
            (master_id, name, description, duration_minutes, price, max_clients, service_format, departure_address_id)
            VALUES ({int(master_id)}, '{name}', '{desc}', {duration}, {price}, {max_cl}, '{fmt}', {dep_val})
            RETURNING *
        """)
        row = cur.fetchone()
        conn.commit()
        conn.close()
        return {'statusCode': 201, 'headers': headers, 'body': json.dumps(row, default=str)}

    if method == 'PUT':
        body = json.loads(event.get('body', '{}'))
        sid = body['id']
        updates = []
        if 'name' in body:
            updates.append(f"name = '{body['name'].replace(chr(39), chr(39)+chr(39))}'")
        if 'description' in body:
            updates.append(f"description = '{(body['description'] or '').replace(chr(39), chr(39)+chr(39))}'")
        if 'duration_minutes' in body:
            updates.append(f"duration_minutes = {int(body['duration_minutes'])}")
        if 'price' in body:
            updates.append(f"price = {float(body['price'])}")
        if 'max_clients' in body:
            updates.append(f"max_clients = {int(body['max_clients'])}")
        if 'is_active' in body:
            updates.append(f"is_active = {'true' if body['is_active'] else 'false'}")
        if 'service_format' in body:
            fmt = body.get('service_format') or 'on_site'
            if fmt not in ('on_site', 'at_home', 'by_agreement'):
                fmt = 'on_site'
            updates.append(f"service_format = '{fmt}'")
        if 'departure_address_id' in body:
            dep = body.get('departure_address_id')
            updates.append(f"departure_address_id = {int(dep) if dep else 'NULL'}")

        if updates:
            updates.append("updated_at = CURRENT_TIMESTAMP")
            cur.execute(f"""
                UPDATE {schema}.master_services SET {', '.join(updates)}
                WHERE id = {int(sid)} RETURNING *
            """)
            row = cur.fetchone()
            conn.commit()
            conn.close()
            return {'statusCode': 200, 'headers': headers, 'body': json.dumps(row, default=str)}

        conn.close()
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Nothing to update'})}

    if method == 'DELETE':
        body = json.loads(event.get('body', '{}'))
        sid = body.get('id') or params.get('id')
        cur.execute(f"UPDATE {schema}.master_services SET is_active = false WHERE id = {int(sid)}")
        conn.commit()
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'success': True})}

    conn.close()
    return {'statusCode': 405, 'headers': headers, 'body': json.dumps({'error': 'Method not allowed'})}


def handle_templates(event, method, params, schema, headers):
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    if method == 'GET':
        master_id, err = require_master_id(params, headers)
        if err:
            conn.close()
            return err
        cur.execute(f"""
            SELECT t.*, json_agg(
                json_build_object(
                    'id', r.id,
                    'day_of_week', r.day_of_week,
                    'time_start', r.time_start,
                    'time_end', r.time_end,
                    'service_id', r.service_id,
                    'max_clients', r.max_clients,
                    'is_day_off', r.is_day_off,
                    'address_id', r.address_id
                ) ORDER BY r.day_of_week, r.time_start
            ) FILTER (WHERE r.id IS NOT NULL) as rules
            FROM {schema}.master_schedule_templates t
            LEFT JOIN {schema}.master_template_rules r ON r.template_id = t.id
            WHERE t.master_id = {int(master_id)}
            GROUP BY t.id
            ORDER BY t.id
        """)
        rows = cur.fetchall()
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps(rows, default=str)}

    if method == 'POST':
        body = json.loads(event.get('body', '{}'))
        master_id = body.get('master_id', 1)
        name = body['name'].replace("'", "''")
        rules = body.get('rules', [])

        cur.execute(f"""
            INSERT INTO {schema}.master_schedule_templates (master_id, name)
            VALUES ({int(master_id)}, '{name}')
            RETURNING id
        """)
        tmpl_id = cur.fetchone()['id']

        for rule in rules:
            svc = rule.get('service_id')
            svc_val = f"{int(svc)}" if svc else "NULL"
            is_off = 'true' if rule.get('is_day_off') else 'false'
            t_start = rule.get('time_start', '09:00')
            t_end = rule.get('time_end', '18:00')
            max_cl = int(rule.get('max_clients', 1))
            dow = int(rule['day_of_week'])
            addr = rule.get('address_id')
            addr_val = f"{int(addr)}" if addr else "NULL"

            cur.execute(f"""
                INSERT INTO {schema}.master_template_rules
                (template_id, day_of_week, time_start, time_end, service_id, max_clients, is_day_off, address_id)
                VALUES ({tmpl_id}, {dow}, '{t_start}', '{t_end}', {svc_val}, {max_cl}, {is_off}, {addr_val})
            """)

        conn.commit()

        cur.execute(f"""
            SELECT t.*, json_agg(
                json_build_object(
                    'id', r.id,
                    'day_of_week', r.day_of_week,
                    'time_start', r.time_start,
                    'time_end', r.time_end,
                    'service_id', r.service_id,
                    'max_clients', r.max_clients,
                    'is_day_off', r.is_day_off,
                    'address_id', r.address_id
                ) ORDER BY r.day_of_week, r.time_start
            ) FILTER (WHERE r.id IS NOT NULL) as rules
            FROM {schema}.master_schedule_templates t
            LEFT JOIN {schema}.master_template_rules r ON r.template_id = t.id
            WHERE t.id = {tmpl_id}
            GROUP BY t.id
        """)
        row = cur.fetchone()
        conn.close()
        return {'statusCode': 201, 'headers': headers, 'body': json.dumps(row, default=str)}

    if method == 'PUT':
        body = json.loads(event.get('body', '{}'))
        tmpl_id = body['id']
        if 'name' in body:
            name = body['name'].replace("'", "''")
            cur.execute(f"UPDATE {schema}.master_schedule_templates SET name = '{name}', updated_at = CURRENT_TIMESTAMP WHERE id = {int(tmpl_id)}")

        if 'rules' in body:
            cur.execute(f"DELETE FROM {schema}.master_template_rules WHERE template_id = {int(tmpl_id)}")
            for rule in body['rules']:
                svc = rule.get('service_id')
                svc_val = f"{int(svc)}" if svc else "NULL"
                is_off = 'true' if rule.get('is_day_off') else 'false'
                t_start = rule.get('time_start', '09:00')
                t_end = rule.get('time_end', '18:00')
                max_cl = int(rule.get('max_clients', 1))
                dow = int(rule['day_of_week'])
                addr = rule.get('address_id')
                addr_val = f"{int(addr)}" if addr else "NULL"

                cur.execute(f"""
                    INSERT INTO {schema}.master_template_rules
                    (template_id, day_of_week, time_start, time_end, service_id, max_clients, is_day_off, address_id)
                    VALUES ({int(tmpl_id)}, {dow}, '{t_start}', '{t_end}', {svc_val}, {max_cl}, {is_off}, {addr_val})
                """)

        conn.commit()
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'success': True})}

    if method == 'DELETE':
        body = json.loads(event.get('body', '{}'))
        tmpl_id = body.get('id') or params.get('id')
        cur.execute(f"UPDATE {schema}.master_schedule_templates SET is_active = false WHERE id = {int(tmpl_id)}")
        conn.commit()
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'success': True})}

    conn.close()
    return {'statusCode': 405, 'headers': headers, 'body': json.dumps({'error': 'Method not allowed'})}


def handle_apply_template(event, method, params, schema, headers):
    """Применение шаблона расписания на N недель вперёд.

    Поддерживает 3 режима:
    - dry_run=true → ничего не пишет, возвращает план (created/conflicts/blocked_dates).
    - force=true → удаляет существующие слоты в диапазоне (с предупреждением, если там есть активные брони).
    - default → пропускает дни с конфликтами, создаёт остальное.
    """
    if method != 'POST':
        return {'statusCode': 405, 'headers': headers, 'body': json.dumps({'error': 'POST only'})}

    body = json.loads(event.get('body', '{}'))
    template_id = body['template_id']
    master_id = body.get('master_id')
    if not master_id:
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'master_id обязателен'})}
    weeks = int(body.get('weeks', 4))
    start_date_str = body.get('start_date')
    dry_run = bool(body.get('dry_run', False))
    force = bool(body.get('force', False))

    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    cur.execute(f"""
        SELECT r.* FROM {schema}.master_template_rules r
        JOIN {schema}.master_schedule_templates t ON t.id = r.template_id
        WHERE r.template_id = {int(template_id)} AND t.is_active = true
        ORDER BY r.day_of_week, r.time_start
    """)
    rules = cur.fetchall()
    if not rules:
        conn.close()
        return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'Шаблон не найден или пустой'})}

    # Канон времени: слоты шаблона создаём в таймзоне мастера (с учётом DST),
    # а не с жёстким +03:00.
    tmpl_tz = fetch_master_tz(cur, schema, master_id)

    if start_date_str:
        start_d = datetime.strptime(start_date_str, '%Y-%m-%d').date()
    else:
        start_d = date.today() + timedelta(days=1)

    end_d = start_d + timedelta(weeks=weeks)

    # 1. Все выходные дни в диапазоне
    cur.execute(f"""
        SELECT block_date FROM {schema}.master_day_blocks
        WHERE master_id = {int(master_id)}
          AND COALESCE(reason, '') <> 'removed'
          AND block_date >= '{start_d}' AND block_date <= '{end_d}'
    """)
    blocked_dates = set(row['block_date'] for row in cur.fetchall())

    # 2. Активные брони в диапазоне (нужны для предупреждения при force)
    cur.execute(f"""
        SELECT id, datetime_start, datetime_end, client_name, status
        FROM {schema}.master_bookings
        WHERE master_id = {int(master_id)}
          AND status IN ('pending', 'confirmed')
          AND datetime_start >= '{start_d}'
          AND datetime_start <= '{end_d}'
        ORDER BY datetime_start
    """)
    active_bookings = cur.fetchall()

    # При force с реальными бронями требуем явное подтверждение через override_bookings=true.
    override_bookings = bool(body.get('override_bookings', False))
    if force and active_bookings and not override_bookings and not dry_run:
        conn.close()
        return {
            'statusCode': 409, 'headers': headers,
            'body': json.dumps({
                'error': 'has_active_bookings',
                'message': f'В диапазоне есть {len(active_bookings)} активных записей. '
                           f'Передайте override_bookings=true, чтобы пересоздать слоты (брони будут отменены).',
                'conflicts': [
                    {'id': b['id'], 'datetime_start': str(b['datetime_start']),
                     'client_name': b.get('client_name'), 'status': b['status']}
                    for b in active_bookings
                ],
            }, default=str, ensure_ascii=False),
        }

    created_slots = []
    conflicts = []
    skipped_blocked = []
    current_d = start_d
    while current_d <= end_d:
        dow = current_d.weekday()

        if current_d in blocked_dates:
            skipped_blocked.append(str(current_d))
            current_d += timedelta(days=1)
            continue

        day_rules = [r for r in rules if r['day_of_week'] == dow and not r['is_day_off']]
        for rule in day_rules:
            t_start = rule['time_start']
            t_end = rule['time_end']
            if isinstance(t_start, str):
                h, m = map(int, t_start.split(':')[:2])
                t_start = time(h, m)
            if isinstance(t_end, str):
                h, m = map(int, t_end.split(':')[:2])
                t_end = time(h, m)

            dt_start = wall_to_master_iso(datetime.combine(current_d, t_start), tmpl_tz)
            dt_end = wall_to_master_iso(datetime.combine(current_d, t_end), tmpl_tz)

            cur.execute(f"""
                SELECT id, status FROM {schema}.master_slots
                WHERE master_id = {int(master_id)}
                  AND datetime_start < '{dt_end}'
                  AND datetime_end > '{dt_start}'
                LIMIT 1
            """)
            existing = cur.fetchone()
            if existing:
                conflicts.append({
                    'slot_id': existing['id'], 'status': existing['status'],
                    'datetime_start': dt_start, 'datetime_end': dt_end,
                })
                if not force:
                    continue
                # force=true и override_bookings (если нужно): удаляем существующий
                if not dry_run:
                    # Отменяем все активные брони привязанные к этому слоту
                    cur.execute(f"""
                        UPDATE {schema}.master_bookings
                        SET status = 'canceled',
                            canceled_at = CURRENT_TIMESTAMP,
                            cancel_reason = 'Шаблон расписания заменил слот',
                            updated_at = CURRENT_TIMESTAMP
                        WHERE slot_id = {int(existing['id'])}
                          AND status IN ('pending', 'confirmed')
                    """)
                    cur.execute(f"DELETE FROM {schema}.master_slots WHERE id = {int(existing['id'])}")

            if dry_run:
                created_slots.append({'datetime_start': dt_start, 'datetime_end': dt_end})
                continue

            svc_val = f"{int(rule['service_id'])}" if rule['service_id'] else "NULL"
            max_cl = int(rule['max_clients'])
            addr_val = f"{int(rule['address_id'])}" if rule.get('address_id') else "NULL"

            cur.execute(f"""
                INSERT INTO {schema}.master_slots
                (master_id, service_id, datetime_start, datetime_end, max_clients, status, source, address_id)
                VALUES ({int(master_id)}, {svc_val}, '{dt_start}', '{dt_end}', {max_cl}, 'available', 'template', {addr_val})
                RETURNING id
            """)
            row = cur.fetchone()
            created_slots.append({'slot_id': row['id'], 'datetime_start': dt_start, 'datetime_end': dt_end})

        current_d += timedelta(days=1)

    if dry_run:
        conn.rollback()
    else:
        conn.commit()
    conn.close()

    return {
        'statusCode': 200,
        'headers': headers,
        'body': json.dumps({
            'success': True,
            'dry_run': dry_run,
            'created': len(created_slots),
            'skipped': len(conflicts) if not force else 0,
            'conflicts': conflicts,
            'blocked_dates': skipped_blocked,
            'overridden_bookings': len(active_bookings) if (force and override_bookings and not dry_run) else 0,
            'period': f"{start_d} - {end_d}"
        })
    }


# ─── Адреса мастера ──────────────────────────────────────────────────────────

MAX_ADDRESSES_PER_MASTER = 10
ALLOWED_ADDRESS_TYPES = {'home', 'studio', 'partner', 'other'}


def _address_to_dict(row):
    """Приводит строку master_addresses к JSON-сериализуемому виду."""
    return {
        'id': row['id'],
        'master_id': row['master_id'],
        'address_text': row['address_text'],
        'latitude': float(row['latitude']) if row.get('latitude') is not None else None,
        'longitude': float(row['longitude']) if row.get('longitude') is not None else None,
        'is_primary': bool(row['is_primary']),
        'address_type': row['address_type'],
        'created_at': str(row['created_at']) if row.get('created_at') else None,
        'updated_at': str(row['updated_at']) if row.get('updated_at') else None,
    }


def handle_addresses(event, method, params, schema, headers):
    """CRUD адресов мастера.

    GET    ?sub=addresses&master_id=X          — список адресов мастера
    POST   ?sub=addresses                      — добавить адрес (body: master_id, address_text, latitude, longitude, address_type, is_primary)
    PUT    ?sub=addresses                      — обновить адрес (body: id, master_id, ...)
    DELETE ?sub=addresses                      — удалить адрес (body: id, master_id) — только если не привязан к слотам/правилам шаблона
    """
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        if method == 'GET':
            master_id, err = require_master_id(params, headers)
            if err:
                return err
            cur.execute(f"""
                SELECT * FROM {schema}.master_addresses
                WHERE master_id = {int(master_id)}
                ORDER BY is_primary DESC, id
            """)
            rows = cur.fetchall()
            return {'statusCode': 200, 'headers': headers,
                    'body': json.dumps([_address_to_dict(r) for r in rows], ensure_ascii=False)}

        body = json.loads(event.get('body') or '{}')
        master_id = int(body.get('master_id', 0))
        if not master_id:
            return {'statusCode': 400, 'headers': headers,
                    'body': json.dumps({'error': 'master_id обязателен'}, ensure_ascii=False)}

        ok, deny = ensure_master_access(cur, schema, event, master_id, headers)
        if not ok:
            return deny

        if method == 'POST':
            address_text = (body.get('address_text') or '').strip()
            if not address_text:
                return {'statusCode': 400, 'headers': headers,
                        'body': json.dumps({'error': 'Укажите адрес'}, ensure_ascii=False)}

            cur.execute(f"SELECT COUNT(*) AS cnt FROM {schema}.master_addresses WHERE master_id = {master_id}")
            cnt = int(cur.fetchone()['cnt'])
            if cnt >= MAX_ADDRESSES_PER_MASTER:
                return {'statusCode': 400, 'headers': headers,
                        'body': json.dumps({'error': f'Можно добавить не более {MAX_ADDRESSES_PER_MASTER} адресов'}, ensure_ascii=False)}

            addr_type = body.get('address_type') or 'other'
            if addr_type not in ALLOWED_ADDRESS_TYPES:
                addr_type = 'other'
            lat = body.get('latitude')
            lon = body.get('longitude')
            lat_val = f"{float(lat)}" if lat is not None else "NULL"
            lon_val = f"{float(lon)}" if lon is not None else "NULL"
            # Первый адрес мастера автоматически становится основным.
            is_primary = bool(body.get('is_primary')) or cnt == 0
            addr_safe = address_text.replace("'", "''")

            if is_primary:
                cur.execute(f"UPDATE {schema}.master_addresses SET is_primary = false WHERE master_id = {master_id}")

            cur.execute(f"""
                INSERT INTO {schema}.master_addresses
                    (master_id, address_text, latitude, longitude, is_primary, address_type)
                VALUES ({master_id}, '{addr_safe}', {lat_val}, {lon_val}, {'true' if is_primary else 'false'}, '{addr_type}')
                RETURNING *
            """)
            row = cur.fetchone()
            conn.commit()
            return {'statusCode': 201, 'headers': headers,
                    'body': json.dumps(_address_to_dict(row), ensure_ascii=False)}

        if method == 'PUT':
            addr_id = int(body.get('id', 0))
            if not addr_id:
                return {'statusCode': 400, 'headers': headers,
                        'body': json.dumps({'error': 'id обязателен'}, ensure_ascii=False)}
            cur.execute(f"SELECT master_id FROM {schema}.master_addresses WHERE id = {addr_id}")
            owner = cur.fetchone()
            if not owner or owner['master_id'] != master_id:
                return {'statusCode': 404, 'headers': headers,
                        'body': json.dumps({'error': 'Адрес не найден'}, ensure_ascii=False)}

            updates = []
            if 'address_text' in body:
                txt = (body.get('address_text') or '').strip()
                if not txt:
                    return {'statusCode': 400, 'headers': headers,
                            'body': json.dumps({'error': 'Укажите адрес'}, ensure_ascii=False)}
                updates.append(f"address_text = '{txt.replace(chr(39), chr(39)+chr(39))}'")
            if 'latitude' in body:
                lat = body.get('latitude')
                updates.append(f"latitude = {float(lat) if lat is not None else 'NULL'}")
            if 'longitude' in body:
                lon = body.get('longitude')
                updates.append(f"longitude = {float(lon) if lon is not None else 'NULL'}")
            if 'address_type' in body:
                at = body.get('address_type') or 'other'
                if at not in ALLOWED_ADDRESS_TYPES:
                    at = 'other'
                updates.append(f"address_type = '{at}'")
            if not updates:
                return {'statusCode': 400, 'headers': headers,
                        'body': json.dumps({'error': 'Нечего обновлять'}, ensure_ascii=False)}
            updates.append("updated_at = CURRENT_TIMESTAMP")
            cur.execute(f"""
                UPDATE {schema}.master_addresses SET {', '.join(updates)}
                WHERE id = {addr_id} RETURNING *
            """)
            row = cur.fetchone()
            conn.commit()
            return {'statusCode': 200, 'headers': headers,
                    'body': json.dumps(_address_to_dict(row), ensure_ascii=False)}

        if method == 'DELETE':
            addr_id = int(body.get('id') or params.get('id') or 0)
            if not addr_id:
                return {'statusCode': 400, 'headers': headers,
                        'body': json.dumps({'error': 'id обязателен'}, ensure_ascii=False)}
            cur.execute(f"SELECT master_id, is_primary FROM {schema}.master_addresses WHERE id = {addr_id}")
            owner = cur.fetchone()
            if not owner or owner['master_id'] != master_id:
                return {'statusCode': 404, 'headers': headers,
                        'body': json.dumps({'error': 'Адрес не найден'}, ensure_ascii=False)}

            cur.execute(f"SELECT COUNT(*) AS cnt FROM {schema}.master_slots WHERE address_id = {addr_id}")
            slots_cnt = int(cur.fetchone()['cnt'])
            cur.execute(f"SELECT COUNT(*) AS cnt FROM {schema}.master_template_rules WHERE address_id = {addr_id}")
            rules_cnt = int(cur.fetchone()['cnt'])
            if slots_cnt > 0 or rules_cnt > 0:
                return {'statusCode': 409, 'headers': headers,
                        'body': json.dumps({
                            'error': 'address_in_use',
                            'message': 'Адрес используется в расписании или слотах. Сначала отвяжите его.',
                            'slots': slots_cnt, 'rules': rules_cnt,
                        }, ensure_ascii=False)}

            cur.execute(f"UPDATE {schema}.master_addresses SET is_primary = false WHERE id = {addr_id}")
            cur.execute(f"DELETE FROM {schema}.master_addresses WHERE id = {addr_id}")
            conn.commit()
            return {'statusCode': 200, 'headers': headers,
                    'body': json.dumps({'success': True}, ensure_ascii=False)}

        return {'statusCode': 405, 'headers': headers,
                'body': json.dumps({'error': 'Method not allowed'}, ensure_ascii=False)}
    finally:
        conn.close()


def handle_set_primary_address(event, method, params, schema, headers):
    """POST ?sub=set-primary-address — сделать адрес основным (снять флаг с других).
    body: { id, master_id }
    """
    if method != 'POST':
        return {'statusCode': 405, 'headers': headers, 'body': json.dumps({'error': 'POST only'})}
    body = json.loads(event.get('body') or '{}')
    master_id = int(body.get('master_id', 0))
    addr_id = int(body.get('id', 0))
    if not master_id or not addr_id:
        return {'statusCode': 400, 'headers': headers,
                'body': json.dumps({'error': 'id и master_id обязательны'}, ensure_ascii=False)}
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        ok, deny = ensure_master_access(cur, schema, event, master_id, headers)
        if not ok:
            return deny
        cur.execute(f"SELECT master_id FROM {schema}.master_addresses WHERE id = {addr_id}")
        owner = cur.fetchone()
        if not owner or owner['master_id'] != master_id:
            return {'statusCode': 404, 'headers': headers,
                    'body': json.dumps({'error': 'Адрес не найден'}, ensure_ascii=False)}
        cur.execute(f"UPDATE {schema}.master_addresses SET is_primary = false WHERE master_id = {master_id}")
        cur.execute(f"""
            UPDATE {schema}.master_addresses
            SET is_primary = true, updated_at = CURRENT_TIMESTAMP
            WHERE id = {addr_id} RETURNING *
        """)
        row = cur.fetchone()
        conn.commit()
        return {'statusCode': 200, 'headers': headers,
                'body': json.dumps(_address_to_dict(row), ensure_ascii=False)}
    finally:
        conn.close()


def handle_settings(event, method, params, schema, headers):
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    if method == 'GET':
        master_id, err = require_master_id(params, headers)
        if err:
            conn.close()
            return err
        cur.execute(f"SELECT * FROM {schema}.master_calendar_settings WHERE master_id = {int(master_id)}")
        row = cur.fetchone()
        conn.close()
        if not row:
            return {'statusCode': 200, 'headers': headers, 'body': json.dumps({
                'master_id': int(master_id),
                'default_slot_duration': 60,
                'break_between_slots': 15,
                'prep_time': 15,
                'max_clients_per_day': 5,
                'auto_confirm': False,
                'notify_new_booking': True,
                'notify_24h_reminder': True,
                'notify_cancellation': True,
                'timezone': 'Europe/Moscow'
            })}
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps(row, default=str)}

    if method in ('POST', 'PUT'):
        body = json.loads(event.get('body', '{}'))
        master_id = body.get('master_id', 1)

        cur.execute(f"SELECT id FROM {schema}.master_calendar_settings WHERE master_id = {int(master_id)}")
        exists = cur.fetchone()

        if exists:
            updates = []
            for field in ['default_slot_duration', 'break_between_slots', 'prep_time', 'max_clients_per_day']:
                if field in body:
                    updates.append(f"{field} = {int(body[field])}")
            for field in ['auto_confirm', 'notify_new_booking', 'notify_24h_reminder', 'notify_cancellation']:
                if field in body:
                    updates.append(f"{field} = {'true' if body[field] else 'false'}")
            if 'timezone' in body:
                tz = body['timezone'].replace("'", "''")
                updates.append(f"timezone = '{tz}'")

            if updates:
                updates.append("updated_at = CURRENT_TIMESTAMP")
                cur.execute(f"""
                    UPDATE {schema}.master_calendar_settings SET {', '.join(updates)}
                    WHERE master_id = {int(master_id)} RETURNING *
                """)
        else:
            cur.execute(f"""
                INSERT INTO {schema}.master_calendar_settings
                (master_id, default_slot_duration, break_between_slots, prep_time, max_clients_per_day,
                 auto_confirm, notify_new_booking, notify_24h_reminder, notify_cancellation, timezone)
                VALUES (
                    {int(master_id)},
                    {int(body.get('default_slot_duration', 60))},
                    {int(body.get('break_between_slots', 15))},
                    {int(body.get('prep_time', 15))},
                    {int(body.get('max_clients_per_day', 5))},
                    {'true' if body.get('auto_confirm') else 'false'},
                    {'true' if body.get('notify_new_booking', True) else 'false'},
                    {'true' if body.get('notify_24h_reminder', True) else 'false'},
                    {'true' if body.get('notify_cancellation', True) else 'false'},
                    '{body.get('timezone', 'Europe/Moscow').replace("'", "''")}'
                ) RETURNING *
            """)

        row = cur.fetchone()
        conn.commit()
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps(row, default=str)}

    conn.close()
    return {'statusCode': 405, 'headers': headers, 'body': json.dumps({'error': 'Method not allowed'})}


def handle_blocks(event, method, params, schema, headers):
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    if method == 'GET':
        master_id, err = require_master_id(params, headers)
        if err:
            conn.close()
            return err
        cur.execute(f"""
            SELECT * FROM {schema}.master_day_blocks
            WHERE master_id = {int(master_id)}
            ORDER BY block_date
        """)
        rows = cur.fetchall()
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps(rows, default=str)}

    if method == 'POST':
        body = json.loads(event.get('body', '{}'))
        master_id = body.get('master_id', 1)
        block_date = body['block_date']
        block_end_date = body.get('block_end_date')
        reason = (body.get('reason') or '').replace("'", "''")
        notes = (body.get('notes') or '').replace("'", "''")
        force = bool(body.get('force', False))

        dates_to_block = []
        start = datetime.strptime(block_date, '%Y-%m-%d').date()
        if block_end_date:
            end = datetime.strptime(block_end_date, '%Y-%m-%d').date()
        else:
            end = start

        d = start
        while d <= end:
            dates_to_block.append(d)
            d += timedelta(days=1)

        # Проверяем конфликты с активными бронями в указанном диапазоне
        cur.execute(f"""
            SELECT b.id, b.client_name, b.client_phone, b.datetime_start, b.status,
                   ms.name AS service_name
            FROM {schema}.master_bookings b
            LEFT JOIN {schema}.master_services ms ON ms.id = b.service_id
            WHERE b.master_id = {int(master_id)}
              AND b.archived_at IS NULL
              AND b.status NOT IN ('canceled', 'no_show', 'completed')
              AND b.datetime_start::date >= '{start}'
              AND b.datetime_start::date <= '{end}'
            ORDER BY b.datetime_start
        """)
        conflicts = cur.fetchall()

        if conflicts and not force:
            conn.close()
            return {
                'statusCode': 409,
                'headers': headers,
                'body': json.dumps({
                    'error': 'has_active_bookings',
                    'message': f'На выбранные дни уже есть {len(conflicts)} активных записей. Отмените их или подтвердите блокировку с переносом.',
                    'conflicts': [
                        {
                            'id': c['id'],
                            'client_name': c['client_name'],
                            'client_phone': c['client_phone'],
                            'datetime_start': str(c['datetime_start']),
                            'status': c['status'],
                            'service_name': c.get('service_name'),
                        } for c in conflicts
                    ],
                }, default=str),
            }

        # Если force=true — отменяем все конфликтующие брони с причиной 'master_blocked_day'
        canceled_bookings = 0
        if conflicts and force:
            ids = ','.join(str(c['id']) for c in conflicts)
            cur.execute(f"""
                UPDATE {schema}.master_bookings
                SET status = 'canceled',
                    cancel_reason = 'Мастер заблокировал день',
                    updated_at = CURRENT_TIMESTAMP
                WHERE id IN ({ids})
            """)
            canceled_bookings = len(conflicts)

        created = 0
        for bd in dates_to_block:
            cur.execute(f"""
                INSERT INTO {schema}.master_day_blocks (master_id, block_date, block_end_date, reason, notes)
                VALUES ({int(master_id)}, '{bd}', '{end}', '{reason}', '{notes}')
                ON CONFLICT (master_id, block_date) DO UPDATE SET
                    reason = EXCLUDED.reason, notes = EXCLUDED.notes, block_end_date = EXCLUDED.block_end_date
            """)
            created += 1

        conn.commit()
        conn.close()
        return {'statusCode': 201, 'headers': headers, 'body': json.dumps({
            'success': True,
            'blocked_days': created,
            'canceled_bookings': canceled_bookings,
        })}

    if method == 'DELETE':
        body = json.loads(event.get('body', '{}'))
        block_id = body.get('id') or params.get('id')

        cur.execute(f"""
            UPDATE {schema}.master_day_blocks SET reason = 'removed'
            WHERE id = {int(block_id)}
        """)

        conn.commit()
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'success': True})}

    conn.close()
    return {'statusCode': 405, 'headers': headers, 'body': json.dumps({'error': 'Method not allowed'})}


def handle_week_view(event, method, params, schema, headers):
    if method != 'GET':
        return {'statusCode': 405, 'headers': headers, 'body': json.dumps({'error': 'GET only'})}

    master_id, err = require_master_id(params, headers)
    if err:
        return err
    week_start = params.get('week_start')
    date_from = params.get('date_from')
    date_to = params.get('date_to')

    if date_from and date_to:
        start_d = datetime.strptime(date_from, '%Y-%m-%d').date()
        end_d = datetime.strptime(date_to, '%Y-%m-%d').date()
    elif week_start:
        start_d = datetime.strptime(week_start, '%Y-%m-%d').date()
        end_d = start_d + timedelta(days=6)
    else:
        today = date.today()
        start_d = today - timedelta(days=today.weekday())
        end_d = start_d + timedelta(days=6)

    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    # Берём TZ мастера, чтобы границы "день" совпадали с локальным временем,
    # а не UTC. Postgres ::date без AT TIME ZONE считает дату как в UTC.
    cur.execute(f"""
        SELECT COALESCE(timezone, 'Europe/Moscow') AS tz
        FROM {schema}.master_calendar_settings
        WHERE master_id = {int(master_id)}
    """)
    tz_row = cur.fetchone()
    master_tz = (tz_row.get('tz') if tz_row else 'Europe/Moscow') or 'Europe/Moscow'
    master_tz = master_tz.replace("'", "''")

    cur.execute(f"""
        SELECT s.*, ms.name as service_name, ms.duration_minutes, ms.price as service_price
        FROM {schema}.master_slots s
        LEFT JOIN {schema}.master_services ms ON s.service_id = ms.id
        WHERE s.master_id = {int(master_id)}
          AND (s.datetime_start AT TIME ZONE '{master_tz}')::date >= '{start_d}'
          AND (s.datetime_start AT TIME ZONE '{master_tz}')::date <= '{end_d}'
        ORDER BY s.datetime_start
    """)
    slots = cur.fetchall()

    cur.execute(f"""
        SELECT b.*, ms.name as service_name
        FROM {schema}.master_bookings b
        LEFT JOIN {schema}.master_services ms ON b.service_id = ms.id
        WHERE b.master_id = {int(master_id)}
          AND b.archived_at IS NULL
          AND (b.datetime_start AT TIME ZONE '{master_tz}')::date >= '{start_d}'
          AND (b.datetime_start AT TIME ZONE '{master_tz}')::date <= '{end_d}'
          AND b.status NOT IN ('canceled')
        ORDER BY b.datetime_start
    """)
    bookings = cur.fetchall()

    cur.execute(f"""
        SELECT * FROM {schema}.master_day_blocks
        WHERE master_id = {int(master_id)}
          AND block_date >= '{start_d}'
          AND block_date <= '{end_d}'
          AND reason != 'removed'
    """)
    blocks = cur.fetchall()

    conn.close()

    # Канон времени: отдаём слоты и брони в таймзоне мастера с явным offset.
    localize_rows(slots, master_tz)
    localize_rows(bookings, master_tz)

    return {
        'statusCode': 200,
        'headers': headers,
        'body': json.dumps({
            'week_start': str(start_d),
            'week_end': str(end_d),
            'slots': slots,
            'bookings': bookings,
            'blocks': blocks,
            'timezone': master_tz,
        }, default=str)
    }