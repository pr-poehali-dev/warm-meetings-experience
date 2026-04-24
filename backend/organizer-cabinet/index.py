import json
import os
import secrets
import urllib.request
from datetime import datetime, timedelta

import psycopg2
import psycopg2.extras
import requests as http_requests

TG_BOT_URL = "https://functions.poehali.dev/c54f8799-96a5-4519-a2c7-e1b2e5f9d8c1"


def notify_admin_tg(text):
    token = os.environ.get('TELEGRAM_BOT_TOKEN')
    chat_id = os.environ.get('TELEGRAM_CHAT_ID')
    if not token or not chat_id:
        return
    payload = json.dumps({'chat_id': chat_id, 'text': text, 'parse_mode': 'HTML'}).encode('utf-8')
    req = urllib.request.Request(
        f'https://api.telegram.org/bot{token}/sendMessage',
        data=payload,
        headers={'Content-Type': 'application/json'}
    )
    try:
        urllib.request.urlopen(req, timeout=5)
    except Exception:
        pass


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def get_schema():
    return os.environ.get('MAIN_DB_SCHEMA', 'public')

def cors_headers():
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Authorization, X-Session-Token',
        'Content-Type': 'application/json'
    }

def get_user_from_token(cur, token, schema):
    cur.execute(f"""
        SELECT u.id, u.name, u.email, u.phone, u.telegram
        FROM {schema}.user_sessions s
        JOIN {schema}.users u ON u.id = s.user_id
        WHERE s.token = '{token}' AND s.expires_at > NOW()
    """)
    return cur.fetchone()

def is_organizer(cur, user_id, schema):
    cur.execute(f"""
        SELECT 1 FROM {schema}.user_roles ur
        JOIN {schema}.roles r ON r.id = ur.role_id
        WHERE ur.user_id = {user_id}
          AND r.slug IN ('organizer', 'admin')
          AND ur.status = 'active'
    """)
    return cur.fetchone() is not None

def is_admin(cur, user_id, schema):
    cur.execute(f"""
        SELECT 1 FROM {schema}.user_roles ur
        JOIN {schema}.roles r ON r.id = ur.role_id
        WHERE ur.user_id = {user_id}
          AND r.slug = 'admin'
          AND ur.status = 'active'
    """)
    return cur.fetchone() is not None


def trigger_tg_publish(event_id, organizer_id):
    try:
        http_requests.post(
            TG_BOT_URL,
            json={'action': 'publish_event', 'event_id': event_id, 'organizer_id': organizer_id},
            timeout=10
        )
    except Exception:
        pass

def verify_admin_token(token):
    """Проверяет admin_token — тот же алгоритм что в auth/index.py"""
    import hashlib, time
    admin_password = os.environ.get('ADMIN_PASSWORD', '')
    if not admin_password or not token:
        return False
    expected = hashlib.sha256(f"{admin_password}:{int(time.time() // 86400)}".encode()).hexdigest()
    return token == expected


