import json
import re
import psycopg2
import psycopg2.extras

from shared import (
    get_conn, get_schema, get_cursor,
    options_response, respond, ok, err,
    get_user_from_token, tg_notify_admin,
)


EMAIL_RE = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')

ALLOWED_CATEGORIES = {'booking', 'payment', 'tech', 'idea', 'other'}
ALLOWED_PRIORITIES = {'low', 'medium', 'high'}
ALLOWED_STATUS_USER = {'closed'}


def esc(s):
    if s is None:
        return 'NULL'
    return "'" + str(s).replace("'", "''") + "'"


def row_ticket(r):
    return {
        'id': r['id'],
        'subject': r['subject'],
        'category': r['category'],
        'status': r['status'],
        'priority': r['priority'],
        'created_at': r['created_at'],
        'updated_at': r['updated_at'],
        'closed_at': r.get('closed_at'),
        'email': r['email'],
        'name': r.get('name'),
    }


def row_message(r):
    return {
        'id': r['id'],
        'ticket_id': r['ticket_id'],
        'author_type': r['author_type'],
        'message': r['message'],
        'attachment_url': r.get('attachment_url'),
        'is_system': r.get('is_system', False),
        'created_at': r['created_at'],
    }


def get_faq(cur, schema, role=None):
    where = "is_active = true"
    if role:
        where += f" AND role = {esc(role)}"
    cur.execute(f"""
        SELECT id, role, question, answer, sort_order
        FROM {schema}.support_faq
        WHERE {where}
        ORDER BY role, sort_order, id
    """)
    return [dict(r) for r in cur.fetchall()]


def create_ticket(cur, conn, schema, body, user):
    name = (body.get('name') or '').strip()[:255]
    email = (body.get('email') or '').strip().lower()[:255]
    subject = (body.get('subject') or '').strip()[:255]
    category = (body.get('category') or 'other').strip()
    message = (body.get('message') or '').strip()
    priority = (body.get('priority') or 'medium').strip()
    captcha_ok = bool(body.get('captcha_ok')) if not user else True

    if user:
        email = user['email']
        if not name:
            name = user['name']

    if not subject or not message:
        return err('Заполните тему и текст обращения')
    if not email or not EMAIL_RE.match(email):
        return err('Укажите корректный email — на него мы ответим')
    if not name:
        return err('Представьтесь, пожалуйста')
    if category not in ALLOWED_CATEGORIES:
        category = 'other'
    if priority not in ALLOWED_PRIORITIES:
        priority = 'medium'
    if not user:
        priority = 'medium'
        if not captcha_ok:
            return err('Кажется, печка ещё не догрелась — проверьте ответ ещё раз')

    user_id_sql = str(user['id']) if user else 'NULL'

    cur.execute(f"""
        INSERT INTO {schema}.support_tickets (user_id, email, name, subject, category, status, priority)
        VALUES ({user_id_sql}, {esc(email)}, {esc(name)}, {esc(subject)}, {esc(category)}, 'open', {esc(priority)})
        RETURNING id, subject, category, status, priority, email, name, created_at, updated_at, closed_at
    """)
    ticket = cur.fetchone()
    ticket_id = ticket['id']

    cur.execute(f"""
        INSERT INTO {schema}.support_messages (ticket_id, author_type, author_user_id, message, is_system)
        VALUES ({ticket_id}, 'user', {user_id_sql}, {esc(message)}, FALSE)
    """)
    cur.execute(f"""
        INSERT INTO {schema}.support_messages (ticket_id, author_type, message, is_system)
        VALUES ({ticket_id}, 'system', 'Обращение создано', TRUE)
    """)

    conn.commit()

    short = (message[:200] + '…') if len(message) > 200 else message
    tg_notify_admin(
        f"🛟 <b>Новое обращение #{ticket_id}</b>\n"
        f"<b>Тема:</b> {subject}\n"
        f"<b>От:</b> {name} ({email})\n"
        f"<b>Категория:</b> {category} · <b>Приоритет:</b> {priority}\n\n"
        f"{short}"
    )

    return ok({'ticket': row_ticket(ticket)})


def list_tickets(cur, schema, user):
    cur.execute(f"""
        SELECT id, subject, category, status, priority, email, name,
               created_at, updated_at, closed_at
        FROM {schema}.support_tickets
        WHERE user_id = {user['id']}
        ORDER BY updated_at DESC, id DESC
    """)
    return ok({'tickets': [row_ticket(r) for r in cur.fetchall()]})


