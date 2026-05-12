import json
import os
import hashlib
import secrets
import psycopg2
import psycopg2.extras
import requests

from shared import *


def handler(event, context):
    """API для управления событиями и записями на них"""
    if event.get('httpMethod') == 'OPTIONS':
        return options_response()

    headers = CORS_HEADERS
    method = event.get('httpMethod', 'GET')
    params = event.get('queryStringParameters') or {}
    resource = params.get('resource', 'events')
    schema = get_schema()

    if resource == 'signups':
        return handle_signups(event, method, params, schema, headers)

    if resource == 'question':
        return handle_question(event, method, params, schema, headers)

    return handle_events(event, method, params, schema, headers)


def handle_events(event, method, params, schema, headers):
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    if method == 'GET':
        short_code = params.get('short_code')
        if short_code:
            cur.execute(
                f"SELECT * FROM {schema}.events WHERE short_code = '{short_code}' AND is_visible = true"
            )
            row = cur.fetchone()
            conn.close()
            if not row:
                return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'Not found'})}
            return {'statusCode': 200, 'headers': headers, 'body': json.dumps(serialize_event(row, cur, schema), default=str)}

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
            if not row:
                conn.close()
                return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'Not found'})}
            event_data = serialize_event(row, cur, schema)
            if row.get('pricing_type') == 'dynamic':
                cur.execute(f"SELECT * FROM event_pricing_tiers WHERE event_id = {row['id']} ORDER BY sort_order, valid_until NULLS LAST")
                event_data['pricing_tiers'] = [dict(t) for t in cur.fetchall()]
            conn.close()
            return {'statusCode': 200, 'headers': headers, 'body': json.dumps(event_data, default=str)}

        only_visible = params.get('visible', 'true')
        where = f"WHERE is_visible = true" if only_visible == 'true' else ""
        order = "ORDER BY event_date ASC, start_time ASC"
        cur.execute(f"SELECT * FROM {schema}.events {where} {order}")
        rows = cur.fetchall()
        results = [serialize_event(r, cur, schema) for r in rows]
        conn.close()
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps(results, default=str)
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

        # Генерируем уникальный short_code
        import random, string
        while True:
            short_code = ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))
            cur.execute(f"SELECT id FROM {schema}.events WHERE short_code = '{short_code}'")
            if not cur.fetchone():
                break

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
                title, slug, short_code, short_description, full_description, description,
                event_date, start_time, end_time,
                event_type, event_type_icon, occupancy,
                bath_name, bath_address, image_url,
                price, price_amount, price_label,
                total_spots, spots_left, featured, is_visible,
                program, rules
            ) VALUES (
                '{title}', '{slug}', '{short_code}', '{short_desc}', '{full_desc}', '{description}',
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

        # ── ЗАЩИТА ОТ СПАМА ──────────────────────────────────────
        # 1) honeypot — скрытое поле, которое заполняют боты
        honeypot = (body.get('website') or body.get('hp_field') or '').strip()
        if honeypot:
            conn.close()
            return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'ok': True, 'id': 0})}

        # 2) минимальное время заполнения формы (живой человек не успеет за 2 сек)
        try:
            form_open_ms = int(body.get('form_open_ms') or 0)
        except (ValueError, TypeError):
            form_open_ms = 0
        if 0 < form_open_ms < 2000:
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Слишком быстрое заполнение формы'})}

        # 3) rate-limit по IP: не больше 5 заявок в час и 2 в минуту
        try:
            ip_address = (event.get('requestContext', {}) or {}).get('identity', {}).get('sourceIp', '') or ''
        except Exception:
            ip_address = ''
        ip_safe = ip_address.replace("'", "''")[:64]
        if ip_safe:
            cur.execute(f"SELECT COUNT(*) AS c FROM {schema}.signup_rate_limit WHERE ip_address = '{ip_safe}' AND created_at > NOW() - INTERVAL '1 minute'")
            cnt_minute = (cur.fetchone() or {}).get('c', 0) or 0
            cur.execute(f"SELECT COUNT(*) AS c FROM {schema}.signup_rate_limit WHERE ip_address = '{ip_safe}' AND created_at > NOW() - INTERVAL '1 hour'")
            cnt_hour = (cur.fetchone() or {}).get('c', 0) or 0
            if cnt_minute >= 2 or cnt_hour >= 5:
                conn.close()
                return {'statusCode': 429, 'headers': headers, 'body': json.dumps({'error': 'Слишком много заявок. Попробуйте позже.'})}

        name = body.get('name', '').replace("'", "''")
        phone = body.get('phone', '').replace("'", "''")
        email = (body.get('email') or '').strip().replace("'", "''")
        telegram = (body.get('telegram') or '').replace("'", "''")
        consent_pd = body.get('consent_pd', False)
        event_id = body.get('event_id')
        preferred_channel_raw = (body.get('preferred_channel') or '').strip().lower()
        allowed_channels = {'telegram', 'vk', 'email', 'sms', 'phone', 'site'}
        preferred_channel = preferred_channel_raw if preferred_channel_raw in allowed_channels else 'site'
        preferred_channel = preferred_channel.replace("'", "''")

        # 4) базовая валидация длин (защита от мусора)
        if len(name) > 200 or len(phone) > 50 or len(email) > 200 or len(telegram) > 100:
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Слишком длинные поля'})}

        if not name or not phone or not event_id or not email:
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'name, phone, email, event_id required'})}

        if not consent_pd:
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Необходимо согласие на обработку персональных данных'})}

        cur.execute(f"SELECT * FROM {schema}.events WHERE id = {event_id}")
        ev = cur.fetchone()
        if not ev:
            conn.close()
            return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'Event not found'})}
        ev = dict(ev)
        is_crowdfund = ev.get('pricing_mode') == 'crowdfund'

        # Для crowdfund: считаем спецлогику взноса/максцены
        cf_club_fee_charged = 0
        cf_joined_after_freeze = False
        cf_final_price_due = None
        if is_crowdfund:
            # Сколько уже записано
            cur.execute(
                f"SELECT COUNT(*) AS n FROM {schema}.event_signups "
                f"WHERE event_id = {event_id} AND COALESCE(status,'') NOT IN ('cancelled','отменено')"
            )
            r = cur.fetchone()
            current_count = int(r['n']) if r else 0
            cf_info = compute_crowdfund_info(ev, current_count)
            cf_max = cf_info['max_participants'] or ev.get('total_spots') or 0
            if cf_max and current_count >= cf_max:
                conn.close()
                return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'No spots left'})}
            if ev.get('cf_status') == 'cancelled':
                conn.close()
                return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Event cancelled'})}

            # После стоп-сбора — платим максцену сразу
            try:
                from datetime import datetime
                fr = cf_info.get('freeze_at')
                if fr:
                    freeze_dt = datetime.fromisoformat(fr)
                    if datetime.now() >= freeze_dt:
                        cf_joined_after_freeze = True
            except Exception:
                pass

            if cf_joined_after_freeze:
                cf_club_fee_charged = cf_info['price_at_min']
                cf_final_price_due = cf_info['price_at_min']
            else:
                cf_club_fee_charged = cf_info['club_fee']
        else:
            if ev.get('spots_left') is not None and ev['spots_left'] <= 0:
                conn.close()
                return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'No spots left'})}

        # Проверка на дублирующую запись по телефону или email
        cur.execute(f"""
            SELECT id FROM {schema}.event_signups
            WHERE event_id = {event_id}
              AND status NOT IN ('cancelled', 'отменено')
              AND (phone = '{phone}' OR email = '{email}')
            LIMIT 1
        """)
        if cur.fetchone():
            conn.close()
            return {'statusCode': 409, 'headers': headers, 'body': json.dumps({'error': 'already_registered'})}

        user_id = find_or_create_user(cur, schema, email, name, phone, telegram)

        if is_crowdfund:
            # Запись с клубным взносом (заглушка — помечаем как «оплачен» без реального шлюза)
            cur.execute(f"""
                INSERT INTO {schema}.event_signups (
                    event_id, name, phone, email, telegram, consent_pd, user_id, preferred_channel,
                    payment_type, payment_amount,
                    joined_after_freeze, club_fee_paid, club_fee_paid_at, final_price_due, status
                )
                VALUES (
                    {event_id}, '{name}', '{phone}', '{email}', '{telegram}', true, {user_id}, '{preferred_channel}',
                    'club_fee', {int(cf_club_fee_charged or 0)},
                    {bool(cf_joined_after_freeze)}, {int(cf_club_fee_charged or 0)}, NOW(),
                    {int(cf_final_price_due) if cf_final_price_due else 'NULL'},
                    '{'paid' if cf_joined_after_freeze else 'new'}'
                )
                RETURNING *
            """)
        else:
            cur.execute(f"""
                INSERT INTO {schema}.event_signups (event_id, name, phone, email, telegram, consent_pd, user_id, preferred_channel)
                VALUES ({event_id}, '{name}', '{phone}', '{email}', '{telegram}', true, {user_id}, '{preferred_channel}')
                RETURNING *
            """)
        row = cur.fetchone()
        cur.execute(f"UPDATE {schema}.events SET spots_left = GREATEST(spots_left - 1, 0) WHERE id = {event_id}")

        if ip_safe:
            cur.execute(f"INSERT INTO {schema}.signup_rate_limit (ip_address, event_id) VALUES ('{ip_safe}', {int(event_id)})")
            cur.execute(f"DELETE FROM {schema}.signup_rate_limit WHERE created_at < NOW() - INTERVAL '1 day'")

        conn.commit()
        conn.close()

        preferred_contact_value = (body.get('preferred_contact_value') or '').strip()

        send_signup_confirmation(email, name, ev)
        send_signup_telegram(name, phone, email, telegram, ev, preferred_channel, preferred_contact_value)
        notify_organizer_telegram(ev, name, phone, email, telegram, preferred_channel, preferred_contact_value)

        return {'statusCode': 201, 'headers': headers, 'body': json.dumps(dict(row), default=str)}

    if method == 'PUT':
        body = json.loads(event.get('body', '{}'))
        signup_id = body.get('id')
        if not signup_id:
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'id required'})}
        updates = []
        if 'status' in body:
            updates.append(f"status = '{body['status'].replace(chr(39), chr(39)*2)}'")
        if 'name' in body:
            updates.append(f"name = '{body['name'].replace(chr(39), chr(39)*2)}'")
        if 'phone' in body:
            updates.append(f"phone = '{body['phone'].replace(chr(39), chr(39)*2)}'")
        if 'telegram' in body:
            updates.append(f"telegram = '{body['telegram'].replace(chr(39), chr(39)*2)}'")
        if 'comment' in body:
            updates.append(f"comment = '{body['comment'].replace(chr(39), chr(39)*2)}'")
        if not updates:
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'nothing to update'})}
        cur.execute(f"UPDATE {schema}.event_signups SET {', '.join(updates)} WHERE id = {signup_id} RETURNING *")
        row = cur.fetchone()
        conn.commit()
        conn.close()
        if not row:
            return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'Not found'})}
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps(dict(row), default=str)}

    conn.close()
    return {'statusCode': 405, 'headers': headers, 'body': json.dumps({'error': 'Method not allowed'})}


