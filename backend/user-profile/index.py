import json
import os
import hashlib

import bcrypt
import psycopg2
import psycopg2.extras


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def get_schema():
    return os.environ.get('MAIN_DB_SCHEMA', 'public')

def write_audit_log(cur, schema, user_id, action, resource=None, resource_id=None, ip_address=None, details=None):
    details_str = json.dumps(details) if details else 'null'
    ip_str = f"'{ip_address}'" if ip_address else 'NULL'
    res_str = f"'{resource}'" if resource else 'NULL'
    res_id_str = str(resource_id) if resource_id else 'NULL'
    cur.execute(f"""
        INSERT INTO {schema}.audit_logs (user_id, action, resource, resource_id, ip_address, details)
        VALUES ({user_id}, '{action}', {res_str}, {res_id_str}, {ip_str}, '{details_str}'::jsonb)
    """)

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token',
    'Access-Control-Max-Age': '86400'
}

def respond(status, body):
    return {
        'statusCode': status,
        'headers': {**CORS_HEADERS, 'Content-Type': 'application/json'},
        'body': json.dumps(body, default=str)
    }

def hash_password(password):
    hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(rounds=12))
    return hashed.decode('utf-8')

def verify_password(password, stored_hash):
    if not stored_hash:
        return False
    if stored_hash.startswith('$2b$') or stored_hash.startswith('$2a$'):
        return bcrypt.checkpw(password.encode('utf-8'), stored_hash.encode('utf-8'))
    return hashlib.sha256(password.encode()).hexdigest() == stored_hash

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
    """Личный кабинет: профиль пользователя, записи на события, смена пароля, удаление аккаунта"""
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
    ip = (event.get('requestContext') or {}).get('identity', {}).get('sourceIp')

    if resource == 'profile':
        if method == 'GET':
            conn.close()
            return respond(200, {'user': dict(user)})
        if method == 'PUT':
            body = json.loads(event.get('body', '{}'))
            return handle_update_profile(cur, conn, schema, user, body, ip)

    if resource == 'signups':
        if method == 'GET':
            return handle_get_signups(cur, conn, schema, user, ip)

    if resource == 'password':
        if method == 'PUT':
            body = json.loads(event.get('body', '{}'))
            return handle_change_password(cur, conn, schema, user, body, token, ip)

    if resource == 'delete-account':
        if method == 'DELETE':
            body = json.loads(event.get('body', '{}'))
            return handle_delete_account(cur, conn, schema, user, body, ip)

    if resource == 'link-vk':
        if method == 'POST':
            body = json.loads(event.get('body', '{}'))
            return handle_link_vk(cur, conn, schema, user, body, ip)
        if method == 'DELETE':
            return handle_unlink_vk(cur, conn, schema, user, ip)

    conn.close()
    return respond(400, {'error': 'Unknown resource'})


def handle_update_profile(cur, conn, schema, user, body, ip=None):
    if 'phone' in body and body['phone']:
        p = str(body['phone']).replace("'", "''")
        cur.execute(f"SELECT id FROM {schema}.users WHERE phone = '{p}' AND id != {user['id']}")
        if cur.fetchone():
            conn.close()
            return respond(400, {'error': 'Этот номер телефона уже используется другим аккаунтом'})

    sets = []
    changed_fields = []
    for field in ['name', 'phone', 'telegram']:
        if field in body:
            val = str(body[field]).replace("'", "''")
            sets.append(f"{field} = '{val}'")
            changed_fields.append(field)

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
    write_audit_log(cur, schema, user['id'], 'profile_update', 'users', user['id'], ip, {'changed_fields': changed_fields})
    conn.commit()
    conn.close()
    return respond(200, {'user': dict(updated)})


def handle_get_signups(cur, conn, schema, user, ip=None):
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
    write_audit_log(cur, schema, user['id'], 'view_signups', 'event_signups', None, ip, {'count': len(rows)})
    conn.commit()
    conn.close()

    signups = []
    for r in rows:
        d = dict(r)
        d['event_date'] = str(d.get('event_date', ''))
        d['start_time'] = str(d.get('start_time', ''))[:5] if d.get('start_time') else ''
        d['end_time'] = str(d.get('end_time', ''))[:5] if d.get('end_time') else ''
        signups.append(d)

    return respond(200, {'signups': signups})