def handler(event, context):
    """Личный кабинет организатора: дашборд, события, участники"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors_headers(), 'body': ''}

    headers = cors_headers()
    method = event.get('httpMethod', 'GET')
    params = event.get('queryStringParameters') or {}
    resource = params.get('resource', 'dashboard')

    hdrs = event.get('headers') or {}

    # Если передан X-Admin-Token и ресурс — moderation, авторизуем напрямую
    admin_token = hdrs.get('X-Admin-Token', '')
    if admin_token and resource == 'moderation' and verify_admin_token(admin_token):
        conn = get_conn()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        schema = get_schema()
        # Находим любого активного admin-пользователя для подстановки user_id
        cur.execute(f"""
            SELECT u.id FROM {schema}.users u
            JOIN {schema}.user_roles ur ON ur.user_id = u.id
            JOIN {schema}.roles r ON r.id = ur.role_id
            WHERE r.slug = 'admin' AND ur.status = 'active'
            LIMIT 1
        """)
        admin_row = cur.fetchone()
        if admin_row:
            return handle_moderation(event, method, params, cur, conn, admin_row['id'], schema, headers)
        conn.close()

    token = (hdrs.get('X-Authorization') or hdrs.get('X-Session-Token') or '').replace('Bearer ', '')
    if not token:
        return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Unauthorized'})}

    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    schema = get_schema()

    user = get_user_from_token(cur, token, schema)
    if not user:
        conn.close()
        return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Invalid token'})}

    user_id = user['id']

    # join_by_invite и verify_invite доступны любому авторизованному пользователю
    if resource == 'co_organizers' and method == 'POST':
        body_raw = json.loads(event.get('body', '{}'))
        if body_raw.get('action') == 'join_by_invite':
            return handle_join_by_invite(body_raw, cur, conn, user_id, schema, headers)

    if resource == 'verify_invite' and method == 'POST':
        body_raw = json.loads(event.get('body', '{}'))
        return handle_verify_invite(body_raw, cur, conn, user_id, schema, headers)

    if not is_organizer(cur, user_id, schema):
        conn.close()
        return {'statusCode': 403, 'headers': headers, 'body': json.dumps({'error': 'Forbidden: organizer role required'})}

    if resource == 'dashboard':
        return handle_dashboard(cur, conn, user_id, user, schema, headers)
    elif resource == 'events':
        return handle_events(event, method, params, cur, conn, user_id, schema, headers)
    elif resource == 'moderation':
        return handle_moderation(event, method, params, cur, conn, user_id, schema, headers)
    elif resource == 'participants':
        return handle_participants(event, method, params, cur, conn, user_id, schema, headers)
    elif resource == 'profile':
        return handle_profile(event, method, cur, conn, user_id, schema, headers)
    elif resource == 'pricing_tiers':
        return handle_pricing_tiers(event, method, params, cur, conn, user_id, schema, headers)
    elif resource == 'co_organizers':
        return handle_co_organizers(event, method, params, cur, conn, user_id, schema, headers)
    elif resource == 'user_search':
        return handle_user_search(event, method, params, cur, conn, user_id, schema, headers)
    elif resource == 'send_invite' and method == 'POST':
        body_raw = json.loads(event.get('body', '{}'))
        return handle_send_invite(body_raw, cur, conn, user_id, schema, headers)
    elif resource == 'guests':
        return handle_guests(event, method, params, cur, conn, user_id, schema, headers)
    elif resource == 'messages':
        return handle_messages(event, method, params, cur, conn, user_id, schema, headers)

    conn.close()
    return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'Resource not found'})}


def handle_dashboard(cur, conn, user_id, user, schema, headers):
    """Дашборд: статистика и ближайшие события организатора"""
    admin = is_admin(cur, user_id, schema)

    events_filter = f"organizer_id = {user_id}" if not admin else "1=1"

    cur.execute(f"""
        SELECT
            COUNT(*) FILTER (WHERE event_date < CURRENT_DATE) as total_events,
            COUNT(*) FILTER (WHERE event_date >= CURRENT_DATE AND is_visible = true) as upcoming_events,
            COUNT(*) FILTER (WHERE is_visible = false) as drafts
        FROM {schema}.events
        WHERE {events_filter}
    """)
    event_stats = cur.fetchone()

    cur.execute(f"""
        SELECT COUNT(s.id) as total_participants
        FROM {schema}.event_signups s
        JOIN {schema}.events e ON e.id = s.event_id
        WHERE {events_filter.replace('organizer_id', 'e.organizer_id') if not admin else '1=1'}
          AND s.status NOT IN ('cancelled', 'отменено')
    """)
    participant_stats = cur.fetchone()

    cur.execute(f"""
        SELECT
            e.id, e.title, e.slug, e.event_date, e.start_time, e.end_time,
            e.bath_name, e.bath_address, e.total_spots, e.spots_left,
            e.price_amount, e.price_label, e.image_url, e.is_visible,
            e.event_type, e.event_type_icon, e.organizer_id,
            COUNT(s.id) FILTER (WHERE s.status NOT IN ('cancelled', 'отменено')) as signups_count,
            COUNT(s.id) FILTER (WHERE s.status = 'paid' OR s.status = 'оплачено') as paid_count
        FROM {schema}.events e
        LEFT JOIN {schema}.event_signups s ON s.event_id = e.id
        WHERE e.event_date >= CURRENT_DATE AND e.is_visible = true
          AND ({events_filter.replace('organizer_id', 'e.organizer_id') if not admin else '1=1'})
        GROUP BY e.id
        ORDER BY e.event_date ASC, e.start_time ASC
        LIMIT 5
    """)
    upcoming = cur.fetchall()

    cur.execute(f"""
        SELECT op.*, u.name, u.email
        FROM {schema}.organizer_profiles op
        JOIN {schema}.users u ON u.id = op.user_id
        WHERE op.user_id = {user_id}
    """)
    profile = cur.fetchone()

    cur.execute(f"SELECT 1 FROM {schema}.tg_linked_accounts WHERE user_id = {user_id}")
    tg_linked = cur.fetchone() is not None

    cur.execute(f"SELECT COUNT(*) as cnt FROM {schema}.tg_channels WHERE user_id = {user_id} AND is_active = TRUE")
    tg_channels = cur.fetchone()

    conn.close()
    return {
        'statusCode': 200,
        'headers': headers,
        'body': json.dumps({
            'user': dict(user),
            'is_admin': admin,
            'stats': {
                'total_events': event_stats['total_events'] or 0,
                'upcoming_events': event_stats['upcoming_events'] or 0,
                'drafts': event_stats['drafts'] or 0,
                'total_participants': participant_stats['total_participants'] or 0,
            },
            'upcoming_events': [dict(e) for e in upcoming],
            'profile': dict(profile) if profile else None,
            'tg_linked': tg_linked,
            'tg_channels_count': tg_channels['cnt'] if tg_channels else 0,
        }, default=str)
    }


def handle_events(event, method, params, cur, conn, user_id, schema, headers):
    """CRUD событий организатора"""
    admin = is_admin(cur, user_id, schema)
    owner_filter = f"e.organizer_id = {user_id}" if not admin else "1=1"

    if method == 'GET':
        status_filter = params.get('status', 'all')
        event_id = params.get('id')

        if event_id:
            cur.execute(f"""
                SELECT e.*,
                    COUNT(s.id) FILTER (WHERE s.status NOT IN ('cancelled','отменено')) as signups_count,
                    COUNT(s.id) FILTER (WHERE s.status IN ('paid','оплачено')) as paid_count
                FROM {schema}.events e
                LEFT JOIN {schema}.event_signups s ON s.event_id = e.id
                WHERE e.id = {event_id} AND ({owner_filter})
                GROUP BY e.id
            """)
            row = cur.fetchone()
            if not row:
                conn.close()
                return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'Not found'})}
            cur.execute(f"SELECT * FROM event_pricing_tiers WHERE event_id = {event_id} ORDER BY sort_order, valid_until NULLS LAST")
            tiers = [dict(t) for t in cur.fetchall()]
            result = dict(row)
            result['pricing_tiers'] = tiers
            conn.close()
            return {'statusCode': 200, 'headers': headers, 'body': json.dumps(result, default=str)}

        where_parts = [f"({owner_filter})"]
        if status_filter == 'active':
            where_parts.append("e.event_date >= CURRENT_DATE AND e.is_visible = true")
        elif status_filter == 'past':
            where_parts.append("e.event_date < CURRENT_DATE")
        elif status_filter == 'drafts':
            where_parts.append("e.is_visible = false")

        where_sql = " AND ".join(where_parts)

        cur.execute(f"""
            SELECT e.*,
                COUNT(s.id) FILTER (WHERE s.status NOT IN ('cancelled','отменено')) as signups_count,
                COUNT(s.id) FILTER (WHERE s.status IN ('paid','оплачено')) as paid_count
            FROM {schema}.events e
            LEFT JOIN {schema}.event_signups s ON s.event_id = e.id
            WHERE {where_sql}
            GROUP BY e.id
            ORDER BY e.event_date DESC, e.start_time DESC
        """)
        rows = cur.fetchall()
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps([dict(r) for r in rows], default=str)}

    if method == 'POST':
        body = json.loads(event.get('body', '{}'))
        action = body.get('action')

        if action == 'assign_organizer':
            event_id = body.get('event_id')
            target_organizer_id = body.get('organizer_id', user_id)
            cur.execute(f"UPDATE {schema}.events SET organizer_id = {target_organizer_id} WHERE id = {event_id}")
            conn.commit()
            conn.close()
            return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'ok': True})}

        import re
        def slugify(text):
            text = text.lower().strip()
            translit = {'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'yo','ж':'zh','з':'z','и':'i','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f','х':'kh','ц':'ts','ч':'ch','ш':'sh','щ':'shch','ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya',' ':'-'}
            result = ''.join(translit.get(c, c) for c in text)
            result = re.sub(r'[^a-z0-9-]', '', result)
            return re.sub(r'-+', '-', result).strip('-')

        slug = slugify(body.get('title', ''))[:200]
        base_slug = slug
        counter = 1
        while True:
            cur.execute(f"SELECT id FROM {schema}.events WHERE slug = '{slug}'")
            if not cur.fetchone():
                break
            slug = f"{base_slug}-{counter}"
            counter += 1

        title = body.get('title', '').replace("'", "''")
        short_desc = (body.get('short_description') or '').replace("'", "''")
        full_desc = (body.get('full_description') or '').replace("'", "''")
        description = (body.get('description') or '').replace("'", "''")
        bath_name = (body.get('bath_name') or '').replace("'", "''")
        bath_address = (body.get('bath_address') or '').replace("'", "''")
        price_label = (body.get('price_label') or body.get('price') or '').replace("'", "''")
        program = body.get('program', [])
        rules = body.get('rules', [])
        pricing_lines = [x for x in body.get('pricing_lines', []) if x.strip()]
        program_sql = "ARRAY[" + ",".join(f"'{p.replace(chr(39), chr(39)*2)}'" for p in program) + "]::text[]" if program else "ARRAY[]::text[]"
        rules_sql = "ARRAY[" + ",".join(f"'{r.replace(chr(39), chr(39)*2)}'" for r in rules) + "]::text[]" if rules else "ARRAY[]::text[]"
        pricing_sql = "ARRAY[" + ",".join(f"'{x.replace(chr(39), chr(39)*2)}'" for x in pricing_lines) + "]::text[]" if pricing_lines else "ARRAY[]::text[]"

        pricing_type = body.get('pricing_type', 'fixed')
        if pricing_type not in ('fixed', 'dynamic'):
            pricing_type = 'fixed'

        admin = is_admin(cur, user_id, schema)
        requested_visible = body.get('is_visible', False)
        if admin:
            event_status = 'published' if requested_visible else 'draft'
            event_visible = requested_visible
        else:
            action = body.get('submit_action', 'draft')
            if action == 'submit':
                event_status = 'pending'
                event_visible = False
            else:
                event_status = 'draft'
                event_visible = False

        try:
            cur.execute(f"""
                INSERT INTO {schema}.events (
                    title, slug, short_description, full_description, description,
                    event_date, start_time, end_time,
                    event_type, event_type_icon, occupancy,
                    bath_name, bath_address, image_url,
                    price, price_amount, price_label,
                    total_spots, spots_left, featured, is_visible, status,
                    program, rules, pricing_lines, pricing_type, organizer_id
                ) VALUES (
                    '{title}', '{slug}', '{short_desc}', '{full_desc}', '{description}',
                    '{body.get('event_date')}', '{body.get('start_time', '19:00')}', '{body.get('end_time', '23:00')}',
                    '{body.get('event_type', 'знакомство')}', '{body.get('event_type_icon', 'Users')}', '{body.get('occupancy', 'low')}',
                    '{bath_name}', '{bath_address}', '{body.get('image_url', '')}',
                    '{price_label}', {body.get('price_amount', 0)}, '{price_label}',
                    {body.get('total_spots', 10)}, {body.get('spots_left', body.get('total_spots', 10))},
                    {body.get('featured', False)}, {event_visible}, '{event_status}',
                    {program_sql}, {rules_sql}, {pricing_sql}, '{pricing_type}', {user_id}
                ) RETURNING *
            """)
        except Exception as e:
            conn.rollback()
            conn.close()
            err = str(e)
            if 'value too long' in err:
                return {'statusCode': 400, 'headers': headers, 'body': json.dumps({
                    'error': 'Одно из текстовых полей слишком длинное. Проверьте: название (макс. 255), тип мероприятия (макс. 100), цена/цена-текст (макс. 100), название бани (макс. 255), адрес (макс. 500).'
                })}
            return {'statusCode': 500, 'headers': headers, 'body': json.dumps({'error': err})}
        row = cur.fetchone()
        conn.commit()
        conn.close()
        created = dict(row)
        if created.get('is_visible'):
            trigger_tg_publish(created['id'], user_id)
        if created.get('status') == 'pending':
            notify_admin_tg(
                f"📋 <b>Новое событие на модерации</b>\n\n"
                f"🎪 <b>{created.get('title', '—')}</b>\n"
                f"📅 {created.get('event_date', '—')}  🕐 {str(created.get('start_time', ''))[:5]}\n"
                f"📍 {created.get('bath_name', '—')}\n"
                f"👤 Организатор ID: {user_id}\n\n"
                f"Откройте Админ-панель → Модерация для проверки."
            )
        return {'statusCode': 201, 'headers': headers, 'body': json.dumps(created, default=str)}

    if method == 'PUT':
        body = json.loads(event.get('body', '{}'))
        event_id = body.get('id')
        if not event_id:
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'id required'})}

        cur.execute(f"SELECT organizer_id, is_visible, status FROM {schema}.events WHERE id = {event_id}")
        existing = cur.fetchone()
        if not existing:
            conn.close()
            return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'Not found'})}
        if not admin and existing['organizer_id'] != user_id:
            conn.close()
            return {'statusCode': 403, 'headers': headers, 'body': json.dumps({'error': 'Forbidden'})}
        was_hidden = not existing['is_visible']

        sets = []
        for field in ['title','short_description','full_description','description','event_date','start_time','end_time','event_type','event_type_icon','occupancy','bath_name','bath_address','image_url','price','price_label','slug']:
            if field in body:
                val = str(body[field]).replace("'", "''")
                sets.append(f"{field} = '{val}'")
        for field in ['price_amount','total_spots','spots_left']:
            if field in body:
                sets.append(f"{field} = {int(body[field])}")
        for field in ['featured']:
            if field in body:
                sets.append(f"{field} = {bool(body[field])}")
        if 'is_visible' in body:
            if admin:
                sets.append(f"is_visible = {bool(body['is_visible'])}")
        if 'submit_action' in body and not admin:
            action = body['submit_action']
            if action == 'submit':
                sets.append("status = 'pending'")
                sets.append("is_visible = false")
            elif action == 'draft':
                sets.append("status = 'draft'")
                sets.append("is_visible = false")
        if 'program' in body:
            p = body['program']
            sets.append(f"program = {'ARRAY[' + ','.join(chr(39)+x.replace(chr(39),chr(39)*2)+chr(39) for x in p) + ']::text[]' if p else 'ARRAY[]::text[]'}")
        if 'rules' in body:
            r = body['rules']
            sets.append(f"rules = {'ARRAY[' + ','.join(chr(39)+x.replace(chr(39),chr(39)*2)+chr(39) for x in r) + ']::text[]' if r else 'ARRAY[]::text[]'}")
        if 'pricing_lines' in body:
            pl = [x for x in body['pricing_lines'] if x.strip()]
            sets.append(f"pricing_lines = {'ARRAY[' + ','.join(chr(39)+x.replace(chr(39),chr(39)*2)+chr(39) for x in pl) + ']::text[]' if pl else 'ARRAY[]::text[]'}")
        if 'pricing_type' in body and body['pricing_type'] in ('fixed', 'dynamic'):
            sets.append(f"pricing_type = '{body['pricing_type']}'")
        sets.append("updated_at = CURRENT_TIMESTAMP")

        try:
            cur.execute(f"UPDATE {schema}.events SET {', '.join(sets)} WHERE id = {event_id} RETURNING *")
        except Exception as e:
            conn.rollback()
            conn.close()
            err = str(e)
            if 'value too long' in err:
                return {'statusCode': 400, 'headers': headers, 'body': json.dumps({
                    'error': 'Одно из текстовых полей слишком длинное. Проверьте: название (макс. 255), тип мероприятия (макс. 100), цена/цена-текст (макс. 100), название бани (макс. 255), адрес (макс. 500).'
                })}
            return {'statusCode': 500, 'headers': headers, 'body': json.dumps({'error': err})}
        row = cur.fetchone()
        conn.commit()
        conn.close()
        updated = dict(row)
        if was_hidden and updated.get('is_visible'):
            trigger_tg_publish(event_id, updated.get('organizer_id') or user_id)
        if body.get('submit_action') == 'submit' and updated.get('status') == 'pending':
            notify_admin_tg(
                f"📋 <b>Новое событие на модерации</b>\n\n"
                f"🎪 <b>{updated.get('title', '—')}</b>\n"
                f"📅 {updated.get('event_date', '—')}  🕐 {str(updated.get('start_time', ''))[:5]}\n"
                f"📍 {updated.get('bath_name', '—')}\n"
                f"👤 Организатор ID: {updated.get('organizer_id', '—')}\n\n"
                f"Откройте Админ-панель → Модерация для проверки."
            )
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps(updated, default=str)}

    if method == 'DELETE':
        event_id = params.get('id')
        cur.execute(f"SELECT organizer_id FROM {schema}.events WHERE id = {event_id}")
        existing = cur.fetchone()
        if not existing or (not admin and existing['organizer_id'] != user_id):
            conn.close()
            return {'statusCode': 403, 'headers': headers, 'body': json.dumps({'error': 'Forbidden'})}
        cur.execute(f"UPDATE {schema}.events SET is_visible = false WHERE id = {event_id}")
        conn.commit()
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'ok': True})}

    conn.close()
    return {'statusCode': 405, 'headers': headers, 'body': json.dumps({'error': 'Method not allowed'})}


def handle_moderation(event, method, params, cur, conn, user_id, schema, headers):
    """Модерация событий (только для админа)"""
    admin = is_admin(cur, user_id, schema)
    if not admin:
        conn.close()
        return {'statusCode': 403, 'headers': headers, 'body': json.dumps({'error': 'Forbidden: admin only'})}

    if method == 'GET':
        cur.execute(f"""
            SELECT e.*, u.name as organizer_name, u.email as organizer_email
            FROM {schema}.events e
            LEFT JOIN {schema}.users u ON u.id = e.organizer_id
            WHERE e.status = 'pending'
            ORDER BY e.created_at ASC
        """)
        rows = cur.fetchall()
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps([dict(r) for r in rows], default=str)}

    if method == 'POST':
        body = json.loads(event.get('body', '{}'))
        event_id = body.get('event_id')
        action = body.get('action')
        reason = (body.get('reason') or '').replace("'", "''")

        if not event_id or action not in ('approve', 'reject'):
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'event_id and action (approve/reject) required'})}

        cur.execute(f"""
            SELECT e.id, e.organizer_id, e.title, e.event_date, e.start_time, e.bath_name,
                   u.name as organizer_name
            FROM {schema}.events e
            LEFT JOIN {schema}.users u ON u.id = e.organizer_id
            WHERE e.id = {event_id}
        """)
        ev = cur.fetchone()
        if not ev:
            conn.close()
            return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'Event not found'})}

        if action == 'approve':
            cur.execute(f"UPDATE {schema}.events SET status = 'published', is_visible = true WHERE id = {event_id}")
            publish_to_telegram = body.get('publish_to_telegram', True)
            if publish_to_telegram:
                trigger_tg_publish(event_id, ev['organizer_id'])
            notify_admin_tg(
                f"✅ <b>Событие одобрено</b>\n\n"
                f"🎪 <b>{ev['title']}</b>\n"
                f"📅 {ev['event_date']}  🕐 {str(ev.get('start_time', ''))[:5]}\n"
                f"📍 {ev.get('bath_name', '—')}\n"
                f"👤 Организатор: {ev.get('organizer_name', '—')}"
            )
        else:
            cur.execute(f"UPDATE {schema}.events SET status = 'rejected', is_visible = false WHERE id = {event_id}")
            reason_display = reason.replace("''", "'") or 'не указана'
            notify_admin_tg(
                f"❌ <b>Событие отклонено</b>\n\n"
                f"🎪 <b>{ev['title']}</b>\n"
                f"📅 {ev['event_date']}  🕐 {str(ev.get('start_time', ''))[:5]}\n"
                f"📍 {ev.get('bath_name', '—')}\n"
                f"👤 Организатор: {ev.get('organizer_name', '—')}\n"
                f"💬 Причина: {reason_display}"
            )

        cur.execute(f"""
            INSERT INTO {schema}.event_moderation_logs (event_id, admin_id, action, reason)
            VALUES ({event_id}, {user_id}, '{action}', '{reason}')
        """)
        conn.commit()
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'ok': True, 'action': action})}

    conn.close()
    return {'statusCode': 405, 'headers': headers, 'body': json.dumps({'error': 'Method not allowed'})}


def handle_participants(event, method, params, cur, conn, user_id, schema, headers):
    """Управление участниками события"""
    admin = is_admin(cur, user_id, schema)
    event_id = params.get('event_id') or (json.loads(event.get('body', '{}')).get('event_id') if method != 'GET' else None)

    if event_id:
        cur.execute(f"SELECT organizer_id FROM {schema}.events WHERE id = {event_id}")
        ev = cur.fetchone()
        if not ev or (not admin and ev['organizer_id'] != user_id):
            conn.close()
            return {'statusCode': 403, 'headers': headers, 'body': json.dumps({'error': 'Forbidden'})}

    if method == 'GET':
        if not event_id:
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'event_id required'})}
        cur.execute(f"""
            SELECT s.*, u.consent_photo
            FROM {schema}.event_signups s
            LEFT JOIN {schema}.users u ON u.id = s.user_id
            WHERE s.event_id = {event_id}
            ORDER BY s.created_at DESC
        """)
        rows = cur.fetchall()
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps([dict(r) for r in rows], default=str)}

    if method == 'POST':
        body = json.loads(event.get('body', '{}'))
        name = body.get('name', '').replace("'", "''")
        phone = body.get('phone', '').replace("'", "''")
        email = (body.get('email') or '').replace("'", "''")
        telegram = (body.get('telegram') or '').replace("'", "''")
        status = body.get('status', 'confirmed')
        payment_type = body.get('payment_type')
        payment_amount = int(body.get('payment_amount', 0))
        pt_sql = f"'{payment_type}'" if payment_type else 'NULL'
        cur.execute(f"""
            INSERT INTO {schema}.event_signups (event_id, name, phone, email, telegram, status, payment_type, payment_amount)
            VALUES ({event_id}, '{name}', '{phone}', '{email}', '{telegram}', '{status}', {pt_sql}, {payment_amount})
            RETURNING *
        """)
        row = cur.fetchone()
        conn.commit()
        conn.close()
        return {'statusCode': 201, 'headers': headers, 'body': json.dumps(dict(row), default=str)}

    if method == 'PUT':
        body = json.loads(event.get('body', '{}'))
        signup_id = body.get('id')
        sets = []
        for field in ['name', 'phone', 'telegram', 'email', 'comment']:
            if field in body:
                val = str(body[field]).replace("'", "''")
                sets.append(f"{field} = '{val}'")
        if 'status' in body:
            sets.append(f"status = '{body['status']}'")
        if 'attended' in body:
            sets.append(f"attended = {bool(body['attended'])}")
        if 'payment_type' in body:
            pt = body['payment_type']
            if pt:
                sets.append(f"payment_type = '{pt}'")
            else:
                sets.append("payment_type = NULL")
        if 'payment_amount' in body:
            sets.append(f"payment_amount = {int(body['payment_amount'])}")
        if not sets:
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Nothing to update'})}
        cur.execute(f"UPDATE {schema}.event_signups SET {', '.join(sets)} WHERE id = {signup_id} RETURNING *")
        row = cur.fetchone()
        conn.commit()
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps(dict(row) if row else {}, default=str)}

    conn.close()
    return {'statusCode': 405, 'headers': headers, 'body': json.dumps({'error': 'Method not allowed'})}


def handle_pricing_tiers(event, method, params, cur, conn, user_id, schema, headers):
    """Управление ступенями динамического ценообразования"""
    admin = is_admin(cur, user_id, schema)

    if method == 'GET':
        event_id = params.get('event_id')
        if not event_id:
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'event_id required'})}
        cur.execute(f"SELECT organizer_id FROM {schema}.events WHERE id = {event_id}")
        ev = cur.fetchone()
        if not ev or (not admin and ev['organizer_id'] != user_id):
            conn.close()
            return {'statusCode': 403, 'headers': headers, 'body': json.dumps({'error': 'Forbidden'})}
        cur.execute(f"SELECT * FROM event_pricing_tiers WHERE event_id = {event_id} ORDER BY sort_order, valid_until NULLS LAST")
        tiers = [dict(t) for t in cur.fetchall()]
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps(tiers, default=str)}

    if method == 'POST':
        body = json.loads(event.get('body', '{}'))
        event_id = body.get('event_id')
        cur.execute(f"SELECT organizer_id FROM {schema}.events WHERE id = {event_id}")
        ev = cur.fetchone()
        if not ev or (not admin and ev['organizer_id'] != user_id):
            conn.close()
            return {'statusCode': 403, 'headers': headers, 'body': json.dumps({'error': 'Forbidden'})}

        tiers = body.get('tiers', [])
        cur.execute(f"DELETE FROM event_pricing_tiers WHERE event_id = {event_id}")
        for i, tier in enumerate(tiers):
            label = str(tier.get('label', '')).replace("'", "''")
            price = int(tier.get('price_amount', 0))
            valid_until = tier.get('valid_until')
            valid_until_sql = f"'{valid_until}'" if valid_until else 'NULL'
            cur.execute(f"""
                INSERT INTO event_pricing_tiers (event_id, label, price_amount, valid_until, sort_order)
                VALUES ({event_id}, '{label}', {price}, {valid_until_sql}, {i})
            """)
        conn.commit()

        cur.execute(f"SELECT * FROM event_pricing_tiers WHERE event_id = {event_id} ORDER BY sort_order")
        result = [dict(t) for t in cur.fetchall()]
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps(result, default=str)}

    conn.close()
    return {'statusCode': 405, 'headers': headers, 'body': json.dumps({'error': 'Method not allowed'})}


def handle_profile(event, method, cur, conn, user_id, schema, headers):
    """Профиль организатора"""
    if method == 'GET':
        cur.execute(f"SELECT * FROM {schema}.organizer_profiles WHERE user_id = {user_id}")
        profile = cur.fetchone()
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps(dict(profile) if profile else {}, default=str)}

    if method == 'PUT':
        body = json.loads(event.get('body', '{}'))
        sets = []
        for field in ['display_name', 'bio', 'photo_url']:
            if field in body:
                val = str(body[field]).replace("'", "''")
                sets.append(f"{field} = '{val}'")
        sets.append("updated_at = CURRENT_TIMESTAMP")

        cur.execute(f"""
            INSERT INTO {schema}.organizer_profiles (user_id, {', '.join(f.split(' = ')[0] for f in sets[:-1])})
            VALUES ({user_id}, {', '.join(chr(39) + str(body.get(f.split(' = ')[0], '')) + chr(39) for f in sets[:-1])})
            ON CONFLICT (user_id) DO UPDATE SET {', '.join(sets)}
            RETURNING *
        """)
        row = cur.fetchone()
        conn.commit()
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps(dict(row), default=str)}

    conn.close()
    return {'statusCode': 405, 'headers': headers, 'body': json.dumps({'error': 'Method not allowed'})}


def handle_co_organizers(event, method, params, cur, conn, user_id, schema, headers):
    """Соорганизаторы события: GET список, POST добавить, DELETE удалить"""
    admin = is_admin(cur, user_id, schema)

    def check_event_owner(event_id):
        cur.execute(f"SELECT organizer_id FROM {schema}.events WHERE id = {event_id}")
        ev = cur.fetchone()
        if not ev:
            return False, 'not_found'
        if not admin and ev['organizer_id'] != user_id:
            return False, 'forbidden'
        return True, None

    if method == 'GET':
        event_id = params.get('event_id')
        if not event_id:
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'event_id required'})}
        ok, err = check_event_owner(event_id)
        if not ok:
            conn.close()
            return {'statusCode': 404 if err == 'not_found' else 403, 'headers': headers, 'body': json.dumps({'error': err})}
        cur.execute(f"""
            SELECT co.id, co.event_id, co.user_id, co.added_by, co.created_at,
                   u.name, u.email, u.telegram,
                   op.display_name, op.photo_url
            FROM {schema}.event_co_organizers co
            JOIN {schema}.users u ON u.id = co.user_id
            LEFT JOIN {schema}.organizer_profiles op ON op.user_id = co.user_id
            WHERE co.event_id = {event_id} AND co.added_by != 0
            ORDER BY co.created_at ASC
        """)
        rows = cur.fetchall()
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps([dict(r) for r in rows], default=str)}

    if method == 'POST':
        body = json.loads(event.get('body', '{}'))
        action = body.get('action')

        # Пользователь добавляет себя по инвайт-ссылке
        if action == 'join_by_invite':
            event_id = body.get('event_id')
            if not event_id:
                conn.close()
                return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'event_id required'})}
            cur.execute(f"SELECT id, organizer_id FROM {schema}.events WHERE id = {event_id}")
            ev = cur.fetchone()
            if not ev:
                conn.close()
                return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'event_not_found'})}
            if ev['organizer_id'] == user_id:
                conn.close()
                return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'already_main_organizer'})}
            existing = None
            cur.execute(f"SELECT id, added_by FROM {schema}.event_co_organizers WHERE event_id = {event_id} AND user_id = {user_id}")
            existing = cur.fetchone()
            if existing and existing['added_by'] != 0:
                conn.close()
                return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'ok': True, 'already': True})}
            if existing:
                cur.execute(f"UPDATE {schema}.event_co_organizers SET added_by = {user_id} WHERE event_id = {event_id} AND user_id = {user_id}")
            else:
                cur.execute(f"INSERT INTO {schema}.event_co_organizers (event_id, user_id, added_by) VALUES ({event_id}, {user_id}, {user_id})")
            conn.commit()
            conn.close()
            return {'statusCode': 201, 'headers': headers, 'body': json.dumps({'ok': True})}

        event_id = body.get('event_id')
        target_user_id = body.get('user_id')
        if not event_id or not target_user_id:
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'event_id and user_id required'})}
        ok, err = check_event_owner(event_id)
        if not ok:
            conn.close()
            return {'statusCode': 404 if err == 'not_found' else 403, 'headers': headers, 'body': json.dumps({'error': err})}
        cur.execute(f"SELECT organizer_id FROM {schema}.events WHERE id = {event_id}")
        ev = cur.fetchone()
        if ev['organizer_id'] == target_user_id:
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'already_main_organizer'})}
        cur.execute(f"SELECT id, name, email, telegram FROM {schema}.users WHERE id = {target_user_id}")
        target = cur.fetchone()
        if not target:
            conn.close()
            return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'user_not_found'})}
        # если запись есть но помечена удалённой (added_by=0) — восстанавливаем
        cur.execute(f"""
            SELECT id, added_by FROM {schema}.event_co_organizers
            WHERE event_id = {event_id} AND user_id = {target_user_id}
        """)
        existing = cur.fetchone()
        if existing:
            cur.execute(f"""
                UPDATE {schema}.event_co_organizers
                SET added_by = {user_id}
                WHERE event_id = {event_id} AND user_id = {target_user_id}
                RETURNING id, event_id, user_id, added_by, created_at
            """)
        else:
            cur.execute(f"""
                INSERT INTO {schema}.event_co_organizers (event_id, user_id, added_by)
                VALUES ({event_id}, {target_user_id}, {user_id})
                RETURNING id, event_id, user_id, added_by, created_at
            """)
        row = cur.fetchone()
        conn.commit()
        result = dict(row)
        result['name'] = target['name']
        result['email'] = target['email']
        result['telegram'] = target['telegram']
        conn.close()
        return {'statusCode': 201, 'headers': headers, 'body': json.dumps(result, default=str)}

    if method == 'DELETE':
        event_id = params.get('event_id')
        target_user_id = params.get('user_id')
        if not event_id or not target_user_id:
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'event_id and user_id required'})}
        ok, err = check_event_owner(event_id)
        if not ok:
            conn.close()
            return {'statusCode': 404 if err == 'not_found' else 403, 'headers': headers, 'body': json.dumps({'error': err})}
        # мягкое удаление: added_by = 0 как флаг
        cur.execute(f"""
            UPDATE {schema}.event_co_organizers
            SET added_by = 0
            WHERE event_id = {event_id} AND user_id = {target_user_id}
        """)
        conn.commit()
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'ok': True})}

    conn.close()
    return {'statusCode': 405, 'headers': headers, 'body': json.dumps({'error': 'Method not allowed (co_organizers)'})}


def handle_join_by_invite(body, cur, conn, user_id, schema, headers):
    """Пользователь принимает инвайт: создаётся заявка на роль организатора, привязанная к событию. Роль выдаётся после верификации администратором."""
    event_id = body.get('event_id')
    if not event_id:
        conn.close()
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'event_id required'})}

    cur.execute(f"SELECT id, organizer_id FROM {schema}.events WHERE id = {event_id}")
    ev = cur.fetchone()
    if not ev:
        conn.close()
        return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'event_not_found'})}

    if ev['organizer_id'] == user_id:
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'ok': True, 'already': True, 'status': 'owner'})}

    # Проверяем, есть ли уже активная роль организатора
    cur.execute(f"""
        SELECT ur.status FROM {schema}.user_roles ur
        JOIN {schema}.roles r ON r.id = ur.role_id
        WHERE ur.user_id = {user_id} AND r.slug = 'organizer'
    """)
    existing_role = cur.fetchone()

    if existing_role and existing_role['status'] == 'active':
        # Роль уже есть — сразу добавляем в соорганизаторы
        cur.execute(f"SELECT id FROM {schema}.organizer_profiles WHERE user_id = {user_id}")
        if not cur.fetchone():
            cur.execute(f"INSERT INTO {schema}.organizer_profiles (user_id) VALUES ({user_id}) ON CONFLICT DO NOTHING")

        cur.execute(f"""
            SELECT id, added_by FROM {schema}.event_co_organizers
            WHERE event_id = {event_id} AND user_id = {user_id}
        """)
        existing_co = cur.fetchone()
        already = False
        if existing_co and existing_co['added_by'] != 0:
            already = True
        elif existing_co:
            cur.execute(f"""
                UPDATE {schema}.event_co_organizers SET added_by = {user_id}
                WHERE event_id = {event_id} AND user_id = {user_id}
            """)
        else:
            cur.execute(f"""
                INSERT INTO {schema}.event_co_organizers (event_id, user_id, added_by)
                VALUES ({event_id}, {user_id}, {user_id})
            """)
        conn.commit()
        conn.close()
        return {'statusCode': 201, 'headers': headers, 'body': json.dumps({'ok': True, 'already': already, 'status': 'active'})}

    # Проверяем, есть ли уже заявка на роль организатора для этого события
    cur.execute(f"""
        SELECT id, status FROM {schema}.role_applications ra
        JOIN {schema}.roles r ON r.id = ra.role_id
        WHERE ra.user_id = {user_id} AND r.slug = 'organizer'
          AND ra.invite_event_id = {event_id} AND ra.status = 'pending'
    """)
    existing_req = cur.fetchone()
    if existing_req:
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'ok': True, 'already': True, 'status': 'pending'})}

    # Создаём pending-роль если нет
    if not existing_role:
        cur.execute(f"""
            INSERT INTO {schema}.user_roles (user_id, role_id, status)
            SELECT {user_id}, id, 'pending' FROM {schema}.roles WHERE slug = 'organizer'
            ON CONFLICT (user_id, role_id) DO NOTHING
        """)

    # Создаём заявку в role_applications с привязкой к событию
    cur.execute(f"""
        INSERT INTO {schema}.role_applications (user_id, role_id, invite_event_id, message)
        SELECT {user_id}, r.id, {event_id},
               'Заявка от соорганизатора по ссылке-приглашению (событие #{event_id})'
        FROM {schema}.roles r WHERE r.slug = 'organizer'
        RETURNING id
    """)
    row = cur.fetchone()
    request_id = row['id'] if row else None

    conn.commit()
    conn.close()
    return {'statusCode': 201, 'headers': headers, 'body': json.dumps({'ok': True, 'already': False, 'status': 'pending', 'request_id': request_id})}


def handle_user_search(event, method, params, cur, conn, user_id, schema, headers):
    """Поиск пользователей по имени/email/telegram для добавления соорганизатором"""
    if method != 'GET':
        conn.close()
        return {'statusCode': 405, 'headers': headers, 'body': json.dumps({'error': 'Method not allowed'})}

    query = (params.get('q') or '').strip().replace("'", "''")
    if len(query) < 2:
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps([])}

    cur.execute(f"""
        SELECT u.id, u.name, u.email, u.telegram,
               op.display_name, op.photo_url,
               EXISTS(
                   SELECT 1 FROM {schema}.user_roles ur
                   JOIN {schema}.roles r ON r.id = ur.role_id
                   WHERE ur.user_id = u.id AND r.slug IN ('organizer','admin') AND ur.status = 'active'
               ) as is_organizer
        FROM {schema}.users u
        LEFT JOIN {schema}.organizer_profiles op ON op.user_id = u.id
        WHERE u.id != {user_id}
          AND (
            u.name ILIKE '%{query}%'
            OR u.email ILIKE '%{query}%'
            OR u.telegram ILIKE '%{query}%'
          )
        ORDER BY is_organizer DESC, u.name ASC
        LIMIT 10
    """)
    rows = cur.fetchall()
    conn.close()
    return {'statusCode': 200, 'headers': headers, 'body': json.dumps([dict(r) for r in rows], default=str)}


def send_invite_email(to_email, to_name, inviter_name, event_title, invite_url):
    api_key = os.environ.get('UNISENDER_API_KEY', '')
    sender_email = os.environ.get('UNISENDER_SENDER_EMAIL', '')
    sender_name = os.environ.get('UNISENDER_SENDER_NAME', 'СПАРКОМ')
    if not api_key or not sender_email:
        return

    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #fafafa;">
        <div style="background: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
            <div style="text-align: center; margin-bottom: 24px;">
                <div style="width: 56px; height: 56px; background: #fef3c7; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 28px;">🤝</div>
            </div>
            <h1 style="color: #1a1a1a; font-size: 22px; text-align: center; margin: 0 0 8px;">Приглашение в команду организаторов</h1>
            <p style="color: #666; text-align: center; margin: 0 0 24px; font-size: 15px;">
                {inviter_name} приглашает вас стать соорганизатором встречи
            </p>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 28px; text-align: center;">
                <p style="color: #1a1a1a; font-size: 16px; font-weight: 600; margin: 0;">📅 {event_title}</p>
            </div>
            <p style="color: #555; font-size: 14px; text-align: center; margin: 0 0 24px; line-height: 1.6;">
                Нажмите кнопку ниже, чтобы подтвердить свой email и отправить заявку.<br>
                После проверки администратором вы получите доступ к кабинету организатора.
            </p>
            <div style="text-align: center; margin-bottom: 24px;">
                <a href="{invite_url}" style="display: inline-block; background: #1a1a1a; color: #ffffff; padding: 14px 36px; border-radius: 24px; text-decoration: none; font-size: 15px; font-weight: 600;">Подтвердить и принять приглашение</a>
            </div>
            <p style="color: #aaa; font-size: 12px; text-align: center; margin: 0 0 8px;">
                Ссылка действительна 7 дней. Если вы не ожидали это письмо — просто проигнорируйте его.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">Это автоматическое письмо. Отвечать на него не нужно.</p>
        </div>
    </div>
    """

    message = {
        "recipients": [{"email": to_email, "name": to_name or to_email}],
        "from_email": sender_email,
        "subject": f"Приглашение стать соорганизатором — {event_title}",
        "body": {"html": html},
        "track_links": 0,
        "track_read": 1,
        "tags": ["co-organizer-invite"],
    }
    if sender_name:
        message["from_name"] = sender_name

    try:
        http_requests.post(
            "https://go2.unisender.ru/ru/transactional/api/v1/email/send.json",
            headers={"Content-Type": "application/json", "X-API-KEY": api_key},
            json={"message": message},
            timeout=10
        )
    except Exception:
        pass


