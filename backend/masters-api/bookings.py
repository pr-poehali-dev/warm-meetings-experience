import json
import psycopg2.extras
from datetime import datetime
from shared import CORS_HEADERS, get_conn, get_schema


def handle_bookings_root(event, method, params, schema, headers):
    """Маршрутизация подресурсов записей: bookings/public-slots/public-book/stats/reviews"""
    sub = params.get('sub') or params.get('subresource') or 'bookings'
    if sub == 'bookings':
        return handle_bookings(event, method, params, schema, headers)
    elif sub == 'public-slots':
        return handle_public_slots(event, method, params, schema, headers)
    elif sub == 'public-book':
        return handle_public_book(event, method, params, schema, headers)
    elif sub == 'stats':
        return handle_stats(event, method, params, schema, headers)
    return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Unknown bookings sub'})}


def handle_bookings(event, method, params, schema, headers):
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    if method == 'GET':
        master_id = params.get('master_id', '1')
        status_filter = params.get('status')
        date_from = params.get('date_from')
        date_to = params.get('date_to')

        query = f"""
            SELECT b.*, ms.name as service_name, ms.duration_minutes
            FROM {schema}.master_bookings b
            LEFT JOIN {schema}.master_services ms ON b.service_id = ms.id
            WHERE b.master_id = {int(master_id)}
        """
        if status_filter and status_filter != 'all':
            query += f" AND b.status = '{status_filter}'"
        if date_from:
            query += f" AND b.datetime_start >= '{date_from}'"
        if date_to:
            query += f" AND b.datetime_start <= '{date_to}'"
        query += " ORDER BY b.datetime_start DESC"

        cur.execute(query)
        rows = cur.fetchall()
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps(rows, default=str)}

    if method == 'POST':
        body = json.loads(event.get('body', '{}'))
        master_id = body.get('master_id', 1)
        slot_id = body.get('slot_id')
        client_name = body['client_name'].replace("'", "''")
        client_phone = body['client_phone'].replace("'", "''")
        client_email = (body.get('client_email') or '').replace("'", "''")
        service_id = body.get('service_id')
        dt_start = body['datetime_start']
        dt_end = body['datetime_end']
        price = float(body.get('price', 0))
        comment = (body.get('comment') or '').replace("'", "''")
        source = body.get('source', 'admin')

        cur.execute(f"""
            SELECT id FROM {schema}.master_bookings
            WHERE master_id = {int(master_id)}
              AND status NOT IN ('canceled')
              AND datetime_start < '{dt_end}'
              AND datetime_end > '{dt_start}'
            LIMIT 1
        """)
        if cur.fetchone():
            conn.close()
            return {'statusCode': 409, 'headers': headers, 'body': json.dumps({'error': 'Это время уже занято'})}

        slot_val = f"{int(slot_id)}" if slot_id else "NULL"
        svc_val = f"{int(service_id)}" if service_id else "NULL"

        cur.execute(f"""
            SELECT auto_confirm FROM {schema}.master_calendar_settings
            WHERE master_id = {int(master_id)}
        """)
        settings = cur.fetchone()
        auto_confirm = settings['auto_confirm'] if settings else False
        status = 'confirmed' if auto_confirm else 'pending'

        confirmed_at_val = 'CURRENT_TIMESTAMP' if auto_confirm else 'NULL'
        cur.execute(f"""
            INSERT INTO {schema}.master_bookings
            (slot_id, master_id, client_name, client_phone, client_email, service_id,
             datetime_start, datetime_end, price, status, source, comment,
             confirmed_at)
            VALUES ({slot_val}, {int(master_id)}, '{client_name}', '{client_phone}', '{client_email}',
             {svc_val}, '{dt_start}', '{dt_end}', {price}, '{status}', '{source}', '{comment}',
             {confirmed_at_val})
            RETURNING *
        """)
        booking = cur.fetchone()

        if slot_id:
            cur.execute(f"""
                UPDATE {schema}.master_slots SET
                    booked_count = booked_count + 1,
                    status = CASE
                        WHEN booked_count + 1 >= max_clients THEN 'booked'
                        ELSE '{('confirmed' if auto_confirm else 'pending')}'
                    END,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = {int(slot_id)}
            """)

        conn.commit()
        conn.close()
        return {'statusCode': 201, 'headers': headers, 'body': json.dumps(booking, default=str)}

    if method == 'PUT':
        body = json.loads(event.get('body', '{}'))
        booking_id = body['id']
        action = body.get('action', 'update')

        if action == 'confirm':
            cur.execute(f"""
                UPDATE {schema}.master_bookings SET
                    status = 'confirmed', confirmed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                WHERE id = {int(booking_id)} RETURNING *
            """)
        elif action == 'cancel':
            reason = (body.get('cancel_reason') or '').replace("'", "''")
            cur.execute(f"""
                UPDATE {schema}.master_bookings SET
                    status = 'canceled', canceled_at = CURRENT_TIMESTAMP,
                    cancel_reason = '{reason}', updated_at = CURRENT_TIMESTAMP
                WHERE id = {int(booking_id)} RETURNING slot_id
            """)
            row = cur.fetchone()
            if row and row.get('slot_id'):
                cur.execute(f"""
                    UPDATE {schema}.master_slots SET
                        booked_count = GREATEST(booked_count - 1, 0),
                        status = 'available',
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = {int(row['slot_id'])}
                """)
            cur.execute(f"SELECT * FROM {schema}.master_bookings WHERE id = {int(booking_id)}")
        elif action == 'complete':
            cur.execute(f"""
                UPDATE {schema}.master_bookings SET
                    status = 'completed', completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                WHERE id = {int(booking_id)} RETURNING *
            """)
        elif action == 'no_show':
            cur.execute(f"""
                UPDATE {schema}.master_bookings SET
                    status = 'no_show', updated_at = CURRENT_TIMESTAMP
                WHERE id = {int(booking_id)} RETURNING *
            """)
        else:
            updates = []
            if 'client_name' in body:
                updates.append(f"client_name = '{body['client_name'].replace(chr(39), chr(39)+chr(39))}'")
            if 'client_phone' in body:
                updates.append(f"client_phone = '{body['client_phone'].replace(chr(39), chr(39)+chr(39))}'")
            if 'price' in body:
                updates.append(f"price = {float(body['price'])}")
            if 'comment' in body:
                updates.append(f"comment = '{(body['comment'] or '').replace(chr(39), chr(39)+chr(39))}'")
            if updates:
                updates.append("updated_at = CURRENT_TIMESTAMP")
                cur.execute(f"""
                    UPDATE {schema}.master_bookings SET {', '.join(updates)}
                    WHERE id = {int(booking_id)} RETURNING *
                """)

        row = cur.fetchone()
        conn.commit()
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps(row, default=str)}

    conn.close()
    return {'statusCode': 405, 'headers': headers, 'body': json.dumps({'error': 'Method not allowed'})}


