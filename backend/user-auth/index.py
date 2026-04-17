import json
import os
import hashlib
import secrets
from datetime import datetime, timedelta

import bcrypt
import pyotp
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
    hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(rounds=12))
    return hashed.decode('utf-8')

def verify_password(password, stored_hash):
    if not stored_hash:
        return False
    # Плавная миграция: поддержка старых SHA256 хешей
    if stored_hash.startswith('$2b$') or stored_hash.startswith('$2a$'):
        return bcrypt.checkpw(password.encode('utf-8'), stored_hash.encode('utf-8'))
    # Старый SHA256 без соли
    return hashlib.sha256(password.encode()).hexdigest() == stored_hash

def generate_token():
    return secrets.token_urlsafe(48)

def write_audit_log(cur, schema, user_id, action, resource=None, resource_id=None, ip_address=None, details=None):
    details_str = json.dumps(details) if details else 'null'
    ip_str = f"'{ip_address}'" if ip_address else 'NULL'
    res_str = f"'{resource}'" if resource else 'NULL'
    res_id_str = str(resource_id) if resource_id else 'NULL'
    uid_str = str(user_id) if user_id else 'NULL'
    cur.execute(f"""
        INSERT INTO {schema}.audit_logs (user_id, action, resource, resource_id, ip_address, details)
        VALUES ({uid_str}, '{action}', {res_str}, {res_id_str}, {ip_str}, '{details_str}'::jsonb)
    """)


def check_device_and_notify(cur, schema, user_id, user_email, user_name, ip, user_agent):
    fp = hashlib.sha256(f"{user_agent}".encode()).hexdigest()[:32]
    safe_fp = fp.replace("'", "''")
    safe_ua = (user_agent or '')[:500].replace("'", "''")
    safe_ip = (ip or '').replace("'", "''")

    cur.execute(f"""
        SELECT id FROM {schema}.user_login_devices
        WHERE user_id = {user_id} AND device_fingerprint = '{safe_fp}'
    """)
    existing = cur.fetchone()

    if existing:
        cur.execute(f"""
            UPDATE {schema}.user_login_devices
            SET last_login_at = CURRENT_TIMESTAMP, ip_address = '{safe_ip}'
            WHERE id = {existing['id']}
        """)
        return False

    cur.execute(f"""
        INSERT INTO {schema}.user_login_devices (user_id, device_fingerprint, user_agent, ip_address)
        VALUES ({user_id}, '{safe_fp}', '{safe_ua}', '{safe_ip}')
    """)

    cur.execute(f"SELECT COUNT(*) as cnt FROM {schema}.user_login_devices WHERE user_id = {user_id}")
    cnt = cur.fetchone()['cnt']

    if cnt > 1 and user_email and '@vk.local' not in user_email:
        send_new_device_email(user_email, user_name or '', ip or 'неизвестен', user_agent or 'неизвестен')
        return True

    return False


def handler(event, context):
    """Авторизация пользователей: регистрация, вход, сброс пароля, 2FA"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}

    if event.get('httpMethod') != 'POST':
        return respond(405, {'error': 'Method not allowed'})

    params = event.get('queryStringParameters') or {}
    action = params.get('action', '')
    raw_body = event.get('body') or '{}'
    body = json.loads(raw_body) if raw_body else {}
    ip = (event.get('requestContext') or {}).get('identity', {}).get('sourceIp')
    headers_in = event.get('headers') or {}
    user_agent = headers_in.get('User-Agent') or headers_in.get('user-agent') or ''

    if action == 'register':
        return handle_register(body, ip)
    elif action == 'login':
        return handle_login(body, ip, user_agent)
    elif action == 'forgot':
        return handle_forgot(body, ip)
    elif action == 'reset':
        return handle_reset(body, ip)
    elif action == 'check':
        return handle_check(body)
    elif action == 'logout':
        return handle_logout(body, ip)
    elif action == 'vk_session':
        return handle_vk_session(body, ip, user_agent)
    elif action == 'yandex_session':
        return handle_yandex_session(body, ip, user_agent)
    elif action == 'verify_2fa':
        return handle_verify_2fa(body, ip, user_agent)

    return respond(400, {'error': 'Unknown action'})


def handle_register(body, ip=None):
    email = (body.get('email') or '').strip().lower()
    name = (body.get('name') or '').strip()
    phone = (body.get('phone') or '').strip()
    password = (body.get('password') or '')
    consent_pd = body.get('consent_pd', False)
    consent_photo = body.get('consent_photo')
    if consent_photo not in ('yes', 'no', None):
        consent_photo = None

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
    if cur.fetchone():
        conn.close()
        return respond(400, {'error': 'Пользователь с таким email уже зарегистрирован'})

    if phone:
        p_check = phone.replace("'", "''")
        cur.execute(f"SELECT id FROM {schema}.users WHERE phone = '{p_check}'")
        if cur.fetchone():
            conn.close()
            return respond(400, {'error': 'Пользователь с таким номером телефона уже зарегистрирован'})

    n = name.replace("'", "''")
    p = phone.replace("'", "''")
    pw_hash = hash_password(password)
    pw_hash_escaped = pw_hash.replace("'", "''")

    cp_val = f"'{consent_photo}'" if consent_photo else 'NULL'
    cur.execute(f"""
        INSERT INTO {schema}.users (email, name, phone, password_hash, consent_photo)
        VALUES ('{e}', '{n}', '{p}', '{pw_hash_escaped}', {cp_val})
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

    write_audit_log(cur, schema, user['id'], 'register', 'users', user['id'], ip)
    conn.commit()
    conn.close()

    send_welcome_email(email, name)

    return respond(200, {
        'user': dict(user),
        'token': token,
        'expires_at': expires
    })