def handle_send_invite(body, cur, conn, user_id, schema, headers):
    """Отправляет email-приглашение стать соорганизатором события"""
    event_id = body.get('event_id')
    invited_email = (body.get('email') or '').strip().lower()

    if not event_id or not invited_email or '@' not in invited_email:
        conn.close()
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'event_id и email обязательны'})}

    # Проверяем, что текущий пользователь — организатор события
    cur.execute(f"SELECT id, title, organizer_id FROM {schema}.events WHERE id = {event_id}")
    ev = cur.fetchone()
    if not ev:
        conn.close()
        return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'Событие не найдено'})}

    admin = is_admin(cur, user_id, schema)
    if not admin and ev['organizer_id'] != user_id:
        conn.close()
        return {'statusCode': 403, 'headers': headers, 'body': json.dumps({'error': 'Нет доступа к этому событию'})}

    # Получаем данные пригласившего
    cur.execute(f"SELECT name FROM {schema}.users WHERE id = {user_id}")
    inviter = cur.fetchone()
    inviter_name = inviter['name'] if inviter else 'Организатор'

    # Проверяем, нет ли уже активного токена для этого email+события
    e = invited_email.replace("'", "''")
    cur.execute(f"""
        SELECT id FROM {schema}.co_organizer_invite_tokens
        WHERE invited_email = '{e}' AND event_id = {event_id}
          AND used = FALSE AND expires_at > NOW()
    """)
    if cur.fetchone():
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'ok': True, 'already_sent': True})}

    token = secrets.token_urlsafe(48)
    expires = (datetime.utcnow() + timedelta(days=7)).strftime('%Y-%m-%d %H:%M:%S')
    cur.execute(f"""
        INSERT INTO {schema}.co_organizer_invite_tokens
            (token, event_id, invited_email, invited_by, expires_at)
        VALUES ('{token}', {event_id}, '{e}', {user_id}, '{expires}')
    """)
    conn.commit()
    conn.close()

    invite_url = f"https://sparcom.ru/invite-verify?token={token}"

    # Ищем имя приглашённого если уже зарегистрирован
    to_name = invited_email
    send_invite_email(
        to_email=invited_email,
        to_name=to_name,
        inviter_name=inviter_name,
        event_title=ev['title'],
        invite_url=invite_url
    )

    return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'ok': True})}


