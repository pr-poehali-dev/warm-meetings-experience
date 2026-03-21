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
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token, X-Admin-Token',
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
    """Система ролей: получение ролей пользователя, прогресса, бейджей, подача заявок и администрирование"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}

    headers_in = event.get('headers') or {}
    token = headers_in.get('X-Session-Token') or headers_in.get('x-session-token') or ''
    admin_token = headers_in.get('X-Admin-Token') or headers_in.get('x-admin-token') or ''

    method = event.get('httpMethod', 'GET')
    params = event.get('queryStringParameters') or {}
    resource = params.get('resource', 'my-roles')

    if resource == 'all-roles':
        return handle_all_roles()

    if resource.startswith('admin-'):
        if not verify_admin_token(admin_token):
            return respond(403, {'error': 'Доступ запрещён'})
        schema = get_schema()
        conn = get_conn()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        if resource == 'admin-applications':
            return handle_admin_applications(cur, conn, schema)
        elif resource == 'admin-review' and method == 'POST':
            body = json.loads(event.get('body', '{}'))
            return handle_admin_review(cur, conn, schema, body)
        elif resource == 'admin-grant' and method == 'POST':
            body = json.loads(event.get('body', '{}'))
            return handle_admin_grant(cur, conn, schema, body)
        conn.close()
        return respond(400, {'error': 'Unknown admin resource'})

    schema = get_schema()
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    user = get_user_from_token(cur, schema, token)
    if not user:
        conn.close()
        return respond(401, {'error': 'Не авторизован'})

    if resource == 'my-roles':
        return handle_my_roles(cur, conn, schema, user)
    elif resource == 'progress':
        return handle_progress(cur, conn, schema, user)
    elif resource == 'badges':
        return handle_badges(cur, conn, schema, user)
    elif resource == 'apply' and method == 'POST':
        body = json.loads(event.get('body', '{}'))
        return handle_apply(cur, conn, schema, user, body)
    elif resource == 'switch-role' and method == 'POST':
        body = json.loads(event.get('body', '{}'))
        return handle_switch_role(cur, conn, schema, user, body)

    conn.close()
    return respond(400, {'error': 'Unknown resource'})


def handle_all_roles():
    schema = get_schema()
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    cur.execute(f"""
        SELECT r.id, r.name, r.slug, r.description, r.icon, r.sort_order,
               json_agg(json_build_object(
                   'id', rr.id,
                   'type', rr.type,
                   'value', rr.value,
                   'description', rr.description
               ) ORDER BY rr.sort_order) FILTER (WHERE rr.id IS NOT NULL) as requirements
        FROM {schema}.roles r
        LEFT JOIN {schema}.role_requirements rr ON rr.role_id = r.id
        WHERE r.is_active = true
        GROUP BY r.id
        ORDER BY r.sort_order
    """)
    roles = [dict(r) for r in cur.fetchall()]
    conn.close()
    return respond(200, {'roles': roles})


def handle_my_roles(cur, conn, schema, user):
    cur.execute(f"""
        SELECT r.id, r.name, r.slug, r.description, r.icon,
               ur.status, ur.verified_at, ur.data, ur.created_at
        FROM {schema}.user_roles ur
        JOIN {schema}.roles r ON r.id = ur.role_id
        WHERE ur.user_id = {user['id']}
        ORDER BY r.sort_order
    """)
    active_roles = [dict(r) for r in cur.fetchall()]

    cur.execute(f"""
        SELECT ra.id, ra.status, ra.message, ra.admin_comment,
               ra.created_at, ra.reviewed_at,
               r.name as role_name, r.slug as role_slug, r.icon as role_icon
        FROM {schema}.role_applications ra
        JOIN {schema}.roles r ON r.id = ra.role_id
        WHERE ra.user_id = {user['id']}
        ORDER BY ra.created_at DESC
    """)
    applications = [dict(r) for r in cur.fetchall()]

    conn.close()
    return respond(200, {'roles': active_roles, 'applications': applications})


def handle_progress(cur, conn, schema, user):
    cur.execute(f"""
        SELECT r.id as role_id, r.name as role_name, r.slug as role_slug, r.icon as role_icon,
               rr.id as req_id, rr.type, rr.value as required_value, rr.description,
               COALESCE(ua.progress, 0) as progress,
               ua.completed_at
        FROM {schema}.roles r
        JOIN {schema}.role_requirements rr ON rr.role_id = r.id
        LEFT JOIN {schema}.user_achievements ua ON ua.requirement_id = rr.id AND ua.user_id = {user['id']}
        WHERE r.is_active = true
        ORDER BY r.sort_order, rr.sort_order
    """)
    rows = cur.fetchall()

    roles_progress = {}
    for row in rows:
        r = dict(row)
        slug = r['role_slug']
        if slug not in roles_progress:
            roles_progress[slug] = {
                'role_id': r['role_id'],
                'role_name': r['role_name'],
                'role_slug': slug,
                'role_icon': r['role_icon'],
                'requirements': [],
                'total': 0,
                'completed': 0
            }
        roles_progress[slug]['requirements'].append({
            'id': r['req_id'],
            'type': r['type'],
            'required_value': r['required_value'],
            'description': r['description'],
            'progress': r['progress'],
            'completed': r['completed_at'] is not None
        })
        roles_progress[slug]['total'] += 1
        if r['completed_at']:
            roles_progress[slug]['completed'] += 1

    conn.close()
    return respond(200, {'progress': list(roles_progress.values())})


def handle_badges(cur, conn, schema, user):
    cur.execute(f"""
        SELECT b.id, b.name, b.slug, b.description, b.icon,
               b.condition_type, b.condition_value,
               ub.earned_at
        FROM {schema}.badges b
        LEFT JOIN {schema}.user_badges ub ON ub.badge_id = b.id AND ub.user_id = {user['id']}
        WHERE b.is_active = true
        ORDER BY b.sort_order
    """)
    badges = [dict(r) for r in cur.fetchall()]
    conn.close()
    return respond(200, {'badges': badges})


def handle_apply(cur, conn, schema, user, body):
    role_slug = (body.get('role_slug') or '').strip()
    message = (body.get('message') or '').strip()
    portfolio_data = body.get('portfolio_data', {})

    if not role_slug:
        conn.close()
        return respond(400, {'error': 'Укажите роль'})

    rs = role_slug.replace("'", "''")
    cur.execute(f"SELECT id, name FROM {schema}.roles WHERE slug = '{rs}' AND is_active = true")
    role = cur.fetchone()
    if not role:
        conn.close()
        return respond(400, {'error': 'Роль не найдена'})

    cur.execute(f"""
        SELECT id FROM {schema}.user_roles
        WHERE user_id = {user['id']} AND role_id = {role['id']} AND status = 'active'
    """)
    if cur.fetchone():
        conn.close()
        return respond(400, {'error': 'У вас уже есть эта роль'})

    cur.execute(f"""
        SELECT id FROM {schema}.role_applications
        WHERE user_id = {user['id']} AND role_id = {role['id']} AND status = 'pending'
    """)
    if cur.fetchone():
        conn.close()
        return respond(400, {'error': 'Заявка на эту роль уже подана'})

    m = message.replace("'", "''")
    pd_json = json.dumps(portfolio_data).replace("'", "''")
    cur.execute(f"""
        INSERT INTO {schema}.role_applications (user_id, role_id, status, message, portfolio_data)
        VALUES ({user['id']}, {role['id']}, 'pending', '{m}', '{pd_json}')
        RETURNING id, status, created_at
    """)
    app = dict(cur.fetchone())
    conn.commit()

    send_telegram_notification(user, role, message)

    conn.close()
    return respond(200, {'application': app, 'message': f'Заявка на роль «{role["name"]}» отправлена'})


def handle_switch_role(cur, conn, schema, user, body):
    role_slug = (body.get('role_slug') or '').strip()
    if not role_slug:
        conn.close()
        return respond(400, {'error': 'Укажите роль'})

    rs = role_slug.replace("'", "''")
    cur.execute(f"""
        SELECT r.id, r.slug, r.name
        FROM {schema}.user_roles ur
        JOIN {schema}.roles r ON r.id = ur.role_id
        WHERE ur.user_id = {user['id']} AND r.slug = '{rs}' AND ur.status = 'active'
    """)
    role = cur.fetchone()
    if not role:
        conn.close()
        return respond(400, {'error': 'У вас нет этой роли'})

    conn.close()
    return respond(200, {'active_role': dict(role)})


def handle_admin_applications(cur, conn, schema):
    cur.execute(f"""
        SELECT ra.id, ra.user_id, u.name as user_name, u.email as user_email,
               r.name as role_name, r.slug as role_slug, r.icon as role_icon,
               ra.status, ra.message, ra.admin_comment,
               ra.created_at, ra.reviewed_at
        FROM {schema}.role_applications ra
        JOIN {schema}.users u ON u.id = ra.user_id
        JOIN {schema}.roles r ON r.id = ra.role_id
        ORDER BY
            CASE WHEN ra.status = 'pending' THEN 0 ELSE 1 END,
            ra.created_at DESC
    """)
    applications = [dict(r) for r in cur.fetchall()]

    cur.execute(f"""
        SELECT u.id, u.name, u.email,
               json_agg(json_build_object(
                   'name', r.name, 'slug', r.slug, 'icon', r.icon, 'status', ur.status
               ) ORDER BY r.sort_order) as roles
        FROM {schema}.users u
        LEFT JOIN {schema}.user_roles ur ON ur.user_id = u.id
        LEFT JOIN {schema}.roles r ON r.id = ur.role_id
        WHERE u.is_active = true
        GROUP BY u.id
        ORDER BY u.name
    """)
    users = []
    for row in cur.fetchall():
        d = dict(row)
        if d['roles'] and d['roles'][0] and d['roles'][0].get('slug'):
            pass
        else:
            d['roles'] = []
        users.append(d)

    conn.close()
    return respond(200, {'applications': applications, 'users': users})


def handle_admin_review(cur, conn, schema, body):
    app_id = body.get('application_id')
    action = body.get('action', '')
    comment = (body.get('comment') or '').strip()

    if not app_id or action not in ('approve', 'reject'):
        conn.close()
        return respond(400, {'error': 'Укажите application_id и action (approve/reject)'})

    cur.execute(f"""
        SELECT ra.id, ra.user_id, ra.role_id, ra.status
        FROM {schema}.role_applications ra
        WHERE ra.id = {app_id}
    """)
    app = cur.fetchone()
    if not app:
        conn.close()
        return respond(404, {'error': 'Заявка не найдена'})

    if app['status'] != 'pending':
        conn.close()
        return respond(400, {'error': 'Заявка уже рассмотрена'})

    new_status = 'approved' if action == 'approve' else 'rejected'
    c = comment.replace("'", "''")
    cur.execute(f"""
        UPDATE {schema}.role_applications
        SET status = '{new_status}', admin_comment = '{c}',
            reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = {app_id}
    """)

    if action == 'approve':
        cur.execute(f"""
            INSERT INTO {schema}.user_roles (user_id, role_id, status, verified_at)
            VALUES ({app['user_id']}, {app['role_id']}, 'active', CURRENT_TIMESTAMP)
            ON CONFLICT (user_id, role_id)
            DO UPDATE SET status = 'active', verified_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        """)

    conn.commit()
    conn.close()
    return respond(200, {'message': 'Заявка обработана'})


def handle_admin_grant(cur, conn, schema, body):
    user_id = body.get('user_id')
    role_slug = (body.get('role_slug') or '').strip()

    if not user_id or not role_slug:
        conn.close()
        return respond(400, {'error': 'Укажите user_id и role_slug'})

    rs = role_slug.replace("'", "''")
    cur.execute(f"SELECT id FROM {schema}.roles WHERE slug = '{rs}'")
    role = cur.fetchone()
    if not role:
        conn.close()
        return respond(400, {'error': 'Роль не найдена'})

    cur.execute(f"""
        INSERT INTO {schema}.user_roles (user_id, role_id, status, verified_at)
        VALUES ({user_id}, {role['id']}, 'active', CURRENT_TIMESTAMP)
        ON CONFLICT (user_id, role_id)
        DO UPDATE SET status = 'active', verified_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    """)
    conn.commit()
    conn.close()
    return respond(200, {'message': 'Роль назначена'})


def send_telegram_notification(user, role, message):
    bot_token = os.environ.get('TELEGRAM_BOT_TOKEN')
    chat_id = os.environ.get('TELEGRAM_CHAT_ID')
    if not bot_token or not chat_id:
        return

    text = (
        f"📋 Заявка на роль\n\n"
        f"👤 {user['name']} ({user['email']})\n"
        f"🎭 Роль: {role['name']}\n"
    )
    if message:
        text += f"💬 Сообщение: {message}\n"

    import requests
    try:
        requests.post(
            f"https://api.telegram.org/bot{bot_token}/sendMessage",
            json={'chat_id': chat_id, 'text': text, 'parse_mode': 'HTML'},
            timeout=5
        )
    except Exception:
        pass
