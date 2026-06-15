import json
import os
import secrets
import psycopg2
import psycopg2.extras
import requests
from datetime import datetime, timedelta

from shared import *
from vk_callback import handle_vk_callback


BOT_TOKEN = None

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


def tg_api(method, data=None, retries=3, timeout=15):
    url = f"https://api.telegram.org/bot{get_bot_token()}/{method}"
    last_err = None
    for attempt in range(retries):
        try:
            r = requests.post(url, json=data or {}, timeout=timeout)
            return r.json()
        except requests.exceptions.Timeout as e:
            last_err = e
            print(f"[tg_api] timeout attempt {attempt + 1}/{retries} for {method}")
            if attempt < retries - 1:
                import time
                time.sleep(2 ** attempt)
        except Exception as e:
            last_err = e
            print(f"[tg_api] error attempt {attempt + 1}/{retries} for {method}: {e}")
            break
    print(f"[tg_api] all attempts failed for {method}: {last_err}")
    return {"ok": False, "description": f"ConnectTimeout after {retries} retries: {last_err}"}


def send_message(chat_id, text, parse_mode='Markdown', reply_markup=None):
    data = {'chat_id': chat_id, 'text': text, 'parse_mode': parse_mode}
    if reply_markup:
        data['reply_markup'] = reply_markup
    return tg_api('sendMessage', data)


def handler(event, context):
    """Telegram-бот: webhook для команд организаторов (verify, add, list, remove, template, test, help)"""
    if event.get('httpMethod') == 'OPTIONS':
        return options_response()

    method = event.get('httpMethod', 'GET')
    params = event.get('queryStringParameters') or {}

    if method == 'GET' and params.get('action') == 'tg_info':
        return handle_tg_info(params)

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
        # VK Callback API: событие от сообщества ВКонтакте
        if 'type' in body and 'group_id' in body:
            result = handle_vk_callback(body)
            return {'statusCode': 200, 'headers': {}, 'body': result}
        if body.get('action') == 'publish_event':
            return handle_publish_event(body)
        if body.get('action') == 'publish_content':
            return handle_publish_content(body)
        if body.get('action') == 'flush_scheduled':
            return handle_flush_scheduled(body)
        if body.get('action') == 'notify_signup':
            return handle_notify_signup(body)
        if body.get('action') == 'notify_question':
            return handle_notify_question(body)
        if body.get('action') == 'get_channels':
            return handle_get_channels(body)
        if body.get('action') == 'preview_content':
            return handle_preview_content(body)

    return respond(200, {'ok': True})


def handle_set_webhook(event):
    webhook_url = 'https://functions.poehali.dev/c54f8799-96a5-4519-a2c7-e1b2e5f9d8c1'
    tg_api('deleteWebhook', {'drop_pending_updates': True})
    result = tg_api('setWebhook', {
        'url': webhook_url,
        'allowed_updates': ['message', 'channel_post'],
        'drop_pending_updates': True
    })
    return respond(200, {'webhook_url': webhook_url, 'result': result})


def handle_tg_info(params):
    """Возвращает статус привязки TG и количество каналов для любого коммерческого пользователя."""
    token = params.get('token', '')
    if not token:
        return respond(401, {'error': 'Не авторизован'})
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
        return respond(401, {'error': 'Сессия истекла'})
    user_id = user['id']
    cur.execute(f"SELECT id FROM {schema}.tg_linked_accounts WHERE user_id = {user_id} LIMIT 1")
    tg_linked = cur.fetchone() is not None
    cur.execute(f"SELECT COUNT(*) as cnt FROM {schema}.tg_channels WHERE user_id = {user_id} AND is_active = TRUE")
    row = cur.fetchone()
    tg_channels_count = int(row['cnt']) if row else 0
    conn.close()
    return respond(200, {'tg_linked': tg_linked, 'tg_channels_count': tg_channels_count})


def handle_generate_code(params):
    token = params.get('token', '')
    if not token:
        return respond(401, {'error': 'Необходимо войти в аккаунт. Пожалуйста, авторизуйтесь на сайте и попробуйте снова.'})

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
        return respond(401, {'error': 'Сессия устарела или недействительна. Выйдите из аккаунта и войдите снова, затем повторите попытку.'})

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
    chat_type = chat.get('type', 'private')
    text = (message.get('text') or '').strip()
    tg_user = message.get('from', {})
    tg_user_id = tg_user.get('id')

    # В группах и каналах бот молчит — только публикует события с сайта
    if chat_type in ('group', 'supergroup', 'channel'):
        if message.get('forward_from_chat'):
            handle_forwarded_message(message, tg_user_id)
        return

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