def handle_public_slots(event, method, params, schema, headers):
    if method != 'GET':
        return {'statusCode': 405, 'headers': headers, 'body': json.dumps({'error': 'GET only'})}

    master_id = params.get('master_id', '1')
    date_from = params.get('date_from')
    service_id = params.get('service_id')

    if not date_from:
        date_from = datetime.now().strftime('%Y-%m-%d')

    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    query = f"""
        SELECT s.id, s.master_id, s.service_id, s.datetime_start, s.datetime_end,
               s.max_clients, s.booked_count, s.status,
               ms.name as service_name, ms.duration_minutes, ms.price as service_price, ms.description as service_description
        FROM {schema}.master_slots s
        LEFT JOIN {schema}.master_services ms ON s.service_id = ms.id
        WHERE s.master_id = {int(master_id)}
          AND s.status = 'available'
          AND s.datetime_start >= '{date_from}'
          AND s.datetime_start <= '{date_from}'::date + interval '30 days'
          AND s.booked_count < s.max_clients
    """
    # Если указан service_id — берём слоты этой услуги ИЛИ универсальные (без услуги)
    if service_id:
        query += f" AND (s.service_id = {int(service_id)} OR s.service_id IS NULL)"
    query += " ORDER BY s.datetime_start"

    cur.execute(query)
    rows = cur.fetchall()
    conn.close()

    return {'statusCode': 200, 'headers': headers, 'body': json.dumps(rows, default=str)}


