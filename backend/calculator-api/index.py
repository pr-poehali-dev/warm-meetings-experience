import json
import os
from typing import Dict, Any
from datetime import datetime, date
import psycopg2
from psycopg2.extras import RealDictCursor
import csv
from io import StringIO
import urllib.request
import urllib.parse

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Единое API для управления калькулятором - пакеты, аддоны, зоны, мультипликаторы, промо, заявки, аналитика
    Args: event с httpMethod, path, body, queryStringParameters; context с request_id
    Returns: HTTP response с данными по запрошенному ресурсу
    '''
    method: str = event.get('httpMethod', 'GET')
    query_params = event.get('queryStringParameters') or {}
    resource = query_params.get('resource', '')
    
    if method == 'OPTIONS':
        return cors_response(200, '')
    
    db_url = os.environ.get('DATABASE_URL')
    if not db_url:
        return cors_response(500, json.dumps({'error': 'DATABASE_URL not configured'}))
    
    conn = psycopg2.connect(db_url)
    
    try:
        if resource == 'bookings':
            result = handle_bookings(conn, event)
        elif resource == 'packages':
            result = handle_packages(conn, event)
        elif resource == 'addons':
            result = handle_addons(conn, event)
        elif resource == 'service-areas':
            result = handle_service_areas(conn, event)
        elif resource == 'multipliers':
            result = handle_multipliers(conn, event)
        elif resource == 'holidays':
            result = handle_holidays(conn, event)
        elif resource == 'promo-codes':
            result = handle_promo_codes(conn, event)
        elif resource == 'settings':
            result = handle_settings(conn, event)
        elif resource == 'analytics':
            result = handle_analytics(conn, event)
        else:
            result = cors_response(404, json.dumps({'error': 'Resource not found. Use ?resource=packages/addons/bookings/etc'}))
        
        conn.close()
        return result
    except Exception as e:
        conn.close()
        return cors_response(500, json.dumps({'error': str(e)}))

def send_telegram_notification(booking_data: dict):
    bot_token = os.environ.get('TELEGRAM_BOT_TOKEN')
    chat_id = os.environ.get('TELEGRAM_CHAT_ID')
    
    if not bot_token or not chat_id:
        return
    
    message = f"""🔔 Новая заявка #{booking_data.get('id')}

👤 Клиент: {booking_data.get('client_name')}
📱 Телефон: {booking_data.get('client_phone')}
📅 Дата: {booking_data.get('event_date', 'Не указана')}
📦 Пакет: {booking_data.get('package_name', 'Не выбран')}
👥 Человек: {booking_data.get('person_count', 0)}
💰 Сумма: {booking_data.get('total_price', 0):,.0f} ₽

Статус: {booking_data.get('status', 'new')}"""
    
    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    data = urllib.parse.urlencode({
        'chat_id': chat_id,
        'text': message,
        'parse_mode': 'HTML'
    }).encode()
    
    try:
        req = urllib.request.Request(url, data=data)
        urllib.request.urlopen(req, timeout=5)
    except Exception:
        pass

def cors_response(status: int, body: str, extra_headers: dict = None) -> Dict[str, Any]:
    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
        'Access-Control-Max-Age': '86400'
    }
    if extra_headers:
        headers.update(extra_headers)
    
    return {
        'statusCode': status,
        'headers': headers,
        'body': body,
        'isBase64Encoded': False
    }

def handle_bookings(conn, event):
    method = event.get('httpMethod', 'GET')
    query_params = event.get('queryStringParameters') or {}
    
    if method == 'GET':
        export_csv = query_params.get('export') == 'csv'
        booking_id = query_params.get('id')
        status_filter = query_params.get('status')
        date_from = query_params.get('date_from')
        date_to = query_params.get('date_to')
        
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        if booking_id:
            cursor.execute('''
                SELECT b.*, p.name as package_name, sa.name as service_area_name
                FROM bookings b
                LEFT JOIN packages p ON b.package_id = p.id
                LEFT JOIN service_areas sa ON b.service_area_id = sa.id
                WHERE b.id = %s
            ''', (booking_id,))
            result = cursor.fetchone()
            cursor.close()
            
            if not result:
                return cors_response(404, json.dumps({'error': 'Booking not found'}))
            
            return cors_response(200, json.dumps(dict(result), default=str))
        
        sql = '''
            SELECT b.*, p.name as package_name, sa.name as service_area_name
            FROM bookings b
            LEFT JOIN packages p ON b.package_id = p.id
            LEFT JOIN service_areas sa ON b.service_area_id = sa.id
            WHERE 1=1
        '''
        params = []
        
        if status_filter:
            sql += ' AND b.status = %s'
            params.append(status_filter)
        if date_from:
            sql += ' AND b.event_date >= %s'
            params.append(date_from)
        if date_to:
            sql += ' AND b.event_date <= %s'
            params.append(date_to)
        
        sql += ' ORDER BY b.created_at DESC'
        
        cursor.execute(sql, params)
        results = cursor.fetchall()
        cursor.close()
        
        bookings_list = [dict(row) for row in results]
        
        if export_csv:
            output = StringIO()
            if bookings_list:
                writer = csv.DictWriter(output, fieldnames=bookings_list[0].keys())
                writer.writeheader()
                writer.writerows(bookings_list)
            
            return cors_response(200, output.getvalue(), {
                'Content-Type': 'text/csv',
                'Content-Disposition': f'attachment; filename="bookings_{datetime.now().strftime("%Y%m%d")}.csv"'
            })
        
        return cors_response(200, json.dumps(bookings_list, default=str))
    
    elif method == 'POST':
        body_data = json.loads(event.get('body', '{}'))
        
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute('''
            INSERT INTO bookings (
                client_name, client_phone, event_date, package_id, service_area_id,
                person_count, selected_addons, promo_code, base_price, total_price,
                discount_amount, calculation_details, status, consent_given
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
        ''', (
            body_data['client_name'], body_data['client_phone'], body_data['event_date'],
            body_data.get('package_id'), body_data.get('service_area_id'),
            body_data['person_count'], json.dumps(body_data.get('selected_addons', [])),
            body_data.get('promo_code'), body_data['base_price'], body_data['total_price'],
            body_data.get('discount_amount', 0), json.dumps(body_data.get('calculation_details', {})),
            body_data.get('status', 'new'), body_data['consent_given']
        ))
        
        new_booking = cursor.fetchone()
        conn.commit()
        cursor.close()
        
        booking_dict = dict(new_booking)
        booking_dict['package_name'] = body_data.get('package_name', '')
        
        send_telegram_notification(booking_dict)
        
        return cors_response(201, json.dumps(booking_dict, default=str))
    
    elif method == 'PUT':
        body_data = json.loads(event.get('body', '{}'))
        
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute('''
            UPDATE bookings SET status = %s, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s RETURNING *
        ''', (body_data.get('status', 'new'), body_data['id']))
        
        updated = cursor.fetchone()
        conn.commit()
        cursor.close()
        
        return cors_response(200, json.dumps(dict(updated), default=str))
    
    elif method == 'DELETE':
        booking_id = query_params.get('id')
        cursor = conn.cursor()
        cursor.execute('DELETE FROM bookings WHERE id = %s', (booking_id,))
        conn.commit()
        cursor.close()
        
        return cors_response(200, json.dumps({'message': 'Deleted'}))

def handle_packages(conn, event):
    return handle_crud_resource(conn, event, 'packages', ['name', 'base_price', 'duration_hours'])

def handle_addons(conn, event):
    return handle_crud_resource(conn, event, 'addons', ['name', 'price'])

def handle_service_areas(conn, event):
    return handle_crud_resource(conn, event, 'service_areas', ['name', 'multiplier'])

def handle_crud_resource(conn, event, table_name, required_fields):
    method = event.get('httpMethod', 'GET')
    query_params = event.get('queryStringParameters') or {}
    
    if method == 'GET':
        resource_id = query_params.get('id')
        include_inactive = query_params.get('include_inactive') == 'true'
        
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        if resource_id:
            cursor.execute(f'SELECT * FROM {table_name} WHERE id = %s', (resource_id,))
            result = cursor.fetchone()
            cursor.close()
            
            if not result:
                return cors_response(404, json.dumps({'error': 'Not found'}))
            
            return cors_response(200, json.dumps(dict(result), default=str))
        
        sql = f'SELECT * FROM {table_name}'
        if not include_inactive:
            sql += ' WHERE is_active = true'
        
        cursor.execute(sql)
        results = cursor.fetchall()
        cursor.close()
        
        return cors_response(200, json.dumps([dict(row) for row in results], default=str))
    
    elif method == 'POST':
        body_data = json.loads(event.get('body', '{}'))
        
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        if table_name == 'packages':
            cursor.execute(f'''
                INSERT INTO {table_name} (name, description, base_price, duration_hours, is_active)
                VALUES (%s, %s, %s, %s, %s) RETURNING *
            ''', (body_data['name'], body_data.get('description', ''), 
                  body_data['base_price'], body_data['duration_hours'], body_data.get('is_active', True)))
        elif table_name == 'addons':
            cursor.execute(f'''
                INSERT INTO {table_name} (name, description, price, is_active)
                VALUES (%s, %s, %s, %s) RETURNING *
            ''', (body_data['name'], body_data.get('description', ''), 
                  body_data['price'], body_data.get('is_active', True)))
        elif table_name == 'service_areas':
            cursor.execute(f'''
                INSERT INTO {table_name} (name, multiplier, is_active)
                VALUES (%s, %s, %s) RETURNING *
            ''', (body_data['name'], body_data['multiplier'], body_data.get('is_active', True)))
        
        new_record = cursor.fetchone()
        conn.commit()
        cursor.close()
        
        return cors_response(201, json.dumps(dict(new_record), default=str))
    
    elif method == 'PUT':
        body_data = json.loads(event.get('body', '{}'))
        resource_id = body_data.get('id')
        
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute(f'SELECT * FROM {table_name} WHERE id = %s', (resource_id,))
        old_record = cursor.fetchone()
        
        if not old_record:
            cursor.close()
            return cors_response(404, json.dumps({'error': 'Not found'}))
        
        if table_name == 'packages':
            cursor.execute(f'''
                UPDATE {table_name} SET name = %s, description = %s, base_price = %s, 
                duration_hours = %s, is_active = %s, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s RETURNING *
            ''', (body_data.get('name', old_record['name']), body_data.get('description', old_record['description']),
                  body_data.get('base_price', old_record['base_price']), 
                  body_data.get('duration_hours', old_record['duration_hours']),
                  body_data.get('is_active', old_record['is_active']), resource_id))
        elif table_name == 'addons':
            cursor.execute(f'''
                UPDATE {table_name} SET name = %s, description = %s, price = %s, 
                is_active = %s, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s RETURNING *
            ''', (body_data.get('name', old_record['name']), body_data.get('description', old_record['description']),
                  body_data.get('price', old_record['price']), 
                  body_data.get('is_active', old_record['is_active']), resource_id))
        elif table_name == 'service_areas':
            cursor.execute(f'''
                UPDATE {table_name} SET name = %s, multiplier = %s, 
                is_active = %s, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s RETURNING *
            ''', (body_data.get('name', old_record['name']), body_data.get('multiplier', old_record['multiplier']),
                  body_data.get('is_active', old_record['is_active']), resource_id))
        
        updated_record = cursor.fetchone()
        conn.commit()
        cursor.close()
        
        return cors_response(200, json.dumps(dict(updated_record), default=str))
    
    elif method == 'DELETE':
        resource_id = query_params.get('id')
        cursor = conn.cursor()
        cursor.execute(f'DELETE FROM {table_name} WHERE id = %s', (resource_id,))
        conn.commit()
        cursor.close()
        
        return cors_response(200, json.dumps({'message': 'Deleted'}))

def handle_multipliers(conn, event):
    method = event.get('httpMethod', 'GET')
    query_params = event.get('queryStringParameters') or {}
    
    if method == 'GET':
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute('SELECT * FROM multipliers WHERE is_active = true ORDER BY multiplier_type, condition_key')
        results = cursor.fetchall()
        cursor.close()
        
        return cors_response(200, json.dumps([dict(row) for row in results], default=str))
    
    elif method == 'POST':
        body_data = json.loads(event.get('body', '{}'))
        
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute('''
            INSERT INTO multipliers (multiplier_type, condition_key, condition_label, multiplier, is_active)
            VALUES (%s, %s, %s, %s, %s) RETURNING *
        ''', (body_data['multiplier_type'], body_data['condition_key'], 
              body_data['condition_label'], body_data['multiplier'], body_data.get('is_active', True)))
        
        new_record = cursor.fetchone()
        conn.commit()
        cursor.close()
        
        return cors_response(201, json.dumps(dict(new_record), default=str))
    
    elif method == 'PUT':
        body_data = json.loads(event.get('body', '{}'))
        
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute('''
            UPDATE multipliers SET multiplier_type = %s, condition_key = %s, 
            condition_label = %s, multiplier = %s, is_active = %s, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s RETURNING *
        ''', (body_data['multiplier_type'], body_data['condition_key'], body_data['condition_label'],
              body_data['multiplier'], body_data.get('is_active', True), body_data['id']))
        
        updated = cursor.fetchone()
        conn.commit()
        cursor.close()
        
        return cors_response(200, json.dumps(dict(updated), default=str))

def handle_holidays(conn, event):
    method = event.get('httpMethod', 'GET')
    query_params = event.get('queryStringParameters') or {}
    
    if method == 'GET':
        check_date = query_params.get('date')
        
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        if check_date:
            cursor.execute('SELECT * FROM holiday_calendar WHERE holiday_date = %s AND is_active = true', (check_date,))
            result = cursor.fetchone()
            cursor.close()
            
            if result:
                return cors_response(200, json.dumps(dict(result), default=str))
            else:
                return cors_response(200, json.dumps({'is_holiday': False}))
        
        cursor.execute('SELECT * FROM holiday_calendar WHERE is_active = true ORDER BY holiday_date DESC')
        results = cursor.fetchall()
        cursor.close()
        
        return cors_response(200, json.dumps([dict(row) for row in results], default=str))
    
    elif method == 'POST':
        body_data = json.loads(event.get('body', '{}'))
        
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute('''
            INSERT INTO holiday_calendar (holiday_date, name, multiplier, is_active)
            VALUES (%s, %s, %s, %s) RETURNING *
        ''', (body_data['holiday_date'], body_data['name'], body_data['multiplier'], body_data.get('is_active', True)))
        
        new_record = cursor.fetchone()
        conn.commit()
        cursor.close()
        
        return cors_response(201, json.dumps(dict(new_record), default=str))

def handle_promo_codes(conn, event):
    method = event.get('httpMethod', 'GET')
    query_params = event.get('queryStringParameters') or {}
    
    if method == 'GET':
        validate_code = query_params.get('validate')
        
        if validate_code:
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            cursor.execute('''
                SELECT * FROM promo_codes 
                WHERE UPPER(code) = UPPER(%s) AND is_active = true
            ''', (validate_code,))
            result = cursor.fetchone()
            cursor.close()
            
            if not result:
                return cors_response(404, json.dumps({'valid': False, 'error': 'Промо-код не найден'}))
            
            promo = dict(result)
            today = date.today()
            
            if today < promo['valid_from'] or today > promo['valid_to']:
                return cors_response(200, json.dumps({'valid': False, 'error': 'Промо-код недействителен'}))
            
            if promo['usage_limit'] and promo['used_count'] >= promo['usage_limit']:
                return cors_response(200, json.dumps({'valid': False, 'error': 'Лимит исчерпан'}))
            
            return cors_response(200, json.dumps({
                'valid': True,
                'discount_type': promo['discount_type'],
                'discount_value': float(promo['discount_value']),
                'max_discount': float(promo['max_discount']) if promo['max_discount'] else None
            }))
        
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute('SELECT * FROM promo_codes WHERE is_active = true ORDER BY created_at DESC')
        results = cursor.fetchall()
        cursor.close()
        
        return cors_response(200, json.dumps([dict(row) for row in results], default=str))
    
    elif method == 'POST':
        body_data = json.loads(event.get('body', '{}'))
        
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute('''
            INSERT INTO promo_codes (code, discount_type, discount_value, valid_from, valid_to, 
                                    usage_limit, max_discount, is_active)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING *
        ''', (body_data['code'].upper(), body_data['discount_type'], body_data['discount_value'],
              body_data['valid_from'], body_data['valid_to'], body_data.get('usage_limit'),
              body_data.get('max_discount'), body_data.get('is_active', True)))
        
        new_record = cursor.fetchone()
        conn.commit()
        cursor.close()
        
        return cors_response(201, json.dumps(dict(new_record), default=str))

def handle_settings(conn, event):
    method = event.get('httpMethod', 'GET')
    query_params = event.get('queryStringParameters') or {}
    
    if method == 'GET':
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute('SELECT * FROM price_settings ORDER BY setting_key')
        results = cursor.fetchall()
        cursor.close()
        
        settings_dict = {row['setting_key']: row['setting_value'] for row in results}
        
        return cors_response(200, json.dumps(settings_dict))
    
    elif method == 'PUT':
        body_data = json.loads(event.get('body', '{}'))
        
        cursor = conn.cursor()
        for key, value in body_data.get('settings', {}).items():
            cursor.execute('''
                UPDATE price_settings 
                SET setting_value = %s, updated_at = CURRENT_TIMESTAMP
                WHERE setting_key = %s
            ''', (str(value), key))
        
        conn.commit()
        cursor.close()
        
        return cors_response(200, json.dumps({'message': 'Settings updated'}))

def handle_analytics(conn, event):
    query_params = event.get('queryStringParameters') or {}
    report_type = query_params.get('type', 'overview')
    
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    if report_type == 'overview':
        cursor.execute('''
            SELECT 
                COUNT(*) as total_bookings,
                COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_bookings,
                AVG(total_price) as average_check,
                SUM(total_price) as total_revenue
            FROM bookings
            WHERE created_at >= NOW() - INTERVAL '30 days'
        ''')
        overview = cursor.fetchone()
        
        cursor.execute('''
            SELECT p.name, COUNT(b.id) as booking_count
            FROM bookings b JOIN packages p ON b.package_id = p.id
            WHERE b.created_at >= NOW() - INTERVAL '30 days'
            GROUP BY p.id, p.name ORDER BY booking_count DESC
        ''')
        packages = cursor.fetchall()
        
        cursor.close()
        
        return cors_response(200, json.dumps({
            'overview': dict(overview) if overview else {},
            'packages_stats': [dict(row) for row in packages]
        }, default=str))
    
    cursor.close()
    return cors_response(400, json.dumps({'error': 'Invalid report type'}))