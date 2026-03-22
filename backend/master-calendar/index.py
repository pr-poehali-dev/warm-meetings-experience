import json
import os
import psycopg2
import psycopg2.extras
from datetime import datetime, timedelta, date, time


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def get_schema():
    return os.environ.get('MAIN_DB_SCHEMA', 'public')


def handler(event, context):
    """API календаря мастера: слоты, шаблоны, услуги, настройки, блокировки"""
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
    resource = params.get('resource', 'slots')
    schema = get_schema()

    try:
        if resource == 'slots':
            return handle_slots(event, method, params, schema, headers)
        elif resource == 'services':
            return handle_services(event, method, params, schema, headers)
        elif resource == 'templates':
            return handle_templates(event, method, params, schema, headers)
        elif resource == 'settings':
            return handle_settings(event, method, params, schema, headers)
        elif resource == 'blocks':
            return handle_blocks(event, method, params, schema, headers)
        elif resource == 'apply-template':
            return handle_apply_template(event, method, params, schema, headers)
        elif resource == 'week-view':
            return handle_week_view(event, method, params, schema, headers)
        else:
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Unknown resource'})}
    except Exception as e:
        return {'statusCode': 500, 'headers': headers, 'body': json.dumps({'error': str(e)})}


def handle_slots(event, method, params, schema, headers):
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    if method == 'GET':
        master_id = params.get('master_id', '1')
        date_from = params.get('date_from', '')
        date_to = params.get('date_to', '')

        query = f"""
            SELECT s.*, ms.name as service_name, ms.duration_minutes, ms.price as service_price
            FROM {schema}.master_slots s
            LEFT JOIN {schema}.master_services ms ON s.service_id = ms.id
            WHERE s.master_id = {int(master_id)}
        """
        if date_from:
            query += f" AND s.datetime_start >= '{date_from}'"
        if date_to:
            query += f" AND s.datetime_start <= '{date_to}'"
        query += " ORDER BY s.datetime_start"

        cur.execute(query)
        rows = cur.fetchall()
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps(rows, default=str)}

    if method == 'POST':
        body = json.loads(event.get('body', '{}'))
        master_id = body.get('master_id', 1)
        service_id = body.get('service_id')
        dt_start = body['datetime_start']
        dt_end = body['datetime_end']
        max_clients = body.get('max_clients', 1)
        notes = body.get('notes', '')

        cur.execute(f"""
            SELECT id FROM {schema}.master_slots
            WHERE master_id = {int(master_id)}
              AND status != 'blocked'
              AND datetime_start < '{dt_end}'
              AND datetime_end > '{dt_start}'
            LIMIT 1
        """)
        conflict = cur.fetchone()
        if conflict:
            conn.close()
            return {'statusCode': 409, 'headers': headers, 'body': json.dumps({'error': 'Конфликт времени: слот пересекается с существующим'})}

        cur.execute(f"""
            SELECT id FROM {schema}.master_day_blocks
            WHERE master_id = {int(master_id)}
              AND block_date = '{dt_start[:10]}'
            LIMIT 1
        """)
        if cur.fetchone():
            conn.close()
            return {'statusCode': 409, 'headers': headers, 'body': json.dumps({'error': 'Этот день заблокирован'})}

        service_val = f"{int(service_id)}" if service_id else "NULL"
        notes_escaped = notes.replace("'", "''")

        cur.execute(f"""
            INSERT INTO {schema}.master_slots
            (master_id, service_id, datetime_start, datetime_end, max_clients, status, source, notes)
            VALUES ({int(master_id)}, {service_val}, '{dt_start}', '{dt_end}', {int(max_clients)}, 'available', 'manual', '{notes_escaped}')
            RETURNING *
        """)
        row = cur.fetchone()
        conn.commit()
        conn.close()
        return {'statusCode': 201, 'headers': headers, 'body': json.dumps(row, default=str)}

    if method == 'PUT':
        body = json.loads(event.get('body', '{}'))
        slot_id = body['id']
        updates = []
        if 'service_id' in body:
            svc = body['service_id']
            updates.append(f"service_id = {int(svc) if svc else 'NULL'}")
        if 'datetime_start' in body:
            updates.append(f"datetime_start = '{body['datetime_start']}'")
        if 'datetime_end' in body:
            updates.append(f"datetime_end = '{body['datetime_end']}'")
        if 'max_clients' in body:
            updates.append(f"max_clients = {int(body['max_clients'])}")
        if 'status' in body:
            updates.append(f"status = '{body['status']}'")
        if 'notes' in body:
            notes_escaped = body['notes'].replace("'", "''")
            updates.append(f"notes = '{notes_escaped}'")

        if updates:
            updates.append("updated_at = CURRENT_TIMESTAMP")
            cur.execute(f"""
                UPDATE {schema}.master_slots SET {', '.join(updates)}
                WHERE id = {int(slot_id)}
                RETURNING *
            """)
            row = cur.fetchone()
            conn.commit()
            conn.close()
            return {'statusCode': 200, 'headers': headers, 'body': json.dumps(row, default=str)}

        conn.close()
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Nothing to update'})}

    if method == 'DELETE':
        body = json.loads(event.get('body', '{}'))
        slot_id = body.get('id')
        if not slot_id:
            slot_id = params.get('id')

        cur.execute(f"""
            SELECT id, status FROM {schema}.master_slots WHERE id = {int(slot_id)}
        """)
        slot = cur.fetchone()
        if not slot:
            conn.close()
            return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'Slot not found'})}

        if slot['status'] == 'booked':
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Нельзя удалить слот с записью. Сначала отмените запись.'})}

        cur.execute(f"UPDATE {schema}.master_slots SET status = 'blocked' WHERE id = {int(slot_id)}")
        conn.commit()
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'success': True})}

    conn.close()
    return {'statusCode': 405, 'headers': headers, 'body': json.dumps({'error': 'Method not allowed'})}


