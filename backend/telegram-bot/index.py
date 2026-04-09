import json
import os
import secrets
import psycopg2
import psycopg2.extras
import requests
from datetime import datetime, timedelta


BOT_TOKEN = None
SCHEMA = None

DEFAULT_TEMPLATE = """📅 *{title}*

🗓 {date}, {time}
📍 {place}
{address_line}
💰 {price}
👥 Осталось мест: {spots_left}

{description_short}

👉 [Подробнее и запись]({url})"""


def get_bot_token():
    global BOT_TOKEN
    if not BOT_TOKEN:
        BOT_TOKEN = os.environ.get('TG_PUBLISH_BOT_TOKEN', '')
    return BOT_TOKEN


def get_schema():
    global SCHEMA
    if not SCHEMA:
        SCHEMA = os.environ.get('MAIN_DB_SCHEMA', 'public')
    return SCHEMA


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def cors_headers():
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    }


def respond(code, body):
    return {'statusCode': code, 'headers': cors_headers(), 'body': json.dumps(body, default=str)}


def tg_api(method, data=None):
    url = f"https://api.telegram.org/bot{get_bot_token()}/{method}"
    r = requests.post(url, json=data or {}, timeout=10)
    return r.json()


def send_message(chat_id, text, parse_mode='Markdown', reply_markup=None):
    data = {'chat_id': chat_id, 'text': text, 'parse_mode': parse_mode}
    if reply_markup:
        data['reply_markup'] = reply_markup
    return tg_api('sendMessage', data)


def handler(event, context):
    """Telegram-бот: webhook для команд организаторов (verify, add, list, remove, template, test, help)"""
    if event.get('httpMethod') == 'OPTIONS':
        return respond(200, {})

    method = event.get('httpMethod', 'GET')
    params = event.get('queryStringParameters') or {}

    if method == 'GET' and params.get('action') == 'generate_code':
        return handle_generate_code(params)

    if method == 'GET' and params.get('action') == 'set_webhook':
        return handle_set_webhook(event)

    if method == 'GET' and params.get('action') == 'webhook_info':
        info = tg_api('getWebhookInfo')
        me = tg_api('getMe')
        return respond(200, {'webhook': info, 'bot': me})

    if method == 'GET' and params.get('action') == 'delete_webhook':
        result = tg_api('deleteWebhook', {'drop_pending_updates': True})
        return respond(200, result)

    if method == 'POST':
        body = json.loads(event.get('body', '{}'))
        if 'update_id' in body:
            process_update(body)
            return respond(200, {'ok': True})
        if body.get('action') == 'publish_event':
            return handle_publish_event(body)
        if body.get('action') == 'notify_signup':
            return handle_notify_signup(body)

    return respond(200, {'ok': True})


def handle_set_webhook(event):
    hdrs = event.get('headers') or {}
    host = hdrs.get('Host', '')
    path = hdrs.get('X-Request-URI', event.get('requestContext', {}).get('path', ''))
    if not host:
        return respond(400, {'error': 'Cannot determine host'})
    webhook_url = f"https://{host}{path}" if path else f"https://{host}"
    webhook_url = webhook_url.split('?')[0]
    result = tg_api('setWebhook', {'url': webhook_url, 'allowed_updates': ['message', 'channel_post']})
    return respond(200, result)


def handle_generate_code(params):
    token = params.get('token', '')
    if not token:
        return respond(401, {'error': 'Unauthorized'})

    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    schema = get_schema()

    cur.execute(f"""
        SELECT u.id FROM {schema}.user_sessions s
        JOIN {schema}.users u ON u.id = s.user_id
        WHERE s.token = '{token.replace("'", "''")}' AND s.expires_at > NOW()
    """)
    user = cur.fetchone()
    if not user:
        conn.close()
        return respond(401, {'error': 'Invalid token'})

    user_id = user['id']

    cur.execute(f"""
        SELECT code FROM {schema}.tg_verify_codes
        WHERE user_id = {user_id} AND used = FALSE AND expires_at > NOW()
        ORDER BY created_at DESC LIMIT 1
    """)
    existing = cur.fetchone()
    if existing:
        conn.close()
        return respond(200, {'code': existing['code']})

    code = f"SP-{secrets.randbelow(9000) + 1000}"
    expires = (datetime.utcnow() + timedelta(minutes=10)).strftime('%Y-%m-%d %H:%M:%S')
    cur.execute(f"""
        INSERT INTO {schema}.tg_verify_codes (user_id, code, expires_at)
        VALUES ({user_id}, '{code}', '{expires}')
    """)
    conn.commit()
    conn.close()
    return respond(200, {'code': code})


