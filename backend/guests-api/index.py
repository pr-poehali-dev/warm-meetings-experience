import json
import os
import psycopg2
import psycopg2.extras
import requests as http_requests

NOTIFY_MODULE_URL = "https://functions.poehali.dev/47bb36f1-5d1a-45e7-86e3-bd7a07a3d8de"

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Authorization, X-Session-Token, X-Admin-Token',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json',
}


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def get_schema():
    return os.environ.get('MAIN_DB_SCHEMA', 'public')


def get_user_from_token(cur, schema, token):
    if not token:
        return None
    t = token.replace("'", "''")
    cur.execute(f"""
        SELECT u.id, u.name, u.email
        FROM {schema}.user_sessions s
        JOIN {schema}.users u ON u.id = s.user_id
        WHERE s.token = '{t}' AND s.expires_at > NOW() AND u.is_active = true
    """)
    return cur.fetchone()


def has_role(cur, schema, user_id, *slugs):
    slug_list = ', '.join(f"'{s}'" for s in slugs)
    cur.execute(f"""
        SELECT 1 FROM {schema}.user_roles ur
        JOIN {schema}.roles r ON r.id = ur.role_id
        WHERE ur.user_id = {user_id} AND r.slug IN ({slug_list}) AND ur.status = 'active'
    """)
    return cur.fetchone() is not None


def respond(status, body, h=None):
    return {'statusCode': status, 'headers': h or CORS_HEADERS,
            'body': json.dumps(body, default=str, ensure_ascii=False), 'isBase64Encoded': False}


