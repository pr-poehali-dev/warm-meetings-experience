import json
import os
import datetime as _dt
import secrets as _secrets
import urllib.request
import psycopg2
import psycopg2.extras

from crm_clients import (
    resolve_client_id, resolve_key_to_client_id, canonical_key,
    resolve_companion, norm_phone, norm_email,
)

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
        if resource == 'import_csv' and method == 'POST':
            return import_csv(cur, conn, user_id, schema, event)
        if resource == 'event_guest':
            if method == 'PUT':
                return update_event_guest(cur, conn, user_id, schema, event)
            if method == 'POST':
                return add_event_guest(cur, conn, user_id, schema, event)
            if method == 'DELETE':
                return delete_event_guest(cur, conn, user_id, schema, params)
        if resource == 'guest_invite' and method == 'POST':
            return send_guest_invite(cur, conn, user_id, user, schema, event)
        if resource == 'backfill_clients' and method == 'POST':
            return backfill_clients(cur, conn, user_id, schema)
    finally:
        try:
            conn.close()
        except Exception:
            pass

    return respond(404, {'error': 'Resource not found'})


def list_clients(cur, conn, user_id, schema, params):
    """Агрегирует всех клиентов владельца из event_signups, master_bookings, ritual_bookings,
    crm_external_guests. Группирует по contact_key (телефон/email/user_id).

    Если передан event_id — возвращает только гостей конкретного события,
    каждая запись отдельно (БЕЗ группировки), со всеми полями event_signups
    (status, payment_amount, payment_type, attended, comment).
    """
    search = (params.get('search') or '').strip().lower()
    search_sql = ''
    if search:
        s = search.replace("'", "''")
        search_sql = f" AND (LOWER(COALESCE(name,'')) LIKE '%{s}%' OR LOWER(COALESCE(phone,'')) LIKE '%{s}%' OR LOWER(COALESCE(email,'')) LIKE '%{s}%')"

    event_id_filter = params.get('event_id')
    if event_id_filter and str(event_id_filter).isdigit():
        return list_event_guests(cur, conn, user_id, schema, int(event_id_filter), search_sql)

    # 1. Гости событий (event_signups) — для организатора
    cur.execute(f"""
        SELECT s.id AS signup_id, s.user_id, s.name, s.phone, s.email, s.telegram,
               s.status, s.payment_amount, s.created_at, s.preferred_channel,
               s.guests,
               e.id AS event_id, e.title AS event_title, e.event_date,
               e.organizer_id
        FROM {schema}.event_signups s
        JOIN {schema}.events e ON e.id = s.event_id
        WHERE e.organizer_id = {user_id} {search_sql}
        ORDER BY s.created_at DESC
        LIMIT 2000
    """)
    signups = cur.fetchall()

    # 2. Записи на мастера (master_bookings) — если пользователь мастер.
    # master_bookings.master_id ссылается на masters.id, а masters.user_id — на users.id
    bookings_search = ''
    if search:
        s = search.replace("'", "''")
        bookings_search = f" AND (LOWER(COALESCE(mb.client_name,'')) LIKE '%{s}%' OR LOWER(COALESCE(mb.client_phone,'')) LIKE '%{s}%' OR LOWER(COALESCE(mb.client_email,'')) LIKE '%{s}%')"
    cur.execute(f"""
        SELECT mb.id AS booking_id, mb.client_id AS user_id,
               mb.client_name AS name, mb.client_phone AS phone, mb.client_email AS email,
               mb.status, mb.price, mb.created_at, mb.datetime_start
        FROM {schema}.master_bookings mb
        JOIN {schema}.masters m ON m.id = mb.master_id
        WHERE m.user_id = {user_id} {bookings_search}
        ORDER BY mb.created_at DESC
        LIMIT 2000
    """)
    master_bookings = cur.fetchall()

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

    companions = []  # для резолва в canonical после агрегации
    for s in signups:
        key = contact_key(s) or f"signup:{s['signup_id']}"
        add_visit(key, s, {
            'date': s.get('created_at'),
            'amount': s.get('payment_amount') or 0,
            'source': 'event',
        })
        # Спутники — отдельные клиенты
        comp_list = s.get('guests') or []
        if isinstance(comp_list, list):
            for idx, comp in enumerate(comp_list):
                if not isinstance(comp, dict):
                    continue
                cname = (comp.get('name') or '').strip()
                cphone = (comp.get('phone') or '').strip()
                if not (cname or cphone):
                    continue
                ph = norm_phone(cphone)
                ckey = f"phone:{ph}" if ph else f"companion:{s['signup_id']}:{idx}"
                add_visit(ckey, {'name': cname, 'phone': cphone}, {
                    'date': s.get('created_at'),
                    'amount': 0,
                    'source': 'event',
                })
                companions.append((s['signup_id'], idx, cname, cphone, ckey))

    for mb in master_bookings:
        key = contact_key(mb) or f"booking:{mb['booking_id']}"
        add_visit(key, mb, {
            'date': mb.get('datetime_start') or mb.get('created_at'),
            'amount': float(mb.get('price') or 0),
            'source': 'master',
        })

    for ex in externals:
        key = contact_key(ex) or f"ext:{ex['id']}"
        add_visit(key, ex, {
            'date': ex.get('created_at'),
            'amount': 0,
            'source': 'external',
        })

    # Создаём canonical-клиентов для спутников (без телефона — через companion-идентичность)
    if companions:
        for sid, idx, cname, cphone, _ckey in companions:
            resolve_companion(cur, schema, user_id, sid, idx, name=cname, phone=cphone)
        conn.commit()

    # Маппинг legacy-ключей -> canonical cid: через идентичности владельца (1 запрос)
    cur.execute(f"""
        SELECT identity_type, identity_value, client_id
        FROM {schema}.crm_client_identities
        WHERE owner_id = {user_id}
    """)
    ident_to_cid = {}
    for r in cur.fetchall():
        ident_to_cid[f"{r['identity_type']}:{r['identity_value']}"] = r['client_id']

    def to_canonical(legacy_key):
        # legacy_key уже в формате user:/phone:/email:/signup:/booking:/ext:/companion:
        cid = ident_to_cid.get(legacy_key)
        return canonical_key(cid) if cid else legacy_key

    # Привязываем canonical-ключ к каждому агрегированному клиенту
    for c in clients.values():
        c['client_key'] = to_canonical(c['client_key'])

    # Подтягиваем теги: по canonical-ключам И по legacy (на случай если backfill не прошёл)
    all_keys = set()
    for c in clients.values():
        all_keys.add(c['client_key'])
    # плюс исходные legacy-ключи
    for k in list(clients.keys()):
        all_keys.add(k)

    tags_by_client = {}
    if all_keys:
        keys_sql = ', '.join(f"'{k.replace(chr(39), chr(39)*2)}'" for k in all_keys)
        cur.execute(f"""
            SELECT gt.client_key, t.id, t.name, t.color
            FROM {schema}.crm_guest_tags gt
            JOIN {schema}.crm_tags t ON t.id = gt.tag_id AND t.is_active = true
            WHERE gt.owner_id = {user_id} AND gt.client_key IN ({keys_sql})
        """)
        for r in cur.fetchall():
            ck = to_canonical(r['client_key'])
            bucket = tags_by_client.setdefault(ck, {})
            bucket[r['id']] = {'id': r['id'], 'name': r['name'], 'color': r['color']}

    result = []
    for c in clients.values():
        c['sources'] = list(c['sources'])
        c['tags'] = list(tags_by_client.get(c['client_key'], {}).values())
        c['segments'] = _compute_segments(c)
        result.append(c)

    result.sort(key=lambda x: str(x.get('last_visit_at') or ''), reverse=True)

    # Считаем размеры сегментов по ВСЕЙ базе (до фильтрации)
    seg_counts = {'vip': 0, 'regular': 0, 'newbie': 0, 'sleeping': 0}
    for c in result:
        for s in c['segments']:
            if s in seg_counts:
                seg_counts[s] += 1

    # Серверная фильтрация по сегменту / тегу / источнику
    seg = (params.get('segment') or '').strip()
    tag_id = params.get('tag_id')
    source = (params.get('source') or '').strip()

    filtered = result
    if seg and seg in seg_counts:
        filtered = [c for c in filtered if seg in c['segments']]
    if tag_id and str(tag_id).isdigit():
        tid = int(tag_id)
        filtered = [c for c in filtered if any(t['id'] == tid for t in c['tags'])]
    if source in ('event', 'master', 'external'):
        filtered = [c for c in filtered if source in c['sources']]

    return respond(200, {
        'clients': filtered,
        'total': len(filtered),
        'total_all': len(result),
        'segment_counts': seg_counts,
    })