def handle_public_book(event, method, params, schema, headers):
    if method != 'POST':
        return {'statusCode': 405, 'headers': headers, 'body': json.dumps({'error': 'POST only'})}

    body = json.loads(event.get('body', '{}'))
    slot_id = body['slot_id']
    client_name = body['client_name'].replace("'", "''")
    client_phone = body['client_phone'].replace("'", "''")
    client_email = (body.get('client_email') or '').replace("'", "''")
    comment = (body.get('comment') or '').replace("'", "''")

    # Опционально: услуга и желаемое время (для универсальных окон)
    req_service_id = body.get('service_id')
    desired_start = body.get('desired_start')
    desired_end = body.get('desired_end')

    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    cur.execute(f"""
        SELECT s.*, ms.price as service_price, ms.name as service_name, ms.duration_minutes as svc_duration
        FROM {schema}.master_slots s
        LEFT JOIN {schema}.master_services ms ON s.service_id = ms.id
        WHERE s.id = {int(slot_id)}
          AND s.status = 'available'
          AND s.booked_count < s.max_clients
        FOR UPDATE OF s
    """)
    slot = cur.fetchone()
    if not slot:
        conn.close()
        return {'statusCode': 409, 'headers': headers, 'body': json.dumps({'error': 'Слот уже недоступен'})}

    master_id = slot['master_id']

    # Определяем услугу и финальное время сеанса
    booking_service_id = slot['service_id']
    booking_service_name = slot.get('service_name', '')
    booking_price = float(slot.get('service_price') or 0)
    dt_start = slot['datetime_start']
    dt_end = slot['datetime_end']

    # Если слот без услуги и клиент выбрал услугу — берём её
    if not booking_service_id and req_service_id:
        cur.execute(f"""
            SELECT id, name, price, duration_minutes
            FROM {schema}.master_services
            WHERE id = {int(req_service_id)} AND master_id = {int(master_id)} AND is_active = true
        """)
        svc = cur.fetchone()
        if not svc:
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Услуга не найдена'})}
        booking_service_id = svc['id']
        booking_service_name = svc['name']
        booking_price = float(svc['price'] or 0)

        # Если клиент указал желаемое время — проверяем что оно внутри окна
        if desired_start and desired_end:
            try:
                ds = datetime.fromisoformat(str(desired_start).replace('Z', ''))
                de = datetime.fromisoformat(str(desired_end).replace('Z', ''))
                slot_s = slot['datetime_start']
                slot_e = slot['datetime_end']
                # Нормализуем без tz для сравнения
                if hasattr(slot_s, 'replace'):
                    slot_s_naive = slot_s.replace(tzinfo=None) if slot_s.tzinfo else slot_s
                    slot_e_naive = slot_e.replace(tzinfo=None) if slot_e.tzinfo else slot_e
                else:
                    slot_s_naive = slot_s
                    slot_e_naive = slot_e
                if ds < slot_s_naive or de > slot_e_naive or de <= ds:
                    conn.close()
                    return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Время вне доступного окна'})}
                dt_start = ds
                dt_end = de
            except (ValueError, TypeError):
                pass

    cur.execute(f"""
        SELECT auto_confirm FROM {schema}.master_calendar_settings WHERE master_id = {int(master_id)}
    """)
    settings = cur.fetchone()
    auto_confirm = settings['auto_confirm'] if settings else False
    status = 'confirmed' if auto_confirm else 'pending'

    svc_val = f"{int(booking_service_id)}" if booking_service_id else "NULL"
    confirmed_at_val = 'CURRENT_TIMESTAMP' if auto_confirm else 'NULL'
    dt_start_str = str(dt_start)
    dt_end_str = str(dt_end)

    cur.execute(f"""
        INSERT INTO {schema}.master_bookings
        (slot_id, master_id, client_name, client_phone, client_email, service_id,
         datetime_start, datetime_end, price, status, source, comment,
         confirmed_at)
        VALUES ({int(slot_id)}, {int(master_id)}, '{client_name}', '{client_phone}', '{client_email}',
         {svc_val}, '{dt_start_str}', '{dt_end_str}', {booking_price}, '{status}', 'public', '{comment}',
         {confirmed_at_val})
        RETURNING *
    """)
    booking = cur.fetchone()

    # Если бронируем кусок универсального окна (не весь слот) — расщепляем слот:
    # - оригинальный слот превращаем в "до" (или удаляем, если совпадает)
    # - создаём новый слот "после" (если есть остаток)
    slot_s = slot['datetime_start']
    slot_e = slot['datetime_end']
    slot_s_naive = slot_s.replace(tzinfo=None) if hasattr(slot_s, 'tzinfo') and slot_s.tzinfo else slot_s
    slot_e_naive = slot_e.replace(tzinfo=None) if hasattr(slot_e, 'tzinfo') and slot_e.tzinfo else slot_e
    dt_start_naive = dt_start.replace(tzinfo=None) if hasattr(dt_start, 'tzinfo') and dt_start.tzinfo else dt_start
    dt_end_naive = dt_end.replace(tzinfo=None) if hasattr(dt_end, 'tzinfo') and dt_end.tzinfo else dt_end

    is_partial = (dt_start_naive > slot_s_naive) or (dt_end_naive < slot_e_naive)

    if is_partial and slot['max_clients'] == 1:
        # Слот делим: 1) сам слот занимаем точно на dt_start..dt_end и booked
        cur.execute(f"""
            UPDATE {schema}.master_slots SET
                datetime_start = '{dt_start_str}',
                datetime_end = '{dt_end_str}',
                booked_count = booked_count + 1,
                status = 'booked',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = {int(slot_id)}
        """)
        # 2) создаём "до" если есть
        if dt_start_naive > slot_s_naive:
            cur.execute(f"""
                INSERT INTO {schema}.master_slots
                (master_id, service_id, datetime_start, datetime_end, max_clients, booked_count, status, source)
                VALUES ({int(master_id)}, NULL, '{slot_s_naive}', '{dt_start_naive}', 1, 0, 'available', 'split')
            """)
        # 3) создаём "после" если есть
        if dt_end_naive < slot_e_naive:
            cur.execute(f"""
                INSERT INTO {schema}.master_slots
                (master_id, service_id, datetime_start, datetime_end, max_clients, booked_count, status, source)
                VALUES ({int(master_id)}, NULL, '{dt_end_naive}', '{slot_e_naive}', 1, 0, 'available', 'split')
            """)
    else:
        # Полный слот занят (или групповой) — просто увеличиваем счётчик
        new_status = 'booked' if slot['booked_count'] + 1 >= slot['max_clients'] else 'available'
        cur.execute(f"""
            UPDATE {schema}.master_slots SET
                booked_count = booked_count + 1,
                status = '{new_status}',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = {int(slot_id)}
        """)

    conn.commit()
    conn.close()

    return {
        'statusCode': 201,
        'headers': headers,
        'body': json.dumps({
            'booking_id': booking['id'],
            'status': status,
            'service_name': booking_service_name,
            'datetime_start': dt_start_str,
            'datetime_end': dt_end_str,
            'price': booking_price
        })
    }


