import json
import os
import psycopg2
import psycopg2.extras

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Authorization, X-Session-Token',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json',
}


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def get_schema():
    return os.environ.get('MAIN_DB_SCHEMA', 'public')


def respond(status, body):
    return {'statusCode': status, 'headers': CORS_HEADERS,
            'body': json.dumps(body, default=str, ensure_ascii=False), 'isBase64Encoded': False}


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


def handler(event: dict, context) -> dict:
    """CRM API — единая база клиентов бизнес-пользователей.

    Resources:
      GET  ?resource=clients            — список всех клиентов владельца
      GET  ?resource=client&key=...     — карточка клиента (история, заметки, теги)
      GET  ?resource=tags               — список тегов владельца
      POST ?resource=tags               — создать тег {name, color}
      DELETE ?resource=tags&id=N        — удалить тег (только из CRM, не из БД)
      POST ?resource=client_tag         — навесить/снять тег {client_key, tag_id, action}
      GET  ?resource=notes&key=...      — заметки по клиенту
      POST ?resource=notes              — добавить заметку {client_key, body}
      PUT  ?resource=notes&id=N         — обновить заметку {body}
      POST ?resource=external_guest     — добавить внешнего клиента
    """
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': '', 'isBase64Encoded': False}

    params = event.get('queryStringParameters') or {}
    method = event.get('httpMethod', 'GET')
    resource = params.get('resource', '')

    h = event.get('headers') or {}
    token = h.get('X-Session-Token') or h.get('x-session-token') or \
            (h.get('X-Authorization', '') or h.get('x-authorization', '')).replace('Bearer ', '')
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
    if not has_role(cur, schema, user_id, 'organizer', 'admin', 'partner', 'parmaster'):
        conn.close()
        return respond(403, {'error': 'Forbidden'})

    try:
        if resource == 'clients' and method == 'GET':
            return list_clients(cur, conn, user_id, schema, params)
        if resource == 'client' and method == 'GET':
            return get_client(cur, conn, user_id, schema, params)
        if resource == 'tags':
            if method == 'GET':
                return list_tags(cur, conn, user_id, schema)
            if method == 'POST':
                return create_tag(cur, conn, user_id, schema, event)
            if method == 'DELETE':
                return delete_tag(cur, conn, user_id, schema, params)
        if resource == 'client_tag' and method == 'POST':
            return toggle_client_tag(cur, conn, user_id, schema, event)
        if resource == 'notes':
            if method == 'GET':
                return list_notes(cur, conn, user_id, schema, params)
            if method == 'POST':
                return create_note(cur, conn, user_id, schema, event)
            if method == 'PUT':
                return update_note(cur, conn, user_id, schema, event, params)
        if resource == 'external_guest' and method == 'POST':
            return create_external_guest(cur, conn, user_id, schema, event)
    finally:
        try:
            conn.close()
        except Exception:
            pass

    return respond(404, {'error': 'Resource not found'})


