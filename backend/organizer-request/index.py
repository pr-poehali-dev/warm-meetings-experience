import json
import os
import urllib.request
import psycopg2


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def get_schema():
    return os.environ.get('MAIN_DB_SCHEMA', 'public')


def send_telegram(text):
    """Отправка уведомления в Telegram-чат команды"""
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


CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
}


def handler(event, context):
    """Приём заявок от потенциальных организаторов мероприятий"""
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': ''
        }

    method = event.get('httpMethod', 'GET')

    if method == 'POST':
        return create_request(event)

    return {
        'statusCode': 405,
        'headers': CORS_HEADERS,
        'body': json.dumps({'error': 'Method not allowed'})
    }


def create_request(event):
    body = json.loads(event.get('body', '{}'))

    name = (body.get('name') or '').strip()
    telegram = (body.get('telegram') or '').strip()
    email = (body.get('email') or '').strip()
    city = (body.get('city') or 'Москва').strip()
    has_own_bath = (body.get('has_own_bath') or 'no').strip()
    event_format = (body.get('event_format') or '').strip()
    additional_info = (body.get('additional_info') or '').strip()

    if not name or len(name) < 2:
        return {
            'statusCode': 400,
            'headers': CORS_HEADERS,
            'body': json.dumps({'error': 'Укажите имя (минимум 2 символа)'})
        }
    if not telegram:
        return {
            'statusCode': 400,
            'headers': CORS_HEADERS,
            'body': json.dumps({'error': 'Укажите Telegram или WhatsApp'})
        }
    if not email or '@' not in email:
        return {
            'statusCode': 400,
            'headers': CORS_HEADERS,
            'body': json.dumps({'error': 'Укажите корректный email'})
        }

    schema = get_schema()
    conn = get_conn()
    cur = conn.cursor()

    cur.execute(f"""
        INSERT INTO {schema}.organizer_requests
            (name, telegram, email, city, has_own_bath, event_format, additional_info)
        VALUES ('{name.replace("'", "''")}', '{telegram.replace("'", "''")}',
                '{email.replace("'", "''")}', '{city.replace("'", "''")}',
                '{has_own_bath.replace("'", "''")}', '{event_format.replace("'", "''")}',
                '{additional_info.replace("'", "''")}')
        RETURNING id
    """)
    row = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()

    request_id = row[0] if row else 'N/A'

    bath_map = {'yes': 'Да', 'no': 'Нет', 'in_progress': 'В процессе'}
    tg_text = (
        f"🔔 <b>Новая заявка организатора #{request_id}</b>\n\n"
        f"👤 <b>Имя:</b> {name}\n"
        f"📱 <b>Telegram:</b> {telegram}\n"
        f"📧 <b>Email:</b> {email}\n"
        f"📍 <b>Город:</b> {city}\n"
        f"🏠 <b>Своя баня:</b> {bath_map.get(has_own_bath, has_own_bath)}\n"
        f"📝 <b>Формат:</b> {event_format or '—'}\n"
        f"💬 <b>Доп. инфо:</b> {additional_info or '—'}"
    )
    send_telegram(tg_text)

    return {
        'statusCode': 200,
        'headers': CORS_HEADERS,
        'body': json.dumps({'success': True, 'id': request_id})
    }
