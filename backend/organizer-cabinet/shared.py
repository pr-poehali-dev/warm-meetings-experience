import hashlib
import json
import os
import re
import time
import urllib.request

import psycopg2
import psycopg2.extras

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def get_schema():
    return os.environ.get('MAIN_DB_SCHEMA', 'public')

def get_cursor(conn):
    return conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Authorization, X-Session-Token, X-Admin-Token',
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

def get_user_from_token(cur, schema, token, extra_fields=''):
    if not token:
        return None
    t = token.replace("'", "''")
    fields = f', {extra_fields}' if extra_fields else ''
    cur.execute(f"""
        SELECT u.id, u.name, u.email, u.phone, u.telegram{fields}
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
        WHERE ur.user_id = {user_id} AND r.slug IN ({slug_list}) AND ur.status = 'active'
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

_TRANSLIT = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'zh',
    'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o',
    'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts',
    'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
    ' ': '-',
}

def slugify(text, max_length=80, fallback='item'):
    text = text.lower().strip()
    result = ''.join(_TRANSLIT.get(c, c) for c in text)
    result = re.sub(r'[^a-z0-9-]', '', result)
    result = re.sub(r'-+', '-', result).strip('-')
    return (result or fallback)[:max_length]

def tg_send(chat_id, text, token=None, parse_mode='HTML'):
    bot_token = token or os.environ.get('TELEGRAM_BOT_TOKEN', '')
    if not bot_token or not chat_id:
        return
    payload = json.dumps({'chat_id': chat_id, 'text': text, 'parse_mode': parse_mode}).encode('utf-8')
    req = urllib.request.Request(
        f'https://api.telegram.org/bot{bot_token}/sendMessage',
        data=payload,
        headers={'Content-Type': 'application/json'},
    )
    try:
        urllib.request.urlopen(req, timeout=5)
    except Exception:
        pass

def tg_notify_admin(text, token=None):
    tg_send(os.environ.get('TELEGRAM_CHAT_ID', ''), text, token=token)