def handle_reviews(event, method, params, schema, headers):
    """Отзывы о мастере: GET — список, POST — создать"""
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    if method == 'GET':
        master_id = params.get('master_id', '1')
        cur.execute(f"""
            SELECT id, master_id, client_name, rating, text, created_at
            FROM {schema}.master_reviews
            WHERE master_id = {int(master_id)} AND is_published = TRUE
            ORDER BY created_at DESC
            LIMIT 50
        """)
        rows = cur.fetchall()
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps(rows, default=str)}

    if method == 'POST':
        body = json.loads(event.get('body', '{}'))
        master_id = int(body.get('master_id', 0))
        client_name = (body.get('client_name') or '').strip().replace("'", "''")
        client_phone = (body.get('client_phone') or '').strip().replace("'", "''")
        rating = int(body.get('rating', 5))
        text = (body.get('text') or '').strip().replace("'", "''")
        booking_id = body.get('booking_id')

        if not master_id or not client_name or not (1 <= rating <= 5):
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Заполните обязательные поля'})}

        cur.execute(f"SELECT id FROM {schema}.masters WHERE id = {master_id}")
        if not cur.fetchone():
            conn.close()
            return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'Мастер не найден'})}

        booking_val = f"{int(booking_id)}" if booking_id else "NULL"
        phone_val = f"'{client_phone}'" if client_phone else "NULL"

        cur.execute(f"""
            INSERT INTO {schema}.master_reviews (master_id, booking_id, client_name, client_phone, rating, text)
            VALUES ({master_id}, {booking_val}, '{client_name}', {phone_val}, {rating}, '{text}')
            RETURNING id, master_id, client_name, rating, text, created_at
        """)
        review = cur.fetchone()

        cur.execute(f"""
            UPDATE {schema}.masters SET
                rating = (
                    SELECT ROUND(AVG(rating)::numeric, 2)
                    FROM {schema}.master_reviews
                    WHERE master_id = {master_id} AND is_published = TRUE
                ),
                reviews_count = (
                    SELECT COUNT(*) FROM {schema}.master_reviews
                    WHERE master_id = {master_id} AND is_published = TRUE
                ),
                updated_at = NOW()
            WHERE id = {master_id}
        """)

        conn.commit()
        conn.close()
        return {'statusCode': 201, 'headers': headers, 'body': json.dumps(review, default=str)}

    conn.close()
    return {'statusCode': 405, 'headers': headers, 'body': json.dumps({'error': 'Method not allowed'})}


