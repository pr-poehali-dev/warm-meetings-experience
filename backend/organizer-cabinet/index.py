import json
import os
import psycopg2
import psycopg2.extras

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

def handler(event, context):
    """Личный кабинет организатора: дашборд, события, участники"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors_headers(), 'body': ''}

    headers = cors_headers()
    method = event.get('httpMethod', 'GET')
    params = event.get('queryStringParameters') or {}
    resource = params.get('resource', 'dashboard')

    hdrs = event.get('headers') or {}
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

    if resource == 'dashboard':
        return handle_dashboard(cur, conn, user_id, user, schema, headers)
    elif resource == 'events':
        return handle_events(event, method, params, cur, conn, user_id, schema, headers)
    elif resource == 'participants':
        return handle_participants(event, method, params, cur, conn, user_id, schema, headers)
    elif resource == 'profile':
        return handle_profile(event, method, cur, conn, user_id, schema, headers)
    elif resource == 'pricing_tiers':
        return handle_pricing_tiers(event, method, params, cur, conn, user_id, schema, headers)

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

        try:
            cur.execute(f"""
                INSERT INTO {schema}.events (
                    title, slug, short_description, full_description, description,
                    event_date, start_time, end_time,
                    event_type, event_type_icon, occupancy,
                    bath_name, bath_address, image_url,
                    price, price_amount, price_label,
                    total_spots, spots_left, featured, is_visible,
                    program, rules, pricing_lines, pricing_type, organizer_id
                ) VALUES (
                    '{title}', '{slug}', '{short_desc}', '{full_desc}', '{description}',
                    '{body.get('event_date')}', '{body.get('start_time', '19:00')}', '{body.get('end_time', '23:00')}',
                    '{body.get('event_type', 'знакомство')}', '{body.get('event_type_icon', 'Users')}', '{body.get('occupancy', 'low')}',
                    '{bath_name}', '{bath_address}', '{body.get('image_url', '')}',
                    '{price_label}', {body.get('price_amount', 0)}, '{price_label}',
                    {body.get('total_spots', 10)}, {body.get('spots_left', body.get('total_spots', 10))},
                    {body.get('featured', False)}, {body.get('is_visible', False)},
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
        return {'statusCode': 201, 'headers': headers, 'body': json.dumps(dict(row), default=str)}

    if method == 'PUT':
        body = json.loads(event.get('body', '{}'))
        event_id = body.get('id')
        if not event_id:
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'id required'})}

        cur.execute(f"SELECT organizer_id FROM {schema}.events WHERE id = {event_id}")
        existing = cur.fetchone()
        if not existing:
            conn.close()
            return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'Not found'})}
        if not admin and existing['organizer_id'] != user_id:
            conn.close()
            return {'statusCode': 403, 'headers': headers, 'body': json.dumps({'error': 'Forbidden'})}

        sets = []
        for field in ['title','short_description','full_description','description','event_date','start_time','end_time','event_type','event_type_icon','occupancy','bath_name','bath_address','image_url','price','price_label','slug']:
            if field in body:
                val = str(body[field]).replace("'", "''")
                sets.append(f"{field} = '{val}'")
        for field in ['price_amount','total_spots','spots_left']:
            if field in body:
                sets.append(f"{field} = {int(body[field])}")
        for field in ['featured','is_visible']:
            if field in body:
                sets.append(f"{field} = {bool(body[field])}")
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
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps(dict(row), default=str)}

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
            SELECT * FROM {schema}.event_signups
            WHERE event_id = {event_id}
            ORDER BY created_at DESC
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
        cur.execute(f"""
            INSERT INTO {schema}.event_signups (event_id, name, phone, email, telegram, status)
            VALUES ({event_id}, '{name}', '{phone}', '{email}', '{telegram}', '{status}')
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