def list_clients(cur, conn, user_id, schema, params):
    """Агрегирует всех клиентов владельца из event_signups, master_bookings, ritual_bookings,
    crm_external_guests. Группирует по contact_key (телефон/email/user_id)."""
    search = (params.get('search') or '').strip().lower()
    search_sql = ''
    if search:
        s = search.replace("'", "''")
        search_sql = f" AND (LOWER(COALESCE(name,'')) LIKE '%{s}%' OR LOWER(COALESCE(phone,'')) LIKE '%{s}%' OR LOWER(COALESCE(email,'')) LIKE '%{s}%')"

    # 1. Гости событий (event_signups)
    cur.execute(f"""
        SELECT s.id AS signup_id, s.user_id, s.name, s.phone, s.email, s.telegram,
               s.status, s.payment_amount, s.created_at, s.preferred_channel,
               e.id AS event_id, e.title AS event_title, e.event_date,
               e.organizer_id
        FROM {schema}.event_signups s
        JOIN {schema}.events e ON e.id = s.event_id
        WHERE e.organizer_id = {user_id} {search_sql}
        ORDER BY s.created_at DESC
        LIMIT 2000
    """)
    signups = cur.fetchall()

    # 2. Записи на мастера (master_bookings) — если пользователь мастер
    cur.execute(f"""
        SELECT mb.id AS booking_id, mb.client_id AS user_id, mb.client_name AS name,
               mb.client_phone AS phone, mb.client_email AS email,
               mb.status, mb.price, mb.created_at, mb.datetime_start
        FROM {schema}.master_bookings mb
        WHERE mb.master_id = {user_id} {search_sql.replace('s.name','mb.client_name').replace('s.phone','mb.client_phone').replace('s.email','mb.client_email').replace('name', 'mb.client_name').replace('phone','mb.client_phone').replace('email','mb.client_email') if search else ''}
        ORDER BY mb.created_at DESC
        LIMIT 2000
    """) if False else None  # отключено пока не интегрировано в кабинет

    # 3. Внешние клиенты
    cur.execute(f"""
        SELECT id, name, phone, email, telegram, vk, created_at, source
        FROM {schema}.crm_external_guests
        WHERE owner_id = {user_id} {search_sql}
        ORDER BY created_at DESC
    """)
    externals = cur.fetchall()

    # Группируем по contact_key
    clients = {}

    def add_visit(key, info, visit):
        if key not in clients:
            clients[key] = {
                'client_key': key,
                'name': info.get('name') or '',
                'phone': info.get('phone') or '',
                'email': info.get('email') or '',
                'telegram': info.get('telegram') or '',
                'user_id': info.get('user_id'),
                'visits_count': 0,
                'total_spent': 0,
                'last_visit_at': None,
                'first_visit_at': None,
                'sources': set(),
            }
        c = clients[key]
        c['visits_count'] += 1
        c['total_spent'] += int(visit.get('amount') or 0)
        d = visit.get('date')
        if d:
            if not c['last_visit_at'] or str(d) > str(c['last_visit_at']):
                c['last_visit_at'] = d
            if not c['first_visit_at'] or str(d) < str(c['first_visit_at']):
                c['first_visit_at'] = d
        c['sources'].add(visit.get('source', 'event'))
        if not c['name'] and info.get('name'):
            c['name'] = info['name']
        if not c['phone'] and info.get('phone'):
            c['phone'] = info['phone']
        if not c['email'] and info.get('email'):
            c['email'] = info['email']
        if not c['telegram'] and info.get('telegram'):
            c['telegram'] = info['telegram']
        if not c['user_id'] and info.get('user_id'):
            c['user_id'] = info['user_id']

    def contact_key(row):
        if row.get('user_id'):
            return f"user:{row['user_id']}"
        if row.get('phone'):
            digits = ''.join(ch for ch in row['phone'] if ch.isdigit())
            if digits:
                return f"phone:{digits[-10:]}"
        if row.get('email'):
            return f"email:{row['email'].lower().strip()}"
        return None

    for s in signups:
        key = contact_key(s) or f"signup:{s['signup_id']}"
        add_visit(key, s, {
            'date': s.get('created_at'),
            'amount': s.get('payment_amount') or 0,
            'source': 'event',
        })

    for ex in externals:
        key = contact_key(ex) or f"ext:{ex['id']}"
        add_visit(key, ex, {
            'date': ex.get('created_at'),
            'amount': 0,
            'source': 'external',
        })

    # Подтягиваем теги одним запросом
    keys = list(clients.keys())
    tags_by_client = {}
    if keys:
        keys_sql = ', '.join(f"'{k}'" for k in keys)
        cur.execute(f"""
            SELECT gt.client_key, t.id, t.name, t.color
            FROM {schema}.crm_guest_tags gt
            JOIN {schema}.crm_tags t ON t.id = gt.tag_id
            WHERE gt.owner_id = {user_id} AND gt.client_key IN ({keys_sql})
        """)
        for r in cur.fetchall():
            tags_by_client.setdefault(r['client_key'], []).append({
                'id': r['id'], 'name': r['name'], 'color': r['color']
            })

    result = []
    for c in clients.values():
        c['sources'] = list(c['sources'])
        c['tags'] = tags_by_client.get(c['client_key'], [])
        result.append(c)

    result.sort(key=lambda x: str(x.get('last_visit_at') or ''), reverse=True)
    return respond(200, {'clients': result, 'total': len(result)})


