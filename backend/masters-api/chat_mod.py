import json
import os
import psycopg2.extras
from shared import get_conn, send_email, tg_send
from booking_validator import ensure_master_access


def _esc(v):
    return (v or '').replace("'", "''")


def _notify_master_about_message(cur, schema, booking_id, guest_name, text):
    """Уведомляет мастера (email + Telegram) о новом сообщении от гостя.
    Все ошибки молча проглатываются — уведомление не должно ломать отправку.
    """
    try:
        cur.execute(f"""
            SELECT m.id AS master_id, m.name AS master_name, m.slug, m.user_id,
                   u.email,
                   COALESCE(u.notify_email, true) AS notify_email,
                   u.notify_telegram AS notify_telegram,
                   u.tg_chat_id AS user_tg,
                   la.telegram_user_id AS linked_tg
            FROM {schema}.master_bookings b
            JOIN {schema}.masters m ON m.id = b.master_id
            LEFT JOIN {schema}.users u ON u.id = m.user_id
            LEFT JOIN (
                SELECT DISTINCT ON (user_id) user_id, telegram_user_id
                FROM {schema}.tg_linked_accounts
                ORDER BY user_id, linked_at DESC
            ) la ON la.user_id = m.user_id
            WHERE b.id = {int(booking_id)}
        """)
        m = cur.fetchone()
        if not m:
            return

        base = (os.environ.get('SITE_URL') or 'https://sparcom.ru').rstrip('/')
        cabinet_link = f'{base}/workspace?tab=master'
        preview = text if len(text) <= 300 else text[:300] + '…'
        guest = guest_name or 'Гость'

        # Email
        if m.get('email') and m.get('notify_email') is not False:
            subject = f'Новое сообщение от {guest}'
            body_html = f"""
            <div style="font-family: -apple-system, Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #2d2318;">
                <h2 style="color: #0f172a;">Новое сообщение в чате</h2>
                <p><b>{guest}</b> написал(а) вам:</p>
                <p style="margin: 16px 0; padding: 12px 14px; background: #f1f5f9;
                          border-radius: 10px; white-space: pre-wrap;">{preview}</p>
                <p style="margin-top: 20px;"><a href="{cabinet_link}"
                   style="display: inline-block; padding: 10px 18px; background: #0ea5e9;
                   color: #fff; border-radius: 8px; text-decoration: none;">Ответить в кабинете</a></p>
            </div>
            """.strip()
            send_email(m['email'], subject, body_html, tags=['master-chat-message'])

        # Telegram
        tg_chat_id = m.get('linked_tg') or m.get('user_tg')
        tg_disabled = m.get('notify_telegram') is False and not m.get('linked_tg')
        if tg_chat_id and not tg_disabled:
            tg_text = (
                f'💬 <b>Новое сообщение от {guest}</b>\n\n'
                f'{preview}\n\n'
                f'<i>Ответьте в кабинете мастера.</i>'
            )
            tg_send(tg_chat_id, tg_text)
    except Exception:
        pass


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
    if sub == 'unread_count':
        return handle_unread_count(event, method, params, schema, headers)
    return {'statusCode': 400, 'headers': headers,
            'body': json.dumps({'error': 'Unknown chat sub'}, ensure_ascii=False)}


