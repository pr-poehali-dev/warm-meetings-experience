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
import urllib.request
import urllib.parse

MOSCOW_TZ = ZoneInfo('Europe/Moscow')
HOLD_TTL_MINUTES = 20

def get_db_connection():
    dsn = os.environ.get('DATABASE_URL')
    return psycopg2.connect(dsn)

def send_telegram_notification(booking_data: Dict[str, Any]):
    bot_token = os.environ.get('TELEGRAM_BOT_TOKEN')
    chat_id = os.environ.get('TELEGRAM_CHAT_ID')
    
    if not bot_token or not chat_id:
        print('[WARNING] Telegram credentials not configured, skipping notification')
        return
    
    try:
        # Форматирование даты и времени
        start_at = datetime.fromisoformat(booking_data['start_at'])
        date_str = start_at.strftime('%d.%m.%Y')
        time_str = start_at.strftime('%H:%M')
        
        # Названия пакетов
        package_names = {
            'signature': 'Ритуал "Ближе"',
            'romance': 'Тепло в тишине',
            'wedding': 'Свадебный пар'
        }
        package_name = package_names.get(booking_data['package_id'], booking_data['package_id'])
        
        # Формирование сообщения
        message = f'''🔔 Новая заявка!

📦 Пакет: {package_name}
👤 Клиент: {booking_data['customer_name']}
📞 Телефон: {booking_data['customer_phone']}
📧 Email: {booking_data.get('customer_email', 'не указан')}

📅 Дата: {date_str}
🕐 Время: {time_str}
👥 Количество: {booking_data['persons']} чел.

💰 Сумма: {booking_data['final_price']} ₽
💳 Депозит: {booking_data['deposit_amount']} ₽

🆔 Номер брони: {booking_data['booking_id']}
⏰ Бронь удерживается до: {booking_data['hold_expires_at']}'''
        
        # Отправка через Telegram Bot API
        url = f'https://api.telegram.org/bot{bot_token}/sendMessage'
        data = urllib.parse.urlencode({
            'chat_id': chat_id,
            'text': message,
            'parse_mode': 'HTML'
        }).encode('utf-8')
        
        req = urllib.request.Request(url, data=data)
        with urllib.request.urlopen(req, timeout=5) as response:
            result = json.loads(response.read().decode('utf-8'))
            if result.get('ok'):
                print('[INFO] Telegram notification sent successfully')
            else:
                print(f'[WARNING] Telegram API error: {result}')
                
    except Exception as e:
        print(f'[ERROR] Failed to send Telegram notification: {e}')

def get_buffers(package_id: str, service_area_id: str, conn) -> tuple:
    safe_package_id = str(package_id).replace("'", "''")
    safe_area_id = str(service_area_id).replace("'", "''")
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(f'''
            SELECT prep_minutes, cleanup_minutes FROM buffers_config
            WHERE (scope_type = 'package' AND scope_id = '{safe_package_id}')
            OR (scope_type = 'area' AND scope_id = '{safe_area_id}')
            OR (scope_type = 'global' AND scope_id IS NULL)
            ORDER BY 
                CASE scope_type 
                    WHEN 'package' THEN 1
                    WHEN 'area' THEN 2
                    WHEN 'global' THEN 3
                END
            LIMIT 1
        ''')
        
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
        cur.execute(f'''
            SELECT id, name, description, duration_hours, base_price 
            FROM packages 
            WHERE id = {int(db_package_id)}
        ''')
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
        addon_ids_str = ','.join(str(int(aid)) for aid in addons)
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(f'''
                SELECT id, price 
                FROM addons 
                WHERE id IN ({addon_ids_str})
            ''')
            for addon in cur.fetchall():
                addon_total += float(addon['price'])
    
    total = base_price + addon_total
    
    # Промокод
    if promo_code:
        safe_promo = promo_code.replace("'", "''")
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(f'''
                SELECT discount_percent 
                FROM promo_codes 
                WHERE code = '{safe_promo}' AND is_active = TRUE
            ''')
            promo = cur.fetchone()
            if promo:
                total *= (1 - float(promo['discount_percent']) / 100)
    
    return round(total, 2)

