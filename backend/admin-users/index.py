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
    import time
    admin_pwd = os.environ.get('ADMIN_PASSWORD', '')
    if not admin_pwd:
        return False
    expected = hashlib.sha256(f"{admin_pwd}:{int(time.time() // 86400)}".encode()).hexdigest()
    return token == expected

def get_user_full(cur, schema, user_id):
    cur.execute(f"""
        SELECT
            u.id, u.name, u.email, u.phone, u.telegram,
            u.is_active, u.created_at, u.updated_at,
            COALESCE(json_agg(
                json_build_object('id', r.id, 'name', r.name, 'slug', r.slug, 'icon', r.icon, 'status', ur.status)
            ) FILTER (WHERE ur.id IS NOT NULL), '[]') as roles
        FROM {schema}.users u
        LEFT JOIN {schema}.user_roles ur ON ur.user_id = u.id
        LEFT JOIN {schema}.roles r ON r.id = ur.role_id
        WHERE u.id = {user_id}
        GROUP BY u.id
    """)
    row = cur.fetchone()
    return dict(row) if row else None


def handler(event, context):
    """Управление пользователями в админ-панели: список, просмотр, редактирование, блокировка, роли"""
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

        # Получение одного пользователя
        if params.get('user_id'):
            user_id = int(params['user_id'])
            user = get_user_full(cur, schema, user_id)
            conn.close()
            if not user:
                return respond(404, {'error': 'Пользователь не найден'})
            # Получаем список всех ролей
            cur2 = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) if False else None
            return respond(200, {'user': user})

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
                    json_build_object('id', r.id, 'name', r.name, 'slug', r.slug, 'icon', r.icon, 'status', ur.status)
                ) FILTER (WHERE ur.id IS NOT NULL), '[]') as roles
            FROM {schema}.users u
            LEFT JOIN {schema}.user_roles ur ON ur.user_id = u.id
            LEFT JOIN {schema}.roles r ON r.id = ur.role_id
            {where}
            GROUP BY u.id
            ORDER BY u.created_at DESC
            LIMIT {per_page} OFFSET {offset}
        """)
        users = [dict(r) for r in cur.fetchall()]

        # Все роли для выбора
        cur.execute(f"SELECT id, name, slug, icon FROM {schema}.roles WHERE is_active = true ORDER BY sort_order")
        all_roles = [dict(r) for r in cur.fetchall()]

        conn.close()
        return respond(200, {'users': users, 'total': total, 'page': page, 'per_page': per_page, 'all_roles': all_roles})

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

        if action == 'update_user':
            fields = []
            if 'name' in body:
                fields.append(f"name = '{str(body['name']).replace(chr(39), chr(39)*2)}'")
            if 'phone' in body:
                fields.append(f"phone = '{str(body['phone']).replace(chr(39), chr(39)*2)}'")
            if 'telegram' in body:
                fields.append(f"telegram = '{str(body['telegram']).replace(chr(39), chr(39)*2)}'")
            if not fields:
                conn.close()
                return respond(400, {'error': 'Нет данных для обновления'})
            fields.append('updated_at = CURRENT_TIMESTAMP')
            cur.execute(f"UPDATE {schema}.users SET {', '.join(fields)} WHERE id = {user_id} RETURNING *")
            row = cur.fetchone()
            conn.commit()
            conn.close()
            if not row:
                return respond(404, {'error': 'Пользователь не найден'})
            return respond(200, {'user': dict(row)})

        if action == 'add_role':
            role_slug = str(body.get('role_slug', '')).replace("'", "''")
            cur.execute(f"SELECT id FROM {schema}.roles WHERE slug = '{role_slug}'")
            role = cur.fetchone()
            if not role:
                conn.close()
                return respond(404, {'error': 'Роль не найдена'})
            cur.execute(f"""
                INSERT INTO {schema}.user_roles (user_id, role_id, status, verified_at)
                VALUES ({user_id}, {role['id']}, 'active', CURRENT_TIMESTAMP)
                ON CONFLICT (user_id, role_id) DO UPDATE SET status = 'active', updated_at = CURRENT_TIMESTAMP, verified_at = CURRENT_TIMESTAMP
                RETURNING id
            """)
            conn.commit()
            user = get_user_full(cur, schema, user_id)
            conn.close()
            return respond(200, {'user': user})

        if action == 'remove_role':
            role_slug = str(body.get('role_slug', '')).replace("'", "''")
            cur.execute(f"SELECT id FROM {schema}.roles WHERE slug = '{role_slug}'")
            role = cur.fetchone()
            if not role:
                conn.close()
                return respond(404, {'error': 'Роль не найдена'})
            cur.execute(f"DELETE FROM {schema}.user_roles WHERE user_id = {user_id} AND role_id = {role['id']}")
            conn.commit()
            user = get_user_full(cur, schema, user_id)
            conn.close()
            return respond(200, {'user': user})

        conn.close()
        return respond(400, {'error': 'Неизвестное действие'})

    conn.close()
    return respond(405, {'error': 'Method not allowed'})