def process_update(update):
    message = update.get('message')
    if not message:
        return

    chat = message.get('chat', {})
    chat_id = chat.get('id')
    text = (message.get('text') or '').strip()
    tg_user = message.get('from', {})
    tg_user_id = tg_user.get('id')

    if message.get('forward_from_chat'):
        handle_forwarded_message(message, tg_user_id)
        return

    if not text.startswith('/'):
        send_message(chat_id, "Используйте /help чтобы увидеть доступные команды.")
        return

    parts = text.split(maxsplit=1)
    cmd = parts[0].lower().split('@')[0]
    arg = parts[1] if len(parts) > 1 else ''

    if cmd == '/start':
        handle_start(chat_id)
    elif cmd == '/verify':
        handle_verify(chat_id, tg_user_id, tg_user, arg)
    elif cmd == '/add':
        handle_add(chat_id)
    elif cmd == '/list':
        handle_list(chat_id, tg_user_id)
    elif cmd == '/remove':
        handle_remove(chat_id, tg_user_id, arg)
    elif cmd == '/template':
        handle_template(chat_id, tg_user_id, arg)
    elif cmd == '/test':
        handle_test(chat_id, tg_user_id, arg)
    elif cmd == '/help':
        handle_help(chat_id)
    else:
        send_message(chat_id, "Неизвестная команда. /help — список команд.")


def handle_start(chat_id):
    send_message(chat_id,
        "🧖‍♂️ Добро пожаловать в бот СПАРКОМ!\n\n"
        "Я помогаю организаторам публиковать события в Telegram-каналы и чаты.\n\n"
        "Чтобы начать:\n"
        "1. Привяжите аккаунт организатора на сайте sparcom.ru\n"
        "2. В ЛК на сайте получите код подтверждения\n"
        "3. Отправьте мне команду /verify КОД\n\n"
        "После привязки вы сможете:\n"
        "• Добавить канал/чат через /add\n"
        "• Настроить шаблон поста через /template\n"
        "• Управлять подключениями через /list и /remove\n\n"
        "Команды:\n"
        "/start — это сообщение\n"
        "/verify КОД — привязать аккаунт\n"
        "/add — добавить канал/чат\n"
        "/list — список подключений\n"
        "/remove — удалить канал/чат\n"
        "/template — настроить шаблон\n"
        "/test — тестовая публикация\n"
        "/help — помощь")


def handle_verify(chat_id, tg_user_id, tg_user, code):
    if not code:
        send_message(chat_id,
            "🔐 *Привязка аккаунта*\n\n"
            "1. Зайдите в кабинет организатора на sparcom.ru\n"
            "2. Нажмите «Подключить Telegram» — появится код\n"
            "3. Отправьте мне: `/verify КОД`\n\n"
            "Например: `/verify SP-1234`")
        return

    code = code.strip().upper().replace("'", "''")
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    schema = get_schema()

    cur.execute(f"""
        SELECT id, user_id FROM {schema}.tg_verify_codes
        WHERE code = '{code}' AND used = FALSE AND expires_at > NOW()
    """)
    vc = cur.fetchone()
    if not vc:
        conn.close()
        send_message(chat_id, "❌ Код не найден или истёк. Получите новый код на сайте.")
        return

    user_id = vc['user_id']

    cur.execute(f"UPDATE {schema}.tg_verify_codes SET used = TRUE WHERE id = {vc['id']}")

    username = (tg_user.get('username') or '').replace("'", "''")
    first_name = (tg_user.get('first_name') or '').replace("'", "''")
    cur.execute(f"""
        INSERT INTO {schema}.tg_linked_accounts (user_id, telegram_user_id, telegram_username, telegram_first_name)
        VALUES ({user_id}, {tg_user_id}, '{username}', '{first_name}')
        ON CONFLICT (telegram_user_id)
        DO UPDATE SET user_id = {user_id}, telegram_username = '{username}', telegram_first_name = '{first_name}', linked_at = NOW()
    """)

    conn.commit()
    conn.close()

    send_message(chat_id,
        "✅ Аккаунт успешно привязан!\n\n"
        "Теперь подключите канал или чат командой /add")


