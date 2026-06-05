"""Рассылки и личные сообщения от администратора.

Каналы: email, telegram, vk (расширяемо — добавь канал в CHANNELS и send_one).
Аудитория: по ролям (member/parmaster/organizer/partner/...) или 'all',
либо одному пользователю по user_id (личное сообщение).
Все отправки пишутся в notification_log (event_type='admin_broadcast'/'admin_message').
"""
import json
import os
import random
import urllib.request
import urllib.parse

from shared import get_conn, get_schema, send_email, tg_send, respond


# Поддерживаемые каналы. Добавление нового канала: впиши сюда + обработай в _send_one.
CHANNELS = ('email', 'telegram', 'vk')

# Аудитории по ролям (slug в таблице roles). 'all' — все пользователи.
ROLE_LABELS = {
    'all': 'Все пользователи',
    'member': 'Гости',
    'parmaster': 'Мастера',
    'organizer': 'Организаторы',
    'partner': 'Управляющие',
    'editor': 'Редакторы',
    'admin': 'Администраторы',
}


def _vk_send(vk_user_id, text):
    """Личное сообщение ВКонтакте от имени сообщества. Не падает."""
    token = os.environ.get('VK_COMMUNITY_TOKEN', '')
    community_id = os.environ.get('VK_COMMUNITY_ID', '0')
    if not token or not vk_user_id:
        return False
    params = {
        'peer_id': str(int(vk_user_id)),
        'message': text,
        'random_id': str(random.randint(1, 2 ** 31)),
        'access_token': token,
        'v': '5.199',
    }
    if community_id and community_id != '0':
        params['group_id'] = str(int(community_id))
    payload = urllib.parse.urlencode(params).encode('utf-8')
    req = urllib.request.Request(
        'https://api.vk.com/method/messages.send',
        data=payload,
        headers={'Content-Type': 'application/x-www-form-urlencoded'},
    )
    try:
        resp = urllib.request.urlopen(req, timeout=6)
        result = json.loads(resp.read().decode('utf-8'))
        if 'error' in result:
            return False
        return True
    except Exception:
        return False


def _log(cur, schema, *, channel, event_type, recipient, status,
         subject=None, error_text=None, user_id=None, payload=None):
    """Пишет запись в notification_log. Никогда не падает."""
    try:
        def _esc(v):
            if v is None:
                return 'NULL'
            return "'" + str(v).replace("'", "''")[:4000] + "'"
        payload_json = 'NULL'
        if payload is not None:
            try:
                payload_json = "'" + json.dumps(payload, default=str, ensure_ascii=False).replace("'", "''")[:6000] + "'"
            except Exception:
                payload_json = 'NULL'
        cur.execute(f"""
            INSERT INTO {schema}.notification_log
                (channel, event_type, recipient, subject, status, error_text, payload, user_id)
            VALUES ({_esc(channel)}, {_esc(event_type)}, {_esc(recipient)}, {_esc(subject)},
                    {_esc(status)}, {_esc(error_text)}, {payload_json}::jsonb,
                    {'NULL' if user_id is None else int(user_id)})
        """)
    except Exception:
        pass


def _email_html(subject, text):
    """Простой адаптивный HTML-шаблон письма из текста (переводы строк → <br>)."""
    safe = (text or '').replace('<', '&lt;').replace('>', '&gt;').replace('\n', '<br>')
    return f"""
    <div style="font-family: -apple-system, Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #2d2318;">
        <h2 style="color: #0f172a; font-size: 20px;">{subject}</h2>
        <div style="font-size: 15px; line-height: 1.6;">{safe}</div>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="color: #9ca3af; font-size: 12px;">Это сообщение от администрации Sparcom.</p>
    </div>
    """.strip()


def _send_one(cur, schema, user, channel, subject, text, event_type):
    """Отправляет одно сообщение пользователю по каналу. Логирует. Возвращает 'sent'|'skipped'|'failed'."""
    uid = user.get('id')
    if channel == 'email':
        email = (user.get('email') or '').strip()
        if not email or email.endswith('.vk.local') or email.endswith('@vk.local'):
            return 'skipped'
        ok = send_email(email, subject or 'Сообщение от Sparcom',
                        _email_html(subject or 'Сообщение', text),
                        to_name=user.get('name'), tags=['admin-broadcast'])
        _log(cur, schema, channel='email', event_type=event_type, recipient=email,
             status='success' if ok else 'failed', subject=subject, user_id=uid,
             error_text=None if ok else 'send_email returned False')
        return 'sent' if ok else 'failed'

    if channel == 'telegram':
        chat_id = user.get('tg_chat_id')
        if not chat_id:
            return 'skipped'
        head = f'<b>{subject}</b>\n\n' if subject else ''
        ok = tg_send(chat_id, head + (text or ''))
        _log(cur, schema, channel='telegram', event_type=event_type, recipient=str(chat_id),
             status='success' if ok else 'failed', subject=subject, user_id=uid,
             error_text=None if ok else 'tg_send returned False')
        return 'sent' if ok else 'failed'

    if channel == 'vk':
        vk_id = user.get('vk_id')
        if not vk_id:
            return 'skipped'
        head = f'{subject}\n\n' if subject else ''
        ok = _vk_send(vk_id, head + (text or ''))
        _log(cur, schema, channel='vk', event_type=event_type, recipient=str(vk_id),
             status='success' if ok else 'failed', subject=subject, user_id=uid,
             error_text=None if ok else 'vk_send returned False')
        return 'sent' if ok else 'failed'

    return 'skipped'


