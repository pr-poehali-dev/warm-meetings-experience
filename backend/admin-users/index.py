import json
import os

import psycopg2
import psycopg2.extras

from shared import *


def get_user_full(cur, schema, user_id):
    cur.execute(f"""
        SELECT
            u.id, u.name, u.email, u.phone, u.telegram,
            u.is_active, u.blocked_reason, u.created_at, u.updated_at, u.consent_photo,
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
        return options_response()

    headers_in = event.get('headers') or {}
    admin_token = headers_in.get('X-Admin-Token') or headers_in.get('x-admin-token') or ''

    if not verify_admin_token(admin_token):
        return respond(403, {'error': 'Доступ запрещён'})

    method = event.get('httpMethod', 'GET')
    schema = get_schema()
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    # Подресурс: журнал уведомлений
    params = event.get('queryStringParameters') or {}
    if (params.get('resource') or '') == 'notifications' and method == 'GET':
        page = max(1, int(params.get('page', 1)))
        per_page = min(100, max(1, int(params.get('per_page', 30))))
        offset = (page - 1) * per_page

        filters = []
        status_f = (params.get('status') or '').strip()
        channel_f = (params.get('channel') or '').strip()
        event_type_f = (params.get('event_type') or '').strip()
        search_f = (params.get('search') or '').strip()
        date_from_f = (params.get('date_from') or '').strip()
        date_to_f = (params.get('date_to') or '').strip()

        if status_f in ('success', 'failed'):
            filters.append(f"status = '{status_f}'")
        if channel_f in ('email', 'telegram', 'vk'):
            filters.append(f"channel = '{channel_f}'")
        if event_type_f:
            et = event_type_f.replace("'", "''")[:60]
            filters.append(f"event_type = '{et}'")
        if search_f:
            s = search_f.replace("'", "''")
            filters.append(f"(recipient ILIKE '%{s}%' OR error_text ILIKE '%{s}%' OR subject ILIKE '%{s}%')")
        if date_from_f:
            filters.append(f"created_at >= '{date_from_f[:10]}'::date")
        if date_to_f:
            filters.append(f"created_at < ('{date_to_f[:10]}'::date + INTERVAL '1 day')")

        where = ('WHERE ' + ' AND '.join(filters)) if filters else ''

        cur.execute(f"SELECT COUNT(*) AS total FROM {schema}.notification_log {where}")
        total_n = cur.fetchone()['total']

        cur.execute(f"""
            SELECT id, channel, event_type, recipient, subject, status,
                   error_code, error_text, provider_resp, user_id, related_id, created_at
            FROM {schema}.notification_log
            {where}
            ORDER BY created_at DESC
            LIMIT {per_page} OFFSET {offset}
        """)
        rows_n = [dict(r) for r in cur.fetchall()]

        # 24h-статистика одинакова для всех админов и не зависит от фильтров —
        # кэшируем на 60 секунд, чтобы не считать тяжёлый агрегат на каждое открытие.
        def _load_stats_24h():
            cur.execute(f"""
                SELECT
                    COUNT(*) FILTER (WHERE status = 'success') AS ok_24h,
                    COUNT(*) FILTER (WHERE status = 'failed')  AS fail_24h,
                    COUNT(*) FILTER (WHERE status = 'failed' AND (error_code IN ('401','403') OR error_text ILIKE '%unauthorized%' OR error_text ILIKE '%forbidden%')) AS critical_24h
                FROM {schema}.notification_log
                WHERE created_at >= NOW() - INTERVAL '24 hours'
            """)
            return dict(cur.fetchone() or {})
        stats_n = cached('notif_log_stats_24h', 60, _load_stats_24h)
        conn.close()
        return respond(200, {
            'items': rows_n,
            'total': total_n,
            'page': page,
            'per_page': per_page,
            'stats_24h': stats_n,
        })

    # Подресурс: публикации в Telegram-каналы
    resource = params.get('resource') or ''
    if resource == 'tg_publications' and method == 'GET':
        page = max(1, int(params.get('page', 1)))
        per_page = min(100, max(1, int(params.get('per_page', 30))))
        offset = (page - 1) * per_page
        status_f = (params.get('status') or '').strip()
        search_f = (params.get('search') or '').strip()

        filters = []
        if status_f in ('sent', 'error'):
            filters.append(f"tp.status = '{status_f}'")
        if search_f:
            s = search_f.replace("'", "''")
            filters.append(f"(e.title ILIKE '%{s}%' OR tc.chat_title ILIKE '%{s}%' OR tp.error_text ILIKE '%{s}%')")
        where = ('WHERE ' + ' AND '.join(filters)) if filters else ''

        cur.execute(f"""
            SELECT COUNT(*) AS total
            FROM {schema}.tg_publications tp
            JOIN {schema}.events e ON e.id = tp.event_id
            JOIN {schema}.tg_channels tc ON tc.id = tp.channel_id
            {where}
        """)
        total_p = cur.fetchone()['total']

        cur.execute(f"""
            SELECT tp.id, tp.event_id, tp.channel_id, tp.message_id,
                   tp.status, tp.error_text, tp.published_at,
                   e.title AS event_title, e.slug AS event_slug,
                   tc.chat_title, tc.chat_id
            FROM {schema}.tg_publications tp
            JOIN {schema}.events e ON e.id = tp.event_id
            JOIN {schema}.tg_channels tc ON tc.id = tp.channel_id
            {where}
            ORDER BY tp.published_at DESC NULLS LAST
            LIMIT {per_page} OFFSET {offset}
        """)
        rows_p = [dict(r) for r in cur.fetchall()]

        cur.execute(f"""
            SELECT
                COUNT(*) FILTER (WHERE status = 'sent') AS sent_total,
                COUNT(*) FILTER (WHERE status = 'error') AS error_total
            FROM {schema}.tg_publications
        """)
        stats_p = dict(cur.fetchone() or {})

        conn.close()
        return respond(200, {
            'items': rows_p,
            'total': total_p,
            'page': page,
            'per_page': per_page,
            'stats': stats_p,
        })

    # Подресурс: рассылки и личные сообщения
    if resource == 'audiences' and method == 'GET':
        from broadcast import handle_audiences
        resp = handle_audiences(cur, schema)
        conn.close()
        return resp

    if resource == 'user_search' and method == 'GET':
        from broadcast import handle_search_users
        resp = handle_search_users(cur, schema, params.get('q') or '')
        conn.close()
        return resp

    if resource == 'broadcast' and method == 'POST':
        from broadcast import handle_send_broadcast
        body = json.loads(event.get('body') or '{}')
        resp = handle_send_broadcast(cur, conn, schema, body)
        conn.close()
        return resp

    if method == 'GET':
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
            where = f"""WHERE (
                u.name ILIKE '%{s}%' OR u.email ILIKE '%{s}%' OR u.phone ILIKE '%{s}%'
                OR EXISTS (
                    SELECT 1 FROM {schema}.crm_notes cn
                    WHERE cn.client_key = 'user:' || u.id AND cn.body ILIKE '%{s}%'
                )
            )"""

        cur.execute(f"SELECT COUNT(*) as total FROM {schema}.users u {where}")
        total = cur.fetchone()['total']

        cur.execute(f"""
            SELECT
                u.id, u.name, u.email, u.phone, u.telegram,
                u.is_active, u.blocked_reason, u.created_at, u.consent_photo,
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
            cur.execute(f"SELECT is_active FROM {schema}.users WHERE id = {user_id}")
            prev = cur.fetchone()
            cur.execute(f"""
                UPDATE {schema}.users
                SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP
                WHERE id = {user_id}
                RETURNING id, is_active
            """)
            row = cur.fetchone()
            audit_log(cur, schema, 'user', user_id,
                      'block' if not row['is_active'] else 'unblock',
                      field='is_active',
                      old_value=str(prev['is_active']) if prev else None,
                      new_value=str(row['is_active']))
            conn.commit()
            conn.close()
            return respond(200, {'id': row['id'], 'is_active': row['is_active']})

        if action == 'block_user':
            reason = str(body.get('reason', 'banned'))
            if reason not in ('banned', 'duplicate'):
                conn.close()
                return respond(400, {'error': 'Недопустимая причина блокировки'})
            cur.execute(f"""
                UPDATE {schema}.users
                SET is_active = false,
                    blocked_reason = '{reason}',
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = {user_id}
                RETURNING id, is_active, blocked_reason
            """)
            row = cur.fetchone()
            if not row:
                conn.close()
                return respond(404, {'error': 'Пользователь не найден'})
            cur.execute(f"""
                UPDATE {schema}.user_sessions
                SET expires_at = NOW() - INTERVAL '1 second'
                WHERE user_id = {user_id}
            """)
            audit_log(cur, schema, 'user', user_id, 'block',
                      field='blocked_reason', new_value=reason)
            conn.commit()
            conn.close()
            return respond(200, {'id': row['id'], 'is_active': row['is_active'], 'blocked_reason': row['blocked_reason']})

        if action == 'unblock_user':
            cur.execute(f"""
                UPDATE {schema}.users
                SET is_active = true,
                    blocked_reason = NULL,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = {user_id}
                RETURNING id, is_active, blocked_reason
            """)
            row = cur.fetchone()
            if not row:
                conn.close()
                return respond(404, {'error': 'Пользователь не найден'})
            audit_log(cur, schema, 'user', user_id, 'unblock',
                      field='blocked_reason', old_value='banned', new_value=None)
            conn.commit()
            conn.close()
            return respond(200, {'id': row['id'], 'is_active': row['is_active'], 'blocked_reason': row['blocked_reason']})

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
            audit_log(cur, schema, 'user', user_id, 'role_added',
                      field='role', new_value=role_slug)
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
            audit_log(cur, schema, 'user', user_id, 'role_removed',
                      field='role', old_value=role_slug)
            conn.commit()
            user = get_user_full(cur, schema, user_id)
            conn.close()
            return respond(200, {'user': user})

        conn.close()
        return respond(400, {'error': 'Неизвестное действие'})

    conn.close()
    return respond(405, {'error': 'Method not allowed'})