def handle_services(event, method, params, schema, headers):
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    if method == 'GET':
        master_id = params.get('master_id', '1')
        cur.execute(f"""
            SELECT * FROM {schema}.master_services
            WHERE master_id = {int(master_id)}
            ORDER BY sort_order, id
        """)
        rows = cur.fetchall()
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps(rows, default=str)}

    if method == 'POST':
        body = json.loads(event.get('body', '{}'))
        master_id = body.get('master_id', 1)
        name = body['name'].replace("'", "''")
        desc = (body.get('description') or '').replace("'", "''")
        duration = int(body.get('duration_minutes', 60))
        price = float(body.get('price', 0))
        max_cl = int(body.get('max_clients', 1))

        cur.execute(f"""
            INSERT INTO {schema}.master_services
            (master_id, name, description, duration_minutes, price, max_clients)
            VALUES ({int(master_id)}, '{name}', '{desc}', {duration}, {price}, {max_cl})
            RETURNING *
        """)
        row = cur.fetchone()
        conn.commit()
        conn.close()
        return {'statusCode': 201, 'headers': headers, 'body': json.dumps(row, default=str)}

    if method == 'PUT':
        body = json.loads(event.get('body', '{}'))
        sid = body['id']
        updates = []
        if 'name' in body:
            updates.append(f"name = '{body['name'].replace(chr(39), chr(39)+chr(39))}'")
        if 'description' in body:
            updates.append(f"description = '{(body['description'] or '').replace(chr(39), chr(39)+chr(39))}'")
        if 'duration_minutes' in body:
            updates.append(f"duration_minutes = {int(body['duration_minutes'])}")
        if 'price' in body:
            updates.append(f"price = {float(body['price'])}")
        if 'max_clients' in body:
            updates.append(f"max_clients = {int(body['max_clients'])}")
        if 'is_active' in body:
            updates.append(f"is_active = {'true' if body['is_active'] else 'false'}")

        if updates:
            updates.append("updated_at = CURRENT_TIMESTAMP")
            cur.execute(f"""
                UPDATE {schema}.master_services SET {', '.join(updates)}
                WHERE id = {int(sid)} RETURNING *
            """)
            row = cur.fetchone()
            conn.commit()
            conn.close()
            return {'statusCode': 200, 'headers': headers, 'body': json.dumps(row, default=str)}

        conn.close()
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Nothing to update'})}

    if method == 'DELETE':
        body = json.loads(event.get('body', '{}'))
        sid = body.get('id') or params.get('id')
        cur.execute(f"UPDATE {schema}.master_services SET is_active = false WHERE id = {int(sid)}")
        conn.commit()
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'success': True})}

    conn.close()
    return {'statusCode': 405, 'headers': headers, 'body': json.dumps({'error': 'Method not allowed'})}