def handle_stats(event, method, params, schema, headers):
    if method != 'GET':
        return {'statusCode': 405, 'headers': headers, 'body': json.dumps({'error': 'GET only'})}

    master_id = params.get('master_id', '1')
    period = params.get('period', 'month')

    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    if period == 'month':
        interval = "interval '30 days'"
    elif period == 'week':
        interval = "interval '7 days'"
    else:
        interval = "interval '30 days'"

    cur.execute(f"""
        SELECT
            COUNT(*) FILTER (WHERE status = 'completed') as completed_sessions,
            COUNT(*) FILTER (WHERE status IN ('confirmed', 'pending')) as upcoming_sessions,
            COUNT(*) FILTER (WHERE status = 'canceled') as canceled_sessions,
            COUNT(*) as total_sessions,
            COALESCE(SUM(price) FILTER (WHERE status = 'completed'), 0) as total_revenue,
            COALESCE(SUM(price) FILTER (WHERE status IN ('confirmed', 'pending')), 0) as expected_revenue
        FROM {schema}.master_bookings
        WHERE master_id = {int(master_id)}
          AND datetime_start >= CURRENT_DATE - {interval}
    """)
    stats = cur.fetchone()

    cur.execute(f"""
        SELECT COUNT(*) as total_slots,
               COUNT(*) FILTER (WHERE status = 'available' AND booked_count < max_clients) as free_slots,
               COUNT(*) FILTER (WHERE status IN ('booked', 'pending')) as busy_slots
        FROM {schema}.master_slots
        WHERE master_id = {int(master_id)}
          AND datetime_start >= CURRENT_DATE
          AND datetime_start <= CURRENT_DATE + {interval}
          AND status != 'blocked'
    """)
    slot_stats = cur.fetchone()

    occupancy = 0
    if slot_stats['total_slots'] > 0:
        occupancy = round(slot_stats['busy_slots'] / slot_stats['total_slots'] * 100)

    conn.close()

    return {
        'statusCode': 200,
        'headers': headers,
        'body': json.dumps({
            **stats,
            **slot_stats,
            'occupancy_percent': occupancy
        }, default=str)
    }