def _fetch_audience(cur, schema, audience, user_ids):
    """Возвращает список пользователей по аудитории (роль/'all') или явным user_ids."""
    fields = "u.id, u.name, u.email, u.tg_chat_id, u.vk_id"
    if user_ids:
        ids = ','.join(str(int(i)) for i in user_ids)
        cur.execute(f"""
            SELECT {fields} FROM {schema}.users u
            WHERE u.id IN ({ids}) AND u.is_active = true
        """)
        return [dict(r) for r in cur.fetchall()]
    if audience == 'all' or not audience:
        cur.execute(f"""
            SELECT {fields} FROM {schema}.users u
            WHERE u.is_active = true
        """)
        return [dict(r) for r in cur.fetchall()]
    slug = str(audience).replace("'", "''")
    cur.execute(f"""
        SELECT DISTINCT {fields} FROM {schema}.users u
        JOIN {schema}.user_roles ur ON ur.user_id = u.id AND ur.status = 'active'
        JOIN {schema}.roles r ON r.id = ur.role_id
        WHERE r.slug = '{slug}' AND u.is_active = true
    """)
    return [dict(r) for r in cur.fetchall()]


def handle_audiences(cur, schema):
    """GET — список аудиторий с количеством получателей по каналам (для UI)."""
    cur.execute(f"""
        SELECT r.slug,
               COUNT(DISTINCT u.id) AS total,
               COUNT(DISTINCT u.id) FILTER (WHERE u.email IS NOT NULL AND u.email NOT LIKE '%%.vk.local' AND u.email NOT LIKE '%%@vk.local') AS email_cnt,
               COUNT(DISTINCT u.id) FILTER (WHERE u.tg_chat_id IS NOT NULL) AS tg_cnt,
               COUNT(DISTINCT u.id) FILTER (WHERE u.vk_id IS NOT NULL) AS vk_cnt
        FROM {schema}.roles r
        JOIN {schema}.user_roles ur ON ur.role_id = r.id AND ur.status = 'active'
        JOIN {schema}.users u ON u.id = ur.user_id AND u.is_active = true
        GROUP BY r.slug
    """)
    by_role = {row['slug']: dict(row) for row in cur.fetchall()}

    cur.execute(f"""
        SELECT COUNT(*) AS total,
               COUNT(*) FILTER (WHERE email IS NOT NULL AND email NOT LIKE '%%.vk.local' AND email NOT LIKE '%%@vk.local') AS email_cnt,
               COUNT(*) FILTER (WHERE tg_chat_id IS NOT NULL) AS tg_cnt,
               COUNT(*) FILTER (WHERE vk_id IS NOT NULL) AS vk_cnt
        FROM {schema}.users WHERE is_active = true
    """)
    all_row = dict(cur.fetchone() or {})

    result = []
    for slug, label in ROLE_LABELS.items():
        if slug == 'all':
            src = all_row
        else:
            src = by_role.get(slug)
            if not src:
                continue
        result.append({
            'slug': slug,
            'label': label,
            'total': int(src.get('total') or 0),
            'email': int(src.get('email_cnt') or 0),
            'telegram': int(src.get('tg_cnt') or 0),
            'vk': int(src.get('vk_cnt') or 0),
        })
    return respond(200, {'audiences': result, 'channels': list(CHANNELS)})


def handle_send_broadcast(cur, conn, schema, body):
    """POST — массовая рассылка по ролям или личное сообщение по user_ids."""
    audience = (body.get('audience') or '').strip()
    user_ids = body.get('user_ids') or []
    channels = body.get('channels') or []
    subject = (body.get('subject') or '').strip()
    text = (body.get('message') or body.get('text') or '').strip()

    if not text:
        return respond(400, {'error': 'Текст сообщения не может быть пустым'})
    channels = [c for c in channels if c in CHANNELS]
    if not channels:
        return respond(400, {'error': 'Выберите хотя бы один канал'})
    if not audience and not user_ids:
        return respond(400, {'error': 'Выберите аудиторию или получателей'})

    is_personal = bool(user_ids)
    event_type = 'admin_message' if is_personal else 'admin_broadcast'

    users = _fetch_audience(cur, schema, audience, user_ids)
    if not users:
        return respond(200, {'sent': 0, 'failed': 0, 'skipped': 0, 'recipients': 0,
                             'by_channel': {}, 'message': 'Нет подходящих получателей'})

    stats = {'sent': 0, 'failed': 0, 'skipped': 0}
    by_channel = {c: {'sent': 0, 'failed': 0, 'skipped': 0} for c in channels}

    for user in users:
        for ch in channels:
            res = _send_one(cur, schema, user, ch, subject, text, event_type)
            stats[res] += 1
            by_channel[ch][res] += 1

    conn.commit()
    return respond(200, {
        'recipients': len(users),
        'sent': stats['sent'],
        'failed': stats['failed'],
        'skipped': stats['skipped'],
        'by_channel': by_channel,
        'personal': is_personal,
    })


def handle_search_users(cur, schema, query):
    """GET — поиск пользователей для личных сообщений (по имени/email/телефону)."""
    q = (query or '').strip().replace("'", "''")
    if len(q) < 2:
        return respond(200, {'users': []})
    cur.execute(f"""
        SELECT u.id, u.name, u.email, u.phone,
               (u.tg_chat_id IS NOT NULL) AS has_tg,
               (u.vk_id IS NOT NULL) AS has_vk,
               (u.email IS NOT NULL AND u.email NOT LIKE '%%.vk.local' AND u.email NOT LIKE '%%@vk.local') AS has_email
        FROM {schema}.users u
        WHERE u.is_active = true
          AND (u.name ILIKE '%{q}%' OR u.email ILIKE '%{q}%' OR u.phone ILIKE '%{q}%')
        ORDER BY u.name
        LIMIT 20
    """)
    return respond(200, {'users': [dict(r) for r in cur.fetchall()]})