def handle_verify_invite(body, cur, conn, user_id, schema, headers):
    """Верифицирует email через токен из письма и создаёт заявку на соорганизатора"""
    token = (body.get('token') or '').strip()
    if not token:
        conn.close()
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'token обязателен'})}

    t = token.replace("'", "''")
    cur.execute(f"""
        SELECT id, event_id, invited_email, used, expires_at
        FROM {schema}.co_organizer_invite_tokens
        WHERE token = '{t}'
    """)
    invite = cur.fetchone()

    if not invite:
        conn.close()
        return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'Ссылка недействительна'})}

    if invite['used']:
        conn.close()
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Приглашение уже использовано'})}

    if invite['expires_at'] < datetime.utcnow():
        conn.close()
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Срок действия приглашения истёк'})}

    # Проверяем, что email пользователя совпадает с адресом приглашения
    cur.execute(f"SELECT id, email, name FROM {schema}.users WHERE id = {user_id}")
    u = cur.fetchone()
    if not u:
        conn.close()
        return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Пользователь не найден'})}

    if u['email'].lower() != invite['invited_email'].lower():
        conn.close()
        return {'statusCode': 403, 'headers': headers, 'body': json.dumps({
            'error': f"Это приглашение отправлено на {invite['invited_email']}. Войдите с этим email."
        })}

    event_id = invite['event_id']

    # Помечаем токен использованным
    cur.execute(f"UPDATE {schema}.co_organizer_invite_tokens SET used = TRUE WHERE id = {invite['id']}")

    # Дальше — та же логика что в join_by_invite
    cur.execute(f"SELECT id, organizer_id FROM {schema}.events WHERE id = {event_id}")
    ev = cur.fetchone()
    if not ev:
        conn.commit()
        conn.close()
        return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'Событие не найдено'})}

    if ev['organizer_id'] == user_id:
        conn.commit()
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'ok': True, 'status': 'owner'})}

    cur.execute(f"""
        SELECT ur.status FROM {schema}.user_roles ur
        JOIN {schema}.roles r ON r.id = ur.role_id
        WHERE ur.user_id = {user_id} AND r.slug = 'organizer'
    """)
    existing_role = cur.fetchone()

    if existing_role and existing_role['status'] == 'active':
        cur.execute(f"SELECT id FROM {schema}.organizer_profiles WHERE user_id = {user_id}")
        if not cur.fetchone():
            cur.execute(f"INSERT INTO {schema}.organizer_profiles (user_id) VALUES ({user_id}) ON CONFLICT DO NOTHING")
        cur.execute(f"""
            SELECT id, added_by FROM {schema}.event_co_organizers
            WHERE event_id = {event_id} AND user_id = {user_id}
        """)
        existing_co = cur.fetchone()
        if existing_co and existing_co['added_by'] != 0:
            conn.commit()
            conn.close()
            return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'ok': True, 'already': True, 'status': 'active'})}
        elif existing_co:
            cur.execute(f"UPDATE {schema}.event_co_organizers SET added_by = {user_id} WHERE event_id = {event_id} AND user_id = {user_id}")
        else:
            cur.execute(f"INSERT INTO {schema}.event_co_organizers (event_id, user_id, added_by) VALUES ({event_id}, {user_id}, {user_id})")
        conn.commit()
        conn.close()
        return {'statusCode': 201, 'headers': headers, 'body': json.dumps({'ok': True, 'status': 'active'})}

    # Создаём заявку pending
    cur.execute(f"""
        SELECT id FROM {schema}.role_applications ra
        JOIN {schema}.roles r ON r.id = ra.role_id
        WHERE ra.user_id = {user_id} AND r.slug = 'organizer'
          AND ra.invite_event_id = {event_id} AND ra.status = 'pending'
    """)
    if cur.fetchone():
        conn.commit()
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'ok': True, 'already': True, 'status': 'pending'})}

    if not existing_role:
        cur.execute(f"""
            INSERT INTO {schema}.user_roles (user_id, role_id, status)
            SELECT {user_id}, id, 'pending' FROM {schema}.roles WHERE slug = 'organizer'
            ON CONFLICT (user_id, role_id) DO NOTHING
        """)

    cur.execute(f"""
        INSERT INTO {schema}.role_applications (user_id, role_id, invite_event_id, message)
        SELECT {user_id}, r.id, {event_id},
               'Заявка подтверждена по email-приглашению (событие #{event_id})'
        FROM {schema}.roles r WHERE r.slug = 'organizer'
        RETURNING id
    """)
    row = cur.fetchone()
    request_id = row['id'] if row else None

    conn.commit()
    conn.close()
    return {'statusCode': 201, 'headers': headers, 'body': json.dumps({'ok': True, 'status': 'pending', 'request_id': request_id})}


