import json
import psycopg2.extras
from shared import get_conn
from booking_validator import ensure_master_access


def _esc(v):
    return (v or '').replace("'", "''")


def handle_chat(event, method, params, schema, headers):
    """Чат мастер↔гость поверх таблицы client_messages (source_type='master_booking').

    Авторизованные подресурсы (мастер, по X-Session-Token):
      GET  ?resource=chat&sub=dialogs&master_id=   — список диалогов (брони с перепиской)
      GET  ?resource=chat&sub=messages&booking_id= — сообщения по брони
      POST ?resource=chat&sub=send  body:{master_id, booking_id, message} — мастер пишет гостю

    Публичный подресурс (гость, по reply_token, без авторизации):
      GET  ?resource=chat&sub=public&token=        — переписка + контекст брони
      POST ?resource=chat&sub=public body:{token, message} — гость пишет мастеру
    """
    sub = params.get('sub') or 'dialogs'
    if sub == 'public':
        return handle_public(event, method, params, schema, headers)
    if sub == 'dialogs':
        return handle_dialogs(event, method, params, schema, headers)
    if sub == 'messages':
        return handle_messages(event, method, params, schema, headers)
    if sub == 'send':
        return handle_send(event, method, params, schema, headers)
    return {'statusCode': 400, 'headers': headers,
            'body': json.dumps({'error': 'Unknown chat sub'}, ensure_ascii=False)}


def handle_dialogs(event, method, params, schema, headers):
    """Список диалогов мастера: каждая бронь с перепиской + последнее сообщение + непрочитанные."""
    if method != 'GET':
        return {'statusCode': 405, 'headers': headers, 'body': json.dumps({'error': 'GET only'})}
    master_id = params.get('master_id')
    if not master_id:
        return {'statusCode': 400, 'headers': headers,
                'body': json.dumps({'error': 'master_id обязателен'}, ensure_ascii=False)}
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        # owner_id мастера = users.id владельца профиля. Берём его из таблицы masters.
        cur.execute(f"SELECT user_id FROM {schema}.masters WHERE id = {int(master_id)}")
        m = cur.fetchone()
        if not m:
            return {'statusCode': 404, 'headers': headers,
                    'body': json.dumps({'error': 'Мастер не найден'}, ensure_ascii=False)}

        ok, deny = ensure_master_access(cur, schema, event, master_id, headers)
        if not ok:
            return deny

        # Все брони мастера, у которых есть хотя бы одно сообщение,
        # + последнее сообщение и счётчик непрочитанных (входящих от гостя).
        cur.execute(f"""
            SELECT b.id AS booking_id, b.client_name, b.client_phone, b.status,
                   b.datetime_start, b.reply_token,
                   ms.name AS service_name,
                   lm.body AS last_body, lm.direction AS last_direction,
                   lm.created_at AS last_at,
                   COALESCE(unread.cnt, 0) AS unread_count,
                   total.cnt AS messages_count
            FROM {schema}.master_bookings b
            LEFT JOIN {schema}.master_services ms ON ms.id = b.service_id
            JOIN (
                SELECT source_id, COUNT(*) AS cnt
                FROM {schema}.client_messages
                WHERE source_type = 'master_booking'
                GROUP BY source_id
            ) total ON total.source_id = b.id
            LEFT JOIN LATERAL (
                SELECT body, direction, created_at
                FROM {schema}.client_messages
                WHERE source_type = 'master_booking' AND source_id = b.id
                ORDER BY created_at DESC LIMIT 1
            ) lm ON true
            LEFT JOIN (
                SELECT source_id, COUNT(*) AS cnt
                FROM {schema}.client_messages
                WHERE source_type = 'master_booking' AND direction = 'in' AND read_at IS NULL
                GROUP BY source_id
            ) unread ON unread.source_id = b.id
            WHERE b.master_id = {int(master_id)} AND b.archived_at IS NULL
            ORDER BY lm.created_at DESC NULLS LAST
        """)
        dialogs = [dict(r) for r in cur.fetchall()]
        return {'statusCode': 200, 'headers': headers,
                'body': json.dumps({'dialogs': dialogs}, default=str, ensure_ascii=False)}
    finally:
        conn.close()


def handle_messages(event, method, params, schema, headers):
    """Сообщения конкретной брони (для мастера). Помечает входящие прочитанными."""
    if method != 'GET':
        return {'statusCode': 405, 'headers': headers, 'body': json.dumps({'error': 'GET only'})}
    booking_id = params.get('booking_id')
    if not booking_id:
        return {'statusCode': 400, 'headers': headers,
                'body': json.dumps({'error': 'booking_id обязателен'}, ensure_ascii=False)}
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        cur.execute(f"""
            SELECT master_id, client_name FROM {schema}.master_bookings WHERE id = {int(booking_id)}
        """)
        b = cur.fetchone()
        if not b:
            return {'statusCode': 404, 'headers': headers,
                    'body': json.dumps({'error': 'Бронь не найдена'}, ensure_ascii=False)}

        ok, deny = ensure_master_access(cur, schema, event, b['master_id'], headers)
        if not ok:
            return deny

        cur.execute(f"""
            SELECT id, direction, channel, body, delivered, created_at, read_at
            FROM {schema}.client_messages
            WHERE source_type = 'master_booking' AND source_id = {int(booking_id)}
            ORDER BY created_at ASC LIMIT 500
        """)
        messages = [dict(m) for m in cur.fetchall()]

        # Помечаем входящие (от гостя) прочитанными
        cur.execute(f"""
            UPDATE {schema}.client_messages
            SET read_at = NOW()
            WHERE source_type = 'master_booking' AND source_id = {int(booking_id)}
              AND direction = 'in' AND read_at IS NULL
        """)
        conn.commit()
        return {'statusCode': 200, 'headers': headers,
                'body': json.dumps({'messages': messages, 'client_name': b['client_name']},
                                   default=str, ensure_ascii=False)}
    finally:
        conn.close()