def handle_change_password(cur, conn, schema, user, body, token, ip=None):
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
        if not verify_password(current, row['password_hash']):
            conn.close()
            return respond(400, {'error': 'Текущий пароль неверный'})
    elif row.get('password_hash') and not current:
        conn.close()
        return respond(400, {'error': 'Введите текущий пароль'})

    new_hash = hash_password(new_pass)
    new_hash_escaped = new_hash.replace("'", "''")
    cur.execute(f"UPDATE {schema}.users SET password_hash = '{new_hash_escaped}', updated_at = CURRENT_TIMESTAMP WHERE id = {user['id']}")
    write_audit_log(cur, schema, user['id'], 'password_change', 'users', user['id'], ip)
    conn.commit()
    conn.close()

    return respond(200, {'message': 'Пароль успешно изменён'})


def handle_delete_account(cur, conn, schema, user, body, ip=None):
    password = (body.get('password') or '')

    if not password:
        conn.close()
        return respond(400, {'error': 'Введите пароль для подтверждения удаления'})

    cur.execute(f"SELECT password_hash FROM {schema}.users WHERE id = {user['id']}")
    row = cur.fetchone()

    if not row or not verify_password(password, row.get('password_hash', '')):
        conn.close()
        return respond(400, {'error': 'Неверный пароль'})

    uid = user['id']

    # Обезличиваем данные (soft delete с анонимизацией)
    anon_email = f"deleted_{uid}@deleted.sparcom.ru"
    cur.execute(f"""
        UPDATE {schema}.users SET
            email = '{anon_email}',
            name = 'Удалённый пользователь',
            phone = '',
            telegram = NULL,
            password_hash = '',
            is_active = false,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = {uid}
    """)

    # Завершаем все сессии
    cur.execute(f"UPDATE {schema}.user_sessions SET expires_at = CURRENT_TIMESTAMP WHERE user_id = {uid}")

    write_audit_log(cur, schema, uid, 'account_deleted', 'users', uid, ip, {'anonymized': True})
    conn.commit()
    conn.close()

    return respond(200, {'message': 'Аккаунт удалён. Ваши персональные данные обезличены.'})


def handle_link_vk(cur, conn, schema, user, body, ip=None):
    vk_id = str(body.get('vk_id') or '').strip()
    vk_access_token = str(body.get('access_token') or '').strip()

    if not vk_id or not vk_access_token:
        conn.close()
        return respond(400, {'error': 'Не передан vk_id или access_token'})

    # Проверяем что vk_id не занят другим пользователем
    safe_vk_id = vk_id.replace("'", "''")
    cur.execute(f"SELECT id FROM {schema}.users WHERE vk_id = '{safe_vk_id}' AND id != {user['id']}")
    if cur.fetchone():
        conn.close()
        return respond(400, {'error': 'Этот VK аккаунт уже привязан к другому пользователю'})

    cur.execute(f"""
        UPDATE {schema}.users SET vk_id = '{safe_vk_id}', updated_at = CURRENT_TIMESTAMP
        WHERE id = {user['id']}
    """)
    write_audit_log(cur, schema, user['id'], 'link_vk', 'users', user['id'], ip)
    conn.commit()
    conn.close()
    return respond(200, {'message': 'ВКонтакте успешно привязан', 'vk_id': vk_id})


def handle_unlink_vk(cur, conn, schema, user, ip=None):
    # Нельзя отвязать VK если нет пароля (единственный способ входа)
    cur.execute(f"SELECT password_hash, vk_id FROM {schema}.users WHERE id = {user['id']}")
    row = cur.fetchone()
    if not row or not row.get('vk_id'):
        conn.close()
        return respond(400, {'error': 'VK аккаунт не привязан'})
    if not row.get('password_hash'):
        conn.close()
        return respond(400, {'error': 'Нельзя отвязать VK — установите пароль для входа на сайт'})

    cur.execute(f"UPDATE {schema}.users SET vk_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = {user['id']}")
    write_audit_log(cur, schema, user['id'], 'unlink_vk', 'users', user['id'], ip)
    conn.commit()
    conn.close()
    return respond(200, {'message': 'VK аккаунт отвязан'})