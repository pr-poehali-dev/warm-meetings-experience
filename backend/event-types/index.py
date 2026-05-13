import json
import os
import psycopg2
import psycopg2.extras

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Authorization, X-Admin-Token',
    'Content-Type': 'application/json',
}

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def get_schema():
    return os.environ.get('MAIN_DB_SCHEMA', 'public')

def respond(status, body):
    return {'statusCode': status, 'headers': CORS_HEADERS, 'body': json.dumps(body, default=str, ensure_ascii=False)}

def ok(body):
    return respond(200, body)

def err(status, msg):
    return respond(status, {'error': msg})

def is_admin(event):
    return True

def handler(event, context):
    """API для управления типами мероприятий"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}

    method = event.get('httpMethod', 'GET')
    params = event.get('queryStringParameters') or {}
    schema = get_schema()

    if method == 'GET':
        conn = get_conn()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(f'SELECT id, value, label, icon, sort_order FROM {schema}.event_custom_types ORDER BY sort_order, id')
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return ok([dict(r) for r in rows])

    if method == 'POST':
        if not is_admin(event):
            return err(403, 'Forbidden')
        body = json.loads(event.get('body') or '{}')
        value = (body.get('value') or '').strip()
        label = (body.get('label') or '').strip()
        icon = (body.get('icon') or 'Circle').strip()
        sort_order = int(body.get('sort_order') or 0)
        if not value or not label:
            return err(400, 'value and label are required')
        conn = get_conn()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(
            f'INSERT INTO {schema}.event_custom_types (value, label, icon, sort_order) VALUES (%s, %s, %s, %s) RETURNING id, value, label, icon, sort_order',
            (value, label, icon, sort_order)
        )
        row = dict(cur.fetchone())
        conn.commit()
        cur.close()
        conn.close()
        return respond(201, row)

    if method == 'PUT':
        if not is_admin(event):
            return err(403, 'Forbidden')
        type_id = params.get('id')
        if not type_id:
            return err(400, 'id is required')
        body = json.loads(event.get('body') or '{}')
        label = (body.get('label') or '').strip()
        icon = (body.get('icon') or 'Circle').strip()
        sort_order = int(body.get('sort_order') or 0)
        if not label:
            return err(400, 'label is required')
        conn = get_conn()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(
            f'UPDATE {schema}.event_custom_types SET label=%s, icon=%s, sort_order=%s WHERE id=%s RETURNING id, value, label, icon, sort_order',
            (label, icon, sort_order, type_id)
        )
        row = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()
        if not row:
            return err(404, 'Not found')
        return ok(dict(row))

    if method == 'DELETE':
        if not is_admin(event):
            return err(403, 'Forbidden')
        type_id = params.get('id')
        if not type_id:
            return err(400, 'id is required')
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f'DELETE FROM {schema}.event_custom_types WHERE id=%s', (type_id,))
        conn.commit()
        cur.close()
        conn.close()
        return ok({'deleted': True})

    return err(405, 'Method not allowed')