def handle_question(event, method, params, schema, headers):
    """Вопрос гостя организатору события. Пишет в event_questions + email."""
    if method != 'POST':
        return {'statusCode': 405, 'headers': headers, 'body': json.dumps({'error': 'Method not allowed'})}

    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    try:
        body = json.loads(event.get('body', '{}'))
    except Exception:
        conn.close()
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Bad JSON'})}

    event_id = body.get('event_id')
    name = (body.get('name') or '').strip()
    contact = (body.get('contact') or '').strip()
    contact_type = (body.get('contact_type') or 'email').strip().lower()
    message = (body.get('message') or '').strip()

    # авторизованный пользователь (если есть)
    auth_headers = event.get('headers', {}) or {}
    guest_user_id = None
    try:
        uid = auth_headers.get('X-User-Id') or auth_headers.get('x-user-id')
        if uid:
            guest_user_id = int(uid)
    except Exception:
        guest_user_id = None

    if not event_id or not name or not contact or not message:
        conn.close()
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'event_id, name, contact, message required'})}

    if len(name) > 200 or len(contact) > 200 or len(message) > 4000:
        conn.close()
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Слишком длинные поля'})}

    if contact_type not in ('email', 'phone', 'telegram'):
        contact_type = 'email'

    # IP rate-limit: не более 3 вопросов в минуту и 10 в час
    try:
        ip_address = (event.get('requestContext', {}) or {}).get('identity', {}).get('sourceIp', '') or ''
    except Exception:
        ip_address = ''
    ip_safe = ip_address.replace("'", "''")[:64]
    if ip_safe:
        cur.execute(f"SELECT COUNT(*) AS c FROM {schema}.event_questions WHERE ip_address = '{ip_safe}' AND created_at > NOW() - INTERVAL '1 minute'")
        cnt_min = (cur.fetchone() or {}).get('c', 0) or 0
        cur.execute(f"SELECT COUNT(*) AS c FROM {schema}.event_questions WHERE ip_address = '{ip_safe}' AND created_at > NOW() - INTERVAL '1 hour'")
        cnt_hr = (cur.fetchone() or {}).get('c', 0) or 0
        if cnt_min >= 3 or cnt_hr >= 10:
            conn.close()
            return {'statusCode': 429, 'headers': headers, 'body': json.dumps({'error': 'Слишком много обращений. Попробуйте позже.'})}

    # Достаём событие и организатора
    cur.execute(f"""
        SELECT e.id, e.title, e.slug, e.event_date, e.start_time,
               COALESCE(b.name, e.bath_name) AS bath_name,
               e.organizer_id,
               u.email AS organizer_email,
               u.name AS organizer_name
        FROM {schema}.events e
        LEFT JOIN {schema}.baths b ON b.id = e.bath_id
        LEFT JOIN {schema}.users u ON u.id = e.organizer_id
        WHERE e.id = {int(event_id)}
    """)
    ev = cur.fetchone()
    if not ev:
        conn.close()
        return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'Event not found'})}

    # SQL-санитизация
    name_q = name.replace("'", "''")
    contact_q = contact.replace("'", "''")
    message_q = message.replace("'", "''")
    organizer_id_v = ev.get('organizer_id')

    cur.execute(f"""
        INSERT INTO {schema}.event_questions
            (event_id, organizer_id, guest_user_id, guest_name, guest_contact, contact_type, message, ip_address)
        VALUES (
            {int(event_id)},
            {organizer_id_v if organizer_id_v else 'NULL'},
            {guest_user_id if guest_user_id else 'NULL'},
            '{name_q}', '{contact_q}', '{contact_type}',
            '{message_q}',
            {f"'{ip_safe}'" if ip_safe else 'NULL'}
        )
        RETURNING id
    """)
    qid = cur.fetchone()['id']
    conn.commit()

    # Email организатору
    email_sent = False
    organizer_email = ev.get('organizer_email')
    if organizer_email:
        try:
            send_event_question_email(organizer_email, ev, name, contact, contact_type, message)
            cur.execute(f"UPDATE {schema}.event_questions SET email_sent = TRUE WHERE id = {qid}")
            conn.commit()
            email_sent = True
        except Exception:
            pass

    conn.close()
    return {
        'statusCode': 200,
        'headers': headers,
        'body': json.dumps({'ok': True, 'id': qid, 'email_sent': email_sent}),
    }