def check_slot_available(start_at: datetime, total_block_from: datetime, total_block_to: datetime, conn) -> bool:
    from_str = total_block_from.strftime('%Y-%m-%d %H:%M:%S')
    to_str = total_block_to.strftime('%Y-%m-%d %H:%M:%S')
    
    with conn.cursor() as cur:
        cur.execute(f'''
            SELECT COUNT(*) FROM bookings
            WHERE status IN ('CONFIRMED', 'HOLD')
            AND archived_at IS NULL
            AND total_block_from IS NOT NULL
            AND total_block_to IS NOT NULL
            AND NOT (total_block_to <= '{from_str}' OR total_block_from >= '{to_str}')
        ''')
        
        count = cur.fetchone()[0]
        if count > 0:
            return False
        
        cur.execute(f'''
            SELECT COUNT(*) FROM calendar_blocks
            WHERE NOT (block_to <= '{from_str}' OR block_from >= '{to_str}')
        ''')
        
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
    
    # Экранирование строк для Simple Query Protocol
    safe_name = customer_name.replace("'", "''")
    safe_phone = customer_phone.replace("'", "''")
    safe_email = customer_email.replace("'", "''")
    safe_promo = promo_code.replace("'", "''") if promo_code else ''
    safe_area = service_area_id.replace("'", "''")
    safe_addons = json.dumps(addons).replace("'", "''")
    safe_calc_details = json.dumps({
        'prep_minutes': prep_minutes,
        'cleanup_minutes': cleanup_minutes,
        'duration_minutes': duration_minutes,
        'deposit_amount': deposit_amount,
        'hold_token': hold_token,
        'hold_expires_at': (now + timedelta(minutes=HOLD_TTL_MINUTES)).isoformat()
    }).replace("'", "''")
    
    event_date_str = start_at.date().strftime('%Y-%m-%d')
    start_time_str = start_at.time().strftime('%H:%M:%S')
    from_str = total_block_from.strftime('%Y-%m-%d %H:%M:%S')
    to_str = total_block_to.strftime('%Y-%m-%d %H:%M:%S')
    now_str = now.strftime('%Y-%m-%d %H:%M:%S')
    
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(f'''
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
                '{safe_name}', '{safe_phone}', '{safe_email}',
                '{event_date_str}', '{start_time_str}',
                {package_info['id']}, '{safe_area}', {persons},
                '{safe_addons}', '{safe_promo}',
                {price}, {price}, {discount_amount},
                '{safe_calc_details}',
                'HOLD', TRUE,
                '{from_str}', '{to_str}',
                '{now_str}', '{now_str}'
            ) RETURNING id
        ''')
        
        booking_id = cur.fetchone()['id']
        
        # Не используем booking_events из-за несоответствия типов (uuid vs integer)
        # TODO: migrate booking_events.booking_id to integer or bookings.id to uuid
    
    conn.commit()
    hold_expires_at = now + timedelta(minutes=HOLD_TTL_MINUTES)
    
    result_data = {
        'booking_id': str(booking_id),
        'token': hold_token,
        'hold_expires_at': hold_expires_at.isoformat(),
        'final_price': price,
        'deposit_amount': deposit_amount
    }
    
    # Отправка уведомления в Telegram
    try:
        notification_data = {
            'booking_id': str(booking_id),
            'package_id': package_id,
            'customer_name': customer_name,
            'customer_phone': customer_phone,
            'customer_email': customer_email,
            'start_at': start_at.isoformat(),
            'persons': persons,
            'final_price': price,
            'deposit_amount': deposit_amount,
            'hold_expires_at': hold_expires_at.strftime('%d.%m.%Y %H:%M')
        }
        send_telegram_notification(notification_data)
    except Exception as e:
        print(f'[WARNING] Notification failed but booking created: {e}')
    
    return {
        'statusCode': 200,
        'data': result_data
    }

def confirm_booking(body: Dict[str, Any], conn) -> Dict[str, Any]:
    booking_id = body.get('booking_id')
    admin_override = body.get('admin_override', False)
    
    if not booking_id:
        return {'statusCode': 400, 'error': 'Missing booking_id'}
    
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(f"SELECT * FROM bookings WHERE id = {int(booking_id)} AND archived_at IS NULL")
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
    now_str = now.strftime('%Y-%m-%d %H:%M:%S')
    with conn.cursor() as cur:
        cur.execute(f"UPDATE bookings SET status = 'CONFIRMED', updated_at = '{now_str}' WHERE id = {int(booking_id)}")
        # Не используем booking_events (type mismatch)
    
    conn.commit()
    return {'statusCode': 200, 'data': {'message': 'Confirmed', 'booking_id': str(booking_id)}}

def cancel_booking(body: Dict[str, Any], conn) -> Dict[str, Any]:
    booking_id = body.get('booking_id')
    reason = body.get('reason', 'Cancelled by user')
    
    if not booking_id:
        return {'statusCode': 400, 'error': 'Missing booking_id'}
    
    with conn.cursor() as cur:
        cur.execute(f"SELECT id FROM bookings WHERE id = {int(booking_id)} AND archived_at IS NULL")
        if not cur.fetchone():
            return {'statusCode': 404, 'error': 'Booking not found'}
    
    now = datetime.now(MOSCOW_TZ)
    now_str = now.strftime('%Y-%m-%d %H:%M:%S')
    with conn.cursor() as cur:
        cur.execute(f"UPDATE bookings SET status = 'CANCELLED', updated_at = '{now_str}' WHERE id = {int(booking_id)}")
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