def get_client(cur, conn, user_id, schema, params):
    """Карточка клиента: история записей, заметки, теги."""
    key = params.get('key', '')
    if not key:
        return respond(400, {'error': 'key required'})

    # Определяем по типу ключа кого ищем
    kind, _, val = key.partition(':')
    user_filter = None
    phone_filter = None
    email_filter = None
    external_id = None
    signup_id = None

    if kind == 'user':
        user_filter = int(val) if val.isdigit() else None
    elif kind == 'phone':
        phone_filter = val
    elif kind == 'email':
        email_filter = val
    elif kind == 'ext':
        external_id = int(val) if val.isdigit() else None
    elif kind == 'signup':
        signup_id = int(val) if val.isdigit() else None

    # Базовая инфа о клиенте — пробуем найти в users
    client_info = {'name': '', 'phone': '', 'email': '', 'telegram': '', 'vk': '', 'user_id': None, 'avatar_url': None}
    if user_filter:
        cur.execute(f"SELECT id, name, phone, email, telegram, vk_id AS vk, avatar_url FROM {schema}.users WHERE id = {user_filter}")
        u = cur.fetchone()
        if u:
            client_info.update({'name': u['name'] or '', 'phone': u['phone'] or '', 'email': u['email'] or '',
                                'telegram': u['telegram'] or '', 'vk': u['vk'] or '', 'user_id': u['id'],
                                'avatar_url': u.get('avatar_url')})

    if external_id:
        cur.execute(f"SELECT name, phone, email, telegram, vk FROM {schema}.crm_external_guests WHERE id = {external_id} AND owner_id = {user_id}")
        u = cur.fetchone()
        if u:
            client_info.update(dict(u))

    # История записей на события владельца
    where_parts = [f"e.organizer_id = {user_id}"]
    or_conds = []
    if user_filter:
        or_conds.append(f"s.user_id = {user_filter}")
    if phone_filter:
        digits = ''.join(ch for ch in phone_filter if ch.isdigit())[-10:]
        if digits:
            or_conds.append(f"REGEXP_REPLACE(COALESCE(s.phone,''), '[^0-9]', '', 'g') LIKE '%{digits}'")
    if email_filter:
        e = email_filter.replace("'", "''")
        or_conds.append(f"LOWER(COALESCE(s.email,'')) = '{e}'")
    if signup_id:
        or_conds.append(f"s.id = {signup_id}")

    history = []
    if or_conds:
        where_parts.append('(' + ' OR '.join(or_conds) + ')')
        where_sql = ' AND '.join(where_parts)
        cur.execute(f"""
            SELECT s.id, s.status, s.payment_amount, s.created_at, s.preferred_channel,
                   e.id AS event_id, e.title, e.event_date, e.start_time, e.bath_name, e.slug
            FROM {schema}.event_signups s
            JOIN {schema}.events e ON e.id = s.event_id
            WHERE {where_sql}
            ORDER BY e.event_date DESC NULLS LAST, s.created_at DESC
            LIMIT 200
        """)
        for r in cur.fetchall():
            history.append({
                'kind': 'event', 'signup_id': r['id'], 'status': r['status'],
                'amount': r['payment_amount'] or 0, 'date': r['event_date'],
                'created_at': r['created_at'], 'title': r['title'],
                'event_id': r['event_id'], 'event_slug': r['slug'],
                'bath_name': r['bath_name'], 'time': r['start_time'],
            })

    # Заметки
    k = key.replace("'", "''")
    cur.execute(f"""
        SELECT id, body, created_at, updated_at
        FROM {schema}.crm_notes
        WHERE owner_id = {user_id} AND client_key = '{k}'
        ORDER BY created_at DESC
    """)
    notes = [dict(r) for r in cur.fetchall()]

    # Теги клиента
    cur.execute(f"""
        SELECT t.id, t.name, t.color
        FROM {schema}.crm_guest_tags gt
        JOIN {schema}.crm_tags t ON t.id = gt.tag_id
        WHERE gt.owner_id = {user_id} AND gt.client_key = '{k}'
        ORDER BY t.name
    """)
    tags = [dict(r) for r in cur.fetchall()]

    # Финансы
    total_spent = sum(int(h.get('amount') or 0) for h in history)
    visits = sum(1 for h in history if h.get('status') in ('confirmed', 'paid', 'attended', 'подтверждён', 'оплачено'))

    return respond(200, {
        'client': {**client_info, 'client_key': key},
        'history': history,
        'notes': notes,
        'tags': tags,
        'stats': {
            'total_spent': total_spent,
            'visits_count': visits,
            'total_bookings': len(history),
        },
    })