def send_organizer_email(to_email, organizer_name, event_title, event_date, event_time, bath_name,
                          signup_name, signup_phone, signup_email, signup_telegram, spots_left,
                          comment='', guests=None):
    """Уведомление организатору о новой записи по Email через Unisender Go."""
    api_key = os.environ.get('UNISENDER_API_KEY', '')
    sender_email = os.environ.get('UNISENDER_SENDER_EMAIL', '')
    sender_name = os.environ.get('UNISENDER_SENDER_NAME', 'Уведомления')
    if not api_key or not sender_email:
        return False

    tg_line = f"<tr><td style='padding:4px 0;color:#888;width:110px;'>Telegram:</td><td style='padding:4px 0;'>{signup_telegram}</td></tr>" if signup_telegram else ""

    guests_block = ""
    if guests:
        rows = "".join(
            f"<tr><td style='padding:3px 0;color:#888;width:110px;'>Участник {i+2}:</td>"
            f"<td style='padding:3px 0;'>{g.get('name') or '—'}"
            f"{(' · ' + g['phone']) if g.get('phone') else ''}</td></tr>"
            for i, g in enumerate(guests)
        )
        guests_block = f"""
    <div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-top:12px;">
      <p style="color:#1a1a1a;font-size:13px;font-weight:600;margin:0 0 10px;">👥 Доп. участники ({len(guests)})</p>
      <table style="width:100%;font-size:13px;color:#444;">{rows}</table>
    </div>"""

    comment_block = ""
    if comment:
        comment_block = f"""
    <div style="border:1px solid #e5e7eb;border-radius:8px;padding:14px;margin-top:12px;background:#fafafa;">
      <p style="color:#888;font-size:12px;margin:0 0 4px;">💬 Комментарий участника</p>
      <p style="color:#333;font-size:13px;margin:0;">{comment}</p>
    </div>"""

    html = f"""
<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:20px;background:#f9fafb;">
  <div style="background:#fff;border-radius:12px;padding:28px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
    <div style="text-align:center;margin-bottom:20px;">
      <div style="width:52px;height:52px;background:#fef9c3;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:26px;">🎫</div>
    </div>
    <h1 style="color:#1a1a1a;font-size:20px;text-align:center;margin:0 0 6px;">Новая запись!</h1>
    <p style="color:#666;text-align:center;margin:0 0 24px;font-size:14px;">{organizer_name}, кто-то записался на вашу встречу</p>
    <div style="background:#f8fafc;border-radius:8px;padding:16px;margin-bottom:20px;">
      <p style="color:#1a1a1a;font-size:15px;font-weight:600;margin:0 0 12px;">📌 {event_title}</p>
      <table style="width:100%;font-size:13px;color:#444;">
        <tr><td style="padding:3px 0;color:#888;width:80px;">Дата:</td><td style="padding:3px 0;font-weight:600;">{event_date}, {event_time}</td></tr>
        <tr><td style="padding:3px 0;color:#888;">Место:</td><td style="padding:3px 0;">{bath_name}</td></tr>
        <tr><td style="padding:3px 0;color:#888;">Мест осталось:</td><td style="padding:3px 0;font-weight:600;">{spots_left}</td></tr>
      </table>
    </div>
    <div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;">
      <p style="color:#1a1a1a;font-size:13px;font-weight:600;margin:0 0 10px;">👤 Участник</p>
      <table style="width:100%;font-size:13px;color:#444;">
        <tr><td style="padding:3px 0;color:#888;width:80px;">Имя:</td><td style="padding:3px 0;font-weight:600;">{signup_name}</td></tr>
        <tr><td style="padding:3px 0;color:#888;">Телефон:</td><td style="padding:3px 0;">{signup_phone}</td></tr>
        <tr><td style="padding:3px 0;color:#888;">Email:</td><td style="padding:3px 0;">{signup_email}</td></tr>
        {tg_line}
      </table>
    </div>
    {guests_block}
    {comment_block}
    <hr style="border:none;border-top:1px solid #eee;margin:20px 0;">
    <p style="color:#aaa;font-size:11px;text-align:center;margin:0;">Управляйте участниками в личном кабинете организатора.</p>
  </div>
</div>"""

    message = {
        "recipients": [{"email": to_email, "name": organizer_name}],
        "from_email": sender_email,
        "from_name": sender_name,
        "subject": f"Новая запись — {event_title}",
        "body": {"html": html},
        "track_links": 0,
        "track_read": 0,
        "tags": ["organizer-signup-notify"],
    }
    try:
        r = requests.post(
            "https://go2.unisender.ru/ru/transactional/api/v1/email/send.json",
            headers={"Content-Type": "application/json", "X-API-KEY": api_key},
            json={"message": message},
            timeout=10,
        )
        return r.status_code == 200
    except Exception:
        return False