def send_event_question_email(to_email, ev, guest_name, guest_contact, contact_type, message):
    """Письмо организатору: новый вопрос от гостя по событию."""
    api_key = os.environ.get('UNISENDER_API_KEY', '')
    sender_email = os.environ.get('UNISENDER_SENDER_EMAIL', '')
    sender_name = os.environ.get('UNISENDER_SENDER_NAME', 'Sparcom')
    if not api_key or not sender_email:
        return

    site_url = os.environ.get("SITE_URL", "https://warm-meetings-experience.poehali.dev").rstrip("/")
    event_url = f"{site_url}/events/{ev['slug']}" if ev.get('slug') else f"{site_url}/events/{ev['id']}"
    event_title = ev.get('title') or 'Событие'
    event_date = str(ev.get('event_date', '') or '')
    start_time = str(ev.get('start_time', '') or '')[:5]
    bath_name = ev.get('bath_name') or ''
    organizer_name = ev.get('organizer_name') or ''

    contact_label = {'email': 'Email', 'phone': 'Телефон', 'telegram': 'Telegram'}.get(contact_type, 'Контакт')
    safe_msg = (message or '').replace('<', '&lt;').replace('>', '&gt;').replace('\n', '<br>')

    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #fafafa;">
      <div style="background: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
        <h1 style="font-size: 20px; margin: 0 0 16px;">Новый вопрос по событию</h1>
        <p style="color: #666; margin: 0 0 20px;">Здравствуйте{', ' + organizer_name if organizer_name else ''}! Гость задал вопрос по вашему событию.</p>

        <div style="background: #f8f9fa; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
          <div style="font-weight: 600; margin-bottom: 6px;">{event_title}</div>
          <div style="color: #555; font-size: 14px;">🗓 {event_date} {start_time}</div>
          {f'<div style="color: #555; font-size: 14px;">📍 {bath_name}</div>' if bath_name else ''}
        </div>

        <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
          <div style="font-size: 14px; color: #444; margin-bottom: 4px;"><b>{guest_name}</b></div>
          <div style="font-size: 13px; color: #777; margin-bottom: 12px;">{contact_label}: {guest_contact}</div>
          <div style="font-size: 14px; color: #1a1a1a; line-height: 1.6;">{safe_msg}</div>
        </div>

        <p style="margin: 0 0 16px;">
          <a href="{event_url}" style="display: inline-block; background: #ea580c; color: #fff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 14px;">Открыть событие</a>
        </p>
        <p style="color: #888; font-size: 12px; margin-top: 24px;">Свяжитесь с гостем удобным способом — он указал свой контакт выше.</p>
      </div>
    </div>
    """

    message_payload = {
        "recipients": [{"email": to_email, "name": organizer_name or "Организатор"}],
        "from_email": sender_email,
        "subject": f"Вопрос по событию: {event_title}",
        "body": {"html": html},
        "tags": ["event-question"],
    }
    if sender_name:
        message_payload["from_name"] = sender_name

    requests.post(
        "https://go2.unisender.ru/ru/transactional/api/v1/email/send.json",
        headers={"Content-Type": "application/json", "X-API-KEY": api_key},
        json={"message": message_payload},
        timeout=10,
    )


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


CHANNEL_LABEL_MAP = {
    'telegram': '✈️ Telegram',
    'vk': '🟦 ВКонтакте',
    'email': '📧 Email',
    'sms': '📱 Звонок / SMS',
    'phone': '📱 Звонок / SMS',
    'site': '🌐 Сайт',
}


def send_signup_telegram(signup_name, signup_phone, signup_email, signup_telegram, event_data, preferred_channel='', preferred_contact_value=''):
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
    if preferred_channel:
        ch_label = CHANNEL_LABEL_MAP.get(preferred_channel, preferred_channel)
        text += f"\n💬 <b>Предпочтительный канал:</b> {ch_label}"
        if preferred_contact_value:
            text += f"\n   {preferred_contact_value}"
    text += f"\n\n🪑 Осталось мест: {max(spots, 0)}"

    try:
        requests.post(
            f"https://api.telegram.org/bot{bot_token}/sendMessage",
            json={'chat_id': chat_id, 'text': text, 'parse_mode': 'HTML'},
            timeout=5
        )
    except Exception:
        pass


def notify_organizer_telegram(event_data, signup_name, signup_phone, signup_email, signup_telegram, preferred_channel='', preferred_contact_value=''):
    organizer_id = event_data.get('organizer_id')
    if not organizer_id:
        return
    start_time = str(event_data.get('start_time', ''))[:5]
    spots = max((event_data.get('spots_left', 1) or 1) - 1, 0)
    try:
        requests.post(
            'https://functions.poehali.dev/c54f8799-96a5-4519-a2c7-e1b2e5f9d8c1',
            json={
                'action': 'notify_signup',
                'organizer_id': organizer_id,
                'event_title': event_data.get('title', ''),
                'event_date': str(event_data.get('event_date', '')),
                'event_time': start_time,
                'bath_name': event_data.get('bath_name', ''),
                'spots_left': spots,
                'signup_name': signup_name,
                'signup_phone': signup_phone,
                'signup_email': signup_email,
                'signup_telegram': signup_telegram,
                'preferred_channel': preferred_channel,
                'preferred_contact_value': preferred_contact_value,
            },
            timeout=5
        )
    except Exception:
        pass


def _round_up_50(n: float) -> int:
    import math
    return int(math.ceil(n / 50.0) * 50)


def compute_crowdfund_info(d: dict, current_count: int) -> dict:
    """Считает текущую/мин/макс цены и клубный взнос для события «в складчину»."""
    target = int(d.get('cf_target_amount') or 0)
    extra = int(d.get('cf_extra_costs') or 0)
    commission = float(d.get('cf_commission_percent') or 0)
    cf_min = int(d.get('cf_min_participants') or 0)
    cf_max = int(d.get('cf_max_participants') or d.get('total_spots') or 0)
    total = target + extra

    def price_for(n: int) -> int:
        if not n or n <= 0 or total <= 0:
            return 0
        return round((total / n) * (1 + commission / 100.0))

    price_at_min = price_for(cf_min) if cf_min else 0
    price_at_max = price_for(cf_max) if cf_max else 0
    price_current = price_for(max(current_count, cf_min or 1))

    fee_mode = d.get('cf_fee_mode') or 'fixed'
    if fee_mode == 'percent':
        fp = float(d.get('cf_fee_percent') or 0)
        club_fee = _round_up_50(price_at_min * fp / 100.0) if price_at_min else 0
    else:
        club_fee = int(d.get('cf_club_fee') or 0)

    threshold_reached = bool(cf_min and current_count >= cf_min)
    progress_percent = 0
    if cf_max:
        progress_percent = min(100, round(current_count * 100 / cf_max))

    # Расчёт момента стоп-сбора
    freeze_at = None
    try:
        from datetime import datetime, timedelta
        ed = d.get('event_date')
        st = d.get('start_time')
        if ed and st:
            ed_s = str(ed)
            st_s = str(st)
            dt = datetime.fromisoformat(f"{ed_s}T{st_s[:8]}")
            hours = int(d.get('cf_freeze_hours') or 48)
            freeze_at = (dt - timedelta(hours=hours)).isoformat()
    except Exception:
        freeze_at = None

    return {
        'target_amount': target,
        'extra_costs': extra,
        'total_to_collect': total,
        'commission_percent': commission,
        'min_participants': cf_min,
        'max_participants': cf_max,
        'current_count': current_count,
        'price_current': price_current,
        'price_at_min': price_at_min,
        'price_at_max': price_at_max,
        'club_fee': club_fee,
        'fee_mode': fee_mode,
        'threshold_reached': threshold_reached,
        'progress_percent': progress_percent,
        'freeze_at': freeze_at,
        'status': d.get('cf_status') or 'collecting',
        'final_price': d.get('cf_final_price'),
        'frozen_at': d.get('cf_frozen_at'),
        'topup_deadline_hours': int(d.get('cf_topup_deadline_hours') or 24),
    }


def serialize_event(row, cur=None, schema=None):
    d = dict(row)
    if d.get('program') is None:
        d['program'] = []
    if d.get('rules') is None:
        d['rules'] = []

    # Crowdfund: добавляем расчётный объект cf
    if d.get('pricing_mode') == 'crowdfund' and cur is not None and schema:
        try:
            cur.execute(
                f"SELECT COUNT(*) AS n FROM {schema}.event_signups "
                f"WHERE event_id = {int(d['id'])} AND COALESCE(status,'') NOT IN ('cancelled','отменено')"
            )
            r = cur.fetchone()
            current_count = int(r['n']) if r else 0
        except Exception:
            current_count = 0
        d['cf'] = compute_crowdfund_info(d, current_count)
    return d