"""История изменений (audit log) для административных карточек.

GET ?entity_type=ticket&entity_id=123&limit=50
    Возвращает список действий по сущности (по убыванию времени).

POST {entity_type, entity_id, action, comment?, field?, old_value?, new_value?}
    Заносит событие вручную (например — оставить комментарий-пометку на карточке).
"""
import json

from shared import (
    get_conn, get_schema, get_cursor,
    options_response, ok, err,
    verify_admin_token,
)


def _esc(v):
    if v is None:
        return 'NULL'
    s = str(v)
    return "'" + s.replace("'", "''") + "'"


def _trunc(v, n=2000):
    if v is None:
        return None
    return str(v)[:n]


def list_for_entity(cur, schema, entity_type, entity_id, limit):
    et = entity_type.replace("'", "''")
    eid = str(entity_id).replace("'", "''")
    cur.execute(f"""
        SELECT id, entity_type, entity_id, action, field,
               old_value, new_value, actor_type, actor_id, actor_name,
               comment, created_at
        FROM {schema}.admin_audit_log
        WHERE entity_type = '{et}' AND entity_id = '{eid}'
        ORDER BY created_at DESC, id DESC
        LIMIT {int(limit)}
    """)
    return cur.fetchall()


def insert_event(cur, schema, payload, actor_name):
    entity_type = (payload.get('entity_type') or '').strip()
    entity_id = str(payload.get('entity_id') or '').strip()
    action = (payload.get('action') or 'comment').strip()
    if not entity_type or not entity_id:
        return None, 'entity_type и entity_id обязательны'

    field = payload.get('field')
    old_value = _trunc(payload.get('old_value'))
    new_value = _trunc(payload.get('new_value'))
    comment = _trunc(payload.get('comment'))

    cur.execute(f"""
        INSERT INTO {schema}.admin_audit_log
            (entity_type, entity_id, action, field, old_value, new_value,
             actor_type, actor_id, actor_name, comment)
        VALUES ({_esc(entity_type)}, {_esc(entity_id)}, {_esc(action)},
                {_esc(field)}, {_esc(old_value)}, {_esc(new_value)},
                'admin', NULL, {_esc(actor_name)}, {_esc(comment)})
        RETURNING id, created_at
    """)
    return cur.fetchone(), None


def handler(event, context):
    """Журнал изменений админки. GET — получить, POST — добавить запись."""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return options_response()

    headers = event.get('headers') or {}
    token = headers.get('X-Admin-Token') or headers.get('x-admin-token') or ''
    if not verify_admin_token(token):
        return err('Доступ только для администратора', 403)

    schema = get_schema()
    conn = get_conn()
    try:
        cur = get_cursor(conn)
        if method == 'GET':
            qs = event.get('queryStringParameters') or {}
            entity_type = (qs.get('entity_type') or '').strip()
            entity_id = (qs.get('entity_id') or '').strip()
            try:
                limit = int(qs.get('limit') or 100)
            except (TypeError, ValueError):
                limit = 100
            limit = max(1, min(limit, 500))
            if not entity_type or not entity_id:
                return err('entity_type и entity_id обязательны')
            rows = list_for_entity(cur, schema, entity_type, entity_id, limit)
            return ok({'events': rows})

        if method == 'POST':
            try:
                body = json.loads(event.get('body') or '{}')
            except json.JSONDecodeError:
                return err('Некорректный JSON')
            actor_name = (body.get('actor_name') or 'Администратор').strip()[:120]
            row, err_msg = insert_event(cur, schema, body, actor_name)
            if err_msg:
                return err(err_msg)
            conn.commit()
            return ok({'id': row['id'], 'created_at': row['created_at']})

        return err('Метод не поддерживается', 405)
    finally:
        conn.close()
