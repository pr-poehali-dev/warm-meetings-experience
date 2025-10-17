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

def get_package_info(package_id: str) -> Dict[str, Any]:
    packages = {
        'signature': {'duration': 150, 'base_price': 33000},
        'romance': {'duration': 180, 'base_price': 39600},
        'wedding': {'duration': 180, 'base_price': 45000},
        'dinner': {'duration': 240, 'base_price': 55000},
        'banya_training': {'duration': 180, 'base_price': 38000}
    }
    return packages.get(package_id, {'duration': 120, 'base_price': 30000})

def calculate_price(package_id: str, service_area_id: str, persons: int, addons: list, promo_code: str) -> float:
    package_info = get_package_info(package_id)
    base_price = package_info['base_price']
    
    if service_area_id == 'area_moscow_region':
        base_price += 5000
    
    addon_prices = {
        'massage_30': 3000,
        'massage_60': 5500,
        'romantic_set': 4000,
        'tea_ceremony': 2500,
        'photo_session': 8000
    }
    
    addon_total = sum(addon_prices.get(addon, 0) for addon in addons)
    total = base_price + addon_total
    
    if promo_code == 'WELCOME10':
        total *= 0.9
    elif promo_code == 'FIRST20':
        total *= 0.8
    
    return round(total, 2)

def check_slot_available(start_at: datetime, total_block_from: datetime, total_block_to: datetime, conn) -> bool:
    with conn.cursor() as cur:
        cur.execute('''
            SELECT COUNT(*) FROM bookings
            WHERE status IN ('CONFIRMED', 'HOLD')
            AND deleted_at IS NULL
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
    package_info = get_package_info(package_id)
    duration_minutes = package_info['duration']
    
    total_block_from = start_at - timedelta(minutes=prep_minutes)
    total_block_to = start_at + timedelta(minutes=duration_minutes + cleanup_minutes)
    
    if not check_slot_available(start_at, total_block_from, total_block_to, conn):
        return {'statusCode': 409, 'error': 'Slot is not available'}
    
    price = calculate_price(package_id, service_area_id, persons, addons, promo_code)
    deposit_amount = round(price * 0.3, 2)
    
    booking_id = str(uuid.uuid4())
    hold_token = str(uuid.uuid4())
    hold_expires_at = datetime.now(MOSCOW_TZ) + timedelta(minutes=HOLD_TTL_MINUTES)
    now = datetime.now(MOSCOW_TZ)
    
    with conn.cursor() as cur:
        cur.execute('''
            INSERT INTO bookings (
                id, package_id, service_area_id, persons,
                start_at, duration_minutes, prep_minutes, cleanup_minutes,
                total_block_from, total_block_to,
                status, hold_expires_at, price, deposit_amount,
                customer_name, customer_phone, customer_email, notes, addons, promo_code,
                created_at, updated_at
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                'HOLD', %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            )
        ''', (
            booking_id, package_id, service_area_id, persons,
            start_at, duration_minutes, prep_minutes, cleanup_minutes,
            total_block_from, total_block_to,
            hold_expires_at, price, deposit_amount,
            customer_name, customer_phone, customer_email, notes, json.dumps(addons), promo_code,
            now, now
        ))
        
        cur.execute('''
            INSERT INTO booking_events (id, booking_id, event_type, payload, created_at)
            VALUES (%s, %s, 'HOLD_CREATED', %s, %s)
        ''', (str(uuid.uuid4()), booking_id, json.dumps({'token': hold_token}), now))
    
    conn.commit()
    
    return {
        'statusCode': 200,
        'data': {
            'booking_id': booking_id,
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
        cur.execute('SELECT * FROM bookings WHERE id = %s AND deleted_at IS NULL', (booking_id,))
        booking = cur.fetchone()
        
        if not booking:
            return {'statusCode': 404, 'error': 'Booking not found'}
        
        if booking['status'] == 'CONFIRMED':
            return {'statusCode': 200, 'data': {'message': 'Already confirmed'}}
        
        if booking['status'] != 'HOLD':
            return {'statusCode': 400, 'error': f"Cannot confirm {booking['status']}"}
        
        now = datetime.now(MOSCOW_TZ)
        if booking['hold_expires_at'] and booking['hold_expires_at'] < now and not admin_override:
            return {'statusCode': 410, 'error': 'Hold expired'}
    
    now = datetime.now(MOSCOW_TZ)
    with conn.cursor() as cur:
        cur.execute('UPDATE bookings SET status = %s, confirmed_at = %s, updated_at = %s WHERE id = %s',
                    ('CONFIRMED', now, now, booking_id))
        cur.execute('INSERT INTO booking_events (id, booking_id, event_type, created_at) VALUES (%s, %s, %s, %s)',
                    (str(uuid.uuid4()), booking_id, 'BOOKING_CONFIRMED', now))
    
    conn.commit()
    return {'statusCode': 200, 'data': {'message': 'Confirmed', 'booking_id': booking_id}}

def cancel_booking(body: Dict[str, Any], conn) -> Dict[str, Any]:
    booking_id = body.get('booking_id')
    reason = body.get('reason', 'Cancelled by user')
    
    if not booking_id:
        return {'statusCode': 400, 'error': 'Missing booking_id'}
    
    with conn.cursor() as cur:
        cur.execute('SELECT id FROM bookings WHERE id = %s AND deleted_at IS NULL', (booking_id,))
        if not cur.fetchone():
            return {'statusCode': 404, 'error': 'Booking not found'}
    
    now = datetime.now(MOSCOW_TZ)
    with conn.cursor() as cur:
        cur.execute('UPDATE bookings SET status = %s, updated_at = %s WHERE id = %s',
                    ('CANCELLED', now, booking_id))
        cur.execute('INSERT INTO booking_events (id, booking_id, event_type, payload, created_at) VALUES (%s, %s, %s, %s, %s)',
                    (str(uuid.uuid4()), booking_id, 'BOOKING_CANCELLED', json.dumps({'reason': reason}), now))
    
    conn.commit()
    return {'statusCode': 200, 'data': {'message': 'Cancelled', 'booking_id': booking_id}}

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
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)}),
            'isBase64Encoded': False
        }