def handle_login(body, ip=None, user_agent=''):
    email = (body.get('email') or '').strip().lower()
    password = (body.get('password') or '')

    if not email or not password:
        return respond(400, {'error': 'Введите email и пароль'})

    schema = get_schema()
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    e = email.replace("'", "''")
    cur.execute(f"SELECT id, email, name, phone, password_hash, is_active, vk_id, totp_enabled, totp_secret, totp_backup_codes, created_at FROM {schema}.users WHERE email = '{e}'")
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

    if not verify_password(password, user['password_hash']):
        conn.close()
        return respond(401, {'error': 'Неверный email или пароль'})

    stored = user['password_hash']
    if not (stored.startswith('$2b$') or stored.startswith('$2a$')):
        new_hash = hash_password(password)
        new_hash_escaped = new_hash.replace("'", "''")
        cur.execute(f"UPDATE {schema}.users SET password_hash = '{new_hash_escaped}' WHERE id = {user['id']}")

    if user.get('totp_enabled') and user.get('totp_secret'):
        pending_token = generate_token()
        expires_2fa = (datetime.utcnow() + timedelta(minutes=5)).strftime('%Y-%m-%d %H:%M:%S')
        cur.execute(f"""
            INSERT INTO {schema}.user_sessions (user_id, token, expires_at)
            VALUES ({user['id']}, '{pending_token}', '{expires_2fa}')
        """)
        conn.commit()
        conn.close()
        return respond(200, {'requires_2fa': True, 'pending_token': pending_token})

    token = generate_token()
    expires = (datetime.utcnow() + timedelta(days=30)).strftime('%Y-%m-%d %H:%M:%S')
    cur.execute(f"""
        INSERT INTO {schema}.user_sessions (user_id, token, expires_at)
        VALUES ({user['id']}, '{token}', '{expires}')
    """)
    check_device_and_notify(cur, schema, user['id'], user['email'], user['name'], ip, user_agent)
    write_audit_log(cur, schema, user['id'], 'login', 'users', user['id'], ip, {'method': 'email'})
    conn.commit()
    conn.close()

    user_data = {k: user[k] for k in ['id', 'email', 'name', 'phone', 'vk_id', 'created_at']}
    user_data['has_password'] = bool(user.get('password_hash'))
    return respond(200, {'user': user_data, 'token': token, 'expires_at': expires})


def handle_forgot(body, ip=None):
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
    write_audit_log(cur, schema, user['id'], 'password_reset_request', 'users', user['id'], ip)
    conn.commit()
    conn.close()

    send_reset_email(email, user['name'], token)

    return respond(200, {'message': 'Если аккаунт существует, письмо отправлено'})


