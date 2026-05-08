"""API персональных мини-сайтов (лендингов) пользователей.

Resources (через ?resource=...):
  • slug-check    — POST  { slug } → { available: bool, error?: str }
  • settings      — GET   (auth) → { landing | null }
  • settings      — POST  (auth) { slug?, enabled?, theme?, custom_data? }
  • public        — GET   ?slug=... → { landing } (увеличивает visits)
  • lead          — POST  ?slug=... { name, contact, message? } → { ok: true }
  • cta-click     — POST  ?slug=...
"""
import base64
import json
import os
import uuid
from datetime import datetime

import boto3

from shared import (
    CORS_HEADERS, options_response, ok, err,
    get_conn, get_schema, get_cursor,
    get_token, get_user_from_token, has_commercial_role,
    slug_validation_error,
)


# ───────────────────────── S3 ─────────────────────────

def get_s3():
    return boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
    )


def make_cdn_url(key):
    return f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"


# ───────────────────────── Telegram ─────────────────────────

def tg_send(chat_id, text):
    if not chat_id:
        return
    bot_token = os.environ.get('TELEGRAM_BOT_TOKEN', '')
    if not bot_token:
        return
    try:
        import urllib.request
        payload = json.dumps({'chat_id': chat_id, 'text': text, 'parse_mode': 'HTML'}).encode('utf-8')
        req = urllib.request.Request(
            f'https://api.telegram.org/bot{bot_token}/sendMessage',
            data=payload, headers={'Content-Type': 'application/json'},
        )
        urllib.request.urlopen(req, timeout=5)
    except Exception:
        pass


# ───────────────────────── Helpers ─────────────────────────

def serialize_landing(row):
    if not row:
        return None
    d = dict(row)
    cd = d.get('custom_data')
    if isinstance(cd, str):
        try:
            d['custom_data'] = json.loads(cd)
        except Exception:
            d['custom_data'] = {}
    return d


def get_landing_by_user(cur, schema, user_id):
    cur.execute(f"SELECT * FROM {schema}.landing_pages WHERE user_id = {int(user_id)} LIMIT 1")
    return cur.fetchone()


def get_landing_by_slug(cur, schema, slug):
    s = slug.lower().replace("'", "''")
    cur.execute(f"SELECT * FROM {schema}.landing_pages WHERE slug = '{s}' LIMIT 1")
    return cur.fetchone()


# ───────────────────────── Handlers ─────────────────────────

def handle_slug_check(event, schema):
    body = json.loads(event.get('body') or '{}')
    raw = (body.get('slug') or '').strip().lower()
    error = slug_validation_error(raw)
    if error:
        return ok({'available': False, 'error': error, 'slug': raw})

    token = get_token(event)
    conn = get_conn(); cur = get_cursor(conn)
    user = get_user_from_token(cur, schema, token) if token else None

    s = raw.replace("'", "''")
    if user:
        cur.execute(
            f"SELECT id, user_id FROM {schema}.landing_pages WHERE slug = '{s}' LIMIT 1"
        )
    else:
        cur.execute(
            f"SELECT id, user_id FROM {schema}.landing_pages WHERE slug = '{s}' LIMIT 1"
        )
    row = cur.fetchone()
    conn.close()

    if row and (not user or row['user_id'] != user['id']):
        return ok({'available': False, 'error': 'Этот адрес уже занят', 'slug': raw})

    return ok({'available': True, 'slug': raw})


def handle_get_my_landing(event, schema):
    token = get_token(event)
    if not token:
        return err('Не авторизован', 401)
    conn = get_conn(); cur = get_cursor(conn)
    user = get_user_from_token(cur, schema, token)
    if not user:
        conn.close(); return err('Не авторизован', 401)

    row = get_landing_by_user(cur, schema, user['id'])
    conn.close()
    return ok({'landing': serialize_landing(row)})


