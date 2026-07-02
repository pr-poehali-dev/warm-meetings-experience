"""Логирование падений серверных функций в error_logs + алерт в Telegram.

Локальный самодостаточный модуль (копируется рядом с index.py каждой
функции, где нужен). Не зависит от shared.py, чтобы не требовать
синхронизации большого канона. Внутри — прямой доступ к БД и Telegram.
"""
import functools
import hashlib
import json
import os
import time
import traceback
import urllib.request
import urllib.error

import psycopg2
import psycopg2.extras

_ALERT_TS: dict = {}
_ALERT_COOLDOWN = 15 * 60

_CORS = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
}


def _esc(v):
    if v is None:
        return 'NULL'
    return "'" + str(v).replace("'", "''") + "'"


def _tg_alert(text):
    token = os.environ.get('TELEGRAM_BOT_TOKEN', '')
    chat_id = os.environ.get('TELEGRAM_CHAT_ID', '')
    if not token or not chat_id:
        return
    payload = json.dumps({
        'chat_id': int(chat_id) if str(chat_id).lstrip('-').isdigit() else chat_id,
        'text': text,
        'parse_mode': 'HTML',
    }).encode('utf-8')
    req = urllib.request.Request(
        f'https://api.telegram.org/bot{token}/sendMessage',
        data=payload, headers={'Content-Type': 'application/json'},
    )
    try:
        urllib.request.urlopen(req, timeout=6)
    except Exception:
        pass


def log_backend_error(function_name, message, stack=None, context=None, level='error'):
    """Пишет ошибку в error_logs (дедуп по fingerprint) и шлёт алерт. Не падает."""
    try:
        fp = hashlib.sha256(
            f"backend|{(message or '')[:200]}|{function_name or ''}".encode('utf-8')
        ).hexdigest()[:32]
        ctx_json = None
        if context is not None:
            try:
                ctx_json = json.dumps(context, ensure_ascii=False, default=str)[:8000]
            except (TypeError, ValueError):
                ctx_json = None

        schema = os.environ.get('MAIN_DB_SCHEMA', 'public')
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        try:
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute(f"""
                UPDATE {schema}.error_logs
                SET count = count + 1, last_seen_at = NOW(), resolved = false
                WHERE fingerprint = '{fp}' AND last_seen_at > NOW() - INTERVAL '24 hours'
                RETURNING count
            """)
            row = cur.fetchone()
            if row:
                new_count = row['count']
            else:
                cur.execute(f"""
                    INSERT INTO {schema}.error_logs
                        (source, level, message, stack, function_name, fingerprint, context)
                    VALUES ('backend', {_esc(level)}, {_esc((message or 'Unknown')[:2000])},
                            {_esc(stack[:8000] if stack else None)},
                            {_esc((function_name or '')[:120])}, '{fp}', {_esc(ctx_json)})
                    RETURNING count
                """)
                r = cur.fetchone()
                new_count = r['count'] if r else 1
            conn.commit()
        finally:
            conn.close()

        now = time.time()
        if level in ('error', 'fatal', 'critical') and now - _ALERT_TS.get(fp, 0) >= _ALERT_COOLDOWN:
            _ALERT_TS[fp] = now
            repeat = f"\n<b>Повторов:</b> {new_count}" if new_count and new_count > 1 else ''
            _tg_alert(
                f"🔴 <b>Ошибка · Бэкенд</b>\n\n"
                f"<b>{(message or 'Unknown')[:300]}</b>\n"
                f"<i>{(function_name or '')[:120]}</i>{repeat}"
            )
    except Exception as e:
        print(f'[log_backend_error] failed: {e}')


def with_error_logging(function_name):
    """Декоратор handler: ловит падения, логирует, возвращает 500."""
    def decorator(fn):
        @functools.wraps(fn)
        def wrapper(event, context):
            try:
                return fn(event, context)
            except Exception as e:
                log_backend_error(
                    function_name,
                    f"{type(e).__name__}: {e}",
                    stack=traceback.format_exc(),
                    context={
                        'method': (event or {}).get('httpMethod', ''),
                        'query': (event or {}).get('queryStringParameters') or {},
                        'request_id': getattr(context, 'request_id', None),
                    },
                )
                return {
                    'statusCode': 500,
                    'headers': _CORS,
                    'body': json.dumps({'error': 'Внутренняя ошибка сервера'}),
                }
        return wrapper
    return decorator