def handle_unread_count(event, method, params, schema, headers):
    """Количество непрочитанных сообщений от гостей по всем бронированиям мастера."""
    if method != 'GET':
        return {'statusCode': 405, 'headers': headers, 'body': json.dumps({'error': 'GET only'})}
    master_id = params.get('master_id')
    if not master_id:
        return {'statusCode': 400, 'headers': headers,
                'body': json.dumps({'error': 'master_id обязателен'}, ensure_ascii=False)}
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        ok, deny = ensure_master_access(cur, schema, event, master_id, headers)
        if not ok:
            return deny
        cur.execute(f"""
            SELECT
              (SELECT COUNT(*) FROM {schema}.client_messages cm
                 JOIN {schema}.master_bookings b ON b.id = cm.source_id
                 WHERE cm.source_type = 'master_booking'
                   AND cm.direction = 'in' AND cm.read_at IS NULL
                   AND b.master_id = {int(master_id)})
              +
              (SELECT COUNT(*) FROM {schema}.client_messages cm
                 JOIN {schema}.master_inquiries q ON q.id = cm.source_id
                 WHERE cm.source_type = 'master_inquiry'
                   AND cm.direction = 'in' AND cm.read_at IS NULL
                   AND q.master_id = {int(master_id)})
              AS cnt
        """)
        row = cur.fetchone()
        return {'statusCode': 200, 'headers': headers,
                'body': json.dumps({'unread': int(row['cnt']) if row else 0}, ensure_ascii=False)}
    finally:
        conn.close()


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

        # Диалоги по броням + обращениям без брони. Единый формат строки.
        cur.execute(f"""
            (
            SELECT 'booking' AS source, b.id AS id, b.client_name AS client_name,
                   b.client_phone AS client_phone, b.status AS status,
                   b.datetime_start AS datetime_start, b.reply_token AS reply_token,
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
            )
            UNION ALL
            (
            SELECT 'inquiry' AS source, q.id AS id, q.guest_name AS client_name,
                   q.guest_contact AS client_phone, q.status AS status,
                   NULL::timestamp AS datetime_start, q.reply_token AS reply_token,
                   'Вопрос мастеру' AS service_name,
                   lm.body AS last_body, lm.direction AS last_direction,
                   lm.created_at AS last_at,
                   COALESCE(unread.cnt, 0) AS unread_count,
                   total.cnt AS messages_count
            FROM {schema}.master_inquiries q
            JOIN (
                SELECT source_id, COUNT(*) AS cnt
                FROM {schema}.client_messages
                WHERE source_type = 'master_inquiry'
                GROUP BY source_id
            ) total ON total.source_id = q.id
            LEFT JOIN LATERAL (
                SELECT body, direction, created_at
                FROM {schema}.client_messages
                WHERE source_type = 'master_inquiry' AND source_id = q.id
                ORDER BY created_at DESC LIMIT 1
            ) lm ON true
            LEFT JOIN (
                SELECT source_id, COUNT(*) AS cnt
                FROM {schema}.client_messages
                WHERE source_type = 'master_inquiry' AND direction = 'in' AND read_at IS NULL
                GROUP BY source_id
            ) unread ON unread.source_id = q.id
            WHERE q.master_id = {int(master_id)}
            )
            ORDER BY last_at DESC NULLS LAST
        """)
        dialogs = []
        for r in cur.fetchall():
            d = dict(r)
            # booking_id оставляем для обратной совместимости с фронтом
            d['booking_id'] = d['id']
            dialogs.append(d)
        return {'statusCode': 200, 'headers': headers,
                'body': json.dumps({'dialogs': dialogs}, default=str, ensure_ascii=False)}
    finally:
        conn.close()


def _resolve_thread(cur, schema, source, thread_id):
    """Возвращает (source_type, master_id, owner_id, client_name) для брони/обращения
    или None, если не найдено."""
    if source == 'inquiry':
        cur.execute(f"""
            SELECT q.master_id, q.guest_name AS client_name, m.user_id AS owner_id
            FROM {schema}.master_inquiries q
            JOIN {schema}.masters m ON m.id = q.master_id
            WHERE q.id = {int(thread_id)}
        """)
        r = cur.fetchone()
        if not r:
            return None
        return ('master_inquiry', r['master_id'], r['owner_id'], r['client_name'])
    cur.execute(f"""
        SELECT b.master_id, b.client_name, m.user_id AS owner_id
        FROM {schema}.master_bookings b
        JOIN {schema}.masters m ON m.id = b.master_id
        WHERE b.id = {int(thread_id)}
    """)
    r = cur.fetchone()
    if not r:
        return None
    return ('master_booking', r['master_id'], r['owner_id'], r['client_name'])