def send_organizer_vk(vk_user_id, event_title, event_date, event_time,
                      signup_name, signup_phone, spots_left, comment='', guests=None):
    """Уведомление организатору через ВКонтакте."""
    token = os.environ.get('VK_COMMUNITY_TOKEN', '')
    community_id = int(os.environ.get('VK_COMMUNITY_ID', '0'))
    if not token or not community_id:
        return False
    import random as _random
    text = (
        f"🎫 Новая запись на встречу!\n\n"
        f"📌 {event_title}\n"
        f"📅 {event_date}, {event_time}\n\n"
        f"👤 {signup_name}\n"
        f"📞 {signup_phone}\n"
    )
    if guests:
        text += f"\n👥 Доп. участники ({len(guests)}):\n"
        for g in (guests or []):
            g_name = g.get('name') or '—'
            g_phone = g.get('phone') or ''
            text += f"  • {g_name}" + (f" {g_phone}" if g_phone else "") + "\n"
    if comment:
        text += f"\n💬 {comment}\n"
    text += f"\n🪑 Осталось мест: {spots_left}"
    try:
        r = requests.post(
            "https://api.vk.com/method/messages.send",
            data={
                "user_id": vk_user_id,
                "message": text,
                "random_id": _random.randint(1, 2**31),
                "group_id": community_id,
                "access_token": token,
                "v": "5.131",
            },
            timeout=10,
        )
        return "response" in r.json()
    except Exception:
        return False


def handle_notify_signup(body):
    organizer_id = body.get('organizer_id')
    if not organizer_id:
        return respond(400, {'error': 'Не указан идентификатор организатора.'})

    signup_name     = body.get('signup_name', '')
    signup_phone    = body.get('signup_phone', '')
    signup_email    = body.get('signup_email', '')
    signup_telegram = body.get('signup_telegram', '')
    event_title     = body.get('event_title', '')
    event_date      = body.get('event_date', '')
    event_time      = body.get('event_time', '')
    bath_name       = body.get('bath_name', '')
    spots_left      = body.get('spots_left', '—')
    comment         = (body.get('comment') or '').strip()
    guests          = body.get('guests') or []
    if not isinstance(guests, list):
        guests = []

    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    schema = get_schema()

    # Получаем данные организатора: email, vk_id, настройки уведомлений
    cur.execute(f"""
        SELECT u.email, u.name, u.vk_id,
               COALESCE(op.notify_telegram, true) AS notify_telegram,
               COALESCE(op.notify_email, true)    AS notify_email,
               COALESCE(op.notify_vk, false)      AS notify_vk
        FROM {schema}.users u
        LEFT JOIN {schema}.organizer_profiles op ON op.user_id = u.id
        WHERE u.id = {organizer_id}
    """)
    organizer = cur.fetchone()

    # Telegram-аккаунт организатора
    cur.execute(f"""
        SELECT telegram_user_id
        FROM {schema}.tg_linked_accounts
        WHERE user_id = {organizer_id}
    """)
    tg_link = cur.fetchone()
    conn.close()

    if not organizer:
        return respond(200, {'ok': True, 'sent': False, 'reason': 'organizer_not_found'})

    results = {}

    # ── Telegram ──────────────────────────────────────────────────────────────
    if organizer['notify_telegram'] and tg_link:
        tg_text = (
            f"🎫 *Новая запись на событие!*\n\n"
            f"📌 {event_title}\n"
            f"📅 {event_date}, {event_time}\n"
            f"🏠 {bath_name}\n\n"
            f"👤 {signup_name}\n"
            f"📞 {signup_phone}\n"
            f"📧 {signup_email}\n"
        )
        if signup_telegram:
            tg_text += f"✈️ {signup_telegram}\n"
        if guests:
            tg_text += f"\n👥 Доп. участники ({len(guests)}):\n"
            for g in guests:
                g_name = g.get('name') or '—'
                g_phone = g.get('phone') or ''
                tg_text += f"  • {g_name}" + (f" {g_phone}" if g_phone else "") + "\n"
        if comment:
            tg_text += f"\n💬 Комментарий: {comment}\n"
        tg_text += f"\n🪑 Осталось мест: {spots_left}"
        result = send_message(tg_link['telegram_user_id'], tg_text)
        print(f"[notify_signup] tg_user_id={tg_link['telegram_user_id']} result={result}")
        results['telegram'] = result.get('ok', False)
        if not result.get('ok'):
            results['telegram_error'] = result.get('description', 'unknown')

    # ── Email ─────────────────────────────────────────────────────────────────
    if organizer['notify_email'] and organizer.get('email'):
        ok = send_organizer_email(
            to_email=organizer['email'],
            organizer_name=organizer.get('name') or '',
            event_title=event_title, event_date=event_date, event_time=event_time,
            bath_name=bath_name, signup_name=signup_name, signup_phone=signup_phone,
            signup_email=signup_email, signup_telegram=signup_telegram, spots_left=spots_left,
            comment=comment, guests=guests,
        )
        results['email'] = ok

    # ── VКонтакте ─────────────────────────────────────────────────────────────
    if organizer['notify_vk'] and organizer.get('vk_id'):
        ok = send_organizer_vk(
            vk_user_id=organizer['vk_id'],
            event_title=event_title, event_date=event_date, event_time=event_time,
            signup_name=signup_name, signup_phone=signup_phone, spots_left=spots_left,
            comment=comment, guests=guests,
        )
        results['vk'] = ok

    sent = any(results.values()) if results else False
    return respond(200, {'ok': True, 'sent': sent, 'channels': results})


