import json
import os
import re
import psycopg2.extras
from shared import get_conn, send_email, tg_send
from booking_validator import _client_ip


def _esc(v):
    return (v or '').replace("'", "''")


def _validate_contact(contact, contact_type):
    """Возвращает (ok, normalized) для контакта гостя."""
    contact = (contact or '').strip()
    if contact_type == 'email':
        if re.match(r'^[^\s@]+@[^\s@]+\.[^\s@]{2,}$', contact):
            return True, contact
        return False, contact
    if contact_type == 'phone':
        digits = re.sub(r'\D', '', contact)
        if 10 <= len(digits) <= 15:
            return True, contact
        return False, contact
    if contact_type == 'telegram':
        nick = contact.lstrip('@')
        if re.match(r'^[A-Za-z0-9_]{3,32}$', nick):
            return True, '@' + nick
        return False, contact
    return False, contact


def _notify_master_about_inquiry(cur, schema, master_id, guest_name, guest_contact,
                                 contact_type, text, reply_token):
    """Уведомляет мастера о новом обращении (email + Telegram). Не падает."""
    try:
        cur.execute(f"""
            SELECT m.user_id, u.email,
                   COALESCE(u.notify_email, true) AS notify_email,
                   u.notify_telegram AS notify_telegram,
                   u.tg_chat_id AS user_tg,
                   la.telegram_user_id AS linked_tg
            FROM {schema}.masters m
            LEFT JOIN {schema}.users u ON u.id = m.user_id
            LEFT JOIN (
                SELECT DISTINCT ON (user_id) user_id, telegram_user_id
                FROM {schema}.tg_linked_accounts
                ORDER BY user_id, linked_at DESC
            ) la ON la.user_id = m.user_id
            WHERE m.id = {int(master_id)}
        """)
        m = cur.fetchone()
        if not m:
            return

        base = (os.environ.get('SITE_URL') or 'https://sparcom.ru').rstrip('/')
        cabinet_link = f'{base}/workspace?tab=master&section=bookings'
        preview = text if len(text) <= 400 else text[:400] + '…'
        guest = guest_name or 'Гость'
        ct_label = {'email': 'Email', 'phone': 'Телефон', 'telegram': 'Telegram'}.get(contact_type, 'Контакт')

        if m.get('email') and m.get('notify_email') is not False:
            subject = f'Новый вопрос от {guest}'
            body_html = f"""
            <div style="font-family: -apple-system, Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #2d2318;">
                <h2 style="color: #0f172a;">Новый вопрос от гостя</h2>
                <p><b>{guest}</b> задал(а) вам вопрос:</p>
                <p style="margin: 16px 0; padding: 12px 14px; background: #f1f5f9;
                          border-radius: 10px; white-space: pre-wrap;">{preview}</p>
                <p style="color:#64748b; font-size: 13px;">{ct_label}: {guest_contact}</p>
                <p style="margin-top: 20px;"><a href="{cabinet_link}"
                   style="display: inline-block; padding: 10px 18px; background: #0ea5e9;
                   color: #fff; border-radius: 8px; text-decoration: none;">Ответить в кабинете</a></p>
            </div>
            """.strip()
            send_email(m['email'], subject, body_html, tags=['master-inquiry'])

        tg_chat_id = m.get('linked_tg') or m.get('user_tg')
        tg_disabled = m.get('notify_telegram') is False and not m.get('linked_tg')
        if tg_chat_id and not tg_disabled:
            tg_text = (
                f'❓ <b>Новый вопрос от {guest}</b>\n\n'
                f'{preview}\n\n'
                f'{ct_label}: {guest_contact}\n'
                f'<i>Ответьте в кабинете мастера.</i>'
            )
            tg_send(tg_chat_id, tg_text)
    except Exception:
        pass


def handle_inquiry_create(event, method, params, schema, headers):
    """Публичное создание обращения гостя к мастеру (вопрос без брони).

    POST ?resource=inquiry&sub=create
      body: {master_id, name, contact, contact_type, message}
    Ответ: {ok, inquiry_id, chat_token}
    """
    if method != 'POST':
        return {'statusCode': 405, 'headers': headers, 'body': json.dumps({'error': 'POST only'})}
    try:
        body = json.loads(event.get('body') or '{}')
    except (ValueError, TypeError):
        body = {}

    master_id = body.get('master_id')
    name = (body.get('name') or '').strip()[:200]
    contact_type = (body.get('contact_type') or 'email').strip()
    contact_raw = (body.get('contact') or '').strip()[:200]
    message = (body.get('message') or '').strip()[:4000]

    if not master_id or not name or not contact_raw or not message:
        return {'statusCode': 400, 'headers': headers,
                'body': json.dumps({'error': 'Заполните имя, контакт и текст вопроса'}, ensure_ascii=False)}
    if len(name) < 2 or len(message) < 5:
        return {'statusCode': 400, 'headers': headers,
                'body': json.dumps({'error': 'Слишком короткое имя или вопрос'}, ensure_ascii=False)}
    if contact_type not in ('email', 'phone', 'telegram'):
        contact_type = 'email'
    ok_c, contact = _validate_contact(contact_raw, contact_type)
    if not ok_c:
        return {'statusCode': 400, 'headers': headers,
                'body': json.dumps({'error': 'Проверьте правильность контакта'}, ensure_ascii=False)}

    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        cur.execute(f"""
            SELECT m.id, m.name AS master_name, m.user_id
            FROM {schema}.masters m WHERE m.id = {int(master_id)} AND m.is_active = true
        """)
        m = cur.fetchone()
        if not m:
            return {'statusCode': 404, 'headers': headers,
                    'body': json.dumps({'error': 'Мастер не найден'}, ensure_ascii=False)}
        owner_id = m['user_id']

        # Простой rate-limit по IP: не больше 5 обращений в час
        ip = _client_ip(event)
        ip_safe = ip.replace("'", "''")[:64]
        cur.execute(f"""
            SELECT COUNT(*) AS cnt FROM {schema}.master_inquiries
            WHERE ip_address = '{ip_safe}' AND created_at > NOW() - INTERVAL '1 hour'
        """)
        rl = cur.fetchone()
        if rl and int(rl['cnt']) >= 5:
            return {'statusCode': 429, 'headers': headers,
                    'body': json.dumps({'error': 'Слишком много вопросов. Попробуйте позже.'}, ensure_ascii=False)}

        cur.execute(f"""
            INSERT INTO {schema}.master_inquiries
                (master_id, guest_name, guest_contact, contact_type, ip_address)
            VALUES ({int(master_id)}, '{_esc(name)}', '{_esc(contact)}',
                    '{contact_type}', '{ip_safe}')
            RETURNING id, reply_token
        """)
        inq = cur.fetchone()
        inquiry_id = int(inq['id'])
        reply_token = inq['reply_token']

        cur.execute(f"""
            INSERT INTO {schema}.client_messages
                (owner_id, source_type, source_id, direction, channel, body, delivered)
            VALUES ({int(owner_id) if owner_id else 'NULL'}, 'master_inquiry', {inquiry_id},
                    'in', 'site', '{_esc(message)}', true)
        """)
        conn.commit()

        _notify_master_about_inquiry(cur, schema, master_id, name, contact,
                                     contact_type, message, reply_token)

        return {'statusCode': 200, 'headers': headers,
                'body': json.dumps({'ok': True, 'inquiry_id': inquiry_id,
                                    'chat_token': reply_token}, ensure_ascii=False)}
    finally:
        conn.close()