def handle_add(chat_id):
    send_message(chat_id,
        "📢 *Подключение канала/чата*\n\n"
        "1. Добавьте меня в администраторы вашего канала (или пригласите в группу)\n"
        "2. Перешлите мне *любое сообщение* из этого канала/чата\n\n"
        "После этого я запомню канал и отправлю туда тестовое сообщение.")


def handle_forwarded_message(message, tg_user_id):
    fwd_chat = message.get('forward_from_chat', {})
    fwd_chat_id = fwd_chat.get('id')
    fwd_chat_title = (fwd_chat.get('title') or '').replace("'", "''")
    fwd_chat_type = fwd_chat.get('type', 'channel')
    user_chat_id = message.get('chat', {}).get('id')

    if not fwd_chat_id:
        send_message(user_chat_id, "❌ Не удалось определить канал. Перешлите сообщение из канала/группы.")
        return

    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    schema = get_schema()

    cur.execute(f"SELECT user_id FROM {schema}.tg_linked_accounts WHERE telegram_user_id = {tg_user_id}")
    link = cur.fetchone()
    if not link:
        conn.close()
        send_message(user_chat_id, "❌ Сначала привяжите аккаунт на сайте командой /verify")
        return

    user_id = link['user_id']

    cur.execute(f"""
        SELECT id FROM {schema}.tg_channels
        WHERE user_id = {user_id} AND chat_id = {fwd_chat_id}
    """)
    existing = cur.fetchone()
    if existing:
        cur.execute(f"UPDATE {schema}.tg_channels SET is_active = TRUE, chat_title = '{fwd_chat_title}' WHERE id = {existing['id']}")
        conn.commit()
        conn.close()
        send_message(user_chat_id, f"✅ Канал «{fwd_chat.get('title', '')}» уже подключён и активен!")
        return

    result = send_message(fwd_chat_id, "✅ Бот СПАРКОМ подключён! Здесь будут публиковаться новые события.")
    if not result.get('ok'):
        conn.close()
        send_message(user_chat_id,
            "❌ Не удалось отправить сообщение в канал.\n"
            "Убедитесь, что я добавлен как администратор с правом отправки сообщений.")
        return

    cur.execute(f"""
        INSERT INTO {schema}.tg_channels (user_id, chat_id, chat_title, chat_type)
        VALUES ({user_id}, {fwd_chat_id}, '{fwd_chat_title}', '{fwd_chat_type}')
        ON CONFLICT (user_id, chat_id) DO UPDATE SET is_active = TRUE, chat_title = '{fwd_chat_title}'
    """)
    conn.commit()
    conn.close()

    send_message(user_chat_id,
        f"✅ Канал «{fwd_chat.get('title', '')}» подключён!\n\n"
        f"Теперь все новые события будут автоматически публиковаться туда.\n"
        f"Настроить шаблон: /template\n"
        f"Тестовый пост: /test")


def handle_list(chat_id, tg_user_id):
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    schema = get_schema()

    cur.execute(f"SELECT user_id FROM {schema}.tg_linked_accounts WHERE telegram_user_id = {tg_user_id}")
    link = cur.fetchone()
    if not link:
        conn.close()
        send_message(chat_id, "❌ Сначала привяжите аккаунт: /verify")
        return

    cur.execute(f"""
        SELECT id, chat_id, chat_title, chat_type, is_active, template IS NOT NULL as has_template
        FROM {schema}.tg_channels WHERE user_id = {link['user_id']}
        ORDER BY created_at
    """)
    channels = [dict(r) for r in cur.fetchall()]
    conn.close()

    if not channels:
        send_message(chat_id, "📋 У вас пока нет подключённых каналов.\nПодключите командой /add")
        return

    lines = ["📋 *Ваши каналы:*\n"]
    for i, ch in enumerate(channels, 1):
        status = "✅" if ch['is_active'] else "❌"
        tmpl = "🎨" if ch['has_template'] else ""
        lines.append(f"{i}. {status} {ch['chat_title'] or 'Без названия'} {tmpl}")
    lines.append("\n✅ — активен, ❌ — отключён, 🎨 — свой шаблон")
    lines.append("Удалить: /remove НОМЕР")

    send_message(chat_id, "\n".join(lines))