def handle_templates(event, method, params, schema, headers):
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    if method == 'GET':
        master_id = params.get('master_id', '1')
        cur.execute(f"""
            SELECT t.*, json_agg(
                json_build_object(
                    'id', r.id,
                    'day_of_week', r.day_of_week,
                    'time_start', r.time_start,
                    'time_end', r.time_end,
                    'service_id', r.service_id,
                    'max_clients', r.max_clients,
                    'is_day_off', r.is_day_off
                ) ORDER BY r.day_of_week, r.time_start
            ) FILTER (WHERE r.id IS NOT NULL) as rules
            FROM {schema}.master_schedule_templates t
            LEFT JOIN {schema}.master_template_rules r ON r.template_id = t.id
            WHERE t.master_id = {int(master_id)}
            GROUP BY t.id
            ORDER BY t.id
        """)
        rows = cur.fetchall()
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps(rows, default=str)}

    if method == 'POST':
        body = json.loads(event.get('body', '{}'))
        master_id = body.get('master_id', 1)
        name = body['name'].replace("'", "''")
        rules = body.get('rules', [])

        cur.execute(f"""
            INSERT INTO {schema}.master_schedule_templates (master_id, name)
            VALUES ({int(master_id)}, '{name}')
            RETURNING id
        """)
        tmpl_id = cur.fetchone()['id']

        for rule in rules:
            svc = rule.get('service_id')
            svc_val = f"{int(svc)}" if svc else "NULL"
            is_off = 'true' if rule.get('is_day_off') else 'false'
            t_start = rule.get('time_start', '09:00')
            t_end = rule.get('time_end', '18:00')
            max_cl = int(rule.get('max_clients', 1))
            dow = int(rule['day_of_week'])

            cur.execute(f"""
                INSERT INTO {schema}.master_template_rules
                (template_id, day_of_week, time_start, time_end, service_id, max_clients, is_day_off)
                VALUES ({tmpl_id}, {dow}, '{t_start}', '{t_end}', {svc_val}, {max_cl}, {is_off})
            """)

        conn.commit()

        cur.execute(f"""
            SELECT t.*, json_agg(
                json_build_object(
                    'id', r.id,
                    'day_of_week', r.day_of_week,
                    'time_start', r.time_start,
                    'time_end', r.time_end,
                    'service_id', r.service_id,
                    'max_clients', r.max_clients,
                    'is_day_off', r.is_day_off
                ) ORDER BY r.day_of_week, r.time_start
            ) FILTER (WHERE r.id IS NOT NULL) as rules
            FROM {schema}.master_schedule_templates t
            LEFT JOIN {schema}.master_template_rules r ON r.template_id = t.id
            WHERE t.id = {tmpl_id}
            GROUP BY t.id
        """)
        row = cur.fetchone()
        conn.close()
        return {'statusCode': 201, 'headers': headers, 'body': json.dumps(row, default=str)}

    if method == 'PUT':
        body = json.loads(event.get('body', '{}'))
        tmpl_id = body['id']
        if 'name' in body:
            name = body['name'].replace("'", "''")
            cur.execute(f"UPDATE {schema}.master_schedule_templates SET name = '{name}', updated_at = CURRENT_TIMESTAMP WHERE id = {int(tmpl_id)}")

        if 'rules' in body:
            cur.execute(f"UPDATE {schema}.master_template_rules SET is_day_off = true WHERE template_id = {int(tmpl_id)}")
            for rule in body['rules']:
                svc = rule.get('service_id')
                svc_val = f"{int(svc)}" if svc else "NULL"
                is_off = 'true' if rule.get('is_day_off') else 'false'
                t_start = rule.get('time_start', '09:00')
                t_end = rule.get('time_end', '18:00')
                max_cl = int(rule.get('max_clients', 1))
                dow = int(rule['day_of_week'])

                if rule.get('id'):
                    cur.execute(f"""
                        UPDATE {schema}.master_template_rules SET
                        day_of_week = {dow}, time_start = '{t_start}', time_end = '{t_end}',
                        service_id = {svc_val}, max_clients = {max_cl}, is_day_off = {is_off}
                        WHERE id = {int(rule['id'])}
                    """)
                else:
                    cur.execute(f"""
                        INSERT INTO {schema}.master_template_rules
                        (template_id, day_of_week, time_start, time_end, service_id, max_clients, is_day_off)
                        VALUES ({int(tmpl_id)}, {dow}, '{t_start}', '{t_end}', {svc_val}, {max_cl}, {is_off})
                    """)

        conn.commit()
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'success': True})}

    if method == 'DELETE':
        body = json.loads(event.get('body', '{}'))
        tmpl_id = body.get('id') or params.get('id')
        cur.execute(f"UPDATE {schema}.master_schedule_templates SET is_active = false WHERE id = {int(tmpl_id)}")
        conn.commit()
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'success': True})}

    conn.close()
    return {'statusCode': 405, 'headers': headers, 'body': json.dumps({'error': 'Method not allowed'})}


