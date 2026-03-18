import json
import os
import hashlib

import psycopg2
import psycopg2.extras


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def get_schema():
    return os.environ.get('MAIN_DB_SCHEMA', 'public')

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token',
    'Access-Control-Max-Age': '86400'
}

def respond(status, body):
    return {
        'statusCode': status,
        'headers': {**CORS_HEADERS, 'Content-Type': 'application/json'},
        'body': json.dumps(body, default=str)
    }


def get_user_from_token(cur, schema, token):
    if not token:
        return None
    t = token.replace("'", "''")
    cur.execute(f"""
        SELECT u.id, u.email, u.name, u.phone, u.telegram, u.created_at
        FROM {schema}.user_sessions s
        JOIN {schema}.users u ON u.id = s.user_id
        WHERE s.token = '{t}' AND s.expires_at > CURRENT_TIMESTAMP AND u.is_active = true
    """)
    return cur.fetchone()


def handler(event, context):
    """Личный кабинет: профиль пользователя, записи на события, смена пароля"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}

    headers_in = event.get('headers') or {}
    token = headers_in.get('X-Session-Token') or headers_in.get('x-session-token') or ''

    schema = get_schema()
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    user = get_user_from_token(cur, schema, token)
    if not user:
        conn.close()
        return respond(401, {'error': 'Не авторизован'})

    method = event.get('httpMethod', 'GET')
    params = event.get('queryStringParameters') or {}
    resource = params.get('resource', 'profile')

    if resource == 'profile':
        if method == 'GET':
            conn.close()
            return respond(200, {'user': dict(user)})

        if method == 'PUT':
            body = json.loads(event.get('body', '{}'))
            return handle_update_profile(cur, conn, schema, user, body)

    if resource == 'signups':
        if method == 'GET':
            return handle_get_signups(cur, conn, schema, user)

    if resource == 'password':
        if method == 'PUT':
            body = json.loads(event.get('body', '{}'))
            return handle_change_password(cur, conn, schema, user, body)

    conn.close()
    return respond(400, {'error': 'Unknown resource'})


def handle_update_profile(cur, conn, schema, user, body):
    sets = []
    for field in ['name', 'phone', 'telegram']:
        if field in body:
            val = str(body[field]).replace("'", "''")
            sets.append(f"{field} = '{val}'")

    if not sets:
        conn.close()
        return respond(400, {'error': 'Нечего обновлять'})

    sets.append("updated_at = CURRENT_TIMESTAMP")
    cur.execute(f"""
        UPDATE {schema}.users SET {', '.join(sets)}
        WHERE id = {user['id']}
        RETURNING id, email, name, phone, telegram, created_at
    """)
    updated = cur.fetchone()
    conn.commit()
    conn.close()
    return respond(200, {'user': dict(updated)})


def handle_get_signups(cur, conn, schema, user):
    cur.execute(f"""
        SELECT s.id, s.event_id, s.name, s.phone, s.email, s.status, s.created_at,
               e.title as event_title, e.event_date, e.start_time, e.end_time,
               e.bath_name, e.bath_address, e.slug as event_slug, e.image_url
        FROM {schema}.event_signups s
        JOIN {schema}.events e ON e.id = s.event_id
        WHERE s.user_id = {user['id']}
        ORDER BY e.event_date DESC, s.created_at DESC
    """)
    rows = cur.fetchall()
    conn.close()

    signups = []
    for r in rows:
        d = dict(r)
        d['event_date'] = str(d.get('event_date', ''))
        d['start_time'] = str(d.get('start_time', ''))[:5] if d.get('start_time') else ''
        d['end_time'] = str(d.get('end_time', ''))[:5] if d.get('end_time') else ''
        signups.append(d)

    return respond(200, {'signups': signups})


def handle_change_password(cur, conn, schema, user, body):
    current = (body.get('current_password') or '')
    new_pass = (body.get('new_password') or '')

    if not new_pass:
        conn.close()
        return respond(400, {'error': 'Введите новый пароль'})
    if len(new_pass) < 6:
        conn.close()
        return respond(400, {'error': 'Пароль должен быть не менее 6 символов'})

    cur.execute(f"SELECT password_hash FROM {schema}.users WHERE id = {user['id']}")
    row = cur.fetchone()

    if row.get('password_hash') and current:
        if hashlib.sha256(current.encode()).hexdigest() != row['password_hash']:
            conn.close()
            return respond(400, {'error': 'Текущий пароль неверный'})
    elif row.get('password_hash') and not current:
        conn.close()
        return respond(400, {'error': 'Введите текущий пароль'})

    new_hash = hashlib.sha256(new_pass.encode()).hexdigest()
    cur.execute(f"UPDATE {schema}.users SET password_hash = '{new_hash}', updated_at = CURRENT_TIMESTAMP WHERE id = {user['id']}")
    conn.commit()
    conn.close()

    return respond(200, {'message': 'Пароль успешно изменён'})
