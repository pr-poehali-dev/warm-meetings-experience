import json
import re
import psycopg2
import psycopg2.extras

from shared import (
    get_conn, get_schema, get_cursor,
    options_response, respond, ok, err,
    get_user_from_token, tg_notify_admin,
    verify_admin_token,
)


EMAIL_RE = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')

ALLOWED_CATEGORIES = {'booking', 'payment', 'tech', 'idea', 'other'}
ALLOWED_PRIORITIES = {'low', 'medium', 'high'}
ALLOWED_STATUS_USER = {'closed'}
ALLOWED_STATUS_ADMIN = {'open', 'in_progress', 'awaiting_reply', 'closed'}


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


# --- Админ ---

def admin_list_tickets(cur, schema, params):
    where = ['1=1']
    status = params.get('status')
    if status and status != 'all':
        where.append(f"t.status = {esc(status)}")
    category = params.get('category')
    if category and category != 'all':
        where.append(f"t.category = {esc(category)}")
    priority = params.get('priority')
    if priority and priority != 'all':
        where.append(f"t.priority = {esc(priority)}")
    q = (params.get('q') or '').strip()
    if q:
        qe = q.replace("'", "''")
        where.append(
            f"(t.subject ILIKE '%{qe}%' OR t.email ILIKE '%{qe}%' OR t.name ILIKE '%{qe}%')"
        )
    where_sql = ' AND '.join(where)
    cur.execute(f"""
        SELECT t.id, t.subject, t.category, t.status, t.priority, t.email, t.name,
               t.user_id, t.assigned_to, t.created_at, t.updated_at, t.closed_at,
               (SELECT COUNT(*) FROM {schema}.support_messages m
                  WHERE m.ticket_id = t.id AND m.is_system = FALSE) AS msg_count
        FROM {schema}.support_tickets t
        WHERE {where_sql}
        ORDER BY
          CASE t.status WHEN 'open' THEN 0 WHEN 'in_progress' THEN 1
                        WHEN 'awaiting_reply' THEN 2 ELSE 3 END,
          t.updated_at DESC
        LIMIT 200
    """)
    rows = cur.fetchall()
    return ok({'tickets': [
        {**row_ticket(r), 'user_id': r['user_id'], 'assigned_to': r['assigned_to'], 'msg_count': r['msg_count']}
        for r in rows
    ]})


def admin_get_ticket(cur, schema, ticket_id):
    cur.execute(f"""
        SELECT id, user_id, subject, category, status, priority, email, name,
               assigned_to, created_at, updated_at, closed_at
        FROM {schema}.support_tickets
        WHERE id = {ticket_id}
    """)
    t = cur.fetchone()
    if not t:
        return err('Обращение не найдено', 404)
    cur.execute(f"""
        SELECT id, ticket_id, author_type, message, attachment_url, is_system, created_at
        FROM {schema}.support_messages
        WHERE ticket_id = {ticket_id}
        ORDER BY created_at, id
    """)
    messages = [row_message(r) for r in cur.fetchall()]
    ticket_dict = {**row_ticket(t), 'user_id': t['user_id'], 'assigned_to': t['assigned_to']}
    return ok({'ticket': ticket_dict, 'messages': messages})


def admin_post_message(cur, conn, schema, ticket_id, body):
    text = (body.get('message') or '').strip()
    if not text:
        return err('Сообщение пустое')
    cur.execute(f"""
        SELECT id, status FROM {schema}.support_tickets WHERE id = {ticket_id}
    """)
    t = cur.fetchone()
    if not t:
        return err('Обращение не найдено', 404)
    cur.execute(f"""
        INSERT INTO {schema}.support_messages (ticket_id, author_type, message, is_system)
        VALUES ({ticket_id}, 'admin', {esc(text)}, FALSE)
        RETURNING id, ticket_id, author_type, message, attachment_url, is_system, created_at
    """)
    msg = cur.fetchone()
    cur.execute(f"""
        UPDATE {schema}.support_tickets
        SET status = 'awaiting_reply', updated_at = CURRENT_TIMESTAMP
        WHERE id = {ticket_id}
    """)
    conn.commit()
    return ok({'message': row_message(msg)})


def admin_change_status(cur, conn, schema, ticket_id, body):
    new_status = (body.get('status') or '').strip()
    if new_status not in ALLOWED_STATUS_ADMIN:
        return err('Недопустимый статус')
    cur.execute(f"""
        SELECT id, status FROM {schema}.support_tickets WHERE id = {ticket_id}
    """)
    t = cur.fetchone()
    if not t:
        return err('Обращение не найдено', 404)
    closed_sql = ', closed_at = CURRENT_TIMESTAMP' if new_status == 'closed' else ''
    if new_status != 'closed' and t['status'] == 'closed':
        closed_sql = ', closed_at = NULL'
    cur.execute(f"""
        UPDATE {schema}.support_tickets
        SET status = {esc(new_status)}{closed_sql}, updated_at = CURRENT_TIMESTAMP
        WHERE id = {ticket_id}
    """)
    label_map = {
        'open': 'Открыт',
        'in_progress': 'В работе',
        'awaiting_reply': 'Ожидает ответа пользователя',
        'closed': 'Закрыт оператором',
    }
    cur.execute(f"""
        INSERT INTO {schema}.support_messages (ticket_id, author_type, message, is_system)
        VALUES ({ticket_id}, 'system', {esc('Статус изменён: ' + label_map.get(new_status, new_status))}, TRUE)
    """)
    conn.commit()
    return ok({'ok': True, 'status': new_status})


