import base64
import json
import os
import re
import uuid
import psycopg2
import psycopg2.extras

import boto3

from shared import (
    get_conn, get_schema, get_cursor,
    options_response, respond, ok, err,
    get_user_from_token, tg_notify_admin,
    verify_admin_token, send_email, admin_email,
    audit_log,
)


# --- S3 ---

ALLOWED_MIME = {
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/heic',
    'application/pdf', 'text/plain',
}
EXT_BY_MIME = {
    'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png',
    'image/webp': 'webp', 'image/gif': 'gif', 'image/heic': 'heic',
    'application/pdf': 'pdf', 'text/plain': 'txt',
}
MAX_FILE_BYTES = 10 * 1024 * 1024  # 10 MB


def _s3_client():
    return boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
    )


def _cdn_url(key):
    return f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"


def upload_attachment(body):
    """Загружает файл в S3 и возвращает ссылку. Принимает base64 в поле 'file'."""
    raw_data = body.get('file') or ''
    filename = (body.get('filename') or 'file').strip()[:255]
    if not raw_data:
        return err('Файл не передан')

    mime = None
    b64 = raw_data
    if 'base64,' in raw_data:
        header, b64 = raw_data.split('base64,', 1)
        if ':' in header:
            mime = header.split(':', 1)[1].split(';', 1)[0].strip()
    if not mime:
        # пробуем определить по расширению имени
        ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
        for m, e in EXT_BY_MIME.items():
            if e == ext:
                mime = m
                break
    if mime not in ALLOWED_MIME:
        return err('Поддерживаются изображения, PDF и текстовые файлы')

    try:
        raw = base64.b64decode(b64)
    except Exception:
        return err('Не удалось прочитать файл')

    if len(raw) > MAX_FILE_BYTES:
        return err('Файл больше 10 МБ')
    if len(raw) == 0:
        return err('Файл пустой')

    ext = EXT_BY_MIME.get(mime, 'bin')
    key = f"support/{uuid.uuid4().hex}.{ext}"
    try:
        _s3_client().put_object(
            Bucket='files', Key=key, Body=raw,
            ContentType=mime, ContentDisposition='inline',
        )
    except Exception as e:
        return err(f'Не удалось загрузить файл: {e}', 500)

    return ok({'url': _cdn_url(key), 'filename': filename, 'mime': mime, 'size': len(raw)})


SITE_URL = os.environ.get('SITE_URL', 'https://sparcom.ru')


def _email_layout(title, content_html):
    return f"""
    <div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1f2937;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;">
        <div style="font-size:28px;">🪵</div>
        <div style="font-weight:600;color:#7c2d12;">Банный клуб СПАРКОМ</div>
      </div>
      <h2 style="margin:0 0 12px;font-size:20px;color:#111827;">{title}</h2>
      <div style="font-size:15px;line-height:1.55;color:#374151;">{content_html}</div>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
      <div style="font-size:12px;color:#9ca3af;">
        Это автоматическое письмо от службы поддержки. Чтобы ответить — откройте обращение в личном кабинете.
      </div>
    </div>
    """


def _esc_html(text):
    return (text or '').replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('\n', '<br>')


def email_admin_new_ticket(ticket_id, subject, name, email, category, priority, message):
    to = admin_email()
    if not to:
        return
    body = _email_layout(
        f'Новое обращение #{ticket_id}',
        f'''
        <p><b>Тема:</b> {_esc_html(subject)}</p>
        <p><b>От:</b> {_esc_html(name)} &lt;{_esc_html(email)}&gt;</p>
        <p><b>Категория:</b> {_esc_html(category)} · <b>Приоритет:</b> {_esc_html(priority)}</p>
        <div style="margin-top:12px;padding:12px;background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;">
          {_esc_html(message)}
        </div>
        <p style="margin-top:16px;">
          <a href="{SITE_URL}/admin" style="display:inline-block;padding:10px 16px;background:#7c2d12;color:#fff;text-decoration:none;border-radius:8px;">
            Открыть в админ-панели
          </a>
        </p>
        '''
    )
    send_email(to, f'Новое обращение #{ticket_id}: {subject}', body)


def email_admin_user_reply(ticket_id, subject, name, email):
    to = admin_email()
    if not to:
        return
    body = _email_layout(
        f'Новый ответ пользователя в #{ticket_id}',
        f'''
        <p><b>Тема:</b> {_esc_html(subject)}</p>
        <p><b>От:</b> {_esc_html(name)} &lt;{_esc_html(email)}&gt;</p>
        <p style="margin-top:16px;">
          <a href="{SITE_URL}/admin" style="display:inline-block;padding:10px 16px;background:#7c2d12;color:#fff;text-decoration:none;border-radius:8px;">
            Открыть переписку
          </a>
        </p>
        '''
    )
    send_email(to, f'Ответ в обращении #{ticket_id}', body)


