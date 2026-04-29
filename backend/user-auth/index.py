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
    elif action == 'login_2fa_verify_email':
        return handle_login_2fa_verify_email(body, ip, user_agent)
    elif action == 'login_2fa_resend_email':
        return handle_login_2fa_resend_email(body, ip, user_agent)
    elif action == 'login_2fa_start_oauth':
        return handle_login_2fa_start_oauth(body, ip, user_agent)
    elif action == 'login_2fa_verify_oauth':
        return handle_login_2fa_verify_oauth(body, ip, user_agent)

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
    if len(password) < 8:
        return respond(400, {'error': 'Пароль должен быть не менее 8 символов'})
    if not consent_pd:
        return respond(400, {'error': 'Необходимо согласие на обработку персональных данных'})

    schema = get_schema()
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    e = email.replace("'", "''")
    cur.execute(f"SELECT id FROM {schema}.users WHERE LOWER(email) = LOWER('{e}')")
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
    cur.execute(f"SELECT id, email, name, phone, password_hash, is_active, vk_id, yandex_id, totp_enabled, totp_secret, totp_backup_codes, login_2fa_method, created_at FROM {schema}.users WHERE LOWER(email) = LOWER('{e}')")
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
        expires_2fa = (datetime.utcnow() + timedelta(minutes=10)).strftime('%Y-%m-%d %H:%M:%S')
        cur.execute(f"""
            INSERT INTO {schema}.user_sessions (user_id, token, expires_at)
            VALUES ({user['id']}, '{pending_token}', '{expires_2fa}')
        """)
        conn.commit()
        conn.close()
        return respond(200, {'requires_2fa': True, 'method': 'totp', 'pending_token': pending_token})

    # Гибкая 2FA (email / vk / yandex) — определяется полем login_2fa_method,
    # либо автоматически требуется для привилегированных ролей
    required_method = effective_login_2fa_method(cur, schema, user)
    if required_method:
        pending_token = generate_token()
        expires_2fa = (datetime.utcnow() + timedelta(minutes=10)).strftime('%Y-%m-%d %H:%M:%S')
        cur.execute(f"""
            INSERT INTO {schema}.user_sessions (user_id, token, expires_at)
            VALUES ({user['id']}, '{pending_token}', '{expires_2fa}')
        """)
        email_masked = None
        if required_method == 'email':
            email_masked = create_and_send_login_email_code(cur, schema, user, pending_token, ip, user_agent)
        log_login_2fa(cur, schema, user['id'], required_method, 'login_required', True, ip, user_agent)
        conn.commit()
        conn.close()
        return respond(200, {
            'requires_2fa': True,
            'method': required_method,
            'pending_token': pending_token,
            'email_masked': email_masked,
            'has_vk': bool(user.get('vk_id')),
            'has_yandex': bool(user.get('yandex_id')),
        })

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
    cur.execute(f"SELECT id, name FROM {schema}.users WHERE LOWER(email) = LOWER('{e}') AND is_active = true")
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
    if len(new_password) < 8:
        return respond(400, {'error': 'Пароль должен быть не менее 8 символов'})

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
        SELECT u.id, u.email, u.name, u.phone, u.vk_id, u.password_hash, u.totp_enabled, u.email_verified, u.created_at
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
    user_data['email_verified'] = bool(user_data.get('email_verified'))
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
    vk_name = str(body.get('name') or '').strip()
    vk_avatar = str(body.get('avatar_url') or '').strip()
    if not vk_id and not user_id:
        return respond(400, {'error': 'vk_id или user_id обязателен'})

    schema = get_schema()
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    user = None
    if vk_id:
        safe_vk_id = vk_id.replace("'", "''")
        cur.execute(f"SELECT id, email, name, phone, telegram, vk_id, password_hash, email_verified, created_at, is_active FROM {schema}.users WHERE vk_id = '{safe_vk_id}'")
        user = cur.fetchone()

    if not user and user_id:
        cur.execute(f"SELECT id, email, name, phone, telegram, vk_id, password_hash, email_verified, created_at, is_active FROM {schema}.users WHERE id = {int(user_id)}")
        user = cur.fetchone()

    if not user:
        conn.close()
        return respond(404, {'error': 'Пользователь не найден'})

    if not user.get('is_active'):
        conn.close()
        return respond(403, {'error': 'Аккаунт заблокирован'})

    # Обновляем имя и аватар из VK, если в БД они пустые
    if vk_name and not user.get('name'):
        safe_name = vk_name.replace("'", "''")
        cur.execute(f"UPDATE {schema}.users SET name = '{safe_name}', updated_at = NOW() WHERE id = {user['id']}")
        user['name'] = vk_name
    if vk_avatar and not user.get('avatar_url'):
        safe_avatar = vk_avatar.replace("'", "''")
        cur.execute(f"UPDATE {schema}.users SET avatar_url = '{safe_avatar}', updated_at = NOW() WHERE id = {user['id']}")

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
    user_data['email_verified'] = bool(user.get('email_verified'))
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
        cur.execute(f"SELECT id, email, name, phone, telegram, vk_id, yandex_id, password_hash, email_verified, created_at, is_active FROM {schema}.users WHERE yandex_id = '{safe_yandex_id}'")
        user = cur.fetchone()

    if not user and user_id:
        cur.execute(f"SELECT id, email, name, phone, telegram, vk_id, yandex_id, password_hash, email_verified, created_at, is_active FROM {schema}.users WHERE id = {int(user_id)}")
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
    user_data['email_verified'] = bool(user.get('email_verified'))
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