# Пороги сегментов (в рублях / днях / визитах)
SEG_VIP_SPENT = 10000
SEG_REGULAR_VISITS = 3
SEG_SLEEPING_DAYS = 90


def _compute_segments(c):
    """Вычисляет умные сегменты клиента на основе его метрик.
    Сегменты не взаимоисключающие (VIP может быть и постоянным)."""
    segs = []
    spent = int(c.get('total_spent') or 0)
    visits = int(c.get('visits_count') or 0)

    if spent >= SEG_VIP_SPENT:
        segs.append('vip')
    if visits >= SEG_REGULAR_VISITS:
        segs.append('regular')
    elif visits <= 1:
        segs.append('newbie')

    last = c.get('last_visit_at')
    if last:
        try:
            ds = str(last)[:10]
            d = _dt.date.fromisoformat(ds)
            if (_dt.date.today() - d).days > SEG_SLEEPING_DAYS:
                segs.append('sleeping')
        except Exception:
            pass
    return segs


def list_event_guests(cur, conn, user_id, schema, event_id, search_sql):
    """Гости конкретного события. Доступ для:
    - organizer_id события
    - admin (любые события)
    - partner-владелец бани, в которой проходит событие
    """
    cur.execute(f"""
        SELECT e.id, e.title, e.event_date, e.organizer_id, e.bath_id,
               b.owner_id AS bath_owner_id
        FROM {schema}.events e
        LEFT JOIN {schema}.baths b ON b.id = e.bath_id
        WHERE e.id = {event_id}
    """)
    ev = cur.fetchone()
    if not ev:
        return respond(404, {'error': 'event not found'})

    is_organizer_owner = ev.get('organizer_id') == user_id
    is_bath_owner = ev.get('bath_owner_id') == user_id
    is_admin = has_role(cur, schema, user_id, 'admin')
    is_co_organizer = False
    if not (is_organizer_owner or is_bath_owner or is_admin):
        cur.execute(f"SELECT 1 FROM {schema}.event_co_organizers WHERE event_id = {event_id} AND user_id = {user_id}")
        is_co_organizer = cur.fetchone() is not None
    if not (is_organizer_owner or is_bath_owner or is_admin or is_co_organizer):
        return respond(403, {'error': 'no access to event'})

    cur.execute(f"""
        SELECT s.id AS signup_id, s.user_id, s.name, s.phone, s.email, s.telegram,
               s.status, s.payment_amount, s.payment_type, s.attended, s.comment,
               s.consent_pd, s.preferred_channel, s.wrote_at, s.created_at,
               s.club_fee_paid, s.final_price_due, s.topup_amount, s.joined_after_freeze,
               s.guests,
               u.avatar_url
        FROM {schema}.event_signups s
        LEFT JOIN {schema}.users u ON u.id = s.user_id
        WHERE s.event_id = {event_id} {search_sql}
        ORDER BY s.created_at DESC
    """)
    rows = cur.fetchall()

    # Маппинг legacy-ключей -> canonical cid: (1 запрос на владельца)
    cur.execute(f"""
        SELECT identity_type, identity_value, client_id
        FROM {schema}.crm_client_identities
        WHERE owner_id = {user_id}
    """)
    ident_to_cid = {}
    for r in cur.fetchall():
        ident_to_cid[f"{r['identity_type']}:{r['identity_value']}"] = r['client_id']

    def legacy_key_for(r):
        if r.get('user_id'):
            return f"user:{r['user_id']}"
        if r.get('phone'):
            digits = ''.join(ch for ch in r['phone'] if ch.isdigit())
            if digits:
                return f"phone:{digits[-10:]}"
        if r.get('email'):
            return f"email:{r['email'].lower().strip()}"
        return f"signup:{r['signup_id']}"

    def canon_for(r):
        lk = legacy_key_for(r)
        cid = ident_to_cid.get(lk)
        return canonical_key(cid) if cid else lk

    # Собираем все ключи (legacy + canonical + signup) для запроса тегов
    keys = set()
    for r in rows:
        keys.add(legacy_key_for(r))
        keys.add(canon_for(r))
        keys.add(f"signup:{r['signup_id']}")

    tags_by_key = {}
    if keys:
        keys_sql = ', '.join(f"'{k.replace(chr(39), chr(39)*2)}'" for k in keys)
        cur.execute(f"""
            SELECT gt.client_key, t.id, t.name, t.color
            FROM {schema}.crm_guest_tags gt
            JOIN {schema}.crm_tags t ON t.id = gt.tag_id AND t.is_active = true
            WHERE gt.owner_id = {user_id} AND gt.client_key IN ({keys_sql})
        """)
        for r in cur.fetchall():
            tags_by_key.setdefault(r['client_key'], []).append({
                'id': r['id'], 'name': r['name'], 'color': r['color']
            })

    guests = []
    for r in rows:
        ckey = canon_for(r)
        g = dict(r)
        # Сериализация datetime
        for k in ('created_at', 'wrote_at'):
            if g.get(k):
                g[k] = str(g[k])
        g['client_key'] = ckey
        # Теги: по canonical + legacy + signup, без дублей по id
        merged = {}
        for src_key in (ckey, legacy_key_for(r), f"signup:{r['signup_id']}"):
            for t in tags_by_key.get(src_key, []):
                merged[t['id']] = t
        g['tags'] = list(merged.values())

        # Спутники → полноценные клиенты с собственным client_key
        comp_list = g.get('guests') or []
        if isinstance(comp_list, list) and comp_list:
            enriched = []
            for idx, comp in enumerate(comp_list):
                if not isinstance(comp, dict):
                    continue
                comp_cid = resolve_companion(
                    cur, schema, user_id, r['signup_id'], idx,
                    name=comp.get('name'), phone=comp.get('phone'),
                )
                comp_out = dict(comp)
                if comp_cid:
                    comp_out['client_key'] = canonical_key(comp_cid)
                enriched.append(comp_out)
            g['guests'] = enriched
        guests.append(g)

    # Статистика
    total = len(guests)
    confirmed = sum(1 for g in guests if g.get('status') in ('confirmed', 'paid', 'подтверждён', 'оплачено'))
    cancelled = sum(1 for g in guests if g.get('status') in ('cancelled', 'отменено', 'refused'))
    total_paid = sum(int(g.get('payment_amount') or 0) for g in guests)
    attended = sum(1 for g in guests if g.get('attended') is True)

    # Спутники могли создать новых canonical-клиентов — фиксируем
    conn.commit()

    return respond(200, {
        'mode': 'event_guests',
        'event': {'id': ev['id'], 'title': ev['title'], 'event_date': str(ev['event_date']) if ev['event_date'] else None},
        'guests': guests,
        'stats': {
            'total': total,
            'confirmed': confirmed,
            'cancelled': cancelled,
            'attended': attended,
            'total_paid': total_paid,
        },
    })