def handle_remove(chat_id, tg_user_id, arg):
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    schema = get_schema()

    cur.execute(f"SELECT user_id FROM {schema}.tg_linked_accounts WHERE telegram_user_id = {tg_user_id}")
    link = cur.fetchone()
    if not link:
        conn.close()
        send_message(chat_id, "❌ Сначала привяжите аккаунт: /verify")
        return

    cur.execute(f"""
        SELECT id, chat_title FROM {schema}.tg_channels
        WHERE user_id = {link['user_id']} AND is_active = TRUE
        ORDER BY created_at
    """)
    channels = [dict(r) for r in cur.fetchall()]

    if not channels:
        conn.close()
        send_message(chat_id, "📋 Нет активных каналов.")
        return

    if not arg.strip().isdigit():
        lines = ["Укажите номер канала для удаления:\n"]
        for i, ch in enumerate(channels, 1):
            lines.append(f"{i}. {ch['chat_title'] or 'Без названия'}")
        lines.append("\nНапример: `/remove 1`")
        conn.close()
        send_message(chat_id, "\n".join(lines))
        return

    idx = int(arg.strip()) - 1
    if idx < 0 or idx >= len(channels):
        conn.close()
        send_message(chat_id, "❌ Неверный номер. Используйте /remove без аргумента для списка.")
        return

    ch = channels[idx]
    cur.execute(f"UPDATE {schema}.tg_channels SET is_active = FALSE WHERE id = {ch['id']}")
    conn.commit()
    conn.close()

    send_message(chat_id, f"✅ Канал «{ch['chat_title'] or 'Без названия'}» отключён.\nВы можете подключить его снова командой /add")


def handle_template(chat_id, tg_user_id, arg):
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    schema = get_schema()

    cur.execute(f"SELECT user_id FROM {schema}.tg_linked_accounts WHERE telegram_user_id = {tg_user_id}")
    link = cur.fetchone()
    if not link:
        conn.close()
        send_message(chat_id, "❌ Сначала привяжите аккаунт: /verify")
        return

    cur.execute(f"""
        SELECT id, chat_title, template FROM {schema}.tg_channels
        WHERE user_id = {link['user_id']} AND is_active = TRUE
        ORDER BY created_at
    """)
    channels = [dict(r) for r in cur.fetchall()]

    if not channels:
        conn.close()
        send_message(chat_id, "📋 Нет активных каналов. Подключите: /add")
        return

    if not arg.strip():
        lines = ["🎨 *Настройка шаблона*\n"]
        for i, ch in enumerate(channels, 1):
            tmpl = ch['template'] or DEFAULT_TEMPLATE
            lines.append(f"*{i}. {ch['chat_title'] or 'Без названия'}*")
            lines.append(f"```\n{tmpl[:200]}{'...' if len(tmpl) > 200 else ''}\n```\n")
        lines.append("Чтобы изменить шаблон:\n`/template НОМЕР ваш шаблон`")
        lines.append("\nДоступные переменные:\n"
                     "`{title}` `{date}` `{time}` `{place}` `{address}` "
                     "`{price}` `{spots_left}` `{description_short}` `{url}`")
        conn.close()
        send_message(chat_id, "\n".join(lines))
        return

    parts = arg.strip().split(maxsplit=1)
    if not parts[0].isdigit() or len(parts) < 2:
        conn.close()
        send_message(chat_id, "Формат: `/template НОМЕР текст шаблона`\nПример: `/template 1 📅 {title}\\n{date}`")
        return

    idx = int(parts[0]) - 1
    new_template = parts[1]

    if idx < 0 or idx >= len(channels):
        conn.close()
        send_message(chat_id, "❌ Неверный номер канала.")
        return

    ch = channels[idx]
    safe_template = new_template.replace("'", "''")
    cur.execute(f"UPDATE {schema}.tg_channels SET template = '{safe_template}' WHERE id = {ch['id']}")
    conn.commit()
    conn.close()

    send_message(chat_id, f"✅ Шаблон для «{ch['chat_title'] or 'Без названия'}» обновлён!\nПроверьте: /test {idx + 1}")