def handle_apply_template(event, method, params, schema, headers):
    if method != 'POST':
        return {'statusCode': 405, 'headers': headers, 'body': json.dumps({'error': 'POST only'})}

    body = json.loads(event.get('body', '{}'))
    template_id = body['template_id']
    master_id = body.get('master_id', 1)
    weeks = int(body.get('weeks', 4))
    start_date_str = body.get('start_date')

    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    cur.execute(f"""
        SELECT r.* FROM {schema}.master_template_rules r
        JOIN {schema}.master_schedule_templates t ON t.id = r.template_id
        WHERE r.template_id = {int(template_id)} AND t.is_active = true
        ORDER BY r.day_of_week, r.time_start
    """)
    rules = cur.fetchall()
    if not rules:
        conn.close()
        return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'Шаблон не найден или пустой'})}

    if start_date_str:
        start_d = datetime.strptime(start_date_str, '%Y-%m-%d').date()
    else:
        start_d = date.today() + timedelta(days=1)

    end_d = start_d + timedelta(weeks=weeks)
    created_count = 0
    skipped_count = 0

    cur.execute(f"""
        SELECT block_date FROM {schema}.master_day_blocks
        WHERE master_id = {int(master_id)}
          AND block_date >= '{start_d}' AND block_date <= '{end_d}'
    """)
    blocked_dates = set(row['block_date'] for row in cur.fetchall())

    current_d = start_d
    while current_d <= end_d:
        dow = current_d.weekday()

        if current_d in blocked_dates:
            current_d += timedelta(days=1)
            continue

        day_rules = [r for r in rules if r['day_of_week'] == dow and not r['is_day_off']]
        for rule in day_rules:
            t_start = rule['time_start']
            t_end = rule['time_end']
            if isinstance(t_start, str):
                h, m = map(int, t_start.split(':')[:2])
                t_start = time(h, m)
            if isinstance(t_end, str):
                h, m = map(int, t_end.split(':')[:2])
                t_end = time(h, m)

            dt_start = datetime.combine(current_d, t_start).strftime('%Y-%m-%dT%H:%M:00+03:00')
            dt_end = datetime.combine(current_d, t_end).strftime('%Y-%m-%dT%H:%M:00+03:00')

            cur.execute(f"""
                SELECT id FROM {schema}.master_slots
                WHERE master_id = {int(master_id)}
                  AND status != 'blocked'
                  AND datetime_start < '{dt_end}'
                  AND datetime_end > '{dt_start}'
                LIMIT 1
            """)
            if cur.fetchone():
                skipped_count += 1
                current_d += timedelta(days=1) if not day_rules else timedelta(days=0)
                continue

            svc_val = f"{int(rule['service_id'])}" if rule['service_id'] else "NULL"
            max_cl = int(rule['max_clients'])

            cur.execute(f"""
                INSERT INTO {schema}.master_slots
                (master_id, service_id, datetime_start, datetime_end, max_clients, status, source)
                VALUES ({int(master_id)}, {svc_val}, '{dt_start}', '{dt_end}', {max_cl}, 'available', 'template')
            """)
            created_count += 1

        current_d += timedelta(days=1)

    conn.commit()
    conn.close()

    return {
        'statusCode': 200,
        'headers': headers,
        'body': json.dumps({
            'success': True,
            'created': created_count,
            'skipped': skipped_count,
            'period': f"{start_d} - {end_d}"
        })
    }


