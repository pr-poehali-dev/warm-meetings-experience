import json
import os
import re
import hashlib
import secrets
import psycopg2
import psycopg2.extras
import requests

def get_conn():
    """Подключение к БД"""
    return psycopg2.connect(os.environ['DATABASE_URL'])

def get_schema():
    return os.environ.get('MAIN_DB_SCHEMA', 'public')

def slugify(text):
    """Генерация slug из текста"""
    text = text.lower().strip()
    translit = {
        'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'yo','ж':'zh',
        'з':'z','и':'i','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o',
        'п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f','х':'kh','ц':'ts',
        'ч':'ch','ш':'sh','щ':'shch','ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya',
        ' ':'-'
    }
    result = ''
    for char in text:
        result += translit.get(char, char)
    result = re.sub(r'[^a-z0-9-]', '', result)
    result = re.sub(r'-+', '-', result).strip('-')
    return result

def handler(event, context):
    """API для управления событиями и записями на них"""
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Authorization',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }

    headers = {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'}
    method = event.get('httpMethod', 'GET')
    params = event.get('queryStringParameters') or {}
    resource = params.get('resource', 'events')
    schema = get_schema()

    if resource == 'signups':
        return handle_signups(event, method, params, schema, headers)

    return handle_events(event, method, params, schema, headers)


def handle_events(event, method, params, schema, headers):
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    if method == 'GET':
        slug = params.get('slug')
        if slug:
            if slug.startswith('event-') and slug[6:].isdigit():
                cur.execute(
                    f"SELECT * FROM {schema}.events WHERE id = {slug[6:]} AND is_visible = true"
                )
            else:
                cur.execute(
                    f"SELECT * FROM {schema}.events WHERE slug = '{slug}' AND is_visible = true"
                )
            row = cur.fetchone()
            conn.close()
            if not row:
                return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'Not found'})}
            return {'statusCode': 200, 'headers': headers, 'body': json.dumps(serialize_event(row), default=str)}

        only_visible = params.get('visible', 'true')
        where = f"WHERE is_visible = true" if only_visible == 'true' else ""
        order = "ORDER BY event_date ASC, start_time ASC"
        cur.execute(f"SELECT * FROM {schema}.events {where} {order}")
        rows = cur.fetchall()
        conn.close()
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps([serialize_event(r) for r in rows], default=str)
        }

    if method == 'POST':
        body = json.loads(event.get('body', '{}'))
        slug = body.get('slug') or slugify(body.get('title', ''))
        base_slug = slug
        counter = 1
        while True:
            cur.execute(f"SELECT id FROM {schema}.events WHERE slug = '{slug}'")
            if not cur.fetchone():
                break
            slug = f"{base_slug}-{counter}"
            counter += 1

        program = body.get('program', [])
        rules = body.get('rules', [])
        program_sql = "ARRAY[" + ",".join(f"'{p}'" for p in program) + "]::text[]" if program else "ARRAY[]::text[]"
        rules_sql = "ARRAY[" + ",".join(f"'{r}'" for r in rules) + "]::text[]" if rules else "ARRAY[]::text[]"

        title = body.get('title', '').replace("'", "''")
        short_desc = (body.get('short_description') or '').replace("'", "''")
        full_desc = (body.get('full_description') or '').replace("'", "''")
        description = (body.get('description') or '').replace("'", "''")
        bath_name = (body.get('bath_name') or '').replace("'", "''")
        bath_address = (body.get('bath_address') or '').replace("'", "''")
        price_label = (body.get('price_label') or body.get('price') or '').replace("'", "''")

        cur.execute(f"""
            INSERT INTO {schema}.events (
                title, slug, short_description, full_description, description,
                event_date, start_time, end_time,
                event_type, event_type_icon, occupancy,
                bath_name, bath_address, image_url,
                price, price_amount, price_label,
                total_spots, spots_left, featured, is_visible,
                program, rules
            ) VALUES (
                '{title}', '{slug}', '{short_desc}', '{full_desc}', '{description}',
                '{body.get('event_date')}', '{body.get('start_time', '19:00')}', '{body.get('end_time', '23:00')}',
                '{body.get('event_type', 'знакомство')}', '{body.get('event_type_icon', 'Users')}', '{body.get('occupancy', 'low')}',
                '{bath_name}', '{bath_address}', '{body.get('image_url', '')}',
                '{price_label}', {body.get('price_amount', 0)}, '{price_label}',
                {body.get('total_spots', 10)}, {body.get('spots_left', 10)}, {body.get('featured', False)}, {body.get('is_visible', True)},
                {program_sql}, {rules_sql}
            ) RETURNING *
        """)
        row = cur.fetchone()
        conn.commit()
        conn.close()
        return {'statusCode': 201, 'headers': headers, 'body': json.dumps(serialize_event(row), default=str)}

    if method == 'PUT':
        body = json.loads(event.get('body', '{}'))
        event_id = body.get('id') or params.get('id')
        if not event_id:
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'id required'})}

        sets = []
        for field in ['title', 'short_description', 'full_description', 'description',
                       'event_date', 'start_time', 'end_time', 'event_type', 'event_type_icon',
                       'occupancy', 'bath_name', 'bath_address', 'image_url', 'price', 'price_label',
                       'slug']:
            if field in body:
                val = str(body[field]).replace("'", "''")
                sets.append(f"{field} = '{val}'")

        for field in ['price_amount', 'total_spots', 'spots_left']:
            if field in body:
                sets.append(f"{field} = {int(body[field])}")

        for field in ['featured', 'is_visible']:
            if field in body:
                sets.append(f"{field} = {bool(body[field])}")

        if 'program' in body:
            program = body['program']
            program_sql = "ARRAY[" + ",".join(f"'{p.replace(chr(39), chr(39)+chr(39))}'" for p in program) + "]::text[]" if program else "ARRAY[]::text[]"
            sets.append(f"program = {program_sql}")

        if 'rules' in body:
            rules = body['rules']
            rules_sql = "ARRAY[" + ",".join(f"'{r.replace(chr(39), chr(39)+chr(39))}'" for r in rules) + "]::text[]" if rules else "ARRAY[]::text[]"
            sets.append(f"rules = {rules_sql}")

        sets.append("updated_at = CURRENT_TIMESTAMP")

        cur.execute(f"UPDATE {schema}.events SET {', '.join(sets)} WHERE id = {event_id} RETURNING *")
        row = cur.fetchone()
        conn.commit()
        conn.close()
        if not row:
            return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'Not found'})}
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps(serialize_event(row), default=str)}

    if method == 'DELETE':
        event_id = params.get('id')
        if not event_id:
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'id required'})}
        cur.execute(f"UPDATE {schema}.events SET is_visible = false WHERE id = {event_id}")
        conn.commit()
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'ok': True})}

    conn.close()
    return {'statusCode': 405, 'headers': headers, 'body': json.dumps({'error': 'Method not allowed'})}