def handle_save_settings(event, schema):
    token = get_token(event)
    if not token:
        return err('Не авторизован', 401)
    body = json.loads(event.get('body') or '{}')

    conn = get_conn(); cur = get_cursor(conn)
    user = get_user_from_token(cur, schema, token)
    if not user:
        conn.close(); return err('Не авторизован', 401)

    if not has_commercial_role(cur, schema, user['id']):
        conn.close()
        return err('Визитка доступна только верифицированным партнёрам', 403)

    existing = get_landing_by_user(cur, schema, user['id'])

    # slug
    new_slug = (body.get('slug') or '').strip().lower()
    if not existing and not new_slug:
        conn.close(); return err('Укажите адрес визитки')

    if new_slug:
        verr = slug_validation_error(new_slug)
        if verr:
            conn.close(); return err(verr)
        s = new_slug.replace("'", "''")
        cur.execute(
            f"SELECT id, user_id FROM {schema}.landing_pages WHERE slug = '{s}' LIMIT 1"
        )
        taken = cur.fetchone()
        if taken and taken['user_id'] != user['id']:
            conn.close(); return err('Этот адрес уже занят')

    enabled = body.get('enabled')
    theme = (body.get('theme') or '').strip().lower() or None
    custom_data = body.get('custom_data')

    if existing:
        sets = []
        if new_slug and new_slug != existing['slug']:
            sets.append(f"slug = '{new_slug.replace(chr(39), chr(39)+chr(39))}'")
        if enabled is not None:
            sets.append(f"enabled = {bool(enabled)}")
        if theme:
            sets.append(f"theme = '{theme.replace(chr(39), chr(39)+chr(39))[:40]}'")
        if custom_data is not None:
            cd_json = json.dumps(custom_data, ensure_ascii=False).replace("'", "''")
            sets.append(f"custom_data = '{cd_json}'::jsonb")
        sets.append("updated_at = NOW()")
        cur.execute(
            f"UPDATE {schema}.landing_pages SET {', '.join(sets)} WHERE id = {existing['id']} RETURNING *"
        )
    else:
        cd_json = json.dumps(custom_data or {}, ensure_ascii=False).replace("'", "''")
        cur.execute(f"""
            INSERT INTO {schema}.landing_pages (user_id, slug, enabled, theme, custom_data)
            VALUES ({int(user['id'])}, '{new_slug}', {bool(enabled) if enabled is not None else True},
                    '{(theme or 'terracotta')}', '{cd_json}'::jsonb)
            RETURNING *
        """)
    row = cur.fetchone()
    conn.commit()
    conn.close()
    return ok({'landing': serialize_landing(row)})


def handle_public_get(event, schema):
    params = event.get('queryStringParameters') or {}
    slug = (params.get('slug') or '').strip().lower()
    if not slug:
        return err('slug required', 400)
    if slug_validation_error(slug):
        return err('Not found', 404)

    conn = get_conn(); cur = get_cursor(conn)
    row = get_landing_by_slug(cur, schema, slug)
    if not row or not row['enabled']:
        conn.close(); return err('Not found', 404)

    # Подтянем данные владельца и доступные сущности
    user_id = int(row['user_id'])
    cur.execute(
        f"SELECT id, name, email, phone, telegram, avatar_url FROM {schema}.users WHERE id = {user_id}"
    )
    owner = cur.fetchone() or {}

    # Услуги (если у пользователя есть мастер-карточка)
    services = []
    cur.execute(f"SELECT id FROM {schema}.masters WHERE user_id = {user_id} LIMIT 1")
    master_row = cur.fetchone()
    master_data = None
    if master_row:
        master_id = int(master_row['id'])
        cur.execute(
            f"SELECT * FROM {schema}.masters WHERE id = {master_id}"
        )
        master_data = cur.fetchone()
        cur.execute(
            f"SELECT id, name, description, duration_minutes, price "
            f"FROM {schema}.master_services WHERE master_id = {master_id} AND is_active = true "
            f"ORDER BY sort_order, id"
        )
        services = [dict(r) for r in cur.fetchall()]

    # Отзывы — если есть мастер
    reviews = []
    if master_data:
        cur.execute(
            f"SELECT id, client_name, rating, text, created_at FROM {schema}.master_reviews "
            f"WHERE master_id = {int(master_data['id'])} AND is_published = true "
            f"ORDER BY created_at DESC LIMIT 10"
        )
        reviews = [dict(r) for r in cur.fetchall()]

    # Бани
    cur.execute(
        f"SELECT id, name, address, lat, lng, photos FROM {schema}.baths "
        f"WHERE owner_id = {user_id} AND is_active = true LIMIT 5"
    )
    baths = [dict(r) for r in cur.fetchall()]

    # Async-инкремент visits
    try:
        cur.execute(
            f"UPDATE {schema}.landing_pages SET visits = visits + 1 WHERE id = {int(row['id'])}"
        )
        conn.commit()
    except Exception:
        pass
    conn.close()

    landing = serialize_landing(row)

    return ok({
        'landing': landing,
        'owner': dict(owner) if owner else None,
        'master': dict(master_data) if master_data else None,
        'services': services,
        'reviews': reviews,
        'baths': baths,
    })