def handle_settings(event, method, params, schema, headers):
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    if method == 'GET':
        master_id = params.get('master_id', '1')
        cur.execute(f"SELECT * FROM {schema}.master_calendar_settings WHERE master_id = {int(master_id)}")
        row = cur.fetchone()
        conn.close()
        if not row:
            return {'statusCode': 200, 'headers': headers, 'body': json.dumps({
                'master_id': int(master_id),
                'default_slot_duration': 60,
                'break_between_slots': 15,
                'prep_time': 15,
                'max_clients_per_day': 5,
                'auto_confirm': False,
                'notify_new_booking': True,
                'notify_24h_reminder': True,
                'notify_cancellation': True,
                'timezone': 'Europe/Moscow'
            })}
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps(row, default=str)}

    if method in ('POST', 'PUT'):
        body = json.loads(event.get('body', '{}'))
        master_id = body.get('master_id', 1)

        cur.execute(f"SELECT id FROM {schema}.master_calendar_settings WHERE master_id = {int(master_id)}")
        exists = cur.fetchone()

        if exists:
            updates = []
            for field in ['default_slot_duration', 'break_between_slots', 'prep_time', 'max_clients_per_day']:
                if field in body:
                    updates.append(f"{field} = {int(body[field])}")
            for field in ['auto_confirm', 'notify_new_booking', 'notify_24h_reminder', 'notify_cancellation']:
                if field in body:
                    updates.append(f"{field} = {'true' if body[field] else 'false'}")
            if 'timezone' in body:
                tz = body['timezone'].replace("'", "''")
                updates.append(f"timezone = '{tz}'")

            if updates:
                updates.append("updated_at = CURRENT_TIMESTAMP")
                cur.execute(f"""
                    UPDATE {schema}.master_calendar_settings SET {', '.join(updates)}
                    WHERE master_id = {int(master_id)} RETURNING *
                """)
        else:
            cur.execute(f"""
                INSERT INTO {schema}.master_calendar_settings
                (master_id, default_slot_duration, break_between_slots, prep_time, max_clients_per_day,
                 auto_confirm, notify_new_booking, notify_24h_reminder, notify_cancellation, timezone)
                VALUES (
                    {int(master_id)},
                    {int(body.get('default_slot_duration', 60))},
                    {int(body.get('break_between_slots', 15))},
                    {int(body.get('prep_time', 15))},
                    {int(body.get('max_clients_per_day', 5))},
                    {'true' if body.get('auto_confirm') else 'false'},
                    {'true' if body.get('notify_new_booking', True) else 'false'},
                    {'true' if body.get('notify_24h_reminder', True) else 'false'},
                    {'true' if body.get('notify_cancellation', True) else 'false'},
                    '{body.get('timezone', 'Europe/Moscow').replace("'", "''")}'
                ) RETURNING *
            """)

        row = cur.fetchone()
        conn.commit()
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps(row, default=str)}

    conn.close()
    return {'statusCode': 405, 'headers': headers, 'body': json.dumps({'error': 'Method not allowed'})}