def handle_signups(event, method, params, schema, headers):
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    if method == 'GET':
        event_id = params.get('event_id')
        if event_id:
            cur.execute(f"SELECT * FROM {schema}.event_signups WHERE event_id = {event_id} ORDER BY created_at DESC")
        else:
            cur.execute(f"""
                SELECT s.*, e.title as event_title, e.event_date
                FROM {schema}.event_signups s
                JOIN {schema}.events e ON e.id = s.event_id
                ORDER BY s.created_at DESC
            """)
        rows = cur.fetchall()
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps([dict(r) for r in rows], default=str)}

    if method == 'POST':
        body = json.loads(event.get('body', '{}'))
        name = body.get('name', '').replace("'", "''")
        phone = body.get('phone', '').replace("'", "''")
        email = (body.get('email') or '').strip().replace("'", "''")
        telegram = (body.get('telegram') or '').replace("'", "''")
        consent_pd = body.get('consent_pd', False)
        event_id = body.get('event_id')

        if not name or not phone or not event_id or not email:
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'name, phone, email, event_id required'})}

        if not consent_pd:
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Необходимо согласие на обработку персональных данных'})}

        cur.execute(f"SELECT id, title, event_date, start_time, end_time, bath_name, bath_address, spots_left FROM {schema}.events WHERE id = {event_id}")
        ev = cur.fetchone()
        if not ev:
            conn.close()
            return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'Event not found'})}
        if ev['spots_left'] <= 0:
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'No spots left'})}

        user_id = find_or_create_user(cur, schema, email, name, phone, telegram)

        cur.execute(f"""
            INSERT INTO {schema}.event_signups (event_id, name, phone, email, telegram, consent_pd, user_id)
            VALUES ({event_id}, '{name}', '{phone}', '{email}', '{telegram}', true, {user_id})
            RETURNING *
        """)
        row = cur.fetchone()
        cur.execute(f"UPDATE {schema}.events SET spots_left = spots_left - 1 WHERE id = {event_id}")
        conn.commit()
        conn.close()

        send_signup_confirmation(email, name, ev)
        send_signup_telegram(name, phone, email, telegram, ev)

        return {'statusCode': 201, 'headers': headers, 'body': json.dumps(dict(row), default=str)}

    if method == 'PUT':
        body = json.loads(event.get('body', '{}'))
        signup_id = body.get('id')
        status = body.get('status')
        if not signup_id or not status:
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'id and status required'})}
        cur.execute(f"UPDATE {schema}.event_signups SET status = '{status}' WHERE id = {signup_id} RETURNING *")
        row = cur.fetchone()
        conn.commit()
        conn.close()
        if not row:
            return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'Not found'})}
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps(dict(row), default=str)}

    conn.close()
    return {'statusCode': 405, 'headers': headers, 'body': json.dumps({'error': 'Method not allowed'})}


