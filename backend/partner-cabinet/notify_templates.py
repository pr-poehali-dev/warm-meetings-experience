"""Персональные шаблоны уведомлений владельца (бизнес-пользователя).

Владелец видит глобальные шаблоны, помеченные owner_editable, и может
переопределить тексты под себя. Запросы авторизуются session-токеном
(пользователь уже проверен в handler).
"""

import json

from shared import respond


def handle_notify_templates(cur, conn, schema, user, method, params, event):
    owner_id = user['id']

    if method == 'GET':
        return _list(cur, conn, schema, owner_id)
    if method == 'POST':
        body = json.loads(event.get('body', '{}'))
        return _save(cur, conn, schema, owner_id, body)
    if method == 'DELETE':
        event_type = (params.get('event_type') or '').strip()
        return _reset(cur, conn, schema, owner_id, event_type)

    conn.close()
    return respond(405, {'error': 'Метод не поддерживается'})


def _list(cur, conn, schema, owner_id):
    """Глобальные редактируемые шаблоны + персональные переопределения владельца."""
    cur.execute(f"""
        SELECT g.event_type, g.name, g.description, g.category,
               g.variables, g.bodies AS global_bodies, g.default_channels,
               o.bodies AS owner_bodies, o.is_active AS owner_active
        FROM {schema}.notification_templates g
        LEFT JOIN {schema}.notification_templates_owner o
               ON o.event_type = g.event_type AND o.owner_id = {int(owner_id)}
        WHERE g.owner_editable = TRUE AND g.is_active = TRUE
        ORDER BY g.category, g.name
    """)
    rows = []
    for r in cur.fetchall():
        d = dict(r)
        d['customized'] = d.get('owner_bodies') is not None
        rows.append(d)
    conn.close()
    return respond(200, {'templates': rows})


def _save(cur, conn, schema, owner_id, body):
    event_type = (body.get('event_type') or '').strip()
    if not event_type:
        conn.close()
        return respond(400, {'error': 'Не указан event_type'})

    # Разрешаем настраивать только шаблоны с флагом owner_editable
    cur.execute(f"""
        SELECT 1 FROM {schema}.notification_templates
        WHERE event_type = %s AND owner_editable = TRUE
    """, (event_type,))
    if not cur.fetchone():
        conn.close()
        return respond(403, {'error': 'Этот тип уведомления нельзя настраивать'})

    bodies = body.get('bodies') or {}

    cur.execute(f"""
        INSERT INTO {schema}.notification_templates_owner
            (owner_id, event_type, bodies, is_active, updated_at)
        VALUES (%s, %s, %s, TRUE, NOW())
        ON CONFLICT (owner_id, event_type) DO UPDATE SET
            bodies = EXCLUDED.bodies,
            is_active = TRUE,
            updated_at = NOW()
    """, (int(owner_id), event_type, json.dumps(bodies, ensure_ascii=False)))
    conn.commit()
    conn.close()
    return respond(200, {'ok': True, 'event_type': event_type})


def _reset(cur, conn, schema, owner_id, event_type):
    """Сбросить персональный шаблон — вернуться к общему тексту."""
    if not event_type:
        conn.close()
        return respond(400, {'error': 'Не указан event_type'})
    cur.execute(f"""
        DELETE FROM {schema}.notification_templates_owner
        WHERE owner_id = {int(owner_id)} AND event_type = %s
    """, (event_type,))
    conn.commit()
    conn.close()
    return respond(200, {'ok': True, 'reset': True})
