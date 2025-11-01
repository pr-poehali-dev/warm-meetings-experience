'''
Business: Управляет бронированиями - создание HOLD, подтверждение CONFIRMED, отмена CANCELLED
Args: event - dict с httpMethod (POST=create hold, PUT=confirm, DELETE=cancel)
      context - объект с request_id
Returns: HTTP response с результатом операции над бронью
'''

import json
import os
import uuid
from datetime import datetime, timedelta
from typing import Dict, Any
import psycopg2
from psycopg2.extras import RealDictCursor
from zoneinfo import ZoneInfo

MOSCOW_TZ = ZoneInfo('Europe/Moscow')
HOLD_TTL_MINUTES = 20

def get_db_connection():
    dsn = os.environ.get('DATABASE_URL')
    return psycopg2.connect(dsn)

def get_buffers(package_id: str, service_area_id: str, conn) -> tuple:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute('''
            SELECT prep_minutes, cleanup_minutes FROM buffers_config
            WHERE (scope_type = 'package' AND scope_id = %s)
            OR (scope_type = 'area' AND scope_id = %s)
            OR (scope_type = 'global' AND scope_id IS NULL)
            ORDER BY 
                CASE scope_type 
                    WHEN 'package' THEN 1
                    WHEN 'area' THEN 2
                    WHEN 'global' THEN 3
                END
            LIMIT 1
        ''', (package_id, service_area_id))
        
        result = cur.fetchone()
        if result:
            return result['prep_minutes'], result['cleanup_minutes']
    return 30, 30

def get_package_info(package_id: str, conn) -> Dict[str, Any]:
    # Словарь mapping строковых id к integer id в БД
    package_mapping = {
        'signature': 1,  # Ритуал "Ближе"
        'romance': 3,    # Тепло в тишине
        'wedding': 2,    # Свадебный пар
        'dinner': 5,     # Свидание с ужином
        'banya_training': 4  # Пар на двоих
    }
    
    # Конвертируем строковый id в integer, если нужно
    db_package_id = package_mapping.get(package_id, package_id)
    
    # Получаем из БД
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute('''
            SELECT id, name, description, duration_hours, base_price 
            FROM packages 
            WHERE id = %s
        ''', (db_package_id,))
        pkg = cur.fetchone()
        if pkg:
            return {
                'id': pkg['id'],
                'duration': pkg['duration_hours'] * 60,
                'base_price': float(pkg['base_price'])
            }
    
    # Fallback если не найдено
    return {'id': 1, 'duration': 120, 'base_price': 30000}

def calculate_price(package_id: str, service_area_id: str, persons: int, addons: list, promo_code: str, conn) -> float:
    package_info = get_package_info(package_id, conn)
    base_price = package_info['base_price']
    
    # Доплата за зону
    if service_area_id == 'area_moscow_region':
        base_price += 5000
    
    # Получаем стоимость аддонов из БД
    addon_total = 0
    if addons:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute('''
                SELECT id, price 
                FROM addons 
                WHERE id = ANY(%s)
            ''', (addons,))
            for addon in cur.fetchall():
                addon_total += float(addon['price'])
    
    total = base_price + addon_total
    
    # Промокод
    if promo_code:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute('''
                SELECT discount_percent 
                FROM promo_codes 
                WHERE code = %s AND is_active = TRUE
            ''', (promo_code,))
            promo = cur.fetchone()
            if promo:
                total *= (1 - float(promo['discount_percent']) / 100)
    
    return round(total, 2)

def check_slot_available(start_at: datetime, total_block_from: datetime, total_block_to: datetime, conn) -> bool:
    with conn.cursor() as cur:
        cur.execute('''
            SELECT COUNT(*) FROM bookings
            WHERE status IN ('CONFIRMED', 'HOLD')
            AND archived_at IS NULL
            AND total_block_from IS NOT NULL
            AND total_block_to IS NOT NULL
            AND NOT (total_block_to <= %s OR total_block_from >= %s)
        ''', (total_block_from, total_block_to))
        
        count = cur.fetchone()[0]
        if count > 0:
            return False
        
        cur.execute('''
            SELECT COUNT(*) FROM calendar_blocks
            WHERE NOT (block_to <= %s OR block_from >= %s)
        ''', (total_block_from, total_block_to))
        
        count = cur.fetchone()[0]
        return count == 0

