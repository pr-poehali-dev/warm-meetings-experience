import json
import os
import hashlib
import secrets
from datetime import datetime, timedelta

import psycopg2
import psycopg2.extras
import requests


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def get_schema():
    return os.environ.get('MAIN_DB_SCHEMA', 'public')

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Session-Token',
    'Access-Control-Max-Age': '86400'
}

def respond(status, body):
    return {
        'statusCode': status,
        'headers': {**CORS_HEADERS, 'Content-Type': 'application/json'},
        'body': json.dumps(body, default=str)
    }

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def generate_token():
    return secrets.token_urlsafe(48)


def handler(event, context):
    """Авторизация пользователей: регистрация, вход, сброс пароля"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}

    if event.get('httpMethod') != 'POST':
        return respond(405, {'error': 'Method not allowed'})

    params = event.get('queryStringParameters') or {}
    action = params.get('action', '')
    raw_body = event.get('body') or '{}'
    body = json.loads(raw_body) if raw_body else {}

    if action == 'register':
        return handle_register(body)
    elif action == 'login':
        return handle_login(body)
    elif action == 'forgot':
        return handle_forgot(body)
    elif action == 'reset':
        return handle_reset(body)
    elif action == 'check':
        return handle_check(body)
    elif action == 'logout':
        return handle_logout(body)

    return respond(400, {'error': 'Unknown action'})


def handle_register(body):
    email = (body.get('email') or '').strip().lower()
    name = (body.get('name') or '').strip()
    phone = (body.get('phone') or '').strip()
    password = (body.get('password') or '')
    consent_pd = body.get('consent_pd', False)

    if not email or not name or not password:
        return respond(400, {'error': 'Заполните email, имя и пароль'})
    if '@' not in email:
        return respond(400, {'error': 'Некорректный email'})
    if len(password) < 6:
        return respond(400, {'error': 'Пароль должен быть не менее 6 символов'})
    if not consent_pd:
        return respond(400, {'error': 'Необходимо согласие на обработку персональных данных'})

    schema = get_schema()
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    e = email.replace("'", "''")
    cur.execute(f"SELECT id FROM {schema}.users WHERE email = '{e}'")
    existing = cur.fetchone()

    if existing:
        conn.close()
        return respond(400, {'error': 'Пользователь с таким email уже зарегистрирован'})

    n = name.replace("'", "''")
    p = phone.replace("'", "''")
    pw_hash = hash_password(password)

    cur.execute(f"""
        INSERT INTO {schema}.users (email, name, phone, password_hash)
        VALUES ('{e}', '{n}', '{p}', '{pw_hash}')
        RETURNING id, email, name, phone, created_at
    """)
    user = cur.fetchone()

    token = generate_token()
    expires = (datetime.utcnow() + timedelta(days=30)).strftime('%Y-%m-%d %H:%M:%S')
    cur.execute(f"""
        INSERT INTO {schema}.user_sessions (user_id, token, expires_at)
        VALUES ({user['id']}, '{token}', '{expires}')
    """)

    cur.execute(f"""
        INSERT INTO {schema}.user_roles (user_id, role_id, status, verified_at)
        SELECT {user['id']}, r.id, 'active', CURRENT_TIMESTAMP
        FROM {schema}.roles r WHERE r.slug = 'member'
        ON CONFLICT (user_id, role_id) DO NOTHING
    """)

    conn.commit()
    conn.close()

    send_welcome_email(email, name)

    return respond(200, {
        'user': dict(user),
        'token': token,
        'expires_at': expires
    })


def handle_login(body):
    email = (body.get('email') or '').strip().lower()
    password = (body.get('password') or '')

    if not email or not password:
        return respond(400, {'error': 'Введите email и пароль'})

    schema = get_schema()
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    e = email.replace("'", "''")
    cur.execute(f"SELECT id, email, name, phone, password_hash, is_active, created_at FROM {schema}.users WHERE email = '{e}'")
    user = cur.fetchone()

    if not user:
        conn.close()
        return respond(401, {'error': 'Неверный email или пароль'})

    if not user.get('is_active'):
        conn.close()
        return respond(403, {'error': 'Аккаунт заблокирован'})

    if not user.get('password_hash'):
        conn.close()
        return respond(401, {'error': 'Пароль не установлен. Воспользуйтесь сбросом пароля.'})

    if user['password_hash'] != hash_password(password):
        conn.close()
        return respond(401, {'error': 'Неверный email или пароль'})

    token = generate_token()
    expires = (datetime.utcnow() + timedelta(days=30)).strftime('%Y-%m-%d %H:%M:%S')
    cur.execute(f"""
        INSERT INTO {schema}.user_sessions (user_id, token, expires_at)
        VALUES ({user['id']}, '{token}', '{expires}')
    """)
    conn.commit()
    conn.close()

    user_data = {k: user[k] for k in ['id', 'email', 'name', 'phone', 'created_at']}
    return respond(200, {'user': user_data, 'token': token, 'expires_at': expires})


def handle_forgot(body):
    email = (body.get('email') or '').strip().lower()
    if not email:
        return respond(400, {'error': 'Введите email'})

    schema = get_schema()
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    e = email.replace("'", "''")
    cur.execute(f"SELECT id, name FROM {schema}.users WHERE email = '{e}' AND is_active = true")
    user = cur.fetchone()

    if not user:
        conn.close()
        return respond(200, {'message': 'Если аккаунт существует, письмо отправлено'})

    token = secrets.token_urlsafe(32)
    expires = (datetime.utcnow() + timedelta(hours=1)).strftime('%Y-%m-%d %H:%M:%S')
    cur.execute(f"""
        INSERT INTO {schema}.password_reset_tokens (user_id, token, expires_at)
        VALUES ({user['id']}, '{token}', '{expires}')
    """)
    conn.commit()
    conn.close()

    send_reset_email(email, user['name'], token)

    return respond(200, {'message': 'Если аккаунт существует, письмо отправлено'})


def handle_reset(body):
    token = (body.get('token') or '').strip()
    new_password = (body.get('password') or '')

    if not token or not new_password:
        return respond(400, {'error': 'Токен и новый пароль обязательны'})
    if len(new_password) < 6:
        return respond(400, {'error': 'Пароль должен быть не менее 6 символов'})

    schema = get_schema()
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    t = token.replace("'", "''")
    cur.execute(f"""
        SELECT id, user_id FROM {schema}.password_reset_tokens
        WHERE token = '{t}' AND used = false AND expires_at > CURRENT_TIMESTAMP
    """)
    reset = cur.fetchone()

    if not reset:
        conn.close()
        return respond(400, {'error': 'Ссылка для сброса пароля недействительна или устарела'})

    pw_hash = hash_password(new_password)
    cur.execute(f"UPDATE {schema}.users SET password_hash = '{pw_hash}', updated_at = CURRENT_TIMESTAMP WHERE id = {reset['user_id']}")
    cur.execute(f"UPDATE {schema}.password_reset_tokens SET used = true WHERE id = {reset['id']}")
    conn.commit()
    conn.close()

    return respond(200, {'message': 'Пароль успешно изменён'})


def handle_check(body):
    token = (body.get('token') or '').strip()
    if not token:
        return respond(401, {'error': 'Не авторизован'})

    schema = get_schema()
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    t = token.replace("'", "''")
    cur.execute(f"""
        SELECT u.id, u.email, u.name, u.phone, u.created_at
        FROM {schema}.user_sessions s
        JOIN {schema}.users u ON u.id = s.user_id
        WHERE s.token = '{t}' AND s.expires_at > CURRENT_TIMESTAMP AND u.is_active = true
    """)
    user = cur.fetchone()
    conn.close()

    if not user:
        return respond(401, {'error': 'Сессия истекла'})

    return respond(200, {'user': dict(user)})


def handle_logout(body):
    token = (body.get('token') or '').strip()
    if not token:
        return respond(200, {'ok': True})

    schema = get_schema()
    conn = get_conn()
    cur = conn.cursor()

    t = token.replace("'", "''")
    cur.execute(f"UPDATE {schema}.user_sessions SET expires_at = CURRENT_TIMESTAMP WHERE token = '{t}'")
    conn.commit()
    conn.close()

    return respond(200, {'ok': True})


def send_welcome_email(to_email, name):
    api_key = os.environ.get('UNISENDER_API_KEY', '')
    sender_email = os.environ.get('UNISENDER_SENDER_EMAIL', '')
    sender_name = os.environ.get('UNISENDER_SENDER_NAME', '')
    if not api_key or not sender_email:
        return

    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #fafafa;">
        <div style="background: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
            <div style="text-align: center; margin-bottom: 24px;">
                <div style="width: 56px; height: 56px; background: #dbeafe; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 28px;">👋</div>
            </div>
            <h1 style="color: #1a1a1a; font-size: 22px; text-align: center; margin: 0 0 8px;">Добро пожаловать!</h1>
            <p style="color: #666; text-align: center; margin: 0 0 28px; font-size: 15px;">
                {name}, вы успешно зарегистрировались на sparcom.ru
            </p>
            <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <p style="color: #444; font-size: 14px; line-height: 1.6; margin: 0;">
                    Теперь вам доступен личный кабинет, где вы можете просматривать свои записи на события и управлять профилем.
                </p>
            </div>
            <div style="text-align: center; margin-bottom: 20px;">
                <a href="https://sparcom.ru/account" style="display: inline-block; background: #1a1a1a; color: #ffffff; padding: 12px 32px; border-radius: 24px; text-decoration: none; font-size: 14px; font-weight: 600;">Перейти в личный кабинет</a>
            </div>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
                Это автоматическое письмо. Отвечать на него не нужно.
            </p>
        </div>
    </div>
    """

    message = {
        "recipients": [{"email": to_email, "name": name}],
        "from_email": sender_email,
        "subject": "Добро пожаловать в Sparcom!",
        "body": {"html": html},
        "track_links": 1,
        "track_read": 1,
        "tags": ["welcome"],
    }
    if sender_name:
        message["from_name"] = sender_name

    try:
        requests.post(
            "https://go2.unisender.ru/ru/transactional/api/v1/email/send.json",
            headers={"Content-Type": "application/json", "X-API-KEY": api_key},
            json={"message": message},
            timeout=10
        )
    except Exception:
        pass