def update_event_guest(cur, conn, user_id, schema, event):
    """Обновление гостя события (status, payment_amount, payment_type, attended, comment, name, phone, email, telegram)."""
    body = json.loads(event.get('body') or '{}')
    signup_id = body.get('signup_id')
    if not signup_id or not str(signup_id).isdigit():
        return respond(400, {'error': 'signup_id required'})
    sid = int(signup_id)

    # Проверка прав: organizer, соорганизатор или admin
    is_admin = has_role(cur, schema, user_id, 'admin')
    if is_admin:
        cur.execute(f"SELECT s.id FROM {schema}.event_signups s WHERE s.id = {sid}")
    else:
        cur.execute(f"""
            SELECT s.id FROM {schema}.event_signups s
            JOIN {schema}.events e ON e.id = s.event_id
            WHERE s.id = {sid} AND (
                e.organizer_id = {user_id}
                OR EXISTS (
                    SELECT 1 FROM {schema}.event_co_organizers c
                    WHERE c.event_id = e.id AND c.user_id = {user_id}
                )
            )
        """)
    if not cur.fetchone():
        return respond(403, {'error': 'no access'})

    allowed_str = {'name': 255, 'phone': 50, 'email': 255, 'telegram': 100, 'status': 20, 'payment_type': 20, 'comment': 5000}
    allowed_int = {'payment_amount', 'club_fee_paid', 'topup_amount', 'final_price_due'}
    allowed_bool = {'attended', 'consent_pd', 'joined_after_freeze'}

    sets = []
    for k, maxlen in allowed_str.items():
        if k in body and body[k] is not None:
            v = str(body[k]).replace("'", "''")[:maxlen]
            sets.append(f"{k} = NULLIF('{v}', '')" if k != 'status' else f"{k} = '{v}'")
    for k in allowed_int:
        if k in body and body[k] is not None:
            try:
                sets.append(f"{k} = {int(body[k])}")
            except Exception:
                pass
    for k in allowed_bool:
        if k in body and body[k] is not None:
            sets.append(f"{k} = {'true' if body[k] else 'false'}")

    if not sets:
        return respond(400, {'error': 'no fields to update'})

    cur.execute(f"UPDATE {schema}.event_signups SET {', '.join(sets)} WHERE id = {sid}")
    conn.commit()
    return respond(200, {'ok': True})