# =============================================================================
# LOGIN 2FA (email / vk / yandex) — гибкая двухфакторка при входе
# =============================================================================

PRIVILEGED_ROLE_SLUGS = ('parmaster', 'partner', 'admin', 'organizer')
LOGIN_2FA_CODE_TTL_MIN = 10
LOGIN_2FA_MAX_ATTEMPTS = 5
LOGIN_2FA_RESEND_COOLDOWN = 60

VK_AUTHORIZE_URL = "https://id.vk.com/authorize"
VK_TOKEN_URL = "https://id.vk.com/oauth2/auth"
VK_USER_INFO_URL = "https://id.vk.com/oauth2/user_info"
YANDEX_AUTH_URL = "https://oauth.yandex.ru/authorize"
YANDEX_TOKEN_URL = "https://oauth.yandex.ru/token"
YANDEX_USER_INFO_URL = "https://login.yandex.ru/info"


def mask_email_login(email):
    if not email or '@' not in email:
        return email or ''
    local, domain = email.split('@', 1)
    if len(local) <= 2:
        masked = local[0] + '*'
    else:
        masked = local[0] + '*' * max(1, len(local) - 2) + local[-1]
    return f"{masked}@{domain}"


def hash_code_login(code):
    return hashlib.sha256(code.encode('utf-8')).hexdigest()


def generate_login_code():
    return f"{secrets.randbelow(900000) + 100000:06d}"


def log_login_2fa(cur, schema, user_id, method, event, success, ip, user_agent, details=None):
    det = json.dumps(details or {}).replace("'", "''")
    ip_val = f"'{ip}'" if ip else 'NULL'
    ua = (user_agent or '')[:500].replace("'", "''")
    uid_val = str(user_id) if user_id else 'NULL'
    cur.execute(f"""
        INSERT INTO {schema}.login_2fa_log
            (user_id, method, event, success, ip_address, user_agent, details)
        VALUES ({uid_val}, '{method}', '{event}', {str(bool(success)).upper()}, {ip_val}, '{ua}', '{det}'::jsonb)
    """)


def has_privileged_role(cur, schema, user_id):
    slugs = ",".join(f"'{s}'" for s in PRIVILEGED_ROLE_SLUGS)
    cur.execute(f"""
        SELECT 1 FROM {schema}.user_roles ur
        JOIN {schema}.roles r ON r.id = ur.role_id
        WHERE ur.user_id = {user_id}
          AND ur.status = 'active'
          AND r.slug IN ({slugs})
        LIMIT 1
    """)
    return cur.fetchone() is not None