def create_hold(body: Dict[str, Any], conn) -> Dict[str, Any]:
    package_id = body.get('package_id')
    service_area_id = body.get('service_area_id')
    start_at_str = body.get('start_at')
    persons = body.get('persons', 2)
    customer_name = body.get('customer_name')
    customer_phone = body.get('customer_phone')
    customer_email = body.get('customer_email', '')
    notes = body.get('notes', '')
    addons = body.get('addons', [])
    promo_code = body.get('promo_code', '')
    
    if not all([package_id, service_area_id, start_at_str, customer_name, customer_phone]):
        return {'statusCode': 400, 'error': 'Missing required fields'}
    
    start_at = datetime.fromisoformat(start_at_str.replace('Z', '+00:00'))
    
    prep_minutes, cleanup_minutes = get_buffers(package_id, service_area_id, conn)
    package_info = get_package_info(package_id, conn)
    duration_minutes = package_info['duration']
    
    total_block_from = start_at - timedelta(minutes=prep_minutes)
    total_block_to = start_at + timedelta(minutes=duration_minutes + cleanup_minutes)
    
    if not check_slot_available(start_at, total_block_from, total_block_to, conn):
        return {'statusCode': 409, 'error': 'Slot is not available'}
    
    price = calculate_price(package_id, service_area_id, persons, addons, promo_code, conn)
    deposit_amount = round(price * 0.3, 2)
    discount_amount = 0
    
    hold_token = str(uuid.uuid4())
    now = datetime.now(MOSCOW_TZ)
    
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute('''
            INSERT INTO bookings (
                client_name, client_phone, client_email,
                event_date, start_time,
                package_id, service_area_id, person_count,
                selected_addons, promo_code,
                base_price, total_price, discount_amount,
                calculation_details,
                status, consent_given,
                total_block_from, total_block_to,
                created_at, updated_at
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, 'HOLD', TRUE, %s, %s, %s, %s
            ) RETURNING id
        ''', (
            customer_name, customer_phone, customer_email,
            start_at.date(), start_at.time(),
            package_info['id'], service_area_id, persons,
            json.dumps(addons), promo_code,
            price, price, discount_amount,
            json.dumps({
                'prep_minutes': prep_minutes,
                'cleanup_minutes': cleanup_minutes,
                'duration_minutes': duration_minutes,
                'deposit_amount': deposit_amount,
                'hold_token': hold_token,
                'hold_expires_at': (now + timedelta(minutes=HOLD_TTL_MINUTES)).isoformat()
            }),
            total_block_from, total_block_to,
            now, now
        ))
        
        booking_id = cur.fetchone()['id']
        
        # Не используем booking_events из-за несоответствия типов (uuid vs integer)
        # TODO: migrate booking_events.booking_id to integer or bookings.id to uuid
    
    conn.commit()
    hold_expires_at = now + timedelta(minutes=HOLD_TTL_MINUTES)
    
    return {
        'statusCode': 200,
        'data': {
            'booking_id': str(booking_id),
            'token': hold_token,
            'hold_expires_at': hold_expires_at.isoformat(),
            'final_price': price,
            'deposit_amount': deposit_amount
        }
    }

def confirm_booking(body: Dict[str, Any], conn) -> Dict[str, Any]:
    booking_id = body.get('booking_id')
    admin_override = body.get('admin_override', False)
    
    if not booking_id:
        return {'statusCode': 400, 'error': 'Missing booking_id'}
    
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute('SELECT * FROM bookings WHERE id = %s AND archived_at IS NULL', (booking_id,))
        booking = cur.fetchone()
        
        if not booking:
            return {'statusCode': 404, 'error': 'Booking not found'}
        
        if booking['status'] == 'CONFIRMED':
            return {'statusCode': 200, 'data': {'message': 'Already confirmed'}}
        
        if booking['status'] != 'HOLD':
            return {'statusCode': 400, 'error': f"Cannot confirm {booking['status']}"}
        
        # Проверка истечения HOLD
        details = booking.get('calculation_details', {})
        hold_expires_at_str = details.get('hold_expires_at')
        if hold_expires_at_str and not admin_override:
            hold_expires_at = datetime.fromisoformat(hold_expires_at_str)
            if hold_expires_at < datetime.now(MOSCOW_TZ):
                return {'statusCode': 410, 'error': 'Hold expired'}
    
    now = datetime.now(MOSCOW_TZ)
    with conn.cursor() as cur:
        cur.execute('UPDATE bookings SET status = %s, updated_at = %s WHERE id = %s',
                    ('CONFIRMED', now, booking_id))
        # Не используем booking_events (type mismatch)
    
    conn.commit()
    return {'statusCode': 200, 'data': {'message': 'Confirmed', 'booking_id': str(booking_id)}}

def cancel_booking(body: Dict[str, Any], conn) -> Dict[str, Any]:
    booking_id = body.get('booking_id')
    reason = body.get('reason', 'Cancelled by user')
    
    if not booking_id:
        return {'statusCode': 400, 'error': 'Missing booking_id'}
    
    with conn.cursor() as cur:
        cur.execute('SELECT id FROM bookings WHERE id = %s AND archived_at IS NULL', (booking_id,))
        if not cur.fetchone():
            return {'statusCode': 404, 'error': 'Booking not found'}
    
    now = datetime.now(MOSCOW_TZ)
    with conn.cursor() as cur:
        cur.execute('UPDATE bookings SET status = %s, updated_at = %s WHERE id = %s',
                    ('CANCELLED', now, booking_id))
        # Не используем booking_events (type mismatch)
    
    conn.commit()
    return {'statusCode': 200, 'data': {'message': 'Cancelled', 'booking_id': str(booking_id)}}

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method = event.get('httpMethod', 'POST')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    try:
        body = json.loads(event.get('body', '{}'))
        
        conn = get_db_connection()
        
        if method == 'POST':
            result = create_hold(body, conn)
        elif method == 'PUT':
            result = confirm_booking(body, conn)
        elif method == 'DELETE':
            result = cancel_booking(body, conn)
        else:
            result = {'statusCode': 405, 'error': 'Method not allowed'}
        
        conn.close()
        
        status_code = result.get('statusCode', 200)
        response_body = result.get('data') or {'error': result.get('error', 'Unknown error')}
        
        return {
            'statusCode': status_code,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps(response_body),
            'isBase64Encoded': False
        }
        
    except Exception as e:
        import traceback
        print(f"[ERROR] {type(e).__name__}: {str(e)}")
        print(traceback.format_exc())
        
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e), 'type': type(e).__name__}),
            'isBase64Encoded': False
        }