"""Управление шаблонами уведомлений (admin)."""

import json

from shared import respond, err


def handle_templates(cur, conn, schema, method, params, event):
    if method == 'GET':
        return _list(cur, schema)
    if method == 'POST':
        return _upsert(cur, conn, schema, event)
    return err('Метод не поддерживается', 405)


def _list(cur, schema):
    cur.execute(f"""
        SELECT id, event_type, name, description, category,
               variables, bodies, default_channels, is_active,
               created_at, updated_at
        FROM {schema}.notification_templates
        ORDER BY category, name
    """)
    rows = [dict(r) for r in cur.fetchall()]
    return respond(200, {'templates': rows})


def _upsert(cur, conn, schema, event):
    try:
        body = json.loads(event.get('body') or '{}')
    except Exception:
        return err('Некорректный JSON')

    event_type = (body.get('event_type') or '').strip()
    if not event_type:
        return err('Не указан event_type')

    name = (body.get('name') or event_type).strip()
    description = body.get('description') or ''
    category = (body.get('category') or 'service').strip()
    variables = body.get('variables') or []
    bodies = body.get('bodies') or {}
    default_channels = body.get('default_channels') or ['telegram', 'email']
    is_active = bool(body.get('is_active', True))

    cur.execute(f"""
        INSERT INTO {schema}.notification_templates
            (event_type, name, description, category, variables, bodies,
             default_channels, is_active, updated_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())
        ON CONFLICT (event_type) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            category = EXCLUDED.category,
            variables = EXCLUDED.variables,
            bodies = EXCLUDED.bodies,
            default_channels = EXCLUDED.default_channels,
            is_active = EXCLUDED.is_active,
            updated_at = NOW()
        RETURNING id
    """, (
        event_type, name, description, category,
        json.dumps(variables, ensure_ascii=False),
        json.dumps(bodies, ensure_ascii=False),
        json.dumps(default_channels, ensure_ascii=False),
        is_active,
    ))
    tpl_id = cur.fetchone()['id']
    conn.commit()
    return respond(200, {'ok': True, 'id': tpl_id, 'event_type': event_type})
