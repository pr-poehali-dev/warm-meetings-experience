import json
import os
import re
import psycopg2
import psycopg2.extras

def get_conn():
    """Подключение к БД"""
    return psycopg2.connect(os.environ['DATABASE_URL'])

def get_schema():
    return os.environ.get('MAIN_DB_SCHEMA', 'public')

def slugify(text):
    """Генерация slug из текста"""
    text = text.lower().strip()
    translit = {
        'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'yo','ж':'zh',
        'з':'z','и':'i','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o',
        'п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f','х':'kh','ц':'ts',
        'ч':'ch','ш':'sh','щ':'shch','ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya',
        ' ':'-'
    }
    result = ''
    for char in text:
        result += translit.get(char, char)
    result = re.sub(r'[^a-z0-9-]', '', result)
    result = re.sub(r'-+', '-', result).strip('-')
    return result

def handler(event, context):
    """API для управления событиями и записями на них"""
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Authorization',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }

    headers = {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'}
    method = event.get('httpMethod', 'GET')
    params = event.get('queryStringParameters') or {}
    resource = params.get('resource', 'events')
    schema = get_schema()

    if resource == 'signups':
        return handle_signups(event, method, params, schema, headers)

    return handle_events(event, method, params, schema, headers)


def handle_events(event, method, params, schema, headers):
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    if method == 'GET':
        slug = params.get('slug')
        if slug:
            if slug.startswith('event-') and slug[6:].isdigit():
                cur.execute(
                    f"SELECT * FROM {schema}.events WHERE id = {slug[6:]} AND is_visible = true"
                )
            else:
                cur.execute(
                    f"SELECT * FROM {schema}.events WHERE slug = '{slug}' AND is_visible = true"
                )
            row = cur.fetchone()
            conn.close()
            if not row:
                return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'Not found'})}
            return {'statusCode': 200, 'headers': headers, 'body': json.dumps(serialize_event(row), default=str)}

        only_visible = params.get('visible', 'true')
        where = f"WHERE is_visible = true" if only_visible == 'true' else ""
        order = "ORDER BY event_date ASC, start_time ASC"
        cur.execute(f"SELECT * FROM {schema}.events {where} {order}")
        rows = cur.fetchall()
        conn.close()
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps([serialize_event(r) for r in rows], default=str)
        }

    if method == 'POST':
        body = json.loads(event.get('body', '{}'))
        slug = body.get('slug') or slugify(body.get('title', ''))
        base_slug = slug
        counter = 1
        while True:
            cur.execute(f"SELECT id FROM {schema}.events WHERE slug = '{slug}'")
            if not cur.fetchone():
                break
            slug = f"{base_slug}-{counter}"
            counter += 1

        program = body.get('program', [])
        rules = body.get('rules', [])
        program_sql = "ARRAY[" + ",".join(f"'{p}'" for p in program) + "]::text[]" if program else "ARRAY[]::text[]"
        rules_sql = "ARRAY[" + ",".join(f"'{r}'" for r in rules) + "]::text[]" if rules else "ARRAY[]::text[]"

        title = body.get('title', '').replace("'", "''")
        short_desc = (body.get('short_description') or '').replace("'", "''")
        full_desc = (body.get('full_description') or '').replace("'", "''")
        description = (body.get('description') or '').replace("'", "''")
        bath_name = (body.get('bath_name') or '').replace("'", "''")
        bath_address = (body.get('bath_address') or '').replace("'", "''")
        price_label = (body.get('price_label') or body.get('price') or '').replace("'", "''")

        cur.execute(f"""
            INSERT INTO {schema}.events (
                title, slug, short_description, full_description, description,
                event_date, start_time, end_time,
                event_type, event_type_icon, occupancy,
                bath_name, bath_address, image_url,
                price, price_amount, price_label,
                total_spots, spots_left, featured, is_visible,
                program, rules
            ) VALUES (
                '{title}', '{slug}', '{short_desc}', '{full_desc}', '{description}',
                '{body.get('event_date')}', '{body.get('start_time', '19:00')}', '{body.get('end_time', '23:00')}',
                '{body.get('event_type', 'знакомство')}', '{body.get('event_type_icon', 'Users')}', '{body.get('occupancy', 'low')}',
                '{bath_name}', '{bath_address}', '{body.get('image_url', '')}',
                '{price_label}', {body.get('price_amount', 0)}, '{price_label}',
                {body.get('total_spots', 10)}, {body.get('spots_left', 10)}, {body.get('featured', False)}, {body.get('is_visible', True)},
                {program_sql}, {rules_sql}
            ) RETURNING *
        """)
        row = cur.fetchone()
        conn.commit()
        conn.close()
        return {'statusCode': 201, 'headers': headers, 'body': json.dumps(serialize_event(row), default=str)}

    if method == 'PUT':
        body = json.loads(event.get('body', '{}'))
        event_id = body.get('id') or params.get('id')
        if not event_id:
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'id required'})}

        sets = []
        for field in ['title', 'short_description', 'full_description', 'description',
                       'event_date', 'start_time', 'end_time', 'event_type', 'event_type_icon',
                       'occupancy', 'bath_name', 'bath_address', 'image_url', 'price', 'price_label',
                       'slug']:
            if field in body:
                val = str(body[field]).replace("'", "''")
                sets.append(f"{field} = '{val}'")

        for field in ['price_amount', 'total_spots', 'spots_left']:
            if field in body:
                sets.append(f"{field} = {int(body[field])}")

        for field in ['featured', 'is_visible']:
            if field in body:
                sets.append(f"{field} = {bool(body[field])}")

        if 'program' in body:
            program = body['program']
            program_sql = "ARRAY[" + ",".join(f"'{p.replace(chr(39), chr(39)+chr(39))}'" for p in program) + "]::text[]" if program else "ARRAY[]::text[]"
            sets.append(f"program = {program_sql}")

        if 'rules' in body:
            rules = body['rules']
            rules_sql = "ARRAY[" + ",".join(f"'{r.replace(chr(39), chr(39)+chr(39))}'" for r in rules) + "]::text[]" if rules else "ARRAY[]::text[]"
            sets.append(f"rules = {rules_sql}")

        sets.append("updated_at = CURRENT_TIMESTAMP")

        cur.execute(f"UPDATE {schema}.events SET {', '.join(sets)} WHERE id = {event_id} RETURNING *")
        row = cur.fetchone()
        conn.commit()
        conn.close()
        if not row:
            return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'Not found'})}
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps(serialize_event(row), default=str)}

    if method == 'DELETE':
        event_id = params.get('id')
        if not event_id:
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'id required'})}
        cur.execute(f"UPDATE {schema}.events SET is_visible = false WHERE id = {event_id}")
        conn.commit()
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'ok': True})}

    conn.close()
    return {'statusCode': 405, 'headers': headers, 'body': json.dumps({'error': 'Method not allowed'})}