def admin_change_priority(cur, conn, schema, ticket_id, body):
    new_priority = (body.get('priority') or '').strip()
    if new_priority not in ALLOWED_PRIORITIES:
        return err('Недопустимый приоритет')
    cur.execute(f"""
        UPDATE {schema}.support_tickets
        SET priority = {esc(new_priority)}, updated_at = CURRENT_TIMESTAMP
        WHERE id = {ticket_id}
    """)
    conn.commit()
    return ok({'ok': True, 'priority': new_priority})


def admin_list_templates(cur, schema):
    cur.execute(f"""
        SELECT id, title, body, category, sort_order, is_active
        FROM {schema}.support_templates
        WHERE is_active = TRUE
        ORDER BY sort_order, id
    """)
    return ok({'templates': [dict(r) for r in cur.fetchall()]})


def admin_save_template(cur, conn, schema, body):
    tid = body.get('id')
    title = (body.get('title') or '').strip()[:255]
    text = (body.get('body') or '').strip()
    category = (body.get('category') or 'other').strip()[:64]
    sort_order = int(body.get('sort_order') or 0)
    if not title or not text:
        return err('Заполните заголовок и текст шаблона')
    if tid:
        cur.execute(f"""
            UPDATE {schema}.support_templates
            SET title = {esc(title)}, body = {esc(text)}, category = {esc(category)},
                sort_order = {sort_order}, updated_at = CURRENT_TIMESTAMP
            WHERE id = {int(tid)}
            RETURNING id
        """)
    else:
        cur.execute(f"""
            INSERT INTO {schema}.support_templates (title, body, category, sort_order)
            VALUES ({esc(title)}, {esc(text)}, {esc(category)}, {sort_order})
            RETURNING id
        """)
    new_id = cur.fetchone()['id']
    conn.commit()
    return ok({'id': new_id})


def admin_archive_template(cur, conn, schema, tid):
    cur.execute(f"""
        UPDATE {schema}.support_templates
        SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
        WHERE id = {int(tid)}
    """)
    conn.commit()
    return ok({'ok': True})


def admin_stats(cur, schema):
    cur.execute(f"""
        SELECT status, COUNT(*) AS c
        FROM {schema}.support_tickets
        GROUP BY status
    """)
    by_status = {r['status']: r['c'] for r in cur.fetchall()}
    cur.execute(f"""
        SELECT COUNT(*) AS c FROM {schema}.support_tickets
        WHERE created_at > NOW() - INTERVAL '7 days'
    """)
    last7 = cur.fetchone()['c']
    return ok({
        'by_status': by_status,
        'open_count': by_status.get('open', 0) + by_status.get('in_progress', 0),
        'last7': last7,
    })


def handler(event, context):
    """Поддержка пользователей: FAQ, тикеты, переписка, админка"""
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
    admin_token = (
        headers_in.get('X-Admin-Token') or headers_in.get('x-admin-token') or ''
    )
    is_admin = verify_admin_token(admin_token)

    schema = get_schema()
    conn = get_conn()
    cur = get_cursor(conn)

    try:
        if resource == 'faq' and method == 'GET':
            role = params.get('role')
            return ok({'faq': get_faq(cur, schema, role)})

        if resource == 'ticket' and method == 'POST' and not is_admin:
            body = json.loads(event.get('body') or '{}')
            user = get_user_from_token(cur, schema, token)
            return create_ticket(cur, conn, schema, body, user)

        if resource.startswith('admin-'):
            if not is_admin:
                return err('Доступ запрещён', 403)
            if resource == 'admin-tickets' and method == 'GET':
                return admin_list_tickets(cur, schema, params)
            if resource == 'admin-stats' and method == 'GET':
                return admin_stats(cur, schema)
            if resource == 'admin-ticket' and method == 'GET':
                tid = params.get('id')
                if not tid or not tid.isdigit():
                    return err('Не указан id тикета')
                return admin_get_ticket(cur, schema, int(tid))
            if resource == 'admin-message' and method == 'POST':
                body = json.loads(event.get('body') or '{}')
                tid = params.get('id') or str(body.get('ticket_id') or '')
                if not tid or not str(tid).isdigit():
                    return err('Не указан id тикета')
                return admin_post_message(cur, conn, schema, int(tid), body)
            if resource == 'admin-status' and method == 'POST':
                body = json.loads(event.get('body') or '{}')
                tid = params.get('id')
                if not tid or not tid.isdigit():
                    return err('Не указан id тикета')
                return admin_change_status(cur, conn, schema, int(tid), body)
            if resource == 'admin-priority' and method == 'POST':
                body = json.loads(event.get('body') or '{}')
                tid = params.get('id')
                if not tid or not tid.isdigit():
                    return err('Не указан id тикета')
                return admin_change_priority(cur, conn, schema, int(tid), body)
            if resource == 'admin-templates' and method == 'GET':
                return admin_list_templates(cur, schema)
            if resource == 'admin-templates' and method == 'POST':
                body = json.loads(event.get('body') or '{}')
                return admin_save_template(cur, conn, schema, body)
            if resource == 'admin-templates' and method == 'DELETE':
                tid = params.get('id')
                if not tid or not tid.isdigit():
                    return err('Не указан id шаблона')
                return admin_archive_template(cur, conn, schema, int(tid))
            return err('Неизвестный админ-запрос', 404)

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
            if not tid or not str(tid).isdigit():
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