def email_user_ticket_created(to_email, to_name, ticket_id, subject):
    body = _email_layout(
        'Мы получили ваше обращение',
        f'''
        <p>Здравствуйте, {_esc_html(to_name) or 'гость'}!</p>
        <p>Мы зарегистрировали обращение <b>#{ticket_id}</b> по теме:<br>
        <i>{_esc_html(subject)}</i></p>
        <p>Ответим в течение 24 часов. Когда придёт ответ — пришлём письмо.</p>
        <p style="margin-top:16px;">
          <a href="{SITE_URL}/account?tab=support&ticket={ticket_id}" style="display:inline-block;padding:10px 16px;background:#7c2d12;color:#fff;text-decoration:none;border-radius:8px;">
            Открыть обращение
          </a>
        </p>
        '''
    )
    send_email(to_email, f'Обращение #{ticket_id} принято', body, to_name=to_name)


def email_user_admin_reply(to_email, to_name, ticket_id, subject, message_text):
    snippet = (message_text[:400] + '…') if len(message_text) > 400 else message_text
    body = _email_layout(
        'Поддержка ответила вам',
        f'''
        <p>Здравствуйте, {_esc_html(to_name) or 'гость'}!</p>
        <p>В обращении <b>#{ticket_id}</b> «{_esc_html(subject)}» появился ответ:</p>
        <div style="margin-top:8px;padding:12px;background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;">
          {_esc_html(snippet)}
        </div>
        <p style="margin-top:16px;">
          <a href="{SITE_URL}/account?tab=support&ticket={ticket_id}" style="display:inline-block;padding:10px 16px;background:#7c2d12;color:#fff;text-decoration:none;border-radius:8px;">
            Открыть переписку
          </a>
        </p>
        '''
    )
    send_email(to_email, f'Ответ в обращении #{ticket_id}', body, to_name=to_name)


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
        'attachment_name': r.get('attachment_name'),
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


def _attachment_pair(body):
    """Возвращает (sql_url, sql_name) — экранированные значения или 'NULL'."""
    url = (body.get('attachment_url') or '').strip()[:1000]
    name = (body.get('attachment_name') or '').strip()[:255]
    if not url:
        return 'NULL', 'NULL'
    if not url.startswith('https://cdn.poehali.dev/'):
        return 'NULL', 'NULL'
    return esc(url), (esc(name) if name else 'NULL')


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

    att_url_sql, att_name_sql = _attachment_pair(body)
    cur.execute(f"""
        INSERT INTO {schema}.support_messages (ticket_id, author_type, author_user_id, message, attachment_url, attachment_name, is_system)
        VALUES ({ticket_id}, 'user', {user_id_sql}, {esc(message)}, {att_url_sql}, {att_name_sql}, FALSE)
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
    email_admin_new_ticket(ticket_id, subject, name, email, category, priority, message)
    email_user_ticket_created(email, name, ticket_id, subject)

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
        SELECT id, ticket_id, author_type, message, attachment_url, attachment_name, is_system, created_at
        FROM {schema}.support_messages
        WHERE ticket_id = {ticket_id}
        ORDER BY created_at, id
    """)
    messages = [row_message(r) for r in cur.fetchall()]
    return ok({'ticket': row_ticket(t), 'messages': messages})


