"""Канонический общий модуль для всех Cloud Functions проекта.

ВАЖНО: Этот файл — единственный источник правды.
Во все папки backend/*/shared.py он автоматически копируется скриптом
backend/_shared/sync_shared.py. НЕ редактируйте копии вручную — они
будут перезаписаны при следующей синхронизации.

Уникальный код, специфичный для одной функции, выносите в локальные
файлы рядом с index.py (например, support_utils.py, landing_utils.py).
"""

import hashlib
import json
import os
import re
import time
import urllib.request
import urllib.error

import psycopg2
import psycopg2.extras


# --- DB ---

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def get_schema():
    return os.environ.get('MAIN_DB_SCHEMA', 'public')

def get_cursor(conn):
    return conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

# --- CORS ---

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Authorization, X-Session-Token, X-Admin-Token, X-Internal-Token',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json',
}

def options_response():
    return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}

def respond(status, body):
    return {'statusCode': status, 'headers': CORS_HEADERS, 'body': json.dumps(body, default=str, ensure_ascii=False)}

def ok(body):
    return respond(200, body)

def err(message, status=400):
    return respond(status, {'error': message})

# --- Process-local memo cache (TTL) ---

_MEMO: dict = {}  # key -> (expires_at_ts, value)


def memo_get(key: str):
    item = _MEMO.get(key)
    if not item:
        return None
    expires_at, value = item
    if expires_at < time.time():
        _MEMO.pop(key, None)
        return None
    return value


def memo_set(key: str, value, ttl_seconds: int = 60):
    _MEMO[key] = (time.time() + max(1, int(ttl_seconds)), value)
    return value


def memo_invalidate(prefix: str = ''):
    if not prefix:
        _MEMO.clear()
        return
    for k in list(_MEMO.keys()):
        if k.startswith(prefix):
            _MEMO.pop(k, None)


def cached(key: str, ttl_seconds: int, loader):
    hit = memo_get(key)
    if hit is not None:
        return hit
    value = loader()
    memo_set(key, value, ttl_seconds)
    return value

# --- Auth ---

def get_token(event):
    """Достаёт токен сессии из заголовков (учитывая прокси-переименование Authorization → X-Authorization)."""
    headers = event.get('headers') or {}
    for k in (
        'X-Session-Token', 'x-session-token',
        'X-Auth-Token', 'x-auth-token',
        'X-Authorization', 'x-authorization',
        'Authorization', 'authorization',
    ):
        v = headers.get(k)
        if v:
            v = v.strip()
            if v.lower().startswith('bearer '):
                v = v[7:].strip()
            if v:
                return v
    return ''

def get_user_from_token(cur, schema, token, extra_fields=''):
    if not token:
        return None
    t = token.replace("'", "''")
    fields = f', {extra_fields}' if extra_fields else ''
    cur.execute(f"""
        SELECT u.id, u.name, u.email, u.phone, u.telegram, u.avatar_url{fields}
        FROM {schema}.user_sessions s
        JOIN {schema}.users u ON u.id = s.user_id
        WHERE s.token = '{t}' AND s.expires_at > NOW() AND u.is_active = true
    """)
    return cur.fetchone()

def has_role(cur, schema, user_id, *slugs):
    slug_list = ', '.join(f"'{s}'" for s in slugs)
    cur.execute(f"""
        SELECT 1 FROM {schema}.user_roles ur
        JOIN {schema}.roles r ON r.id = ur.role_id
        WHERE ur.user_id = {int(user_id)} AND r.slug IN ({slug_list}) AND ur.status = 'active'
        LIMIT 1
    """)
    return cur.fetchone() is not None

def verify_admin_token(token):
    if not token:
        return False
    admin_pwd = os.environ.get('ADMIN_PASSWORD', '')
    if not admin_pwd:
        return False
    expected = hashlib.sha256(f"{admin_pwd}:{int(time.time() // 86400)}".encode()).hexdigest()
    return token == expected

# --- Telegram ---