def handle_lead(event, schema):
    params = event.get('queryStringParameters') or {}
    slug = (params.get('slug') or '').strip().lower()
    body = json.loads(event.get('body') or '{}')
    name = (body.get('name') or '').strip()[:200]
    contact = (body.get('contact') or '').strip()[:200]
    message = (body.get('message') or '').strip()[:1000]
    if not name or not contact:
        return err('Укажите имя и контакт')

    conn = get_conn(); cur = get_cursor(conn)
    row = get_landing_by_slug(cur, schema, slug)
    if not row or not row['enabled']:
        conn.close(); return err('Not found', 404)

    n = name.replace("'", "''")
    c = contact.replace("'", "''")
    m = message.replace("'", "''")
    cur.execute(f"""
        INSERT INTO {schema}.landing_leads (landing_id, name, contact, message)
        VALUES ({int(row['id'])}, '{n}', '{c}', '{m}')
    """)

    # Уведомление владельцу
    cur.execute(f"SELECT name, email, telegram FROM {schema}.users WHERE id = {int(row['user_id'])}")
    owner = cur.fetchone()
    conn.commit()
    conn.close()

    if owner and owner.get('telegram'):
        tg_handle = (owner['telegram'] or '').lstrip('@')
        tg_text = (
            f"📨 Заявка с вашей визитки <b>sparcom.ru/{row['slug']}</b>\n\n"
            f"<b>Имя:</b> {name}\n<b>Контакт:</b> {contact}\n"
            + (f"<b>Сообщение:</b> {message}\n" if message else '')
        )
        # отправляем админу проекта (не приватный chat_id владельца — нет связи)
        tg_send(os.environ.get('TELEGRAM_CHAT_ID', ''), tg_text + f"\nTelegram владельца: @{tg_handle}")

    return ok({'ok': True})


def handle_cta_click(event, schema):
    params = event.get('queryStringParameters') or {}
    slug = (params.get('slug') or '').strip().lower()
    if not slug or slug_validation_error(slug):
        return ok({'ok': True})
    conn = get_conn(); cur = get_cursor(conn)
    s = slug.replace("'", "''")
    cur.execute(
        f"UPDATE {schema}.landing_pages SET cta_clicks = cta_clicks + 1 WHERE slug = '{s}'"
    )
    conn.commit()
    conn.close()
    return ok({'ok': True})


def handle_upload(event, schema):
    token = get_token(event)
    if not token:
        return err('Не авторизован', 401)
    body = json.loads(event.get('body') or '{}')
    file_data = body.get('file') or ''
    filename = body.get('filename') or 'photo.jpg'
    if not file_data:
        return err('Файл не передан')

    conn = get_conn(); cur = get_cursor(conn)
    user = get_user_from_token(cur, schema, token)
    if not user:
        conn.close(); return err('Не авторизован', 401)
    conn.close()

    if 'base64,' in file_data:
        b64 = file_data.split('base64,', 1)[1]
    else:
        b64 = file_data
    raw = base64.b64decode(b64)
    if len(raw) > 10 * 1024 * 1024:
        return err('Фото не должно превышать 10 МБ')

    ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else 'jpg'
    if ext not in ('jpg', 'jpeg', 'png', 'webp', 'gif'):
        ext = 'jpg'
    mime_map = {'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png', 'webp': 'image/webp', 'gif': 'image/gif'}
    mime = mime_map.get(ext, 'image/jpeg')

    uid = uuid.uuid4().hex[:10]
    date_prefix = datetime.now().strftime('%Y%m')
    key = f"landings/{int(user['id'])}/{date_prefix}/{uid}.{ext}"
    get_s3().put_object(Bucket='files', Key=key, Body=raw, ContentType=mime)
    return ok({'url': make_cdn_url(key), 'key': key})


# ───────────────────────── Entry ─────────────────────────

def handler(event, context):
    """API персональных мини-сайтов: проверка адреса, настройки, публичный просмотр, заявки."""
    if event.get('httpMethod') == 'OPTIONS':
        return options_response()

    method = event.get('httpMethod', 'GET')
    params = event.get('queryStringParameters') or {}
    resource = params.get('resource', 'public')
    schema = get_schema()

    if resource == 'slug-check' and method == 'POST':
        return handle_slug_check(event, schema)
    if resource == 'settings' and method == 'GET':
        return handle_get_my_landing(event, schema)
    if resource == 'settings' and method == 'POST':
        return handle_save_settings(event, schema)
    if resource == 'upload' and method == 'POST':
        return handle_upload(event, schema)
    if resource == 'lead' and method == 'POST':
        return handle_lead(event, schema)
    if resource == 'cta-click' and method == 'POST':
        return handle_cta_click(event, schema)
    if resource == 'public' and method == 'GET':
        return handle_public_get(event, schema)

    return err('Unknown resource or method', 400)
