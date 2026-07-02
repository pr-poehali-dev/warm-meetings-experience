"""Сбор ошибок фронтенда и бэкенда + алерты в Telegram.

POST {source, level, message, stack?, url?, function_name?, user_agent?, user_id?, context?}
    Принимает ошибку, дедуплицирует по fingerprint (source+message+function/url),
    инкрементит счётчик повторов. Критичные (level=error/fatal) шлёт в Telegram,
    но не чаще 1 раза в 15 минут на один fingerprint (антиспам).
    Публичный (без токена) — чтобы фронт мог слать ошибки.

GET (X-Admin-Token) ?source=&resolved=&limit=  — список последних ошибок для админки.
POST ?action=resolve (X-Admin-Token) {id}     — пометить ошибку решённой.
"""
import hashlib
import json
import time

from shared import (
    get_conn, get_schema, get_cursor,
    options_response, ok, err,
    verify_admin_token, tg_notify_admin, _esc,
)

ALERT_COOLDOWN_SEC = 15 * 60


def _trunc(v, n=8000):
    if v is None:
        return None
    return str(v)[:n]


def _fingerprint(source, message, ident):
    raw = f"{source}|{(message or '')[:200]}|{ident or ''}"
    return hashlib.sha256(raw.encode('utf-8')).hexdigest()[:32]


def save_error(cur, schema, payload, ip):
    source = (payload.get('source') or 'frontend').strip()[:16]
    level = (payload.get('level') or 'error').strip()[:16]
    message = _trunc(payload.get('message') or 'Unknown error', 2000)
    stack = _trunc(payload.get('stack'))
    url = _trunc(payload.get('url'), 2000)
    function_name = _trunc(payload.get('function_name'), 120)
    user_agent = _trunc(payload.get('user_agent'), 500)
    user_id = payload.get('user_id')
    ctx = payload.get('context')
    ident = function_name or url or ''
    fp = _fingerprint(source, message, ident)

    ctx_json = None
    if ctx is not None:
        try:
            ctx_json = json.dumps(ctx, ensure_ascii=False, default=str)[:8000]
        except (TypeError, ValueError):
            ctx_json = None

    uid_sql = int(user_id) if str(user_id).lstrip('-').isdigit() else 'NULL'

    # Дедупликация: если такой же fingerprint был за последние 24ч — инкрементим
    cur.execute(f"""
        UPDATE {schema}.error_logs
        SET count = count + 1, last_seen_at = NOW(),
            resolved = false, stack = COALESCE({_esc(stack)}, stack)
        WHERE fingerprint = '{fp}' AND last_seen_at > NOW() - INTERVAL '24 hours'
        RETURNING id, count,
                  (last_seen_at) AS ls
    """)
    row = cur.fetchone()
    if row:
        return {'id': row['id'], 'count': row['count'], 'is_new': False,
                'fingerprint': fp, 'level': level, 'message': message,
                'source': source, 'ident': ident}

    cur.execute(f"""
        INSERT INTO {schema}.error_logs
            (source, level, message, stack, url, function_name,
             user_agent, user_id, fingerprint, context)
        VALUES ({_esc(source)}, {_esc(level)}, {_esc(message)}, {_esc(stack)},
                {_esc(url)}, {_esc(function_name)}, {_esc(user_agent)},
                {uid_sql}, '{fp}', {_esc(ctx_json)})
        RETURNING id, count
    """)
    r = cur.fetchone()
    return {'id': r['id'], 'count': r['count'], 'is_new': True,
            'fingerprint': fp, 'level': level, 'message': message,
            'source': source, 'ident': ident}


# антиспам алертов в рамках жизни процесса
_LAST_ALERT: dict = {}


def maybe_alert(info):
    if info['level'] not in ('error', 'fatal', 'critical'):
        return
    fp = info['fingerprint']
    now = time.time()
    last = _LAST_ALERT.get(fp, 0)
    if now - last < ALERT_COOLDOWN_SEC:
        return
    _LAST_ALERT[fp] = now

    icon = '🔴' if info['source'] == 'backend' else '🟠'
    src = 'Бэкенд' if info['source'] == 'backend' else 'Фронтенд'
    ident = info.get('ident') or ''
    repeat = f"\n<b>Повторов:</b> {info['count']}" if info['count'] > 1 else ''
    text = (
        f"{icon} <b>Ошибка · {src}</b>\n\n"
        f"<b>{info['message'][:300]}</b>\n"
        f"{('<i>' + ident[:200] + '</i>') if ident else ''}"
        f"{repeat}"
    )
    tg_notify_admin(text)


def list_errors(cur, schema, qs):
    conds = []
    src = (qs.get('source') or '').strip()
    if src in ('frontend', 'backend'):
        conds.append(f"source = '{src}'")
    resolved = (qs.get('resolved') or '').strip()
    if resolved == 'false':
        conds.append("resolved = false")
    elif resolved == 'true':
        conds.append("resolved = true")
    try:
        limit = max(1, min(int(qs.get('limit') or 100), 500))
    except (TypeError, ValueError):
        limit = 100
    where = ('WHERE ' + ' AND '.join(conds)) if conds else ''
    cur.execute(f"""
        SELECT id, source, level, message, stack, url, function_name,
               user_agent, user_id, fingerprint, count, resolved,
               created_at, last_seen_at
        FROM {schema}.error_logs
        {where}
        ORDER BY last_seen_at DESC
        LIMIT {limit}
    """)
    return cur.fetchall()


def resolve_error(cur, schema, error_id):
    cur.execute(f"""
        UPDATE {schema}.error_logs SET resolved = true
        WHERE id = {int(error_id)}
        RETURNING id
    """)
    return cur.fetchone()


def handler(event, context):
    """Приём ошибок фронта/бэка, дедупликация, запись в БД и алерт в Telegram."""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return options_response()

    qs = event.get('queryStringParameters') or {}
    headers = event.get('headers') or {}
    token = headers.get('X-Admin-Token') or headers.get('x-admin-token') or ''
    schema = get_schema()
    conn = get_conn()
    try:
        cur = get_cursor(conn)

        if method == 'GET':
            if not verify_admin_token(token):
                return err('Доступ только для администратора', 403)
            rows = list_errors(cur, schema, qs)
            return ok({'errors': rows})

        if method == 'POST':
            try:
                body = json.loads(event.get('body') or '{}')
            except json.JSONDecodeError:
                return err('Некорректный JSON')

            if (qs.get('action') or '') == 'resolve':
                if not verify_admin_token(token):
                    return err('Доступ только для администратора', 403)
                eid = body.get('id')
                if not eid:
                    return err('id обязателен')
                row = resolve_error(cur, schema, eid)
                conn.commit()
                return ok({'resolved': bool(row)})

            # публичный приём ошибки
            ip = ((event.get('requestContext') or {}).get('identity') or {}).get('sourceIp')
            info = save_error(cur, schema, body, ip)
            conn.commit()
            maybe_alert(info)
            return ok({'id': info['id'], 'count': info['count']})

        return err('Метод не поддерживается', 405)
    finally:
        conn.close()