def handle_guests(event, method, params, cur, conn, user_id, schema, headers):
    """Гости события: список, обновление статуса"""
    admin = is_admin(cur, user_id, schema)
    event_id = params.get('event_id')
    if not event_id:
        conn.close()
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'event_id required'})}

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
        return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'Event not found'})}

    if method == 'GET':
        cur.execute(f"""
            SELECT s.id, s.name, s.phone, s.email, s.telegram,
                   s.status, s.preferred_channel, s.created_at, s.wrote_at,
                   s.user_id,
                   u.tg_chat_id, u.vk_id, u.notify_telegram, u.notify_vk,
                   u.notify_email, u.notify_sms,
                   (SELECT COUNT(*) FROM {schema}.guest_messages gm WHERE gm.signup_id = s.id) as messages_count
            FROM {schema}.event_signups s
            LEFT JOIN {schema}.users u ON u.id = s.user_id
            WHERE s.event_id = {event_id}
            ORDER BY s.created_at ASC
        """)
        guests = [dict(g) for g in cur.fetchall()]

        spots_confirmed = sum(1 for g in guests if g['status'] in ('confirmed', 'paid', 'подтверждён', 'оплачено'))
        spots_waiting = sum(1 for g in guests if g['status'] in ('new', 'новая', 'wrote'))
        conn.close()
        return {
            'statusCode': 200, 'headers': headers,
            'body': json.dumps({
                'event': dict(ev),
                'guests': guests,
                'stats': {
                    'total': len(guests),
                    'confirmed': spots_confirmed,
                    'waiting': spots_waiting,
                    'spots_left': ev['spots_left'] or 0,
                    'total_spots': ev['total_spots'] or 0,
                }
            }, default=str)
        }

    if method == 'PUT':
        body = json.loads(event.get('body', '{}'))
        signup_id = body.get('signup_id')
        new_status = body.get('status')
        if not signup_id or not new_status:
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'signup_id and status required'})}

        cur.execute(f"SELECT status FROM {schema}.event_signups WHERE id = {signup_id} AND event_id = {event_id}")
        old = cur.fetchone()
        if not old:
            conn.close()
            return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'Signup not found'})}

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
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'ok': True})}

    conn.close()
    return {'statusCode': 405, 'headers': headers, 'body': json.dumps({'error': 'Method not allowed'})}