def post_message(cur, conn, schema, user, ticket_id, body):
    text = (body.get('message') or '').strip()
    att_url_sql, att_name_sql = _attachment_pair(body)
    has_attachment = att_url_sql != 'NULL'
    if not text and not has_attachment:
        return err('Сообщение пустое')
    if not text and has_attachment:
        text = ''  # допустимо — только файл
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
        INSERT INTO {schema}.support_messages (ticket_id, author_type, author_user_id, message, attachment_url, attachment_name, is_system)
        VALUES ({ticket_id}, 'user', {user['id']}, {esc(text)}, {att_url_sql}, {att_name_sql}, FALSE)
        RETURNING id, ticket_id, author_type, message, attachment_url, attachment_name, is_system, created_at
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
    email_admin_user_reply(ticket_id, t['subject'], user['name'], user['email'])

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
        SELECT id, ticket_id, author_type, message, attachment_url, attachment_name, is_system, created_at
        FROM {schema}.support_messages
        WHERE ticket_id = {ticket_id}
        ORDER BY created_at, id
    """)
    messages = [row_message(r) for r in cur.fetchall()]
    ticket_dict = {**row_ticket(t), 'user_id': t['user_id'], 'assigned_to': t['assigned_to']}
    return ok({'ticket': ticket_dict, 'messages': messages})


def admin_post_message(cur, conn, schema, ticket_id, body):
    text = (body.get('message') or '').strip()
    att_url_sql, att_name_sql = _attachment_pair(body)
    has_attachment = att_url_sql != 'NULL'
    if not text and not has_attachment:
        return err('Сообщение пустое')
    cur.execute(f"""
        SELECT id, status, subject, user_id, email, name
        FROM {schema}.support_tickets WHERE id = {ticket_id}
    """)
    t = cur.fetchone()
    if not t:
        return err('Обращение не найдено', 404)
    cur.execute(f"""
        INSERT INTO {schema}.support_messages (ticket_id, author_type, message, attachment_url, attachment_name, is_system)
        VALUES ({ticket_id}, 'admin', {esc(text)}, {att_url_sql}, {att_name_sql}, FALSE)
        RETURNING id, ticket_id, author_type, message, attachment_url, attachment_name, is_system, created_at
    """)
    msg = cur.fetchone()
    cur.execute(f"""
        UPDATE {schema}.support_tickets
        SET status = 'awaiting_reply', updated_at = CURRENT_TIMESTAMP
        WHERE id = {ticket_id}
    """)
    conn.commit()

    # Уведомление пользователю в Telegram, если привязан
    notify_email_allowed = True
    if t['user_id']:
        cur.execute(f"""
            SELECT tg_chat_id, notify_telegram, notify_email
            FROM {schema}.users WHERE id = {t['user_id']}
        """)
        u = cur.fetchone()
        if u:
            if u.get('tg_chat_id') and u.get('notify_telegram'):
                try:
                    from shared import tg_send
                    tg_send(
                        u['tg_chat_id'],
                        f"💬 Поддержка ответила в обращении #{ticket_id}\n"
                        f"<b>{t['subject']}</b>\n\nОткройте личный кабинет, чтобы прочитать."
                    )
                except Exception:
                    pass
            # Уважаем настройку notify_email
            notify_email_allowed = u.get('notify_email') is not False

    # Email пользователю
    if notify_email_allowed and t['email']:
        email_user_admin_reply(t['email'], t.get('name'), ticket_id, t['subject'], text)

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
    audit_log(cur, schema, 'ticket', ticket_id, 'status_change',
              field='status', old_value=t['status'], new_value=new_status)
    conn.commit()
    return ok({'ok': True, 'status': new_status})


def admin_change_priority(cur, conn, schema, ticket_id, body):
    new_priority = (body.get('priority') or '').strip()
    if new_priority not in ALLOWED_PRIORITIES:
        return err('Недопустимый приоритет')
    cur.execute(f"""
        SELECT priority FROM {schema}.support_tickets WHERE id = {ticket_id}
    """)
    prev = cur.fetchone()
    cur.execute(f"""
        UPDATE {schema}.support_tickets
        SET priority = {esc(new_priority)}, updated_at = CURRENT_TIMESTAMP
        WHERE id = {ticket_id}
    """)
    audit_log(cur, schema, 'ticket', ticket_id, 'priority_change',
              field='priority',
              old_value=(prev['priority'] if prev else None),
              new_value=new_priority)
    conn.commit()
    return ok({'ok': True, 'priority': new_priority})


def admin_list_templates(cur, schema):
    cur.execute(f"""
        SELECT id, title, body, COALESCE(category, 'other') AS category, sort_order, is_active
        FROM {schema}.support_reply_templates
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
            UPDATE {schema}.support_reply_templates
            SET title = {esc(title)}, body = {esc(text)}, category = {esc(category)},
                sort_order = {sort_order}, updated_at = CURRENT_TIMESTAMP
            WHERE id = {int(tid)}
            RETURNING id
        """)
    else:
        cur.execute(f"""
            INSERT INTO {schema}.support_reply_templates (title, body, category, sort_order)
            VALUES ({esc(title)}, {esc(text)}, {esc(category)}, {sort_order})
            RETURNING id
        """)
    new_id = cur.fetchone()['id']
    conn.commit()
    return ok({'id': new_id})


def admin_archive_template(cur, conn, schema, tid):
    cur.execute(f"""
        UPDATE {schema}.support_reply_templates
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

        if resource == 'upload' and method == 'POST':
            body = json.loads(event.get('body') or '{}')
            return upload_attachment(body)

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