def handler(event: dict, context) -> dict:
    """Guests API — список гостей события и диалоги с ними."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': '', 'isBase64Encoded': False}

    params = event.get('queryStringParameters') or {}
    method = event.get('httpMethod', 'GET')
    resource = params.get('resource', '')

    # Публичный ресурс — диалог гостя по reply_token, без авторизации
    if resource == 'public_chat':
        conn = get_conn()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        schema = get_schema()
        try:
            return handle_public_chat(event, method, params, cur, conn, schema)
        finally:
            try:
                conn.close()
            except Exception:
                pass

    token = (event.get('headers') or {}).get('X-Session-Token') or \
            (event.get('headers') or {}).get('x-session-token') or \
            (event.get('headers') or {}).get('X-Authorization', '').replace('Bearer ', '') or \
            (event.get('headers') or {}).get('x-authorization', '').replace('Bearer ', '')
    if not token:
        return respond(401, {'error': 'Unauthorized'})

    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    schema = get_schema()

    user = get_user_from_token(cur, schema, token)
    if not user:
        conn.close()
        return respond(401, {'error': 'Invalid token'})

    user_id = user['id']

    if not has_role(cur, schema, user_id, 'organizer', 'admin'):
        conn.close()
        return respond(403, {'error': 'Forbidden'})

    admin = has_role(cur, schema, user_id, 'admin')

    if resource == 'guests':
        return handle_guests(event, method, params, cur, conn, user_id, schema, admin)

    if resource == 'messages':
        return handle_messages(event, method, params, cur, conn, user_id, schema, admin, token)

    conn.close()
    return respond(404, {'error': 'Resource not found'})


def handle_guests(event, method, params, cur, conn, user_id, schema, admin):
    """Гости события: список, обновление статуса."""
    event_id = params.get('event_id')
    if not event_id:
        conn.close()
        return respond(400, {'error': 'event_id required'})

    cur.execute(f"""
        SELECT id, organizer_id, title, event_date, start_time, bath_name,
               total_spots, spots_left, slug
        FROM {schema}.events
        WHERE id = {event_id}
          AND (organizer_id = {user_id} {'OR 1=1' if admin else ''})
    """)
    ev = cur.fetchone()
    if not ev:
        conn.close()
        return respond(404, {'error': 'Event not found'})

    if method == 'GET':
        # Считаем сообщения одним проходом по guest_messages для всего события
        # (LEFT JOIN + GROUP BY) — это убирает N+1 (по подзапросу на каждого гостя).
        cur.execute(f"""
            SELECT s.id, s.name, s.phone, s.email, s.telegram,
                   s.status, s.preferred_channel, s.created_at, s.wrote_at,
                   s.user_id,
                   u.tg_chat_id, u.vk_id, u.notify_telegram, u.notify_vk,
                   u.notify_email, u.notify_sms,
                   COALESCE(gm.messages_count, 0) AS messages_count
            FROM {schema}.event_signups s
            LEFT JOIN {schema}.users u ON u.id = s.user_id
            LEFT JOIN (
                SELECT signup_id, COUNT(*) AS messages_count
                FROM {schema}.guest_messages
                WHERE signup_id IN (
                    SELECT id FROM {schema}.event_signups WHERE event_id = {event_id}
                )
                GROUP BY signup_id
            ) gm ON gm.signup_id = s.id
            WHERE s.event_id = {event_id}
            ORDER BY s.created_at ASC
        """)
        guests = [dict(g) for g in cur.fetchall()]
        spots_confirmed = sum(1 for g in guests if g['status'] in ('confirmed', 'paid', 'подтверждён', 'оплачено'))
        spots_waiting = sum(1 for g in guests if g['status'] in ('new', 'новая', 'wrote'))
        conn.close()
        return respond(200, {
            'event': dict(ev),
            'guests': guests,
            'stats': {
                'total': len(guests),
                'confirmed': spots_confirmed,
                'waiting': spots_waiting,
                'spots_left': ev['spots_left'] or 0,
                'total_spots': ev['total_spots'] or 0,
            }
        })

    if method == 'PUT':
        body = json.loads(event.get('body', '{}'))
        signup_id = body.get('signup_id')
        new_status = body.get('status')
        if not signup_id or not new_status:
            conn.close()
            return respond(400, {'error': 'signup_id and status required'})

        cur.execute(f"SELECT status FROM {schema}.event_signups WHERE id = {signup_id} AND event_id = {event_id}")
        old = cur.fetchone()
        if not old:
            conn.close()
            return respond(404, {'error': 'Signup not found'})

        old_status = old['status']
        cur.execute(f"UPDATE {schema}.event_signups SET status = '{new_status}' WHERE id = {signup_id}")

        was_confirmed = old_status in ('confirmed', 'paid', 'подтверждён', 'оплачено')
        now_confirmed = new_status in ('confirmed', 'paid', 'подтверждён', 'оплачено')
        now_refused = new_status in ('cancelled', 'отменено', 'refused')

        if not was_confirmed and now_confirmed:
            cur.execute(f"UPDATE {schema}.events SET spots_left = GREATEST(0, spots_left - 1) WHERE id = {event_id}")
        elif was_confirmed and (now_refused or new_status in ('new', 'новая')):
            cur.execute(f"UPDATE {schema}.events SET spots_left = LEAST(total_spots, spots_left + 1) WHERE id = {event_id}")

        conn.commit()
        conn.close()
        return respond(200, {'ok': True})

    conn.close()
    return respond(405, {'error': 'Method not allowed'})


def handle_messages(event, method, params, cur, conn, user_id, schema, admin, session_token):
    """История диалогов и отправка сообщений гостям."""
    signup_id = params.get('signup_id')

    if method == 'GET':
        if not signup_id:
            conn.close()
            return respond(400, {'error': 'signup_id required'})
        cur.execute(f"""
            SELECT gm.id, gm.direction, gm.channel, gm.body, gm.delivered, gm.created_at
            FROM {schema}.guest_messages gm
            JOIN {schema}.event_signups s ON s.id = gm.signup_id
            JOIN {schema}.events e ON e.id = s.event_id
            WHERE gm.signup_id = {signup_id}
              AND (e.organizer_id = {user_id} {'OR 1=1' if admin else ''})
            ORDER BY gm.created_at ASC
        """)
        messages = [dict(m) for m in cur.fetchall()]
        conn.close()
        return respond(200, {'messages': messages})

    if method == 'POST':
        body = json.loads(event.get('body', '{}'))
        signup_ids = body.get('signup_ids', [])
        text = (body.get('message') or '').strip()
        if not signup_ids or not text:
            conn.close()
            return respond(400, {'error': 'signup_ids and message required'})

        conn.close()

        # Делегируем отправку в notify-module — единая точка логики доставки
        try:
            resp = http_requests.post(
                f"{NOTIFY_MODULE_URL}?resource=send",
                json={'signup_ids': signup_ids, 'body_html': text, 'channel': 'auto'},
                headers={'X-Session-Token': session_token, 'Content-Type': 'application/json'},
                timeout=25,
            )
            try:
                data = resp.json()
            except Exception:
                data = {'raw': resp.text}
            print(f"[guests-api send] notify status={resp.status_code} data={data}")
        except Exception as e:
            print(f"[guests-api send] notify EXCEPTION: {e}")
            return respond(500, {'error': str(e)})

        # notify-module вернул ошибку — пробрасываем в UI понятно
        if resp.status_code >= 400 or (isinstance(data, dict) and 'error' in data):
            err_text = (data or {}).get('error') if isinstance(data, dict) else f"HTTP {resp.status_code}"
            return respond(200, {
                'ok': False,
                'sent': [{'signup_id': sid, 'channel': 'auto',
                          'delivered': False, 'error': err_text or f"HTTP {resp.status_code}"}
                         for sid in signup_ids],
                'errors': [err_text or f"HTTP {resp.status_code}"],
            })

        sent_list = []
        failures = data.get('failures') or []
        failed_ids = set()
        for f in failures:
            fsid = f.get('signup_id') or f.get('booking_id')
            failed_ids.add(fsid)
            sent_list.append({'signup_id': fsid, 'channel': f.get('channel', 'auto'),
                              'delivered': False, 'error': f.get('reason')})

        sent_count = int(data.get('sent') or 0)
        if sent_count > 0:
            by_ch = data.get('by_channel') or {}
            actual_channel = next((ch for ch, c in by_ch.items() if c > 0), 'auto')
            for sid in signup_ids:
                if sid not in failed_ids:
                    sent_list.append({'signup_id': sid, 'channel': actual_channel,
                                      'delivered': True, 'error': None})

        if not sent_list:
            sent_list = [{'signup_id': sid, 'channel': 'auto', 'delivered': False,
                          'error': 'notify-module не вернул результат: ' + str(data)[:200]}
                         for sid in signup_ids]

        return respond(200, {'ok': sent_count > 0, 'sent': sent_list, 'errors': []})

    conn.close()
    return respond(405, {'error': 'Method not allowed'})


def handle_public_chat(event, method, params, cur, conn, schema):
    """Публичный чат гостя по reply_token (без авторизации).

    GET  ?resource=public_chat&token=...      — переписка + контекст события
    POST ?resource=public_chat  body: {token, message} — отправить ответ организатору
    """
    token = (params.get('token') or '').strip()
    body_json = {}
    if method == 'POST':
        try:
            body_json = json.loads(event.get('body') or '{}')
        except Exception:
            body_json = {}
        token = (body_json.get('token') or token).strip()

    if not token or len(token) > 64 or not all(c.isalnum() for c in token):
        return respond(400, {'error': 'invalid token'})

    t = token.replace("'", "''")
    cur.execute(f"""
        SELECT s.id AS signup_id, s.event_id, s.name AS guest_name,
               e.title AS event_title, e.event_date, e.start_time,
               u.name AS organizer_name
        FROM {schema}.event_signups s
        JOIN {schema}.events e ON e.id = s.event_id
        LEFT JOIN {schema}.users u ON u.id = e.organizer_id
        WHERE s.reply_token = '{t}'
        LIMIT 1
    """)
    row = cur.fetchone()
    if not row:
        return respond(404, {'error': 'not found'})

    signup_id = int(row['signup_id'])
    event_id = int(row['event_id'])

    if method == 'POST':
        text = (body_json.get('message') or '').strip()
        if not text:
            return respond(400, {'error': 'message required'})
        if len(text) > 5000:
            text = text[:5000]
        t_esc = text.replace("'", "''")
        cur.execute(f"""
            INSERT INTO {schema}.guest_messages (event_id, signup_id, direction, channel, body, delivered)
            VALUES ({event_id}, {signup_id}, 'in', 'site', '{t_esc}', true)
            RETURNING id, direction, channel, body, delivered, created_at
        """)
        new_msg = cur.fetchone()
        cur.execute(f"""
            UPDATE {schema}.event_signups
            SET wrote_at = COALESCE(wrote_at, NOW()),
                status = CASE WHEN status IN ('new', 'новая') THEN 'wrote' ELSE status END
            WHERE id = {signup_id}
        """)
        conn.commit()
        return respond(200, {'ok': True, 'message': dict(new_msg)})

    # GET
    cur.execute(f"""
        SELECT id, direction, channel, body, delivered, created_at
        FROM {schema}.guest_messages
        WHERE signup_id = {signup_id}
        ORDER BY created_at ASC
        LIMIT 500
    """)
    messages = [dict(m) for m in cur.fetchall()]

    cur.execute(f"""
        UPDATE {schema}.guest_messages
        SET read_at = NOW()
        WHERE signup_id = {signup_id} AND direction = 'out' AND read_at IS NULL
    """)
    conn.commit()

    event_date = row.get('event_date')
    start_time = row.get('start_time')
    return respond(200, {
        'guest_name': row.get('guest_name'),
        'event': {
            'id': event_id,
            'title': row.get('event_title'),
            'date': str(event_date) if event_date else None,
            'start_time': str(start_time) if start_time else None,
        },
        'organizer_name': row.get('organizer_name'),
        'messages': messages,
    })