def get_ticket(cur, schema, user, ticket_id):
    cur.execute(f"""
        SELECT id, user_id, subject, category, status, priority, email, name,
               created_at, updated_at, closed_at
        FROM {schema}.support_tickets
        WHERE id = {ticket_id}
    """)
    t = cur.fetchone()
    if not t:
        return err('Обращение не найдено', 404)
    if t['user_id'] != user['id']:
        return err('Нет доступа', 403)

    cur.execute(f"""
        SELECT id, ticket_id, author_type, message, attachment_url, is_system, created_at
        FROM {schema}.support_messages
        WHERE ticket_id = {ticket_id}
        ORDER BY created_at, id
    """)
    messages = [row_message(r) for r in cur.fetchall()]
    return ok({'ticket': row_ticket(t), 'messages': messages})


def post_message(cur, conn, schema, user, ticket_id, body):
    text = (body.get('message') or '').strip()
    if not text:
        return err('Сообщение пустое')
    cur.execute(f"""
        SELECT id, user_id, status, subject FROM {schema}.support_tickets WHERE id = {ticket_id}
    """)
    t = cur.fetchone()
    if not t:
        return err('Обращение не найдено', 404)
    if t['user_id'] != user['id']:
        return err('Нет доступа', 403)
    if t['status'] == 'closed':
        return err('Обращение закрыто. Создайте новое, чтобы продолжить разговор')

    cur.execute(f"""
        INSERT INTO {schema}.support_messages (ticket_id, author_type, author_user_id, message, is_system)
        VALUES ({ticket_id}, 'user', {user['id']}, {esc(text)}, FALSE)
        RETURNING id, ticket_id, author_type, message, attachment_url, is_system, created_at
    """)
    msg = cur.fetchone()
    cur.execute(f"""
        UPDATE {schema}.support_tickets
        SET status = CASE WHEN status = 'awaiting_reply' THEN 'in_progress' ELSE status END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = {ticket_id}
    """)
    conn.commit()

    tg_notify_admin(
        f"💬 <b>Новый ответ в #{ticket_id}</b>\n"
        f"<b>Тема:</b> {t['subject']}\n"
        f"<b>От:</b> {user['name']} ({user['email']})"
    )

    return ok({'message': row_message(msg)})


def close_ticket(cur, conn, schema, user, ticket_id):
    cur.execute(f"""
        SELECT id, user_id, status FROM {schema}.support_tickets WHERE id = {ticket_id}
    """)
    t = cur.fetchone()
    if not t:
        return err('Обращение не найдено', 404)
    if t['user_id'] != user['id']:
        return err('Нет доступа', 403)
    cur.execute(f"""
        UPDATE {schema}.support_tickets
        SET status = 'closed', closed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = {ticket_id}
    """)
    cur.execute(f"""
        INSERT INTO {schema}.support_messages (ticket_id, author_type, message, is_system)
        VALUES ({ticket_id}, 'system', 'Обращение закрыто пользователем', TRUE)
    """)
    conn.commit()
    return ok({'ok': True})


def handler(event, context):
    """Поддержка пользователей: FAQ, тикеты, переписка"""
    if event.get('httpMethod') == 'OPTIONS':
        return options_response()

    method = event.get('httpMethod', 'GET')
    params = event.get('queryStringParameters') or {}
    resource = params.get('resource', 'faq')
    headers_in = event.get('headers') or {}
    token = (
        headers_in.get('X-Session-Token')
        or headers_in.get('x-session-token')
        or ''
    )

    schema = get_schema()
    conn = get_conn()
    cur = get_cursor(conn)

    try:
        if resource == 'faq' and method == 'GET':
            role = params.get('role')
            return ok({'faq': get_faq(cur, schema, role)})

        if resource == 'ticket' and method == 'POST':
            body = json.loads(event.get('body') or '{}')
            user = get_user_from_token(cur, schema, token)
            return create_ticket(cur, conn, schema, body, user)

        user = get_user_from_token(cur, schema, token)
        if not user:
            return err('Не авторизован', 401)

        if resource == 'tickets' and method == 'GET':
            return list_tickets(cur, schema, user)

        if resource == 'ticket' and method == 'GET':
            tid = params.get('id')
            if not tid or not tid.isdigit():
                return err('Не указан id тикета')
            return get_ticket(cur, schema, user, int(tid))

        if resource == 'message' and method == 'POST':
            body = json.loads(event.get('body') or '{}')
            tid = params.get('id') or str(body.get('ticket_id') or '')
            if not tid or not tid.isdigit():
                return err('Не указан id тикета')
            return post_message(cur, conn, schema, user, int(tid), body)

        if resource == 'close' and method == 'POST':
            tid = params.get('id')
            if not tid or not tid.isdigit():
                return err('Не указан id тикета')
            return close_ticket(cur, conn, schema, user, int(tid))

        return err('Неизвестный запрос', 404)
    finally:
        cur.close()
        conn.close()