def handle_signups(event, method, params, schema, headers):
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    if method == 'GET':
        event_id = params.get('event_id')
        if event_id:
            cur.execute(f"SELECT * FROM {schema}.event_signups WHERE event_id = {event_id} ORDER BY created_at DESC")
        else:
            cur.execute(f"""
                SELECT s.*, e.title as event_title, e.event_date
                FROM {schema}.event_signups s
                JOIN {schema}.events e ON e.id = s.event_id
                ORDER BY s.created_at DESC
            """)
        rows = cur.fetchall()
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps([dict(r) for r in rows], default=str)}

    if method == 'POST':
        body = json.loads(event.get('body', '{}'))
        name = body.get('name', '').replace("'", "''")
        phone = body.get('phone', '').replace("'", "''")
        telegram = (body.get('telegram') or '').replace("'", "''")
        event_id = body.get('event_id')

        if not name or not phone or not event_id:
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'name, phone, event_id required'})}

        cur.execute(f"SELECT spots_left FROM {schema}.events WHERE id = {event_id}")
        ev = cur.fetchone()
        if not ev:
            conn.close()
            return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'Event not found'})}
        if ev['spots_left'] <= 0:
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'No spots left'})}

        cur.execute(f"""
            INSERT INTO {schema}.event_signups (event_id, name, phone, telegram)
            VALUES ({event_id}, '{name}', '{phone}', '{telegram}')
            RETURNING *
        """)
        row = cur.fetchone()
        cur.execute(f"UPDATE {schema}.events SET spots_left = spots_left - 1 WHERE id = {event_id}")
        conn.commit()
        conn.close()
        return {'statusCode': 201, 'headers': headers, 'body': json.dumps(dict(row), default=str)}

    if method == 'PUT':
        body = json.loads(event.get('body', '{}'))
        signup_id = body.get('id')
        status = body.get('status')
        if not signup_id or not status:
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'id and status required'})}
        cur.execute(f"UPDATE {schema}.event_signups SET status = '{status}' WHERE id = {signup_id} RETURNING *")
        row = cur.fetchone()
        conn.commit()
        conn.close()
        if not row:
            return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'Not found'})}
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps(dict(row), default=str)}

    conn.close()
    return {'statusCode': 405, 'headers': headers, 'body': json.dumps({'error': 'Method not allowed'})}


def serialize_event(row):
    d = dict(row)
    if d.get('program') is None:
        d['program'] = []
    if d.get('rules') is None:
        d['rules'] = []
    return d