def handle_test(chat_id, tg_user_id, arg):
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    schema = get_schema()

    cur.execute(f"SELECT user_id FROM {schema}.tg_linked_accounts WHERE telegram_user_id = {tg_user_id}")
    link = cur.fetchone()
    if not link:
        conn.close()
        send_message(chat_id, "❌ Сначала привяжите аккаунт: /verify")
        return

    cur.execute(f"""
        SELECT id, chat_id, chat_title, template FROM {schema}.tg_channels
        WHERE user_id = {link['user_id']} AND is_active = TRUE
        ORDER BY created_at
    """)
    channels = [dict(r) for r in cur.fetchall()]

    if not channels:
        conn.close()
        send_message(chat_id, "📋 Нет активных каналов. Подключите: /add")
        return

    if arg.strip().isdigit():
        idx = int(arg.strip()) - 1
    else:
        idx = 0

    if idx < 0 or idx >= len(channels):
        conn.close()
        send_message(chat_id, "❌ Неверный номер. Используйте /list для списка.")
        return

    ch = channels[idx]
    conn.close()

    template = ch['template'] or DEFAULT_TEMPLATE
    test_data = {
        'title': 'Тестовая встреча в банном клубе',
        'date': '15 мая 2026',
        'time': '18:00 — 21:00',
        'place': 'Банный клуб «Парус»',
        'address': 'ул. Примерная, 42',
        'address_line': '📌 ул. Примерная, 42',
        'price': '3 500 ₽',
        'spots_left': '5',
        'description_short': 'Приглашаем на вечер знакомств в уютной атмосфере банного клуба. Парение, общение, лёгкие закуски.',
        'url': 'https://sparcom.ru/events/test-event',
    }

    try:
        text = template.format(**test_data)
    except (KeyError, IndexError) as e:
        send_message(chat_id, f"❌ Ошибка в шаблоне: {e}\nИсправьте шаблон: /template")
        return

    result = send_message(ch['chat_id'], text)
    if result.get('ok'):
        send_message(chat_id, f"✅ Тестовое сообщение отправлено в «{ch['chat_title'] or 'Без названия'}»!")
    else:
        desc = result.get('description', 'Неизвестная ошибка')
        send_message(chat_id, f"❌ Ошибка отправки: {desc}\nПроверьте, что бот — администратор канала.")


def handle_help(chat_id):
    send_message(chat_id,
        "🤖 *Команды бота СПАРКОМ*\n\n"
        "/verify КОД — привязать аккаунт с сайта\n"
        "/add — подключить канал или чат\n"
        "/list — список подключённых каналов\n"
        "/remove — отключить канал\n"
        "/template — настроить шаблон поста\n"
        "/test — отправить тестовый пост\n"
        "/help — эта справка\n\n"
        "📖 Подробная инструкция: sparcom.ru")


def handle_notify_signup(body):
    organizer_id = body.get('organizer_id')
    if not organizer_id:
        return respond(400, {'error': 'organizer_id required'})

    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    schema = get_schema()

    cur.execute(f"""
        SELECT la.telegram_user_id
        FROM {schema}.tg_linked_accounts la
        WHERE la.user_id = {organizer_id}
    """)
    link = cur.fetchone()
    conn.close()

    if not link:
        return respond(200, {'ok': True, 'sent': False, 'reason': 'no_telegram_linked'})

    tg_chat_id = link['telegram_user_id']
    signup_name = body.get('signup_name', '')
    signup_phone = body.get('signup_phone', '')
    signup_email = body.get('signup_email', '')
    signup_telegram = body.get('signup_telegram', '')
    event_title = body.get('event_title', '')
    event_date = body.get('event_date', '')
    event_time = body.get('event_time', '')
    bath_name = body.get('bath_name', '')
    spots_left = body.get('spots_left', '—')

    text = (
        f"🎫 *Новая запись на событие!*\n\n"
        f"📌 {event_title}\n"
        f"📅 {event_date}, {event_time}\n"
        f"🏠 {bath_name}\n\n"
        f"👤 {signup_name}\n"
        f"📞 {signup_phone}\n"
        f"📧 {signup_email}\n"
    )
    if signup_telegram:
        text += f"✈️ {signup_telegram}\n"
    text += f"\n🪑 Осталось мест: {spots_left}"

    result = send_message(tg_chat_id, text)
    sent = result.get('ok', False)

    return respond(200, {'ok': True, 'sent': sent})