def handle_notify_question(body):
    """Уведомление организатору в Telegram о новом вопросе от гостя по событию."""
    organizer_id = body.get('organizer_id')
    if not organizer_id:
        return respond(400, {'error': 'Не указан идентификатор организатора.'})

    event_title  = body.get('event_title', '')
    event_date   = body.get('event_date', '')
    event_time   = body.get('event_time', '')
    bath_name    = body.get('bath_name', '')
    event_url    = body.get('event_url', '')
    guest_name   = body.get('guest_name', '')
    guest_contact = body.get('guest_contact', '')
    contact_type = (body.get('contact_type') or 'email').lower()
    message      = body.get('message', '')

    contact_icon = {'email': '📧', 'phone': '📞', 'telegram': '✈️'}.get(contact_type, '📩')

    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    schema = get_schema()

    try:
        organizer_id_int = int(organizer_id)
    except Exception:
        conn.close()
        return respond(400, {'error': 'Некорректный organizer_id'})

    cur.execute(f"""
        SELECT COALESCE(op.notify_telegram, true) AS notify_telegram
        FROM {schema}.users u
        LEFT JOIN {schema}.organizer_profiles op ON op.user_id = u.id
        WHERE u.id = {organizer_id_int}
    """)
    organizer = cur.fetchone()

    cur.execute(f"""
        SELECT telegram_user_id
        FROM {schema}.tg_linked_accounts
        WHERE user_id = {organizer_id_int}
    """)
    tg_link = cur.fetchone()
    conn.close()

    if not organizer:
        return respond(200, {'ok': True, 'sent': False, 'reason': 'organizer_not_found'})

    if not (organizer.get('notify_telegram') and tg_link):
        return respond(200, {'ok': True, 'sent': False, 'reason': 'no_tg_link_or_disabled'})

    # Markdown-safe экранирование (минимально нужное для parse_mode=Markdown)
    def md_escape(s):
        if not s:
            return ''
        return str(s).replace('_', r'\_').replace('*', r'\*').replace('`', r'\`').replace('[', r'\[')

    msg_safe = md_escape(message)[:2000]
    text = (
        f"❓ *Новый вопрос по событию!*\n\n"
        f"📌 {md_escape(event_title)}\n"
        f"📅 {md_escape(event_date)}, {md_escape(event_time)}\n"
    )
    if bath_name:
        text += f"🏠 {md_escape(bath_name)}\n"
    text += (
        f"\n👤 {md_escape(guest_name)}\n"
        f"{contact_icon} {md_escape(guest_contact)}\n\n"
        f"💬 {msg_safe}"
    )
    if event_url:
        text += f"\n\n👉 [Открыть событие]({event_url})"

    result = send_message(tg_link['telegram_user_id'], text)
    sent = bool(result.get('ok'))
    return respond(200, {'ok': True, 'sent': sent, 'tg': result})


def handle_publish_event(body):
    event_id = body.get('event_id')
    organizer_id = body.get('organizer_id')
    if not event_id or not organizer_id:
        return respond(400, {'error': 'Не указан идентификатор события или организатора. Пожалуйста, обратитесь в поддержку.'})

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
        return respond(404, {'error': 'Событие не найдено. Возможно, оно было удалено.'})

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
        'url': f"https://sparcom.ru/e/{ev['short_code']}" if ev.get('short_code') else f"https://sparcom.ru/events/{ev.get('slug') or ev['id']}",
    }

    published = 0
    errors = []

    for ch in channels:
        # Пропускаем только успешно отправленные; ошибочные — повторяем
        cur.execute(f"""
            SELECT id, status FROM {schema}.tg_publications
            WHERE event_id = {event_id} AND channel_id = {ch['id']}
        """)
        prev = cur.fetchone()
        if prev and prev['status'] == 'sent':
            published += 1
            continue

        template = ch['template'] or DEFAULT_TEMPLATE
        try:
            text = template.format(**template_vars)
        except (KeyError, IndexError):
            text = DEFAULT_TEMPLATE.format(**template_vars)

        photo_url = ev.get('image_url')
        result = None

        try:
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
        except Exception as e:
            result = {'ok': False, 'description': str(e)}

        status = 'sent' if result.get('ok') else 'error'
        msg_id = result.get('result', {}).get('message_id')
        err_text = result.get('description') if not result.get('ok') else None

        if err_text:
            err_text = err_text.replace("'", "''")

        print(f"[publish_event] event={event_id} channel={ch['chat_title']} status={status} msg_id={msg_id} err={err_text}")

        # Сохраняем результат всегда — при ошибке пишем статус 'error',
        # чтобы повторная попытка не пропускала канал как «уже отправленный»
        cur.execute(f"""
            SELECT id, status FROM {schema}.tg_publications
            WHERE event_id = {event_id} AND channel_id = {ch['id']}
        """)
        existing = cur.fetchone()

        if existing and existing['status'] == 'sent':
            pass  # уже успешно отправлено ранее — не трогаем
        elif existing:
            cur.execute(f"""
                UPDATE {schema}.tg_publications
                SET status='{status}', message_id={msg_id or 'NULL'},
                    error_text={f"'{err_text}'" if err_text else 'NULL'},
                    created_at=NOW()
                WHERE event_id = {event_id} AND channel_id = {ch['id']}
            """)
        else:
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