def find_or_create_user(cur, schema, email, name, phone, telegram):
    email_lower = email.lower().replace("'", "''")
    cur.execute(f"SELECT id FROM {schema}.users WHERE email = '{email_lower}'")
    user = cur.fetchone()
    if user:
        return user['id']

    temp_password = secrets.token_urlsafe(12)
    password_hash = hashlib.sha256(temp_password.encode()).hexdigest()
    cur.execute(f"""
        INSERT INTO {schema}.users (email, name, phone, telegram, password_hash)
        VALUES ('{email_lower}', '{name}', '{phone}', '{telegram}', '{password_hash}')
        RETURNING id
    """)
    return cur.fetchone()['id']


def send_signup_confirmation(to_email, name, event_data):
    api_key = os.environ.get('UNISENDER_API_KEY', '')
    sender_email = os.environ.get('UNISENDER_SENDER_EMAIL', '')
    sender_name = os.environ.get('UNISENDER_SENDER_NAME', '')
    if not api_key or not sender_email:
        return

    event_title = event_data.get('title', '')
    event_date = str(event_data.get('event_date', ''))
    start_time = str(event_data.get('start_time', ''))[:5]
    end_time = str(event_data.get('end_time', ''))[:5]
    bath_name = event_data.get('bath_name', '')
    bath_address = event_data.get('bath_address', '')

    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #fafafa;">
        <div style="background: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
            <div style="text-align: center; margin-bottom: 24px;">
                <div style="width: 56px; height: 56px; background: #dcfce7; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 28px;">✓</div>
            </div>
            <h1 style="color: #1a1a1a; font-size: 22px; text-align: center; margin: 0 0 8px;">Вы записаны!</h1>
            <p style="color: #666; text-align: center; margin: 0 0 28px; font-size: 15px;">
                {name}, ваша заявка на участие принята
            </p>
            <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <h2 style="color: #1a1a1a; font-size: 17px; margin: 0 0 12px;">{event_title}</h2>
                <table style="width: 100%; font-size: 14px; color: #444;">
                    <tr><td style="padding: 4px 0; color: #888; width: 90px;">Дата:</td><td style="padding: 4px 0; font-weight: 600;">{event_date}</td></tr>
                    <tr><td style="padding: 4px 0; color: #888;">Время:</td><td style="padding: 4px 0; font-weight: 600;">{start_time} — {end_time}</td></tr>
                    <tr><td style="padding: 4px 0; color: #888;">Место:</td><td style="padding: 4px 0; font-weight: 600;">{bath_name}</td></tr>
                    <tr><td style="padding: 4px 0; color: #888;">Адрес:</td><td style="padding: 4px 0;">{bath_address}</td></tr>
                </table>
            </div>
            <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
                Организатор свяжется с вами для подтверждения. Если у вас есть вопросы — напишите нам в <a href="https://t.me/sparcom_ru" style="color: #2563eb;">Telegram</a>.
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
        "subject": f"Подтверждение записи: {event_title}",
        "body": {"html": html},
        "track_links": 1,
        "track_read": 1,
        "tags": ["signup-confirmation"],
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


def send_signup_telegram(signup_name, signup_phone, signup_email, signup_telegram, event_data):
    bot_token = os.environ.get('TELEGRAM_BOT_TOKEN')
    chat_id = os.environ.get('TELEGRAM_CHAT_ID')
    if not bot_token or not chat_id:
        return

    title = event_data.get('title', '')
    date = str(event_data.get('event_date', ''))
    start = str(event_data.get('start_time', ''))[:5]
    bath = event_data.get('bath_name', '')
    spots = event_data.get('spots_left', 0) - 1

    text = (
        f"🎫 <b>Новая запись на событие</b>\n\n"
        f"📌 {title}\n"
        f"📅 {date}, {start}\n"
        f"🏠 {bath}\n\n"
        f"👤 {signup_name}\n"
        f"📞 {signup_phone}\n"
        f"📧 {signup_email}\n"
    )
    if signup_telegram:
        text += f"✈️ {signup_telegram}\n"
    text += f"\n🪑 Осталось мест: {max(spots, 0)}"

    try:
        requests.post(
            f"https://api.telegram.org/bot{bot_token}/sendMessage",
            json={'chat_id': chat_id, 'text': text, 'parse_mode': 'HTML'},
            timeout=5
        )
    except Exception:
        pass


def serialize_event(row):
    d = dict(row)
    if d.get('program') is None:
        d['program'] = []
    if d.get('rules') is None:
        d['rules'] = []
    return d