def add_event_guest(cur, conn, user_id, schema, event):
    """Добавление гостя в событие вручную."""
    body = json.loads(event.get('body') or '{}')
    event_id = body.get('event_id')
    name = (body.get('name') or '').strip()
    phone = (body.get('phone') or '').strip()
    if not event_id or not str(event_id).isdigit() or not name:
        return respond(400, {'error': 'event_id and name required'})
    eid = int(event_id)

    # Доступ: организатор события, соорганизатор или админ
    is_admin = has_role(cur, schema, user_id, 'admin')
    if is_admin:
        cur.execute(f"SELECT id FROM {schema}.events WHERE id = {eid}")
    else:
        cur.execute(f"""
            SELECT e.id FROM {schema}.events e
            WHERE e.id = {eid} AND (
                e.organizer_id = {user_id}
                OR EXISTS (
                    SELECT 1 FROM {schema}.event_co_organizers c
                    WHERE c.event_id = e.id AND c.user_id = {user_id}
                )
            )
        """)
    if not cur.fetchone():
        return respond(403, {'error': 'no access'})

    n = name.replace("'", "''")[:255]
    ph = phone.replace("'", "''")[:50] or ' '  # phone NOT NULL
    em = (body.get('email') or '').replace("'", "''")[:255]
    tg = (body.get('telegram') or '').replace("'", "''")[:100]
    status = (body.get('status') or 'confirmed').replace("'", "''")[:20]
    p_type = (body.get('payment_type') or '').replace("'", "''")[:20]
    p_amount = int(body.get('payment_amount') or 0)

    cur.execute(f"""
        INSERT INTO {schema}.event_signups
            (event_id, name, phone, email, telegram, status, payment_type, payment_amount, preferred_channel)
        VALUES
            ({eid}, '{n}', '{ph}', NULLIF('{em}',''), NULLIF('{tg}',''), '{status}',
             NULLIF('{p_type}',''), {p_amount}, 'manual')
        RETURNING id, name, phone, email, telegram, status, payment_amount, payment_type, attended, comment, created_at
    """)
    row = dict(cur.fetchone())
    if row.get('created_at'):
        row['created_at'] = str(row['created_at'])
    # Создаём/привязываем canonical-клиента
    cid = resolve_client_id(cur, schema, user_id, name=name, phone=phone,
                            email=body.get('email'), telegram=body.get('telegram'))
    if cid:
        row['client_key'] = canonical_key(cid)
    conn.commit()
    return respond(200, {'guest': row})