# ─── Шаблоны по типам контента ────────────────────────────────────────────────

CONTENT_TEMPLATES = {
    'event': DEFAULT_TEMPLATE,
    'master_service': """💆 *{title}*

👤 Мастер: {master_name}
📍 {place}
💰 {price}
⏱ Продолжительность: {duration}

{description_short}

👉 [Записаться]({url})""",
    'bath': """🏛 *{title}*

📍 {address}
💰 от {price}

{description_short}

👉 [Подробнее]({url})""",
    'article': """📖 *{title}*

{excerpt}

👉 [Читать статью]({url})""",
}


def _apply_vars(text, tpl_vars):
    """Подставляет переменные {key} в произвольный текст. Неизвестные переменные оставляет как есть."""
    if not text:
        return text
    result = text
    for key, value in (tpl_vars or {}).items():
        result = result.replace('{' + key + '}', str(value))
    return result


def _format_content(content_type, data, channel_template=None):
    """Форматирует текст поста по типу контента и данным."""
    months = ['января','февраля','марта','апреля','мая','июня',
              'июля','августа','сентября','октября','ноября','декабря']

    if content_type == 'event':
        ev = data
        date_str = ''
        if ev.get('event_date'):
            d = ev['event_date']
            if hasattr(d, 'day'):
                date_str = f"{d.day} {months[d.month - 1]} {d.year}"
            else:
                date_str = str(d)
        time_str = ''
        if ev.get('start_time'):
            st = ev['start_time']
            start = st.strftime('%H:%M') if hasattr(st, 'strftime') else str(st)[:5]
            end_t = ev.get('end_time')
            if end_t:
                end = end_t.strftime('%H:%M') if hasattr(end_t, 'strftime') else str(end_t)[:5]
                time_str = f"{start} — {end}"
            else:
                time_str = start
        price_str = ev.get('price_label') or (f"{ev['price_amount']} ₽" if ev.get('price_amount') else '')
        address = ev.get('bath_address') or ''
        vars_ = {
            'title': ev.get('title') or '',
            'date': date_str,
            'time': time_str,
            'place': ev.get('bath_name') or '',
            'address': address,
            'address_line': f"📌 {address}" if address else '',
            'price': price_str or 'Бесплатно',
            'spots_left': str(ev.get('spots_left') or ev.get('total_spots') or '—'),
            'description_short': (ev.get('short_description') or ev.get('description') or '')[:300],
            'url': f"https://sparcom.ru/e/{ev['short_code']}" if ev.get('short_code') else f"https://sparcom.ru/events/{ev.get('slug') or ev['id']}",
        }
        photo_url = ev.get('image_url')

    elif content_type == 'master_service':
        svc = data
        duration = ''
        if svc.get('duration_minutes'):
            d = int(svc['duration_minutes'])
            duration = f"{d // 60} ч {d % 60} мин" if d >= 60 else f"{d} мин"
        vars_ = {
            'title': svc.get('service_name') or svc.get('name') or '',
            'master_name': svc.get('master_name') or '',
            'place': svc.get('city') or '',
            'price': f"{svc.get('price', 0)} ₽" if svc.get('price') else 'По договорённости',
            'duration': duration or '—',
            'description_short': (svc.get('description') or '')[:300],
            'url': f"https://sparcom.ru/masters/{svc.get('master_slug') or svc.get('master_id', '')}",
        }
        photo_url = svc.get('avatar') or svc.get('photo_url')

    elif content_type == 'bath':
        bath = data
        price = bath.get('price_from') or bath.get('price_per_hour')
        vars_ = {
            'title': bath.get('name') or '',
            'address': bath.get('address') or '',
            'price': f"{price} ₽" if price else 'По запросу',
            'description_short': (bath.get('description') or '')[:300],
            'url': f"https://sparcom.ru/baths/{bath.get('slug') or bath.get('id', '')}",
        }
        photo_url = (bath.get('photos') or [None])[0] if isinstance(bath.get('photos'), list) else None

    elif content_type == 'article':
        art = data
        vars_ = {
            'title': art.get('title') or '',
            'excerpt': (art.get('excerpt') or art.get('content') or '')[:400],
            'url': f"https://sparcom.ru/blog/{art.get('slug') or art.get('id', '')}",
        }
        photo_url = art.get('image_url')

    else:
        return None, None, {}

    default_tpl = CONTENT_TEMPLATES.get(content_type, '')
    template = channel_template or default_tpl
    try:
        text = template.format(**vars_)
    except (KeyError, IndexError):
        text = default_tpl.format(**vars_)
    return text, photo_url, vars_