def effective_login_2fa_method(cur, schema, user):
    """Возвращает 'email' | 'vk' | 'yandex' если 2FA при входе требуется, иначе None."""
    chosen = (user.get('login_2fa_method') or '').strip().lower()
    if chosen in ('email', 'vk', 'yandex'):
        # Проверим, что провайдер привязан; если нет — упадём на email
        if chosen == 'vk' and not user.get('vk_id'):
            return 'email'
        if chosen == 'yandex' and not user.get('yandex_id'):
            return 'email'
        return chosen
    # Если пользователь ничего не выбрал, но имеет привилегированную роль — форсируем email
    if has_privileged_role(cur, schema, user['id']):
        return 'email'
    return None


def load_pending_session(cur, schema, pending_token):
    t = pending_token.replace("'", "''")
    cur.execute(f"""
        SELECT s.user_id, s.token, s.expires_at,
               u.id, u.email, u.name, u.phone, u.vk_id, u.yandex_id,
               u.login_2fa_method, u.created_at
        FROM {schema}.user_sessions s
        JOIN {schema}.users u ON u.id = s.user_id
        WHERE s.token = '{t}' AND s.expires_at > CURRENT_TIMESTAMP AND u.is_active = true
    """)
    return cur.fetchone()


def finalize_login_session(cur, schema, user_row, method_used, ip, user_agent, pending_token):
    t = pending_token.replace("'", "''")
    cur.execute(f"UPDATE {schema}.user_sessions SET expires_at = CURRENT_TIMESTAMP WHERE token = '{t}'")

    token = generate_token()
    expires = (datetime.utcnow() + timedelta(days=30)).strftime('%Y-%m-%d %H:%M:%S')
    cur.execute(f"""
        INSERT INTO {schema}.user_sessions (user_id, token, expires_at)
        VALUES ({user_row['id']}, '{token}', '{expires}')
    """)
    check_device_and_notify(cur, schema, user_row['id'], user_row['email'], user_row.get('name', ''), ip, user_agent)
    write_audit_log(cur, schema, user_row['id'], 'login', 'users', user_row['id'], ip, {'method': method_used})

    user_data = {
        'id': user_row['id'],
        'email': user_row['email'],
        'name': user_row['name'],
        'phone': user_row.get('phone'),
        'vk_id': user_row.get('vk_id'),
        'yandex_id': user_row.get('yandex_id'),
        'created_at': user_row.get('created_at'),
        'has_password': True,
    }
    return user_data, token, expires


