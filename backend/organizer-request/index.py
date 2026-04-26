import json
import os
import hashlib
import secrets
import urllib.request
from datetime import datetime, timedelta

import psycopg2
import psycopg2.extras
import requests as http_requests


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def get_schema():
    return os.environ.get('MAIN_DB_SCHEMA', 'public')


def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()


def generate_token():
    return secrets.token_urlsafe(48)


def generate_password(length=10):
    alphabet = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789'
    return ''.join(secrets.choice(alphabet) for _ in range(length))


def send_telegram(text):
    token = os.environ.get('TELEGRAM_BOT_TOKEN')
    chat_id = os.environ.get('TELEGRAM_CHAT_ID')
    if not token or not chat_id:
        return
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = json.dumps({
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML"
    }).encode('utf-8')
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
    try:
        urllib.request.urlopen(req)
    except Exception:
        pass


def send_organizer_welcome_email(to_email, name, password):
    api_key = os.environ.get('UNISENDER_API_KEY', '')
    sender_email = os.environ.get('UNISENDER_SENDER_EMAIL', '')
    sender_name = os.environ.get('UNISENDER_SENDER_NAME', '')
    if not api_key or not sender_email:
        return

    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #fafafa;">
        <div style="background: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
            <div style="text-align: center; margin-bottom: 24px;">
                <div style="width: 56px; height: 56px; background: #dbeafe; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 28px;">🎉</div>
            </div>
            <h1 style="color: #1a1a1a; font-size: 22px; text-align: center; margin: 0 0 8px;">Добро пожаловать в команду!</h1>
            <p style="color: #666; text-align: center; margin: 0 0 28px; font-size: 15px;">
                {name}, ваша заявка организатора принята. Мы создали вам аккаунт на sparcom.ru
            </p>
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <p style="color: #444; font-size: 14px; line-height: 1.8; margin: 0;">
                    <strong>Ваши данные для входа:</strong><br>
                    Email: <strong>{to_email}</strong><br>
                    Пароль: <strong>{password}</strong>
                </p>
            </div>
            <p style="color: #888; font-size: 13px; text-align: center; margin: 0 0 20px;">
                Рекомендуем сменить пароль после первого входа в личном кабинете.
            </p>
            <div style="text-align: center; margin-bottom: 20px;">
                <a href="https://sparcom.ru/login" style="display: inline-block; background: #1a1a1a; color: #ffffff; padding: 12px 32px; border-radius: 24px; text-decoration: none; font-size: 14px; font-weight: 600;">Войти в личный кабинет</a>
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
        "subject": "Ваш аккаунт организатора — Sparcom",
        "body": {"html": html},
        "track_links": 1,
        "track_read": 1,
        "tags": ["organizer-welcome"],
    }
    if sender_name:
        message["from_name"] = sender_name

    try:
        http_requests.post(
            "https://go2.unisender.ru/ru/transactional/api/v1/email/send.json",
            headers={"Content-Type": "application/json", "X-API-KEY": api_key},
            json={"message": message},
            timeout=10
        )
    except Exception:
        pass


CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
}


def respond(status, body):
    return {
        'statusCode': status,
        'headers': CORS_HEADERS,
        'body': json.dumps(body, default=str)
    }