def handle_get_channels(body):
    """Возвращает список активных каналов пользователя для фронтенда."""
    user_id = body.get('user_id')
    if not user_id:
        return respond(400, {'error': 'user_id required'})
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    schema = get_schema()
    cur.execute(f"""
        SELECT id, chat_id, chat_title, chat_type, include_photo,
               content_types, auto_publish, channel_type
        FROM {schema}.tg_channels
        WHERE user_id = {int(user_id)} AND is_active = TRUE
        ORDER BY id
    """)
    channels = [dict(r) for r in cur.fetchall()]
    conn.close()
    return respond(200, {'channels': channels})


def handle_preview_content(body):
    """Возвращает сформированный текст поста для предпросмотра перед публикацией."""
    content_type = body.get('content_type')
    content_id = body.get('content_id')
    user_id = body.get('user_id')

    if not content_type or not content_id or not user_id:
        return respond(400, {'error': 'content_type, content_id, user_id обязательны'})
    if content_type not in ('event', 'master_service', 'bath', 'article'):
        return respond(400, {'error': f'Неизвестный content_type: {content_type}'})

    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    schema = get_schema()

    data = None
    if content_type == 'event':
        cur.execute(f"""
            SELECT e.*, u.name as organizer_name
            FROM {schema}.events e
            LEFT JOIN {schema}.users u ON u.id = e.organizer_id
            WHERE e.id = {int(content_id)}
        """)
        row = cur.fetchone()
        if not row:
            conn.close()
            return respond(404, {'error': 'Событие не найдено'})
        data = dict(row)
    elif content_type == 'master_service':
        cur.execute(f"""
            SELECT ms.*, m.name as master_name, m.slug as master_slug,
                   m.id as master_id, m.avatar, m.city
            FROM {schema}.master_services ms
            JOIN {schema}.masters m ON m.id = ms.master_id
            WHERE ms.id = {int(content_id)}
        """)
        row = cur.fetchone()
        if not row:
            conn.close()
            return respond(404, {'error': 'Услуга не найдена'})
        data = dict(row)
    elif content_type == 'bath':
        cur.execute(f"SELECT * FROM {schema}.baths WHERE id = {int(content_id)}")
        row = cur.fetchone()
        if not row:
            conn.close()
            return respond(404, {'error': 'Баня не найдена'})
        data = dict(row)
    elif content_type == 'article':
        cur.execute(f"""
            SELECT a.*, u.name as author_name
            FROM {schema}.blog_articles a
            JOIN {schema}.users u ON u.id = a.author_id
            WHERE a.id = {int(content_id)}
        """)
        row = cur.fetchone()
        if not row:
            conn.close()
            return respond(404, {'error': 'Статья не найдена'})
        data = dict(row)

    conn.close()

    text, photo_url, tpl_vars = _format_content(content_type, data)

    # Сериализуем datetime/date объекты
    def safe_str(v):
        if hasattr(v, 'isoformat'):
            return v.isoformat()
        return v

    safe_data = {k: safe_str(v) for k, v in data.items() if isinstance(v, (str, int, float, bool, type(None))) or hasattr(v, 'isoformat')}

    return respond(200, {
        'ok': True,
        'text': text or '',
        'photo_url': photo_url or '',
        'content_type': content_type,
        'content_id': content_id,
        'meta': safe_data,
        'vars': tpl_vars or {},
    })