def handle_blocks(event, method, params, schema, headers):
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    if method == 'GET':
        master_id = params.get('master_id', '1')
        cur.execute(f"""
            SELECT * FROM {schema}.master_day_blocks
            WHERE master_id = {int(master_id)}
            ORDER BY block_date
        """)
        rows = cur.fetchall()
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps(rows, default=str)}

    if method == 'POST':
        body = json.loads(event.get('body', '{}'))
        master_id = body.get('master_id', 1)
        block_date = body['block_date']
        block_end_date = body.get('block_end_date')
        reason = (body.get('reason') or '').replace("'", "''")
        notes = (body.get('notes') or '').replace("'", "''")

        dates_to_block = []
        start = datetime.strptime(block_date, '%Y-%m-%d').date()
        if block_end_date:
            end = datetime.strptime(block_end_date, '%Y-%m-%d').date()
        else:
            end = start

        d = start
        while d <= end:
            dates_to_block.append(d)
            d += timedelta(days=1)

        created = 0
        for bd in dates_to_block:
            cur.execute(f"""
                INSERT INTO {schema}.master_day_blocks (master_id, block_date, block_end_date, reason, notes)
                VALUES ({int(master_id)}, '{bd}', '{end}', '{reason}', '{notes}')
                ON CONFLICT (master_id, block_date) DO UPDATE SET
                    reason = EXCLUDED.reason, notes = EXCLUDED.notes, block_end_date = EXCLUDED.block_end_date
            """)
            created += 1

        cur.execute(f"""
            UPDATE {schema}.master_slots SET status = 'blocked'
            WHERE master_id = {int(master_id)}
              AND status = 'available'
              AND datetime_start::date >= '{start}'
              AND datetime_start::date <= '{end}'
        """)

        conn.commit()
        conn.close()
        return {'statusCode': 201, 'headers': headers, 'body': json.dumps({'success': True, 'blocked_days': created})}

    if method == 'DELETE':
        body = json.loads(event.get('body', '{}'))
        block_id = body.get('id') or params.get('id')
        master_id = body.get('master_id', params.get('master_id', '1'))

        cur.execute(f"SELECT block_date FROM {schema}.master_day_blocks WHERE id = {int(block_id)}")
        block_row = cur.fetchone()

        cur.execute(f"""
            UPDATE {schema}.master_day_blocks SET reason = 'removed'
            WHERE id = {int(block_id)}
        """)

        if block_row:
            cur.execute(f"""
                UPDATE {schema}.master_slots SET status = 'available'
                WHERE master_id = {int(master_id)}
                  AND status = 'blocked'
                  AND source = 'template'
                  AND datetime_start::date = '{block_row['block_date']}'
            """)

        conn.commit()
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'success': True})}

    conn.close()
    return {'statusCode': 405, 'headers': headers, 'body': json.dumps({'error': 'Method not allowed'})}


def handle_week_view(event, method, params, schema, headers):
    if method != 'GET':
        return {'statusCode': 405, 'headers': headers, 'body': json.dumps({'error': 'GET only'})}

    master_id = params.get('master_id', '1')
    week_start = params.get('week_start')

    if week_start:
        start_d = datetime.strptime(week_start, '%Y-%m-%d').date()
    else:
        today = date.today()
        start_d = today - timedelta(days=today.weekday())

    end_d = start_d + timedelta(days=6)

    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    cur.execute(f"""
        SELECT s.*, ms.name as service_name, ms.duration_minutes, ms.price as service_price
        FROM {schema}.master_slots s
        LEFT JOIN {schema}.master_services ms ON s.service_id = ms.id
        WHERE s.master_id = {int(master_id)}
          AND s.datetime_start::date >= '{start_d}'
          AND s.datetime_start::date <= '{end_d}'
          AND s.status != 'blocked'
        ORDER BY s.datetime_start
    """)
    slots = cur.fetchall()

    cur.execute(f"""
        SELECT b.*, ms.name as service_name
        FROM {schema}.master_bookings b
        LEFT JOIN {schema}.master_services ms ON b.service_id = ms.id
        WHERE b.master_id = {int(master_id)}
          AND b.datetime_start::date >= '{start_d}'
          AND b.datetime_start::date <= '{end_d}'
          AND b.status NOT IN ('canceled')
        ORDER BY b.datetime_start
    """)
    bookings = cur.fetchall()

    cur.execute(f"""
        SELECT * FROM {schema}.master_day_blocks
        WHERE master_id = {int(master_id)}
          AND block_date >= '{start_d}'
          AND block_date <= '{end_d}'
          AND reason != 'removed'
    """)
    blocks = cur.fetchall()

    conn.close()

    return {
        'statusCode': 200,
        'headers': headers,
        'body': json.dumps({
            'week_start': str(start_d),
            'week_end': str(end_d),
            'slots': slots,
            'bookings': bookings,
            'blocks': blocks
        }, default=str)
    }