def handle_messages(event, method, params, schema, headers):
    """Сообщения конкретного диалога (брони или обращения). Помечает входящие прочитанными."""
    if method != 'GET':
        return {'statusCode': 405, 'headers': headers, 'body': json.dumps({'error': 'GET only'})}
    source = params.get('source') or 'booking'
    thread_id = params.get('booking_id') or params.get('thread_id')
    if not thread_id:
        return {'statusCode': 400, 'headers': headers,
                'body': json.dumps({'error': 'booking_id обязателен'}, ensure_ascii=False)}
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        resolved = _resolve_thread(cur, schema, source, thread_id)
        if not resolved:
            return {'statusCode': 404, 'headers': headers,
                    'body': json.dumps({'error': 'Диалог не найден'}, ensure_ascii=False)}
        source_type, master_id, owner_id, client_name = resolved

        ok, deny = ensure_master_access(cur, schema, event, master_id, headers)
        if not ok:
            return deny

        cur.execute(f"""
            SELECT id, direction, channel, body, delivered, created_at, read_at
            FROM {schema}.client_messages
            WHERE source_type = '{source_type}' AND source_id = {int(thread_id)}
            ORDER BY created_at ASC LIMIT 500
        """)
        messages = [dict(m) for m in cur.fetchall()]

        cur.execute(f"""
            UPDATE {schema}.client_messages
            SET read_at = NOW()
            WHERE source_type = '{source_type}' AND source_id = {int(thread_id)}
              AND direction = 'in' AND read_at IS NULL
        """)
        conn.commit()
        return {'statusCode': 200, 'headers': headers,
                'body': json.dumps({'messages': messages, 'client_name': client_name},
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
    source = body.get('source') or 'booking'
    thread_id = body.get('booking_id') or body.get('thread_id')
    text = (body.get('message') or '').strip()[:5000]
    if not thread_id or not text:
        return {'statusCode': 400, 'headers': headers,
                'body': json.dumps({'error': 'booking_id и message обязательны'}, ensure_ascii=False)}
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        resolved = _resolve_thread(cur, schema, source, thread_id)
        if not resolved:
            return {'statusCode': 404, 'headers': headers,
                    'body': json.dumps({'error': 'Диалог не найден'}, ensure_ascii=False)}
        source_type, master_id, owner_id, _ = resolved

        ok, deny = ensure_master_access(cur, schema, event, master_id, headers)
        if not ok:
            return deny

        cur.execute(f"""
            INSERT INTO {schema}.client_messages
                (owner_id, source_type, source_id, direction, channel, body, delivered)
            VALUES ({int(owner_id) if owner_id else 'NULL'}, '{source_type}', {int(thread_id)},
                    'out', 'site', '{_esc(text)}', true)
            RETURNING id, direction, channel, body, delivered, created_at
        """)
        new_msg = cur.fetchone()
        # Обращение переходит в статус «answered» после первого ответа мастера
        if source_type == 'master_inquiry':
            cur.execute(f"""
                UPDATE {schema}.master_inquiries
                SET status = CASE WHEN status = 'new' THEN 'answered' ELSE status END
                WHERE id = {int(thread_id)}
            """)
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
        # 1. Пробуем найти токен среди броней
        cur.execute(f"""
            SELECT b.id AS thread_id, b.client_name, b.status, b.datetime_start,
                   ms.name AS service_name, mp.name AS master_name, m.id AS master_id
            FROM {schema}.master_bookings b
            LEFT JOIN {schema}.master_services ms ON ms.id = b.service_id
            LEFT JOIN {schema}.masters m ON m.id = b.master_id
            LEFT JOIN {schema}.users mp ON mp.id = m.user_id
            WHERE b.reply_token = '{t}'
            LIMIT 1
        """)
        row = cur.fetchone()
        source_type = 'master_booking'
        if not row:
            # 2. Иначе — токен обращения без брони
            cur.execute(f"""
                SELECT q.id AS thread_id, q.guest_name AS client_name, q.status,
                       NULL::timestamp AS datetime_start,
                       'Вопрос мастеру' AS service_name,
                       mp.name AS master_name, m.id AS master_id
                FROM {schema}.master_inquiries q
                LEFT JOIN {schema}.masters m ON m.id = q.master_id
                LEFT JOIN {schema}.users mp ON mp.id = m.user_id
                WHERE q.reply_token = '{t}'
                LIMIT 1
            """)
            row = cur.fetchone()
            source_type = 'master_inquiry'
        if not row:
            return {'statusCode': 404, 'headers': headers,
                    'body': json.dumps({'error': 'not found'}, ensure_ascii=False)}
        thread_id = int(row['thread_id'])
        master_id = row.get('master_id')

        if method == 'POST':
            text = (body_json.get('message') or '').strip()[:5000]
            if not text:
                return {'statusCode': 400, 'headers': headers,
                        'body': json.dumps({'error': 'message required'}, ensure_ascii=False)}
            owner_id = None
            if master_id:
                cur.execute(f"SELECT user_id FROM {schema}.masters WHERE id = {int(master_id)}")
                o = cur.fetchone()
                owner_id = o['user_id'] if o else None
            cur.execute(f"""
                INSERT INTO {schema}.client_messages
                    (owner_id, source_type, source_id, direction, channel, body, delivered)
                VALUES ({int(owner_id) if owner_id else 'NULL'}, '{source_type}', {thread_id},
                        'in', 'site', '{_esc(text)}', true)
                RETURNING id, direction, channel, body, delivered, created_at
            """)
            new_msg = cur.fetchone()
            conn.commit()
            if source_type == 'master_inquiry' and master_id:
                from inquiries import _notify_master_about_inquiry
                _notify_master_about_inquiry(cur, schema, master_id, row.get('client_name'),
                                             '', '', text, token)
            elif source_type == 'master_booking':
                _notify_master_about_message(cur, schema, thread_id, row.get('client_name'), text)
            return {'statusCode': 200, 'headers': headers,
                    'body': json.dumps({'ok': True, 'message': dict(new_msg)},
                                       default=str, ensure_ascii=False)}

        # GET — переписка + пометка исходящих (от мастера) прочитанными
        cur.execute(f"""
            SELECT id, direction, channel, body, delivered, created_at
            FROM {schema}.client_messages
            WHERE source_type = '{source_type}' AND source_id = {thread_id}
            ORDER BY created_at ASC LIMIT 500
        """)
        messages = [dict(m) for m in cur.fetchall()]
        cur.execute(f"""
            UPDATE {schema}.client_messages
            SET read_at = NOW()
            WHERE source_type = '{source_type}' AND source_id = {thread_id}
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