def handle_publish_content(body):
    """Универсальная публикация контента в Telegram-каналы.

    Поддерживает типы: event, master_service, bath, article.
    body: {
        content_type: str,
        content_id: int,
        user_id: int,
        channel_ids: list[int] | None (если None — все активные),
        publication_type: 'manual' | 'auto' | 'repeat' (default: 'manual'),
        allow_repeat: bool (default: False — не публиковать если уже было),
        scheduled_at: str | None (ISO datetime для отложенной публикации),
        published_by: int | None
    }
    """
    content_type = body.get('content_type')
    content_id = body.get('content_id')
    user_id = body.get('user_id')
    channel_ids = body.get('channel_ids')  # None = все активные
    pub_type = body.get('publication_type', 'manual')
    allow_repeat = body.get('allow_repeat', False)
    scheduled_at = body.get('scheduled_at')
    published_by = body.get('published_by')
    custom_text = body.get('custom_text') or None

    if not content_type or not content_id or not user_id:
        return respond(400, {'error': 'content_type, content_id, user_id обязательны'})
    if content_type not in ('event', 'master_service', 'bath', 'article'):
        return respond(400, {'error': f'Неизвестный content_type: {content_type}'})

    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    schema = get_schema()

    # Получаем каналы
    if channel_ids:
        ids_str = ','.join(str(int(i)) for i in channel_ids)
        cur.execute(f"""
            SELECT id, chat_id, chat_title, template, include_photo
            FROM {schema}.tg_channels
            WHERE user_id = {int(user_id)} AND is_active = TRUE AND id IN ({ids_str})
        """)
    else:
        cur.execute(f"""
            SELECT id, chat_id, chat_title, template, include_photo
            FROM {schema}.tg_channels
            WHERE user_id = {int(user_id)} AND is_active = TRUE
        """)
    channels = [dict(r) for r in cur.fetchall()]

    if not channels:
        conn.close()
        return respond(200, {'ok': True, 'published': 0, 'reason': 'no_channels'})

    # Загружаем данные контента
    data = None
    if content_type == 'event':
        cur.execute(f"""
            SELECT e.*, u.name as organizer_name
            FROM {schema}.events e
            LEFT JOIN {schema}.users u ON u.id = e.organizer_id
            WHERE e.id = {int(content_id)}
        """)
        row = cur.fetchone()
        if not row:
            conn.close()
            return respond(404, {'error': 'Событие не найдено'})
        data = dict(row)

    elif content_type == 'master_service':
        cur.execute(f"""
            SELECT ms.*, m.name as master_name, m.slug as master_slug,
                   m.id as master_id, m.avatar, m.city
            FROM {schema}.master_services ms
            JOIN {schema}.masters m ON m.id = ms.master_id
            WHERE ms.id = {int(content_id)}
        """)
        row = cur.fetchone()
        if not row:
            conn.close()
            return respond(404, {'error': 'Услуга не найдена'})
        data = dict(row)

    elif content_type == 'bath':
        cur.execute(f"SELECT * FROM {schema}.baths WHERE id = {int(content_id)}")
        row = cur.fetchone()
        if not row:
            conn.close()
            return respond(404, {'error': 'Баня не найдена'})
        data = dict(row)

    elif content_type == 'article':
        cur.execute(f"""
            SELECT a.*, u.name as author_name
            FROM {schema}.blog_articles a
            JOIN {schema}.users u ON u.id = a.author_id
            WHERE a.id = {int(content_id)}
        """)
        row = cur.fetchone()
        if not row:
            conn.close()
            return respond(404, {'error': 'Статья не найдена'})
        data = dict(row)

    published = 0
    errors = []

    for ch in channels:
        # Проверяем дубль (если не allow_repeat)
        if not allow_repeat:
            cur.execute(f"""
                SELECT id FROM {schema}.tg_pub_universal
                WHERE channel_id = {ch['id']} AND content_type = '{content_type}'
                  AND content_id = {int(content_id)} AND publication_type != 'repeat'
            """)
            if cur.fetchone():
                continue

        if custom_text:
            _, photo_url, tpl_vars = _format_content(content_type, data, ch.get('template'))
            text = _apply_vars(custom_text, tpl_vars)
        else:
            text, photo_url, _ = _format_content(content_type, data, ch.get('template'))

        pub_type_safe = pub_type.replace("'", "''")
        published_by_sql = str(int(published_by)) if published_by else 'NULL'
        sched_sql = f"'{scheduled_at}'" if scheduled_at else 'NULL'

        # Отложенная публикация — только сохраняем запись
        if scheduled_at:
            cur.execute(f"""
                INSERT INTO {schema}.tg_pub_universal
                    (user_id, channel_id, content_type, content_id, message_id,
                     status, error_text, scheduled_at, published_by, publication_type)
                VALUES
                    ({int(user_id)}, {ch['id']}, '{content_type}', {int(content_id)},
                     NULL, 'scheduled', NULL, {sched_sql}, {published_by_sql}, '{pub_type_safe}')
                ON CONFLICT (channel_id, content_type, content_id, publication_type)
                DO UPDATE SET status='scheduled', scheduled_at=EXCLUDED.scheduled_at,
                              published_by=EXCLUDED.published_by
            """)
            published += 1
            continue

        result = None
        if photo_url and ch.get('include_photo'):
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
        msg_id = result.get('result', {}).get('message_id') if result else None
        err_text = result.get('description') if result and not result.get('ok') else None
        if err_text:
            err_text = err_text.replace("'", "''")

        msg_id_sql = str(msg_id) if msg_id else 'NULL'
        err_sql = f"'{err_text}'" if err_text else 'NULL'

        cur.execute(f"""
            INSERT INTO {schema}.tg_pub_universal
                (user_id, channel_id, content_type, content_id, message_id,
                 status, error_text, scheduled_at, published_by, publication_type)
            VALUES
                ({int(user_id)}, {ch['id']}, '{content_type}', {int(content_id)},
                 {msg_id_sql}, '{status}', {err_sql}, {sched_sql}, {published_by_sql}, '{pub_type_safe}')
            ON CONFLICT (channel_id, content_type, content_id, publication_type)
            DO UPDATE SET status=EXCLUDED.status, message_id=EXCLUDED.message_id,
                          error_text=EXCLUDED.error_text, published_at=CURRENT_TIMESTAMP
        """)

        if status == 'sent':
            published += 1
        else:
            errors.append({'channel': ch.get('chat_title', ''), 'error': result.get('description', '') if result else ''})

    conn.commit()
    conn.close()
    return respond(200, {'ok': True, 'published': published, 'scheduled': scheduled_at is not None, 'errors': errors})