def handle_messages(event, method, params, cur, conn, user_id, schema, headers):
    """История диалогов и отправка сообщений гостям"""
    admin = is_admin(cur, user_id, schema)
    signup_id = params.get('signup_id')

    if method == 'GET':
        if not signup_id:
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'signup_id required'})}
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
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'messages': messages}, default=str)}

    if method == 'POST':
        body = json.loads(event.get('body', '{}'))
        signup_ids = body.get('signup_ids', [])
        text = (body.get('message') or '').strip()
        if not signup_ids or not text:
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'signup_ids and message required'})}

        sent = []
        for sid in signup_ids:
            cur.execute(f"""
                SELECT s.id, s.name, s.phone, s.email, s.telegram, s.preferred_channel, s.user_id,
                       u.tg_chat_id, u.vk_id, u.tg_notify_allowed, u.notify_email
                FROM {schema}.event_signups s
                LEFT JOIN {schema}.users u ON u.id = s.user_id
                WHERE s.id = {sid}
            """)
            signup = cur.fetchone()
            if not signup:
                continue

            channel = signup['preferred_channel'] or 'site'
            if channel == 'site':
                if signup.get('tg_chat_id') and signup.get('tg_notify_allowed'):
                    channel = 'telegram'
                elif signup.get('notify_email') and signup.get('email'):
                    channel = 'email'

            cur.execute(f"""
                INSERT INTO {schema}.guest_messages (event_id, signup_id, direction, channel, body)
                SELECT s.event_id, {sid}, 'out', '{channel}', $msg${text}$msg$
                FROM {schema}.event_signups s WHERE s.id = {sid}
            """)

            cur.execute(f"""
                UPDATE {schema}.event_signups
                SET status = CASE WHEN status IN ('new', 'новая') THEN 'wrote' ELSE status END,
                    wrote_at = NOW()
                WHERE id = {sid}
            """)

            if channel == 'telegram' and signup.get('tg_chat_id'):
                try:
                    tg_chat_id = signup['tg_chat_id']
                    http_requests.post(
                        TG_BOT_URL,
                        json={'action': 'send_message', 'chat_id': tg_chat_id, 'text': text},
                        timeout=8
                    )
                except Exception:
                    pass

            sent.append(sid)

        conn.commit()
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'ok': True, 'sent': sent})}