def handle_reset(body, ip=None):
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
    pw_hash_escaped = pw_hash.replace("'", "''")
    cur.execute(f"UPDATE {schema}.users SET password_hash = '{pw_hash_escaped}', updated_at = CURRENT_TIMESTAMP WHERE id = {reset['user_id']}")
    cur.execute(f"UPDATE {schema}.password_reset_tokens SET used = true WHERE id = {reset['id']}")
    write_audit_log(cur, schema, reset['user_id'], 'password_reset_complete', 'users', reset['user_id'], ip)
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
        SELECT u.id, u.email, u.name, u.phone, u.vk_id, u.password_hash, u.totp_enabled, u.created_at
        FROM {schema}.user_sessions s
        JOIN {schema}.users u ON u.id = s.user_id
        WHERE s.token = '{t}' AND s.expires_at > CURRENT_TIMESTAMP AND u.is_active = true
    """)
    user = cur.fetchone()
    conn.close()

    if not user:
        return respond(401, {'error': 'Сессия истекла'})

    user_data = dict(user)
    user_data['has_password'] = bool(user_data.pop('password_hash', None))
    return respond(200, {'user': user_data})


def handle_logout(body, ip=None):
    token = (body.get('token') or '').strip()
    if not token:
        return respond(200, {'ok': True})

    schema = get_schema()
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    t = token.replace("'", "''")
    cur.execute(f"SELECT user_id FROM {schema}.user_sessions WHERE token = '{t}'")
    session = cur.fetchone()
    cur.execute(f"UPDATE {schema}.user_sessions SET expires_at = CURRENT_TIMESTAMP WHERE token = '{t}'")
    if session:
        write_audit_log(cur, schema, session['user_id'], 'logout', 'users', session['user_id'], ip)
    conn.commit()
    conn.close()

    return respond(200, {'ok': True})


def handle_vk_session(body, ip=None, user_agent=''):
    """Создаёт сессию основной системы для пользователя, вошедшего через VK."""
    vk_id = str(body.get('vk_id') or '').strip()
    user_id = body.get('user_id')
    if not vk_id and not user_id:
        return respond(400, {'error': 'vk_id или user_id обязателен'})

    schema = get_schema()
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    user = None
    if vk_id:
        safe_vk_id = vk_id.replace("'", "''")
        cur.execute(f"SELECT id, email, name, phone, telegram, vk_id, password_hash, created_at, is_active FROM {schema}.users WHERE vk_id = '{safe_vk_id}'")
        user = cur.fetchone()

    if not user and user_id:
        cur.execute(f"SELECT id, email, name, phone, telegram, vk_id, password_hash, created_at, is_active FROM {schema}.users WHERE id = {int(user_id)}")
        user = cur.fetchone()

    if not user:
        conn.close()
        return respond(404, {'error': 'Пользователь не найден'})

    if not user.get('is_active'):
        conn.close()
        return respond(403, {'error': 'Аккаунт заблокирован'})

    token = generate_token()
    expires = (datetime.utcnow() + timedelta(days=30)).strftime('%Y-%m-%d %H:%M:%S')
    cur.execute(f"""
        INSERT INTO {schema}.user_sessions (user_id, token, expires_at)
        VALUES ({user['id']}, '{token}', '{expires}')
    """)
    check_device_and_notify(cur, schema, user['id'], user['email'], user.get('name', ''), ip, user_agent)
    write_audit_log(cur, schema, user['id'], 'login', 'users', user['id'], ip, {'method': 'vk'})
    conn.commit()
    conn.close()

    user_data = {k: user[k] for k in ['id', 'email', 'name', 'phone', 'vk_id', 'created_at']}
    user_data['has_password'] = bool(user.get('password_hash'))
    return respond(200, {'user': user_data, 'token': token, 'expires_at': expires})


def handle_yandex_session(body, ip=None, user_agent=''):
    """Создаёт сессию основной системы для пользователя, вошедшего через Яндекс."""
    yandex_id = str(body.get('yandex_id') or '').strip()
    user_id = body.get('user_id')
    if not yandex_id and not user_id:
        return respond(400, {'error': 'yandex_id или user_id обязателен'})

    schema = get_schema()
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    user = None
    if yandex_id:
        safe_yandex_id = yandex_id.replace("'", "''")
        cur.execute(f"SELECT id, email, name, phone, telegram, vk_id, yandex_id, password_hash, created_at, is_active FROM {schema}.users WHERE yandex_id = '{safe_yandex_id}'")
        user = cur.fetchone()

    if not user and user_id:
        cur.execute(f"SELECT id, email, name, phone, telegram, vk_id, yandex_id, password_hash, created_at, is_active FROM {schema}.users WHERE id = {int(user_id)}")
        user = cur.fetchone()

    if not user:
        conn.close()
        return respond(404, {'error': 'Пользователь не найден'})

    if not user.get('is_active'):
        conn.close()
        return respond(403, {'error': 'Аккаунт заблокирован'})

    token = generate_token()
    expires = (datetime.utcnow() + timedelta(days=30)).strftime('%Y-%m-%d %H:%M:%S')
    cur.execute(f"""
        INSERT INTO {schema}.user_sessions (user_id, token, expires_at)
        VALUES ({user['id']}, '{token}', '{expires}')
    """)
    check_device_and_notify(cur, schema, user['id'], user['email'], user.get('name', ''), ip, user_agent)
    write_audit_log(cur, schema, user['id'], 'login', 'users', user['id'], ip, {'method': 'yandex'})
    conn.commit()
    conn.close()

    user_data = {k: user[k] for k in ['id', 'email', 'name', 'phone', 'vk_id', 'yandex_id', 'created_at']}
    user_data['has_password'] = bool(user.get('password_hash'))
    return respond(200, {'user': user_data, 'token': token, 'expires_at': expires})


def handle_verify_2fa(body, ip=None, user_agent=''):
    pending_token = (body.get('pending_token') or '').strip()
    code = str(body.get('code') or '').strip()

    if not pending_token or not code:
        return respond(400, {'error': 'Токен и код обязательны'})

    schema = get_schema()
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    t = pending_token.replace("'", "''")
    cur.execute(f"""
        SELECT s.user_id, u.totp_secret, u.totp_backup_codes, u.id, u.email, u.name, u.phone, u.vk_id, u.created_at
        FROM {schema}.user_sessions s
        JOIN {schema}.users u ON u.id = s.user_id
        WHERE s.token = '{t}' AND s.expires_at > CURRENT_TIMESTAMP AND u.is_active = true
    """)
    row = cur.fetchone()

    if not row or not row.get('totp_secret'):
        conn.close()
        return respond(400, {'error': 'Недействительный токен или истёк срок'})

    totp = pyotp.TOTP(row['totp_secret'])
    valid = totp.verify(code, valid_window=1)

    if not valid and row.get('totp_backup_codes'):
        backup = json.loads(row['totp_backup_codes']) if isinstance(row['totp_backup_codes'], str) else row['totp_backup_codes']
        if code in backup:
            valid = True
            backup.remove(code)
            backup_json = json.dumps(backup).replace("'", "''")
            cur.execute(f"UPDATE {schema}.users SET totp_backup_codes = '{backup_json}' WHERE id = {row['id']}")

    if not valid:
        conn.close()
        return respond(400, {'error': 'Неверный код'})

    cur.execute(f"UPDATE {schema}.user_sessions SET expires_at = CURRENT_TIMESTAMP WHERE token = '{t}'")

    token = generate_token()
    expires = (datetime.utcnow() + timedelta(days=30)).strftime('%Y-%m-%d %H:%M:%S')
    cur.execute(f"""
        INSERT INTO {schema}.user_sessions (user_id, token, expires_at)
        VALUES ({row['id']}, '{token}', '{expires}')
    """)
    check_device_and_notify(cur, schema, row['id'], row['email'], row.get('name', ''), ip, user_agent)
    write_audit_log(cur, schema, row['id'], 'login', 'users', row['id'], ip, {'method': 'email_2fa'})
    conn.commit()
    conn.close()

    user_data = {k: row[k] for k in ['id', 'email', 'name', 'phone', 'vk_id', 'created_at']}
    user_data['has_password'] = True
    return respond(200, {'user': user_data, 'token': token, 'expires_at': expires})


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


def send_new_device_email(to_email, name, ip, user_agent):
    api_key = os.environ.get('UNISENDER_API_KEY', '')
    sender_email = os.environ.get('UNISENDER_SENDER_EMAIL', '')
    sender_name = os.environ.get('UNISENDER_SENDER_NAME', '')
    if not api_key or not sender_email:
        return

    now_str = datetime.utcnow().strftime('%d.%m.%Y %H:%M UTC')
    short_ua = (user_agent[:80] + '...') if len(user_agent) > 80 else user_agent

    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #fafafa;">
        <div style="background: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
            <div style="text-align: center; margin-bottom: 24px;">
                <div style="width: 56px; height: 56px; background: #fee2e2; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 28px;">&#128276;</div>
            </div>
            <h1 style="color: #1a1a1a; font-size: 22px; text-align: center; margin: 0 0 8px;">Вход с нового устройства</h1>
            <p style="color: #666; text-align: center; margin: 0 0 28px; font-size: 15px;">
                {name}, в ваш аккаунт на sparcom.ru выполнен вход с нового устройства
            </p>
            <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <p style="color: #444; font-size: 14px; line-height: 1.8; margin: 0;">
                    <strong>IP-адрес:</strong> {ip}<br>
                    <strong>Устройство:</strong> {short_ua}<br>
                    <strong>Время:</strong> {now_str}
                </p>
            </div>
            <p style="color: #888; font-size: 13px; text-align: center; margin: 0 0 20px;">
                Если это были вы — проигнорируйте это письмо.<br>
                Если нет — срочно смените пароль в личном кабинете.
            </p>
            <div style="text-align: center; margin-bottom: 20px;">
                <a href="https://sparcom.ru/account" style="display: inline-block; background: #dc2626; color: #ffffff; padding: 12px 32px; border-radius: 24px; text-decoration: none; font-size: 14px; font-weight: 600;">Перейти в личный кабинет</a>
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
        "subject": "Вход с нового устройства — Sparcom",
        "body": {"html": html},
        "track_links": 0,
        "track_read": 1,
        "tags": ["new-device-login"],
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