def handle_flush_scheduled(body):
    """Отправляет все отложенные публикации, время которых уже наступило."""
    user_id = body.get('user_id')
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    schema = get_schema()

    where_user = f"AND p.user_id = {int(user_id)}" if user_id else ''
    cur.execute(f"""
        SELECT p.id, p.user_id, p.channel_id, p.content_type, p.content_id,
               p.publication_type, p.published_by,
               ch.chat_id, ch.chat_title, ch.template, ch.include_photo
        FROM {schema}.tg_pub_universal p
        JOIN {schema}.tg_channels ch ON ch.id = p.channel_id
        WHERE p.status = 'scheduled'
          AND p.scheduled_at <= NOW()
          {where_user}
        ORDER BY p.scheduled_at
        LIMIT 50
    """)
    rows = [dict(r) for r in cur.fetchall()]

    sent = 0
    errors = []

    for row in rows:
        content_type = row['content_type']
        content_id = row['content_id']
        data = None

        if content_type == 'event':
            cur.execute(f"SELECT e.*, u.name as organizer_name FROM {schema}.events e LEFT JOIN {schema}.users u ON u.id = e.organizer_id WHERE e.id = {int(content_id)}")
        elif content_type == 'master_service':
            cur.execute(f"SELECT ms.*, m.name as master_name, m.slug as master_slug, m.id as master_id, m.avatar, m.city FROM {schema}.master_services ms JOIN {schema}.masters m ON m.id = ms.master_id WHERE ms.id = {int(content_id)}")
        elif content_type == 'bath':
            cur.execute(f"SELECT * FROM {schema}.baths WHERE id = {int(content_id)}")
        elif content_type == 'article':
            cur.execute(f"SELECT a.*, u.name as author_name FROM {schema}.blog_articles a JOIN {schema}.users u ON u.id = a.author_id WHERE a.id = {int(content_id)}")
        else:
            continue

        r = cur.fetchone()
        if not r:
            cur.execute(f"UPDATE {schema}.tg_pub_universal SET status='error', error_text='content_not_found' WHERE id = {row['id']}")
            continue
        data = dict(r)

        text, photo_url, _ = _format_content(content_type, data, row.get('template'))

        result = None
        if photo_url and row.get('include_photo'):
            result = tg_api('sendPhoto', {'chat_id': row['chat_id'], 'photo': photo_url, 'caption': text, 'parse_mode': 'Markdown'})
            if not result.get('ok'):
                result = send_message(row['chat_id'], text)
        else:
            result = send_message(row['chat_id'], text)

        if result and result.get('ok'):
            msg_id = result.get('result', {}).get('message_id')
            msg_id_sql = str(msg_id) if msg_id else 'NULL'
            cur.execute(f"UPDATE {schema}.tg_pub_universal SET status='sent', message_id={msg_id_sql}, published_at=NOW() WHERE id = {row['id']}")
            sent += 1
        else:
            err = (result.get('description', 'unknown') if result else 'no_response').replace("'", "''")
            cur.execute(f"UPDATE {schema}.tg_pub_universal SET status='error', error_text='{err}' WHERE id = {row['id']}")
            errors.append({'channel': row.get('chat_title', ''), 'error': err})

    conn.commit()
    conn.close()
    return respond(200, {'ok': True, 'flushed': sent, 'errors': errors})