def delete_event_guest(cur, conn, user_id, schema, params):
    sid = params.get('signup_id')
    if not sid or not str(sid).isdigit():
        return respond(400, {'error': 'signup_id required'})
    sid = int(sid)
    is_admin = has_role(cur, schema, user_id, 'admin')
    if is_admin:
        cur.execute(f"SELECT id FROM {schema}.event_signups WHERE id = {sid}")
    else:
        cur.execute(f"""
            SELECT id FROM {schema}.event_signups
            WHERE id = {sid} AND event_id IN (
                SELECT e.id FROM {schema}.events e
                WHERE e.organizer_id = {user_id}
                   OR EXISTS (
                       SELECT 1 FROM {schema}.event_co_organizers c
                       WHERE c.event_id = e.id AND c.user_id = {user_id}
                   )
            )
        """)
    if not cur.fetchone():
        return respond(404, {'error': 'Запись не найдена или нет прав'})
    cur.execute(f"DELETE FROM {schema}.guest_messages WHERE signup_id = {sid}")
    cur.execute(f"DELETE FROM {schema}.refund_requests WHERE signup_id = {sid}")
    cur.execute(f"DELETE FROM {schema}.event_signups WHERE id = {sid}")
    conn.commit()
    return respond(200, {'ok': True, 'deleted': 1})


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

    # cid: — стабильный клиент. Разворачиваем в набор контактов по идентичностям
    # и по карточке crm_clients, чтобы собрать всю историю.
    note_keys = [key]
    cc = None
    if kind == 'cid' and val.isdigit():
        client_id = int(val)
        cur.execute(f"""
            SELECT identity_type, identity_value FROM {schema}.crm_client_identities
            WHERE owner_id = {user_id} AND client_id = {client_id}
        """)
        for r in cur.fetchall():
            t, v = r['identity_type'], r['identity_value']
            if t == 'user' and v.isdigit():
                user_filter = int(v)
                note_keys.append(f"user:{v}")
            elif t == 'phone':
                phone_filter = v
                note_keys.append(f"phone:{v}")
            elif t == 'email':
                email_filter = v
                note_keys.append(f"email:{v}")
            elif t == 'signup' and v.isdigit():
                signup_id = int(v)
                note_keys.append(f"signup:{v}")
        # Контакты из самой карточки (для отображения имени/телефона)
        cur.execute(f"SELECT name, phone, email, telegram, vk, user_id FROM {schema}.crm_clients WHERE id = {client_id} AND owner_id = {user_id}")
        cc = cur.fetchone()
    elif kind == 'user':
        user_filter = int(val) if val.isdigit() else None
    elif kind == 'phone':
        phone_filter = val
    elif kind == 'email':
        email_filter = val
    elif kind == 'ext':
        external_id = int(val) if val.isdigit() else None
    elif kind == 'signup':
        signup_id = int(val) if val.isdigit() else None
    booking_id = int(val) if kind == 'booking' and val.isdigit() else None

    # Базовая инфа о клиенте — пробуем найти в users
    client_info = {'name': '', 'phone': '', 'email': '', 'telegram': '', 'vk': '', 'user_id': None, 'avatar_url': None}
    # Из canonical-карточки (если открыт по cid:)
    if cc:
        client_info.update({'name': cc['name'] or '', 'phone': cc['phone'] or '',
                            'email': cc['email'] or '', 'telegram': cc['telegram'] or '',
                            'vk': cc['vk'] or '', 'user_id': cc['user_id']})
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

    # История мастер-записей: ищем по тем же критериям, но по master_bookings
    mb_or = []
    if user_filter:
        mb_or.append(f"mb.client_id = {user_filter}")
    if phone_filter:
        digits = ''.join(ch for ch in phone_filter if ch.isdigit())[-10:]
        if digits:
            mb_or.append(f"REGEXP_REPLACE(COALESCE(mb.client_phone,''), '[^0-9]', '', 'g') LIKE '%{digits}'")
    if email_filter:
        e = email_filter.replace("'", "''")
        mb_or.append(f"LOWER(COALESCE(mb.client_email,'')) = '{e}'")
    if booking_id:
        mb_or.append(f"mb.id = {booking_id}")

    if mb_or:
        try:
            cur.execute(f"""
                SELECT mb.id, mb.status, mb.price, mb.created_at, mb.datetime_start,
                       mb.comment
                FROM {schema}.master_bookings mb
                JOIN {schema}.masters m ON m.id = mb.master_id
                WHERE m.user_id = {user_id} AND ({' OR '.join(mb_or)})
                ORDER BY mb.datetime_start DESC NULLS LAST, mb.created_at DESC
                LIMIT 200
            """)
            for r in cur.fetchall():
                history.append({
                    'kind': 'master', 'signup_id': r['id'], 'status': r['status'],
                    'amount': float(r['price'] or 0),
                    'date': r['datetime_start'], 'created_at': r['created_at'],
                    'title': 'Запись к мастеру',
                    'event_id': None, 'event_slug': None,
                    'bath_name': None, 'time': None,
                })
            history.sort(key=lambda x: str(x.get('date') or x.get('created_at') or ''), reverse=True)
        except Exception:
            pass

    # Заметки и теги собираем по canonical-ключу И всем legacy-ключам клиента
    keys_sql = ', '.join(f"'{nk.replace(chr(39), chr(39)*2)}'" for nk in set(note_keys))
    cur.execute(f"""
        SELECT id, body, created_at, updated_at
        FROM {schema}.crm_notes
        WHERE owner_id = {user_id} AND client_key IN ({keys_sql})
        ORDER BY created_at DESC
    """)
    notes = [dict(r) for r in cur.fetchall()]

    # Теги клиента (DISTINCT — один тег мог быть на разных legacy-ключах)
    cur.execute(f"""
        SELECT DISTINCT t.id, t.name, t.color
        FROM {schema}.crm_guest_tags gt
        JOIN {schema}.crm_tags t ON t.id = gt.tag_id
        WHERE gt.owner_id = {user_id} AND gt.client_key IN ({keys_sql})
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
        WHERE t.owner_id = {user_id} AND t.is_active = true
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
    tid = int(tag_id)
    cur.execute(f"SELECT 1 FROM {schema}.crm_tags WHERE id = {tid} AND owner_id = {user_id}")
    if not cur.fetchone():
        return respond(404, {'error': 'Тег не найден'})
    cur.execute(f"UPDATE {schema}.crm_tags SET is_active = false WHERE id = {tid} AND owner_id = {user_id}")
    conn.commit()
    return respond(200, {'ok': True})


def toggle_client_tag(cur, conn, user_id, schema, event):
    body = json.loads(event.get('body') or '{}')
    client_key = (body.get('client_key') or '').strip()
    tag_id = body.get('tag_id')
    action = body.get('action', 'add')
    if not client_key or not tag_id:
        return respond(400, {'error': 'client_key and tag_id required'})
    # Стабильный ключ — тег не потеряется при регистрации гостя
    cid = resolve_key_to_client_id(cur, schema, user_id, client_key)
    if cid:
        client_key = canonical_key(cid)
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
    # Переводим любой ключ на стабильный cid:, чтобы заметка не «отвязалась»
    cid = resolve_key_to_client_id(cur, schema, user_id, client_key)
    if cid:
        client_key = canonical_key(cid)
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
    guest_row = dict(cur.fetchone())
    # Создаём/привязываем canonical-клиента
    cid = resolve_client_id(cur, schema, user_id, name=body.get('name'),
                            phone=body.get('phone'), email=body.get('email'),
                            telegram=body.get('telegram'), vk=body.get('vk'))
    if cid:
        guest_row['client_key'] = canonical_key(cid)
    conn.commit()
    return respond(200, {'guest': guest_row, 'created': True})


def _norm_phone(p):
    if not p:
        return ''
    digits = ''.join(ch for ch in str(p) if ch.isdigit())
    return digits[-10:] if len(digits) >= 10 else digits


def import_csv(cur, conn, user_id, schema, event):
    """Массовый импорт клиентов из CSV.

    Body: {"rows": [{"name","phone","email","telegram","vk","note"}, ...], "source": "csv"}
    Возвращает: {created, skipped_duplicates, errors, total}.
    Дубли определяются по нормализованному телефону (последние 10 цифр) или email
    среди уже существующих внешних клиентов И внутри самого файла.
    """
    body = json.loads(event.get('body') or '{}')
    rows = body.get('rows') or []
    source = (body.get('source') or 'csv').replace("'", "''")[:50]

    if not isinstance(rows, list):
        return respond(400, {'error': 'rows must be array'})
    if len(rows) > 5000:
        return respond(400, {'error': 'too many rows (max 5000)'})

    # Берём существующие телефоны/email одним запросом
    cur.execute(f"""
        SELECT id, phone, email
        FROM {schema}.crm_external_guests
        WHERE owner_id = {user_id}
    """)
    existing_phones = set()
    existing_emails = set()
    for r in cur.fetchall():
        ph = _norm_phone(r.get('phone'))
        if ph:
            existing_phones.add(ph)
        em = (r.get('email') or '').lower().strip()
        if em:
            existing_emails.add(em)

    created = 0
    skipped = 0
    errors = []
    notes_to_insert = []  # (external_id, note_text)

    # Внутри-файловые дубли — добавляем в set по мере импорта
    for idx, row in enumerate(rows):
        try:
            name = (row.get('name') or '').strip()
            if not name:
                errors.append({'row': idx + 1, 'reason': 'нет имени'})
                continue

            phone = (row.get('phone') or '').strip()
            email = (row.get('email') or '').strip().lower()
            tg = (row.get('telegram') or '').strip()
            vk = (row.get('vk') or '').strip()
            note_text = (row.get('note') or '').strip()

            ph_norm = _norm_phone(phone)
            if (ph_norm and ph_norm in existing_phones) or (email and email in existing_emails):
                skipped += 1
                continue

            n = name.replace("'", "''")[:255]
            ph_esc = phone.replace("'", "''")[:50]
            em_esc = email.replace("'", "''")[:255]
            tg_esc = tg.replace("'", "''")[:100]
            vk_esc = vk.replace("'", "''")[:100]

            cur.execute(f"""
                INSERT INTO {schema}.crm_external_guests (owner_id, name, phone, email, telegram, vk, source)
                VALUES ({user_id}, '{n}', NULLIF('{ph_esc}',''), NULLIF('{em_esc}',''), NULLIF('{tg_esc}',''), NULLIF('{vk_esc}',''), '{source}')
                RETURNING id
            """)
            new_id = cur.fetchone()['id']
            created += 1
            if ph_norm:
                existing_phones.add(ph_norm)
            if email:
                existing_emails.add(email)

            if note_text:
                notes_to_insert.append((new_id, note_text))
        except Exception as e:
            errors.append({'row': idx + 1, 'reason': str(e)[:200]})

    # Заметки скопом
    for ext_id, txt in notes_to_insert:
        t = txt.replace("'", "''")[:5000]
        cur.execute(f"""
            INSERT INTO {schema}.crm_notes (owner_id, client_key, body)
            VALUES ({user_id}, 'ext:{ext_id}', '{t}')
        """)

    conn.commit()
    return respond(200, {
        'total': len(rows),
        'created': created,
        'skipped_duplicates': skipped,
        'errors': errors,
    })


def _send_email(to_email, subject, body_html, to_name=None):
    """Отправка письма через Unisender Go. Не падает при ошибках."""
    api_key = os.environ.get('UNISENDER_API_KEY', '')
    sender_email = os.environ.get('UNISENDER_SENDER_EMAIL', '')
    sender_name = os.environ.get('UNISENDER_SENDER_NAME', 'Sparcom')
    if not api_key or not sender_email or not to_email:
        return False
    recipient = {'email': to_email}
    if to_name:
        recipient['name'] = to_name
    payload = {
        'message': {
            'recipients': [recipient],
            'sender_email': sender_email,
            'sender_name': sender_name,
            'subject': subject,
            'body': {'html': body_html},
            'track_links': 1,
            'track_read': 1,
        }
    }
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        'https://go2.unisender.ru/ru/transactional/api/v1/email/send.json',
        data=data,
        headers={'X-API-KEY': api_key, 'Content-Type': 'application/json'},
    )
    try:
        urllib.request.urlopen(req, timeout=10)
        return True
    except Exception:
        return False


def _get_or_create_referral_code(cur, conn, schema, user_id):
    cur.execute(f"SELECT referral_code FROM {schema}.users WHERE id = {user_id}")
    row = cur.fetchone()
    code = row['referral_code'] if row else None
    if not code:
        code = _secrets.token_urlsafe(8).upper()[:12]
        safe = code.replace("'", "''")
        cur.execute(f"UPDATE {schema}.users SET referral_code = '{safe}' WHERE id = {user_id}")
        conn.commit()
    return code


def send_guest_invite(cur, conn, user_id, user, schema, event):
    """Отправляет email-приглашение гостю с реферальной ссылкой организатора."""
    try:
        body = json.loads(event.get('body') or '{}')
    except Exception:
        body = {}

    signup_id = body.get('signup_id')
    email = (body.get('email') or '').strip()
    if not email or '@' not in email:
        return respond(400, {'error': 'Укажите корректный email'})

    # Если указан signup_id — проверяем что гость принадлежит событию организатора и обновляем email при необходимости
    guest_name = body.get('name') or ''
    event_title = ''
    if signup_id and str(signup_id).isdigit():
        cur.execute(f"""
            SELECT s.id, s.name, s.email, e.title, e.organizer_id
            FROM {schema}.event_signups s
            JOIN {schema}.events e ON e.id = s.event_id
            WHERE s.id = {int(signup_id)}
        """)
        row = cur.fetchone()
        if not row:
            return respond(404, {'error': 'Гость не найден'})
        if row['organizer_id'] != user_id:
            return respond(403, {'error': 'Forbidden'})
        guest_name = guest_name or row['name'] or ''
        event_title = row['title'] or ''
        # Сохраняем email на signup, если его не было
        if not row['email']:
            safe_email = email.replace("'", "''")
            cur.execute(f"UPDATE {schema}.event_signups SET email = '{safe_email}' WHERE id = {int(signup_id)}")
            conn.commit()

    ref_code = _get_or_create_referral_code(cur, conn, schema, user_id)
    origin = (body.get('origin') or 'https://sparcom.club').rstrip('/')
    link = f"{origin}/register?ref={ref_code}"

    organizer_name = (user.get('name') if isinstance(user, dict) else None) or 'Организатор'
    name_html = (guest_name or 'Здравствуйте').replace('<', '').replace('>', '')
    org_html = organizer_name.replace('<', '').replace('>', '')
    event_html = event_title.replace('<', '').replace('>', '')
    event_block = f'<p style="margin:0 0 12px;">Событие: <b>{event_html}</b></p>' if event_html else ''

    subject = f'Приглашение от {organizer_name}'
    html = f"""
    <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111;">
      <h2 style="margin:0 0 12px;">{name_html}, вас приглашают в Sparcom</h2>
      <p style="margin:0 0 12px;line-height:1.5;">
        <b>{org_html}</b> пригласил(а) вас присоединиться. Чтобы получать уведомления и общаться,
        зарегистрируйтесь по ссылке ниже:
      </p>
      {event_block}
      <p style="margin:20px 0;">
        <a href="{link}" style="background:#2563eb;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;display:inline-block;">
          Принять приглашение
        </a>
      </p>
      <p style="margin:12px 0 0;font-size:12px;color:#666;">
        Или скопируйте ссылку: <span style="word-break:break-all;">{link}</span>
      </p>
    </div>
    """

    ok = _send_email(email, subject, html, to_name=guest_name or None)
    if not ok:
        return respond(500, {'error': 'Не удалось отправить письмо. Проверьте настройки почты.'})
    return respond(200, {'ok': True, 'sent_to': email, 'referral_link': link})


def backfill_clients(cur, conn, owner_id, schema):
    """Разовая засейка canonical-клиентов из всех источников владельца и
    перевод заметок/тегов со старых client_key на стабильные cid:.

    Идемпотентна: повторный запуск не плодит дубли (resolve_client_id
    переиспользует существующих клиентов по идентичностям).
    """
    stats = {'signups': 0, 'bookings': 0, 'externals': 0,
             'notes_migrated': 0, 'tags_migrated': 0, 'clients_total': 0}

    # 1. Гости событий организатора
    cur.execute(f"""
        SELECT s.id AS signup_id, s.user_id, s.name, s.phone, s.email, s.telegram
        FROM {schema}.event_signups s
        JOIN {schema}.events e ON e.id = s.event_id
        WHERE e.organizer_id = {owner_id}
    """)
    for r in cur.fetchall():
        cid = resolve_client_id(cur, schema, owner_id, user_id=r['user_id'],
                                phone=r['phone'], email=r['email'],
                                telegram=r['telegram'], name=r['name'])
        if cid:
            stats['signups'] += 1
            _migrate_legacy_key(cur, schema, owner_id, _legacy_key(r['user_id'], r['phone'], r['email'], f"signup:{r['signup_id']}"), cid, stats)

    # 2. Записи к мастеру (если пользователь — мастер)
    cur.execute(f"""
        SELECT mb.id AS booking_id, mb.client_id AS user_id,
               mb.client_name AS name, mb.client_phone AS phone, mb.client_email AS email
        FROM {schema}.master_bookings mb
        JOIN {schema}.masters m ON m.id = mb.master_id
        WHERE m.user_id = {owner_id}
    """)
    for r in cur.fetchall():
        cid = resolve_client_id(cur, schema, owner_id, user_id=r['user_id'],
                                phone=r['phone'], email=r['email'], name=r['name'])
        if cid:
            stats['bookings'] += 1
            _migrate_legacy_key(cur, schema, owner_id, _legacy_key(r['user_id'], r['phone'], r['email'], f"booking:{r['booking_id']}"), cid, stats)

    # 3. Внешние клиенты
    cur.execute(f"""
        SELECT id, name, phone, email, telegram, vk
        FROM {schema}.crm_external_guests
        WHERE owner_id = {owner_id}
    """)
    for r in cur.fetchall():
        cid = resolve_client_id(cur, schema, owner_id, phone=r['phone'], email=r['email'],
                                telegram=r['telegram'], vk=r['vk'], name=r['name'])
        if cid:
            stats['externals'] += 1
            _migrate_legacy_key(cur, schema, owner_id, _legacy_key(None, r['phone'], r['email'], f"ext:{r['id']}"), cid, stats)

    cur.execute(f"SELECT COUNT(*) AS c FROM {schema}.crm_clients WHERE owner_id = {owner_id} AND merged_into IS NULL")
    stats['clients_total'] = cur.fetchone()['c']

    conn.commit()
    return respond(200, {'ok': True, 'stats': stats})


def _legacy_key(user_id, phone, email, fallback):
    """Воспроизводит старую логику contact_key для поиска legacy-записей."""
    if user_id:
        return f"user:{user_id}"
    ph = norm_phone(phone)
    if ph:
        return f"phone:{ph}"
    em = norm_email(email)
    if em:
        return f"email:{em}"
    return fallback


def _migrate_legacy_key(cur, schema, owner_id, legacy_key, client_id, stats):
    """Переносит заметки и теги со старого client_key на canonical cid:."""
    new_key = canonical_key(client_id)
    if legacy_key == new_key:
        return
    lk = legacy_key.replace("'", "''")
    nk = new_key.replace("'", "''")

    # Заметки: переносим, но не дублируем уже перенесённые
    cur.execute(f"""
        UPDATE {schema}.crm_notes
        SET client_key = '{nk}'
        WHERE owner_id = {owner_id} AND client_key = '{lk}'
    """)
    stats['notes_migrated'] += cur.rowcount or 0

    # Теги: переносим с защитой от конфликта уникальности
    cur.execute(f"""
        UPDATE {schema}.crm_guest_tags gt
        SET client_key = '{nk}'
        WHERE gt.owner_id = {owner_id} AND gt.client_key = '{lk}'
          AND NOT EXISTS (
              SELECT 1 FROM {schema}.crm_guest_tags x
              WHERE x.owner_id = gt.owner_id AND x.tag_id = gt.tag_id AND x.client_key = '{nk}'
          )
    """)
    stats['tags_migrated'] += cur.rowcount or 0