def handler(event, context):
    """Приём заявок от организаторов с автоматической регистрацией аккаунта"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}

    method = event.get('httpMethod', 'GET')

    if method == 'POST':
        return create_request(event)

    return respond(405, {'error': 'Method not allowed'})


def create_request(event):
    body = json.loads(event.get('body', '{}'))

    name = (body.get('name') or '').strip()
    telegram = (body.get('telegram') or '').strip()
    email = (body.get('email') or '').strip().lower()
    city = (body.get('city') or 'Москва').strip()
    has_own_bath = (body.get('has_own_bath') or 'no').strip()
    event_format = (body.get('event_format') or '').strip()
    additional_info = (body.get('additional_info') or '').strip()

    if not name or len(name) < 2:
        return respond(400, {'error': 'Укажите имя (минимум 2 символа)'})
    if not telegram:
        return respond(400, {'error': 'Укажите Telegram или WhatsApp'})
    if not email or '@' not in email:
        return respond(400, {'error': 'Укажите корректный email'})

    schema = get_schema()
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    e = email.replace("'", "''")
    cur.execute(f"SELECT id FROM {schema}.users WHERE email = '{e}'")
    existing_user = cur.fetchone()

    if existing_user:
        conn.close()
        return respond(400, {'error': 'Пользователь с таким email уже зарегистрирован. Войдите в аккаунт и подайте заявку из личного кабинета.'})

    password = generate_password()
    pw_hash = hash_password(password)
    n = name.replace("'", "''")
    tg = telegram.replace("'", "''")

    cur.execute(f"""
        INSERT INTO {schema}.users (email, name, telegram, password_hash)
        VALUES ('{e}', '{n}', '{tg}', '{pw_hash}')
        RETURNING id, email, name, created_at
    """)
    user = cur.fetchone()
    user_id = user['id']

    token = generate_token()
    expires = (datetime.utcnow() + timedelta(days=30)).strftime('%Y-%m-%d %H:%M:%S')
    cur.execute(f"""
        INSERT INTO {schema}.user_sessions (user_id, token, expires_at)
        VALUES ({user_id}, '{token}', '{expires}')
    """)

    cur.execute(f"""
        INSERT INTO {schema}.user_roles (user_id, role_id, status, verified_at)
        SELECT {user_id}, r.id, 'active', CURRENT_TIMESTAMP
        FROM {schema}.roles r WHERE r.slug = 'member'
        ON CONFLICT (user_id, role_id) DO NOTHING
    """)

    cur.execute(f"""
        INSERT INTO {schema}.user_roles (user_id, role_id, status)
        SELECT {user_id}, r.id, 'pending'
        FROM {schema}.roles r WHERE r.slug = 'organizer'
        ON CONFLICT (user_id, role_id) DO NOTHING
    """)

    cur.execute(f"""
        INSERT INTO {schema}.organizer_requests
            (name, telegram, email, city, has_own_bath, event_format, additional_info)
        VALUES ('{n}', '{tg}',
                '{e}', '{city.replace("'", "''")}',
                '{has_own_bath.replace("'", "''")}', '{event_format.replace("'", "''")}',
                '{additional_info.replace("'", "''")}')
        RETURNING id
    """)
    row = cur.fetchone()
    request_id = row['id'] if row else 'N/A'

    # Создаём заявку и в role_applications, чтобы она появилась в админке
    bath_map_ru = {'yes': 'Да', 'no': 'Нет', 'in_progress': 'В процессе'}
    role_msg = (
        f"Город: {city}\n"
        f"Своя баня: {bath_map_ru.get(has_own_bath, has_own_bath)}\n"
        f"Формат: {event_format or '—'}\n"
        f"Доп. инфо: {additional_info or '—'}"
    ).replace("'", "''")
    cur.execute(f"""
        INSERT INTO {schema}.role_applications (user_id, role_id, status, message)
        SELECT {user_id}, r.id, 'pending', '{role_msg}'
        FROM {schema}.roles r WHERE r.slug = 'organizer'
        ON CONFLICT DO NOTHING
    """)

    conn.commit()
    cur.close()
    conn.close()

    bath_map = {'yes': 'Да', 'no': 'Нет', 'in_progress': 'В процессе'}
    tg_text = (
        f"🔔 <b>Новая заявка организатора #{request_id}</b>\n\n"
        f"👤 <b>Имя:</b> {name}\n"
        f"📱 <b>Telegram:</b> {telegram}\n"
        f"📧 <b>Email:</b> {email}\n"
        f"📍 <b>Город:</b> {city}\n"
        f"🏠 <b>Своя баня:</b> {bath_map.get(has_own_bath, has_own_bath)}\n"
        f"📝 <b>Формат:</b> {event_format or '—'}\n"
        f"💬 <b>Доп. инфо:</b> {additional_info or '—'}\n"
        f"✅ <b>Аккаунт создан:</b> ID {user_id}"
    )
    send_telegram(tg_text)
    send_organizer_welcome_email(email, name, password)

    return respond(200, {
        'success': True,
        'id': request_id,
        'user': dict(user),
        'token': token,
        'expires_at': expires,
        'generated_password': password
    })