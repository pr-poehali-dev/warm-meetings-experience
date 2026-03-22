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
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Token',
    'Access-Control-Max-Age': '86400'
}

def respond(status, body):
    return {
        'statusCode': status,
        'headers': {**CORS_HEADERS, 'Content-Type': 'application/json'},
        'body': json.dumps(body, default=str)
    }

def verify_admin_token(token):
    if not token:
        return False
    from datetime import datetime
    admin_pwd = os.environ.get('ADMIN_PASSWORD', '')
    if not admin_pwd:
        return False
    today = datetime.utcnow().strftime('%Y-%m-%d')
    expected = hashlib.sha256(f"{admin_pwd}:{today}".encode()).hexdigest()
    return token == expected


def handler(event, context):
    """Управление пользователями в админ-панели: список, блокировка"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}

    headers_in = event.get('headers') or {}
    admin_token = headers_in.get('X-Admin-Token') or headers_in.get('x-admin-token') or ''

    if not verify_admin_token(admin_token):
        return respond(403, {'error': 'Доступ запрещён'})

    method = event.get('httpMethod', 'GET')
    schema = get_schema()
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    if method == 'GET':
        params = event.get('queryStringParameters') or {}
        search = (params.get('search') or '').strip()
        page = max(1, int(params.get('page', 1)))
        per_page = 20
        offset = (page - 1) * per_page

        where = ''
        if search:
            s = search.replace("'", "''")
            where = f"WHERE u.name ILIKE '%{s}%' OR u.email ILIKE '%{s}%' OR u.phone ILIKE '%{s}%'"

        cur.execute(f"SELECT COUNT(*) as total FROM {schema}.users u {where}")
        total = cur.fetchone()['total']

        cur.execute(f"""
            SELECT
                u.id, u.name, u.email, u.phone, u.telegram,
                u.is_active, u.created_at,
                COALESCE(json_agg(
                    json_build_object('name', r.name, 'slug', r.slug, 'icon', r.icon)
                ) FILTER (WHERE ur.id IS NOT NULL), '[]') as roles
            FROM {schema}.users u
            LEFT JOIN {schema}.user_roles ur ON ur.user_id = u.id AND ur.status = 'active'
            LEFT JOIN {schema}.roles r ON r.id = ur.role_id
            {where}
            GROUP BY u.id
            ORDER BY u.created_at DESC
            LIMIT {per_page} OFFSET {offset}
        """)
        users = [dict(r) for r in cur.fetchall()]
        conn.close()
        return respond(200, {'users': users, 'total': total, 'page': page, 'per_page': per_page})

    if method == 'POST':
        body = json.loads(event.get('body', '{}'))
        action = body.get('action')
        user_id = int(body.get('user_id', 0))

        if not user_id:
            conn.close()
            return respond(400, {'error': 'Укажите user_id'})

        if action == 'toggle_active':
            cur.execute(f"""
                UPDATE {schema}.users
                SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP
                WHERE id = {user_id}
                RETURNING id, is_active
            """)
            row = cur.fetchone()
            conn.commit()
            conn.close()
            return respond(200, {'id': row['id'], 'is_active': row['is_active']})

        conn.close()
        return respond(400, {'error': 'Неизвестное действие'})

    conn.close()
    return respond(405, {'error': 'Method not allowed'})