def handle_send(event, method, params, schema, headers):
    """Мастер отправляет сообщение гостю (direction='out', channel='site')."""
    if method != 'POST':
        return {'statusCode': 405, 'headers': headers, 'body': json.dumps({'error': 'POST only'})}
    try:
        body = json.loads(event.get('body') or '{}')
    except (ValueError, TypeError):
        body = {}
    booking_id = body.get('booking_id')
    text = (body.get('message') or '').strip()[:5000]
    if not booking_id or not text:
        return {'statusCode': 400, 'headers': headers,
                'body': json.dumps({'error': 'booking_id и message обязательны'}, ensure_ascii=False)}
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        cur.execute(f"""
            SELECT b.master_id, m.user_id
            FROM {schema}.master_bookings b
            JOIN {schema}.masters m ON m.id = b.master_id
            WHERE b.id = {int(booking_id)}
        """)
        b = cur.fetchone()
        if not b:
            return {'statusCode': 404, 'headers': headers,
                    'body': json.dumps({'error': 'Бронь не найдена'}, ensure_ascii=False)}

        ok, deny = ensure_master_access(cur, schema, event, b['master_id'], headers)
        if not ok:
            return deny

        owner_id = b['user_id']
        cur.execute(f"""
            INSERT INTO {schema}.client_messages
                (owner_id, source_type, source_id, direction, channel, body, delivered)
            VALUES ({int(owner_id) if owner_id else 'NULL'}, 'master_booking', {int(booking_id)},
                    'out', 'site', '{_esc(text)}', true)
            RETURNING id, direction, channel, body, delivered, created_at
        """)
        new_msg = cur.fetchone()
        conn.commit()
        return {'statusCode': 200, 'headers': headers,
                'body': json.dumps({'ok': True, 'message': dict(new_msg)},
                                   default=str, ensure_ascii=False)}
    finally:
        conn.close()


def handle_public(event, method, params, schema, headers):
    """Публичный чат гостя по reply_token (без авторизации)."""
    token = (params.get('token') or '').strip()
    body_json = {}
    if method == 'POST':
        try:
            body_json = json.loads(event.get('body') or '{}')
        except (ValueError, TypeError):
            body_json = {}
        token = (body_json.get('token') or token).strip()

    if not token or len(token) > 64 or not all(c.isalnum() for c in token):
        return {'statusCode': 400, 'headers': headers,
                'body': json.dumps({'error': 'invalid token'}, ensure_ascii=False)}

    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        t = token.replace("'", "''")
        cur.execute(f"""
            SELECT b.id AS booking_id, b.client_name, b.status, b.datetime_start,
                   ms.name AS service_name, mp.name AS master_name
            FROM {schema}.master_bookings b
            LEFT JOIN {schema}.master_services ms ON ms.id = b.service_id
            LEFT JOIN {schema}.masters mm ON mm.id = b.master_id
            LEFT JOIN {schema}.users mp ON mp.id = mm.user_id
            WHERE b.reply_token = '{t}'
            LIMIT 1
        """)
        row = cur.fetchone()
        if not row:
            return {'statusCode': 404, 'headers': headers,
                    'body': json.dumps({'error': 'not found'}, ensure_ascii=False)}
        booking_id = int(row['booking_id'])

        if method == 'POST':
            text = (body_json.get('message') or '').strip()[:5000]
            if not text:
                return {'statusCode': 400, 'headers': headers,
                        'body': json.dumps({'error': 'message required'}, ensure_ascii=False)}
            # owner_id мастера
            cur.execute(f"""
                SELECT m.user_id FROM {schema}.master_bookings b
                JOIN {schema}.masters m ON m.id = b.master_id WHERE b.id = {booking_id}
            """)
            owner = cur.fetchone()
            owner_id = owner['user_id'] if owner else None
            cur.execute(f"""
                INSERT INTO {schema}.client_messages
                    (owner_id, source_type, source_id, direction, channel, body, delivered)
                VALUES ({int(owner_id) if owner_id else 'NULL'}, 'master_booking', {booking_id},
                        'in', 'site', '{_esc(text)}', true)
                RETURNING id, direction, channel, body, delivered, created_at
            """)
            new_msg = cur.fetchone()
            conn.commit()
            return {'statusCode': 200, 'headers': headers,
                    'body': json.dumps({'ok': True, 'message': dict(new_msg)},
                                       default=str, ensure_ascii=False)}

        # GET — переписка + пометка исходящих (от мастера) прочитанными
        cur.execute(f"""
            SELECT id, direction, channel, body, delivered, created_at
            FROM {schema}.client_messages
            WHERE source_type = 'master_booking' AND source_id = {booking_id}
            ORDER BY created_at ASC LIMIT 500
        """)
        messages = [dict(m) for m in cur.fetchall()]
        cur.execute(f"""
            UPDATE {schema}.client_messages
            SET read_at = NOW()
            WHERE source_type = 'master_booking' AND source_id = {booking_id}
              AND direction = 'out' AND read_at IS NULL
        """)
        conn.commit()
        dt = row.get('datetime_start')
        return {'statusCode': 200, 'headers': headers,
                'body': json.dumps({
                    'guest_name': row.get('client_name'),
                    'master_name': row.get('master_name'),
                    'service_name': row.get('service_name'),
                    'status': row.get('status'),
                    'datetime_start': str(dt) if dt else None,
                    'messages': messages,
                }, default=str, ensure_ascii=False)}
    finally:
        conn.close()