def send_reset_email(to_email, name, token):
    api_key = os.environ.get('UNISENDER_API_KEY', '')
    sender_email = os.environ.get('UNISENDER_SENDER_EMAIL', '')
    sender_name = os.environ.get('UNISENDER_SENDER_NAME', '')
    if not api_key or not sender_email:
        return

    reset_url = f"https://sparcom.ru/reset-password?token={token}"

    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #fafafa;">
        <div style="background: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
            <div style="text-align: center; margin-bottom: 24px;">
                <div style="width: 56px; height: 56px; background: #fef3c7; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 28px;">🔑</div>
            </div>
            <h1 style="color: #1a1a1a; font-size: 22px; text-align: center; margin: 0 0 8px;">Сброс пароля</h1>
            <p style="color: #666; text-align: center; margin: 0 0 28px; font-size: 15px;">
                {name}, вы запросили сброс пароля на sparcom.ru
            </p>
            <div style="text-align: center; margin-bottom: 24px;">
                <a href="{reset_url}" style="display: inline-block; background: #1a1a1a; color: #ffffff; padding: 12px 32px; border-radius: 24px; text-decoration: none; font-size: 14px; font-weight: 600;">Установить новый пароль</a>
            </div>
            <p style="color: #888; font-size: 13px; text-align: center; margin: 0 0 20px;">
                Ссылка действительна 1 час. Если вы не запрашивали сброс — просто проигнорируйте это письмо.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
                Это автоматическое письмо. Отвечать на него не нужно.
            </p>
        </div>
    </div>
    """

    message = {
        "recipients": [{"email": to_email, "name": name}],
        "from_email": sender_email,
        "subject": "Сброс пароля — Sparcom",
        "body": {"html": html},
        "track_links": 0,
        "track_read": 1,
        "tags": ["password-reset"],
    }
    if sender_name:
        message["from_name"] = sender_name

    try:
        requests.post(
            "https://go2.unisender.ru/ru/transactional/api/v1/email/send.json",
            headers={"Content-Type": "application/json", "X-API-KEY": api_key},
            json={"message": message},
            timeout=10
        )
    except Exception:
        pass