def list_tags(cur, conn, user_id, schema):
    cur.execute(f"""
        SELECT t.id, t.name, t.color, t.created_at,
               (SELECT COUNT(*) FROM {schema}.crm_guest_tags gt WHERE gt.tag_id = t.id) AS clients_count
        FROM {schema}.crm_tags t
        WHERE t.owner_id = {user_id}
        ORDER BY t.name
    """)
    return respond(200, {'tags': [dict(r) for r in cur.fetchall()]})


def create_tag(cur, conn, user_id, schema, event):
    body = json.loads(event.get('body') or '{}')
    name = (body.get('name') or '').strip()
    color = (body.get('color') or '#888888').strip()[:20]
    if not name:
        return respond(400, {'error': 'name required'})
    n = name.replace("'", "''")[:64]
    c = color.replace("'", "''")
    cur.execute(f"""
        INSERT INTO {schema}.crm_tags (owner_id, name, color)
        VALUES ({user_id}, '{n}', '{c}')
        ON CONFLICT (owner_id, name) DO UPDATE SET color = EXCLUDED.color
        RETURNING id, name, color
    """)
    conn.commit()
    return respond(200, {'tag': dict(cur.fetchone())})


def delete_tag(cur, conn, user_id, schema, params):
    tag_id = params.get('id')
    if not tag_id or not str(tag_id).isdigit():
        return respond(400, {'error': 'id required'})
    cur.execute(f"UPDATE {schema}.crm_tags SET name = name || '__deleted_' || id WHERE id = {int(tag_id)} AND owner_id = {user_id}")
    conn.commit()
    return respond(200, {'ok': True})


def toggle_client_tag(cur, conn, user_id, schema, event):
    body = json.loads(event.get('body') or '{}')
    client_key = (body.get('client_key') or '').strip()
    tag_id = body.get('tag_id')
    action = body.get('action', 'add')
    if not client_key or not tag_id:
        return respond(400, {'error': 'client_key and tag_id required'})
    k = client_key.replace("'", "''")[:64]
    tid = int(tag_id)

    cur.execute(f"SELECT 1 FROM {schema}.crm_tags WHERE id = {tid} AND owner_id = {user_id}")
    if not cur.fetchone():
        return respond(404, {'error': 'tag not found'})

    if action == 'remove':
        cur.execute(f"UPDATE {schema}.crm_guest_tags SET client_key = client_key || '__r' WHERE owner_id = {user_id} AND tag_id = {tid} AND client_key = '{k}'")
    else:
        cur.execute(f"""
            INSERT INTO {schema}.crm_guest_tags (owner_id, tag_id, client_key)
            VALUES ({user_id}, {tid}, '{k}')
            ON CONFLICT (owner_id, tag_id, client_key) DO NOTHING
        """)
    conn.commit()
    return respond(200, {'ok': True})


