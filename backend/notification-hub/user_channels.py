"""Админ-обзор каналов уведомлений пользователей.

GET  ?resource=user_channels            — список пользователей с состоянием каналов
POST ?resource=user_channels (disable)  — отключить канал у пользователя (при жалобах)

Авторизация — admin-токен (проверяется в index.py до вызова).
"""

from shared import respond, err


def handle_user_channels(cur, conn, schema, method, params, body):
    if method == 'GET':
        return _list(cur, schema, params)
    if method == 'POST':
        return _disable(cur, conn, schema, body)
    return err('Метод не поддерживается', 405)


def _list(cur, schema, params):
    page = max(1, int(params.get('page', 1)))
    per_page = min(100, max(1, int(params.get('per_page', 30))))
    offset = (page - 1) * per_page
    search = (params.get('search') or '').strip()
    role = (params.get('role') or '').strip()

    where = ["u.is_active = true"]
    if search:
        s = search.replace("'", "''")[:100]
        where.append(f"(u.name ILIKE '%{s}%' OR u.email ILIKE '%{s}%')")
    if role in ('master', 'parmaster', 'organizer', 'partner', 'bath_owner'):
        where.append(f"""EXISTS (
            SELECT 1 FROM {schema}.user_roles ur
            JOIN {schema}.roles r ON r.id = ur.role_id
            WHERE ur.user_id = u.id AND ur.status = 'active' AND r.slug = '{role}'
        )""")
    where_sql = ' AND '.join(where)

    cur.execute(f"SELECT COUNT(*) AS total FROM {schema}.users u WHERE {where_sql}")
    total = cur.fetchone()['total']

    cur.execute(f"""
        SELECT u.id, u.name, u.email, u.vk_id,
               u.tg_chat_id, u.tg_notify_allowed,
               u.vk_notify_allowed,
               COALESCE(u.notify_email, true)    AS notify_email,
               COALESCE(u.notify_telegram, false) AS notify_telegram,
               COALESCE(u.notify_vk, false)      AS notify_vk,
               la.telegram_user_id AS linked_tg,
               (SELECT string_agg(r.slug, ',') FROM {schema}.user_roles ur
                JOIN {schema}.roles r ON r.id = ur.role_id
                WHERE ur.user_id = u.id AND ur.status = 'active') AS roles,
               (SELECT quiet_enabled FROM {schema}.notify_schedule ns WHERE ns.user_id = u.id) AS quiet_enabled
        FROM {schema}.users u
        LEFT JOIN (
            SELECT DISTINCT ON (user_id) user_id, telegram_user_id
            FROM {schema}.tg_linked_accounts
            ORDER BY user_id, linked_at DESC
        ) la ON la.user_id = u.id
        WHERE {where_sql}
        ORDER BY u.id DESC
        LIMIT {per_page} OFFSET {offset}
    """)
    rows = []
    for r in cur.fetchall():
        email_ok = bool(r['email'] and '@vk.local' not in (r['email'] or ''))
        rows.append({
            'id': r['id'],
            'name': r['name'],
            'email': r['email'] if email_ok else None,
            'roles': (r['roles'] or '').split(',') if r['roles'] else [],
            'quiet_enabled': bool(r['quiet_enabled']),
            'channels': {
                'telegram': {
                    'connected': bool(r['tg_chat_id'] or r['linked_tg']),
                    'active': bool(r['notify_telegram']),
                },
                'email': {
                    'connected': email_ok,
                    'active': bool(r['notify_email']),
                },
                'vk': {
                    'connected': bool(r['vk_id']),
                    'active': bool(r['notify_vk'] and r['vk_notify_allowed']),
                },
            },
        })

    return respond(200, {
        'users': rows,
        'total': total,
        'page': page,
        'per_page': per_page,
        'pages': (total + per_page - 1) // per_page,
    })


_COL = {'email': 'notify_email', 'telegram': 'notify_telegram', 'vk': 'notify_vk'}


def _disable(cur, conn, schema, body):
    user_id = body.get('user_id')
    channel = (body.get('channel') or '').strip()
    active = bool(body.get('active', False))  # по умолчанию отключаем
    if not user_id or channel not in _COL:
        return err('Укажите user_id и корректный канал')

    col = _COL[channel]
    cur.execute(f"""
        UPDATE {schema}.users SET {col} = {str(active).lower()}
        WHERE id = {int(user_id)}
    """)
    conn.commit()
    return respond(200, {'ok': True, 'user_id': int(user_id), 'channel': channel, 'active': active})