def tg_send(chat_id, text, token=None, parse_mode='HTML'):
    """Отправляет сообщение в Telegram. Не падает при ошибках.
    Делает до 2 попыток (на случай медленного ответа Telegram API)."""
    bot_token = token or os.environ.get('TG_PUBLISH_BOT_TOKEN') or os.environ.get('TELEGRAM_BOT_TOKEN', '')
    if not bot_token or not chat_id:
        print(f'[tg_send] SKIP: bot_token={bool(bot_token)} chat_id={bool(chat_id)}')
        return False
    payload = json.dumps({
        'chat_id': int(chat_id) if str(chat_id).lstrip('-').isdigit() else chat_id,
        'text': text,
        'parse_mode': parse_mode,
    }).encode('utf-8')
    url = f'https://api.telegram.org/bot{bot_token}/sendMessage'
    last_err = None
    for attempt in range(2):
        req = urllib.request.Request(
            url, data=payload, headers={'Content-Type': 'application/json'},
        )
        try:
            urllib.request.urlopen(req, timeout=10)
            return True
        except urllib.error.HTTPError as e:
            try:
                err_body = e.read().decode('utf-8')
            except Exception:
                err_body = ''
            print(f'[tg_send] HTTP {e.code} chat_id={chat_id}: {err_body}')
            return False
        except Exception as e:
            last_err = e
            continue
    print(f'[tg_send] failed after retries chat_id={chat_id}: {last_err}')
    return False

def tg_notify_admin(text, token=None):
    admin_token = token or os.environ.get('TELEGRAM_BOT_TOKEN', '')
    return tg_send(os.environ.get('TELEGRAM_CHAT_ID', ''), text, token=admin_token)

# --- VK (сообщения сообщества) ---

def vk_send(vk_user_id, text):
    """Личное сообщение ВКонтакте от имени сообщества. True/False, не падает."""
    token = os.environ.get('VK_COMMUNITY_TOKEN', '')
    community_id = os.environ.get('VK_COMMUNITY_ID', '0')
    if not token or not vk_user_id:
        return False
    import random as _random
    import urllib.parse as _urlparse
    params = {
        'peer_id': str(int(vk_user_id)),
        'message': text,
        'random_id': str(_random.randint(1, 2 ** 31)),
        'access_token': token,
        'v': '5.199',
    }
    if community_id and community_id != '0':
        params['group_id'] = str(int(community_id))
    payload = _urlparse.urlencode(params).encode('utf-8')
    req = urllib.request.Request(
        'https://api.vk.com/method/messages.send',
        data=payload,
        headers={'Content-Type': 'application/x-www-form-urlencoded'},
    )
    try:
        resp = urllib.request.urlopen(req, timeout=6)
        result = json.loads(resp.read().decode('utf-8'))
        if 'error' in result:
            print(f'[vk_send] error vk_id={vk_user_id}: {result["error"]}')
            return False
        return True
    except Exception as e:
        print(f'[vk_send] exception vk_id={vk_user_id}: {e}')
        return False

# --- Email (Unisender Go) ---

def send_email(to_email, subject, body_html, to_name=None, tags=None):
    """Отправляет письмо через Unisender Go. Возвращает True/False, не падает при ошибках."""
    api_key = os.environ.get('UNISENDER_API_KEY', '')
    sender_email = os.environ.get('UNISENDER_SENDER_EMAIL', '')
    sender_name = os.environ.get('UNISENDER_SENDER_NAME', 'Sparcom')
    if not api_key or not sender_email or not to_email:
        print(f'[send_email] SKIP: missing config '
              f'(api_key={bool(api_key)}, sender={bool(sender_email)}, to={bool(to_email)})')
        return False
    recipient = {'email': to_email}
    if to_name:
        recipient['name'] = to_name
    message = {
        'recipients': [recipient],
        'from_email': sender_email,
        'subject': subject,
        'body': {'html': body_html},
        'track_links': 1,
        'track_read': 1,
    }
    if sender_name:
        message['from_name'] = sender_name
    if tags:
        message['tags'] = tags if isinstance(tags, list) else [str(tags)]
    payload = json.dumps({'message': message}).encode('utf-8')
    req = urllib.request.Request(
        'https://go2.unisender.ru/ru/transactional/api/v1/email/send.json',
        data=payload,
        headers={'X-API-KEY': api_key, 'Content-Type': 'application/json'},
    )
    try:
        resp = urllib.request.urlopen(req, timeout=10)
        raw = resp.read().decode('utf-8', 'replace')
        try:
            data = json.loads(raw)
        except Exception:
            data = {}
        failed = data.get('failed_emails') or {}
        if data.get('status') == 'error' or failed:
            print(f'[send_email] FAIL to={to_email}: provider_resp={raw[:500]}')
            return False
        return True
    except urllib.error.HTTPError as e:
        body = ''
        try:
            body = e.read().decode('utf-8', 'replace')[:500]
        except Exception:
            pass
        print(f'[send_email] HTTP {e.code} to={to_email}: {body}')
        return False
    except Exception as e:
        print(f'[send_email] EXC to={to_email}: {type(e).__name__}: {e}')
        return False

def admin_email():
    return os.environ.get('SUPPORT_ADMIN_EMAIL') or os.environ.get('UNISENDER_SENDER_EMAIL', '')