def list_notes(cur, conn, user_id, schema, params):
    key = (params.get('key') or '').replace("'", "''")[:64]
    if not key:
        return respond(400, {'error': 'key required'})
    cur.execute(f"""
        SELECT id, body, created_at, updated_at
        FROM {schema}.crm_notes
        WHERE owner_id = {user_id} AND client_key = '{key}'
        ORDER BY created_at DESC
    """)
    return respond(200, {'notes': [dict(r) for r in cur.fetchall()]})


def create_note(cur, conn, user_id, schema, event):
    body_raw = json.loads(event.get('body') or '{}')
    client_key = (body_raw.get('client_key') or '').strip()
    text = (body_raw.get('body') or '').strip()
    if not client_key or not text:
        return respond(400, {'error': 'client_key and body required'})
    k = client_key.replace("'", "''")[:64]
    t = text.replace("'", "''")[:5000]
    cur.execute(f"""
        INSERT INTO {schema}.crm_notes (owner_id, client_key, body)
        VALUES ({user_id}, '{k}', '{t}')
        RETURNING id, body, created_at, updated_at
    """)
    conn.commit()
    return respond(200, {'note': dict(cur.fetchone())})


def update_note(cur, conn, user_id, schema, event, params):
    note_id = params.get('id')
    if not note_id or not str(note_id).isdigit():
        return respond(400, {'error': 'id required'})
    body_raw = json.loads(event.get('body') or '{}')
    text = (body_raw.get('body') or '').strip()
    if not text:
        return respond(400, {'error': 'body required'})
    t = text.replace("'", "''")[:5000]
    cur.execute(f"""
        UPDATE {schema}.crm_notes
        SET body = '{t}', updated_at = NOW()
        WHERE id = {int(note_id)} AND owner_id = {user_id}
        RETURNING id, body, created_at, updated_at
    """)
    row = cur.fetchone()
    conn.commit()
    if not row:
        return respond(404, {'error': 'not found'})
    return respond(200, {'note': dict(row)})


def create_external_guest(cur, conn, user_id, schema, event):
    body = json.loads(event.get('body') or '{}')
    name = (body.get('name') or '').strip()
    if not name:
        return respond(400, {'error': 'name required'})

    n = name.replace("'", "''")[:255]
    phone = (body.get('phone') or '').replace("'", "''")[:50]
    email = (body.get('email') or '').replace("'", "''").lower()[:255]
    tg = (body.get('telegram') or '').replace("'", "''")[:100]
    vk = (body.get('vk') or '').replace("'", "''")[:100]
    source = (body.get('source') or 'manual').replace("'", "''")[:50]

    # Проверяем дубли по телефону/email
    dup_conds = []
    if phone:
        digits = ''.join(ch for ch in phone if ch.isdigit())[-10:]
        if digits:
            dup_conds.append(f"REGEXP_REPLACE(COALESCE(phone,''), '[^0-9]', '', 'g') LIKE '%{digits}'")
    if email:
        dup_conds.append(f"LOWER(email) = '{email}'")

    duplicate_id = None
    if dup_conds:
        cur.execute(f"""
            SELECT id FROM {schema}.crm_external_guests
            WHERE owner_id = {user_id} AND ({' OR '.join(dup_conds)})
            LIMIT 1
        """)
        d = cur.fetchone()
        if d:
            duplicate_id = d['id']

    if duplicate_id:
        return respond(200, {'duplicate_id': duplicate_id, 'created': False})

    cur.execute(f"""
        INSERT INTO {schema}.crm_external_guests (owner_id, name, phone, email, telegram, vk, source)
        VALUES ({user_id}, '{n}', NULLIF('{phone}',''), NULLIF('{email}',''), NULLIF('{tg}',''), NULLIF('{vk}',''), '{source}')
        RETURNING id, name, phone, email, telegram, vk, source, created_at
    """)
    conn.commit()
    return respond(200, {'guest': dict(cur.fetchone()), 'created': True})