def send_login_2fa_email(to_email, name, code, ip, ua):
    api_key = os.environ.get('UNISENDER_API_KEY', '')
    sender_email = os.environ.get('UNISENDER_SENDER_EMAIL', '')
    sender_name = os.environ.get('UNISENDER_SENDER_NAME', '')
    if not api_key or not sender_email:
        return False
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #fafafa;">
        <div style="background: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
            <div style="text-align: center; margin-bottom: 24px;">
                <div style="width: 56px; height: 56px; background: #e0f2fe; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 28px;">🔐</div>
            </div>
            <h1 style="color: #1a1a1a; font-size: 22px; text-align: center; margin: 0 0 8px;">Код для входа в аккаунт</h1>
            <p style="color: #666; text-align: center; margin: 0 0 24px; font-size: 15px;">
                Здравствуйте, {name}! Вы пытаетесь войти в свой аккаунт на sparcom.ru
            </p>
            <div style="background: #f8f9fa; border-radius: 8px; padding: 24px; margin-bottom: 20px; text-align: center;">
                <p style="color: #666; font-size: 13px; margin: 0 0 10px; text-transform: uppercase; letter-spacing: 1px;">Код подтверждения</p>
                <p style="color: #1a1a1a; font-size: 32px; font-weight: 700; letter-spacing: 8px; margin: 0; font-family: 'Courier New', monospace;">{code}</p>
            </div>
            <p style="color: #888; font-size: 13px; text-align: center; margin: 0 0 20px;">
                Код действует {LOGIN_2FA_CODE_TTL_MIN} минут. IP: {ip or 'неизвестен'}. Если вы не пытались войти — немедленно смените пароль.
            </p>
        </div>
    </div>
    """
    message = {
        "recipients": [{"email": to_email, "name": name}],
        "from_email": sender_email,
        "subject": "Код для входа — Sparcom",
        "body": {"html": html},
        "track_links": 0,
        "track_read": 1,
        "tags": ["login-2fa"],
    }
    if sender_name:
        message["from_name"] = sender_name
    try:
        r = requests.post(
            "https://go2.unisender.ru/ru/transactional/api/v1/email/send.json",
            headers={"Content-Type": "application/json", "X-API-KEY": api_key},
            json={"message": message},
            timeout=10,
        )
        return r.status_code < 400
    except Exception:
        return False


def create_and_send_login_email_code(cur, schema, user_row, pending_token, ip, user_agent):
    """Создаёт код и отправляет его на email. Используется внутри login и resend."""
    code = generate_login_code()
    code_hash = hash_code_login(code)
    expires = (datetime.utcnow() + timedelta(minutes=LOGIN_2FA_CODE_TTL_MIN)).strftime('%Y-%m-%d %H:%M:%S')
    pt = pending_token.replace("'", "''")
    masked = mask_email_login(user_row['email'])
    m = masked.replace("'", "''")
    ip_val = f"'{ip}'" if ip else 'NULL'
    ua = (user_agent or '')[:500].replace("'", "''")
    cur.execute(f"""
        INSERT INTO {schema}.login_2fa_email_codes
            (user_id, pending_token, code_hash, email_masked, ip_address, user_agent, expires_at)
        VALUES ({user_row['id']}, '{pt}', '{code_hash}', '{m}', {ip_val}, '{ua}', '{expires}')
    """)
    send_login_2fa_email(user_row['email'], user_row.get('name') or '', code, ip, user_agent)
    return masked


def handle_login_2fa_verify_email(body, ip=None, user_agent=''):
    pending_token = (body.get('pending_token') or '').strip()
    code = (body.get('code') or '').strip()
    if not pending_token or not code:
        return respond(400, {'error': 'Токен и код обязательны'})
    if not code.isdigit() or len(code) != 6:
        return respond(400, {'error': 'Код должен состоять из 6 цифр'})

    schema = get_schema()
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    user_row = load_pending_session(cur, schema, pending_token)
    if not user_row:
        conn.close()
        return respond(400, {'error': 'Сессия истекла, войдите заново'})

    pt = pending_token.replace("'", "''")
    cur.execute(f"""
        SELECT id, code_hash, attempts, expires_at, verified_at
        FROM {schema}.login_2fa_email_codes
        WHERE pending_token = '{pt}' AND user_id = {user_row['id']}
        ORDER BY id DESC LIMIT 1
    """)
    code_row = cur.fetchone()
    if not code_row:
        conn.close()
        return respond(400, {'error': 'Код не найден. Запросите код заново.'})
    if code_row['verified_at']:
        conn.close()
        return respond(400, {'error': 'Код уже использован'})
    if code_row['expires_at'] and code_row['expires_at'] < datetime.utcnow():
        conn.close()
        return respond(400, {'error': 'Код истёк. Запросите код заново.'})
    if code_row['attempts'] >= LOGIN_2FA_MAX_ATTEMPTS:
        log_login_2fa(cur, schema, user_row['id'], 'email', 'too_many_attempts', False, ip, user_agent)
        conn.commit()
        conn.close()
        return respond(429, {'error': 'Слишком много попыток. Запросите код заново.'})

    if hash_code_login(code) != code_row['code_hash']:
        cur.execute(f"UPDATE {schema}.login_2fa_email_codes SET attempts = attempts + 1 WHERE id = {code_row['id']}")
        log_login_2fa(cur, schema, user_row['id'], 'email', 'verify_failed', False, ip, user_agent)
        conn.commit()
        left = LOGIN_2FA_MAX_ATTEMPTS - (code_row['attempts'] + 1)
        conn.close()
        return respond(400, {'error': 'Неверный код', 'attempts_left': max(0, left)})

    cur.execute(f"UPDATE {schema}.login_2fa_email_codes SET verified_at = CURRENT_TIMESTAMP WHERE id = {code_row['id']}")
    log_login_2fa(cur, schema, user_row['id'], 'email', 'verify_success', True, ip, user_agent)
    user_data, token, expires = finalize_login_session(cur, schema, user_row, 'email_code', ip, user_agent, pending_token)
    conn.commit()
    conn.close()
    return respond(200, {'user': user_data, 'token': token, 'expires_at': expires})


def handle_login_2fa_resend_email(body, ip=None, user_agent=''):
    pending_token = (body.get('pending_token') or '').strip()
    if not pending_token:
        return respond(400, {'error': 'Токен обязателен'})

    schema = get_schema()
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    user_row = load_pending_session(cur, schema, pending_token)
    if not user_row:
        conn.close()
        return respond(400, {'error': 'Сессия истекла, войдите заново'})

    pt = pending_token.replace("'", "''")
    cur.execute(f"""
        SELECT created_at FROM {schema}.login_2fa_email_codes
        WHERE pending_token = '{pt}' AND user_id = {user_row['id']}
        ORDER BY created_at DESC LIMIT 1
    """)
    last = cur.fetchone()
    if last:
        delta = (datetime.utcnow() - last['created_at']).total_seconds()
        if delta < LOGIN_2FA_RESEND_COOLDOWN:
            wait = int(LOGIN_2FA_RESEND_COOLDOWN - delta)
            conn.close()
            return respond(429, {'error': f'Повторная отправка доступна через {wait} сек.'})

    cur.execute(f"""
        UPDATE {schema}.login_2fa_email_codes SET expires_at = CURRENT_TIMESTAMP
        WHERE pending_token = '{pt}' AND user_id = {user_row['id']}
          AND verified_at IS NULL AND expires_at > CURRENT_TIMESTAMP
    """)
    masked = create_and_send_login_email_code(cur, schema, user_row, pending_token, ip, user_agent)
    log_login_2fa(cur, schema, user_row['id'], 'email', 'code_resent', True, ip, user_agent)
    conn.commit()
    conn.close()
    return respond(200, {
        'message': 'Код отправлен повторно',
        'email_masked': masked,
        'code_ttl_minutes': LOGIN_2FA_CODE_TTL_MIN,
    })


def build_vk_login_auth_url(client_id, redirect_uri, state, code_challenge):
    from urllib.parse import urlencode
    return f"{VK_AUTHORIZE_URL}?" + urlencode({
        'client_id': client_id,
        'redirect_uri': redirect_uri,
        'response_type': 'code',
        'scope': '',
        'state': state,
        'code_challenge': code_challenge,
        'code_challenge_method': 'S256',
    })


def build_yandex_login_auth_url(client_id, redirect_uri, state):
    from urllib.parse import urlencode
    return f"{YANDEX_AUTH_URL}?" + urlencode({
        'client_id': client_id,
        'redirect_uri': redirect_uri,
        'response_type': 'code',
        'state': state,
        'force_confirm': 'yes',
    })


def handle_login_2fa_start_oauth(body, ip=None, user_agent=''):
    pending_token = (body.get('pending_token') or '').strip()
    provider = (body.get('provider') or '').strip().lower()
    if not pending_token or provider not in ('vk', 'yandex'):
        return respond(400, {'error': 'Неверные параметры'})

    schema = get_schema()
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    user_row = load_pending_session(cur, schema, pending_token)
    if not user_row:
        conn.close()
        return respond(400, {'error': 'Сессия истекла, войдите заново'})

    state = secrets.token_urlsafe(24)
    code_verifier_val = 'NULL'

    if provider == 'vk':
        client_id = os.environ.get('VK_CLIENT_ID', '')
        redirect_uri = os.environ.get('VK_REDIRECT_URI', '')
        if not client_id or not redirect_uri:
            conn.close()
            return respond(500, {'error': 'VK не настроен'})
        import base64 as b64
        verifier = b64.urlsafe_b64encode(secrets.token_bytes(32)).decode('utf-8').rstrip('=')
        challenge = b64.urlsafe_b64encode(hashlib.sha256(verifier.encode('utf-8')).digest()).decode('utf-8').rstrip('=')
        auth_url = build_vk_login_auth_url(client_id, redirect_uri, state, challenge)
        code_verifier_val = f"'{verifier}'"
        resp_body = {'auth_url': auth_url, 'state': state, 'code_verifier': verifier, 'provider': 'vk'}
    else:
        client_id = os.environ.get('YANDEX_CLIENT_ID', '')
        redirect_uri = os.environ.get('YANDEX_REDIRECT_URI', '')
        if not client_id or not redirect_uri:
            conn.close()
            return respond(500, {'error': 'Яндекс не настроен'})
        auth_url = build_yandex_login_auth_url(client_id, redirect_uri, state)
        resp_body = {'auth_url': auth_url, 'state': state, 'provider': 'yandex'}

    pt = pending_token.replace("'", "''")
    s = state.replace("'", "''")
    expires = (datetime.utcnow() + timedelta(minutes=LOGIN_2FA_CODE_TTL_MIN)).strftime('%Y-%m-%d %H:%M:%S')
    ip_val = f"'{ip}'" if ip else 'NULL'
    ua = (user_agent or '')[:500].replace("'", "''")
    cur.execute(f"""
        INSERT INTO {schema}.login_2fa_oauth_states
            (user_id, pending_token, provider, state, code_verifier, ip_address, user_agent, expires_at)
        VALUES ({user_row['id']}, '{pt}', '{provider}', '{s}', {code_verifier_val}, {ip_val}, '{ua}', '{expires}')
    """)
    log_login_2fa(cur, schema, user_row['id'], provider, 'oauth_started', True, ip, user_agent)
    conn.commit()
    conn.close()
    return respond(200, resp_body)


def exchange_vk_login_code(code, code_verifier, device_id, redirect_uri):
    client_id = os.environ.get('VK_CLIENT_ID', '')
    client_secret = os.environ.get('VK_CLIENT_SECRET', '')
    if not client_id or not client_secret:
        return None, 'VK не настроен'
    data = {
        'grant_type': 'authorization_code', 'code': code, 'redirect_uri': redirect_uri,
        'client_id': client_id, 'client_secret': client_secret, 'code_verifier': code_verifier,
    }
    if device_id:
        data['device_id'] = device_id
    try:
        r = requests.post(VK_TOKEN_URL, data=data, timeout=10)
        tok = r.json()
    except Exception:
        return None, 'Ошибка запроса к VK'
    if 'error' in tok:
        return None, tok.get('error_description') or 'Не удалось авторизоваться через VK'
    at = tok.get('access_token')
    if not at:
        return None, 'VK не вернул access_token'
    try:
        ur = requests.post(VK_USER_INFO_URL, data={'access_token': at, 'client_id': client_id}, timeout=10)
        info = ur.json().get('user') or {}
    except Exception:
        return None, 'Не удалось получить профиль VK'
    vid = str(info.get('user_id') or info.get('id') or '')
    if not vid:
        return None, 'VK не вернул идентификатор'
    return {'vk_id': vid}, None


def exchange_yandex_login_code(code):
    client_id = os.environ.get('YANDEX_CLIENT_ID', '')
    client_secret = os.environ.get('YANDEX_CLIENT_SECRET', '')
    if not client_id or not client_secret:
        return None, 'Яндекс не настроен'
    data = {
        'grant_type': 'authorization_code', 'code': code,
        'client_id': client_id, 'client_secret': client_secret,
    }
    try:
        r = requests.post(YANDEX_TOKEN_URL, data=data, timeout=10)
        tok = r.json()
    except Exception:
        return None, 'Ошибка запроса к Яндексу'
    if 'error' in tok:
        return None, tok.get('error_description') or 'Не удалось авторизоваться через Яндекс'
    at = tok.get('access_token')
    if not at:
        return None, 'Яндекс не вернул access_token'
    try:
        ur = requests.get(YANDEX_USER_INFO_URL, headers={'Authorization': f'OAuth {at}'}, timeout=10)
        info = ur.json()
    except Exception:
        return None, 'Не удалось получить профиль Яндекса'
    yid = str(info.get('id') or '')
    if not yid:
        return None, 'Яндекс не вернул идентификатор'
    return {'yandex_id': yid}, None


def handle_login_2fa_verify_oauth(body, ip=None, user_agent=''):
    pending_token = (body.get('pending_token') or '').strip()
    provider = (body.get('provider') or '').strip().lower()
    code = (body.get('code') or '').strip()
    state = (body.get('state') or '').strip()
    code_verifier = (body.get('code_verifier') or '').strip()
    device_id = (body.get('device_id') or '').strip()

    if not pending_token or provider not in ('vk', 'yandex') or not code or not state:
        return respond(400, {'error': 'Неверные параметры'})

    schema = get_schema()
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    user_row = load_pending_session(cur, schema, pending_token)
    if not user_row:
        conn.close()
        return respond(400, {'error': 'Сессия истекла, войдите заново'})

    pt = pending_token.replace("'", "''")
    s = state.replace("'", "''")
    cur.execute(f"""
        SELECT id, code_verifier, used_at, expires_at
        FROM {schema}.login_2fa_oauth_states
        WHERE pending_token = '{pt}' AND state = '{s}' AND provider = '{provider}' AND user_id = {user_row['id']}
        ORDER BY id DESC LIMIT 1
    """)
    st_row = cur.fetchone()
    if not st_row:
        log_login_2fa(cur, schema, user_row['id'], provider, 'state_mismatch', False, ip, user_agent)
        conn.commit()
        conn.close()
        return respond(400, {'error': 'Неверный state. Повторите попытку.'})
    if st_row['used_at']:
        conn.close()
        return respond(400, {'error': 'State уже использован'})
    if st_row['expires_at'] and st_row['expires_at'] < datetime.utcnow():
        conn.close()
        return respond(400, {'error': 'Срок действия истёк. Повторите попытку.'})

    # Обмен кода на токен и ID
    if provider == 'vk':
        verifier = code_verifier or (st_row['code_verifier'] or '')
        if not verifier:
            conn.close()
            return respond(400, {'error': 'code_verifier отсутствует'})
        redirect_uri = os.environ.get('VK_REDIRECT_URI', '')
        result, err = exchange_vk_login_code(code, verifier, device_id, redirect_uri)
        expected_id = (user_row.get('vk_id') or '').strip()
        got_id = result.get('vk_id') if result else ''
        id_field = 'vk_id'
    else:
        result, err = exchange_yandex_login_code(code)
        expected_id = (user_row.get('yandex_id') or '').strip()
        got_id = result.get('yandex_id') if result else ''
        id_field = 'yandex_id'

    if err or not result:
        log_login_2fa(cur, schema, user_row['id'], provider, 'exchange_failed', False, ip, user_agent, {'error': err})
        conn.commit()
        conn.close()
        return respond(400, {'error': err or 'Не удалось подтвердить'})

    if not expected_id or str(expected_id) != str(got_id):
        log_login_2fa(cur, schema, user_row['id'], provider, 'id_mismatch', False, ip, user_agent,
                      {'expected': str(expected_id), 'got': str(got_id)})
        conn.commit()
        conn.close()
        return respond(400, {'error': f'{provider.upper()}-аккаунт не совпадает с привязанным к профилю'})

    cur.execute(f"UPDATE {schema}.login_2fa_oauth_states SET used_at = CURRENT_TIMESTAMP WHERE id = {st_row['id']}")
    log_login_2fa(cur, schema, user_row['id'], provider, 'verify_success', True, ip, user_agent)
    _ = id_field  # reserved
    user_data, token, expires = finalize_login_session(cur, schema, user_row, f'{provider}_2fa', ip, user_agent, pending_token)
    conn.commit()
    conn.close()
    return respond(200, {'user': user_data, 'token': token, 'expires_at': expires})


# =============================================================================


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