def handle_publish_event(body):
    event_id = body.get('event_id')
    organizer_id = body.get('organizer_id')
    if not event_id or not organizer_id:
        return respond(400, {'error': 'event_id and organizer_id required'})

    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    schema = get_schema()

    cur.execute(f"""
        SELECT id, chat_id, chat_title, template, include_photo
        FROM {schema}.tg_channels
        WHERE user_id = {organizer_id} AND is_active = TRUE
    """)
    channels = [dict(r) for r in cur.fetchall()]

    if not channels:
        conn.close()
        return respond(200, {'ok': True, 'published': 0, 'reason': 'no_channels'})

    cur.execute(f"""
        SELECT e.*, u.name as organizer_name
        FROM {schema}.events e
        LEFT JOIN {schema}.users u ON u.id = e.organizer_id
        WHERE e.id = {event_id}
    """)
    ev = cur.fetchone()
    if not ev:
        conn.close()
        return respond(404, {'error': 'Event not found'})

    ev = dict(ev)
    date_str = ''
    if ev.get('event_date'):
        months = ['января','февраля','марта','апреля','мая','июня',
                  'июля','августа','сентября','октября','ноября','декабря']
        d = ev['event_date']
        if hasattr(d, 'day'):
            date_str = f"{d.day} {months[d.month - 1]} {d.year}"
        else:
            date_str = str(d)

    time_str = ''
    if ev.get('start_time'):
        st = ev['start_time']
        start = st.strftime('%H:%M') if hasattr(st, 'strftime') else str(st)[:5]
        if ev.get('end_time'):
            et = ev['end_time']
            end = et.strftime('%H:%M') if hasattr(et, 'strftime') else str(et)[:5]
            time_str = f"{start} — {end}"
        else:
            time_str = start

    price_str = ''
    if ev.get('price_label'):
        price_str = ev['price_label']
    elif ev.get('price_amount'):
        price_str = f"{ev['price_amount']} ₽"

    address = ev.get('bath_address') or ''
    template_vars = {
        'title': ev.get('title') or '',
        'date': date_str,
        'time': time_str,
        'place': ev.get('bath_name') or '',
        'address': address,
        'address_line': f"📌 {address}" if address else '',
        'price': price_str or 'Бесплатно',
        'spots_left': str(ev.get('spots_left') or ev.get('total_spots') or '—'),
        'description_short': (ev.get('short_description') or ev.get('description') or '')[:300],
        'url': f"https://sparcom.ru/events/{ev.get('slug') or ev['id']}",
    }

    published = 0
    errors = []

    for ch in channels:
        cur.execute(f"""
            SELECT id FROM {schema}.tg_publications
            WHERE event_id = {event_id} AND channel_id = {ch['id']}
        """)
        if cur.fetchone():
            continue

        template = ch['template'] or DEFAULT_TEMPLATE
        try:
            text = template.format(**template_vars)
        except (KeyError, IndexError):
            text = DEFAULT_TEMPLATE.format(**template_vars)

        photo_url = ev.get('image_url')
        result = None

        if photo_url and ch['include_photo']:
            result = tg_api('sendPhoto', {
                'chat_id': ch['chat_id'],
                'photo': photo_url,
                'caption': text,
                'parse_mode': 'Markdown'
            })
            if not result.get('ok'):
                result = send_message(ch['chat_id'], text)
        else:
            result = send_message(ch['chat_id'], text)

        status = 'sent' if result.get('ok') else 'error'
        msg_id = result.get('result', {}).get('message_id')
        err_text = result.get('description') if not result.get('ok') else None

        if err_text:
            err_text = err_text.replace("'", "''")

        cur.execute(f"""
            INSERT INTO {schema}.tg_publications (event_id, channel_id, message_id, status, error_text)
            VALUES ({event_id}, {ch['id']}, {msg_id or 'NULL'}, '{status}', {f"'{err_text}'" if err_text else 'NULL'})
        """)

        if status == 'sent':
            published += 1
        else:
            errors.append({'channel': ch['chat_title'], 'error': result.get('description', '')})

    conn.commit()
    conn.close()

    return respond(200, {'ok': True, 'published': published, 'errors': errors})