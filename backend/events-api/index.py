import json
import os
from typing import Dict, Any, List, Optional
from datetime import datetime
from decimal import Decimal
import psycopg2
from psycopg2.extras import RealDictCursor
import urllib.request
import urllib.parse

def get_db_connection():
    '''
    Create database connection using DATABASE_URL environment variable
    '''
    return psycopg2.connect(os.environ['DATABASE_URL'])

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: API для управления мероприятиями и заявками (CRUD операции)
    Args: event - dict с httpMethod, body, queryStringParameters, pathParams
          context - объект с request_id, function_name
    Returns: HTTP response dict с данными мероприятий или заявок
    '''
    method: str = event.get('httpMethod', 'GET')
    params = event.get('queryStringParameters') or {}
    resource = params.get('resource', 'events')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    conn = get_db_connection()
    
    try:
        if resource == 'bookings':
            if method == 'GET':
                return get_bookings(event, conn)
            elif method == 'POST':
                return create_booking(event, conn)
            elif method == 'PUT':
                return update_booking(event, conn)
            else:
                return {
                    'statusCode': 405,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Method not allowed for bookings'}),
                    'isBase64Encoded': False
                }
        
        if method == 'GET':
            return get_events(event, conn)
        elif method == 'POST':
            return create_event(event, conn)
        elif method == 'PUT':
            return update_event(event, conn)
        elif method == 'DELETE':
            return delete_event(event, conn)
        else:
            return {
                'statusCode': 405,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Method not allowed'}),
                'isBase64Encoded': False
            }
    finally:
        conn.close()

def get_events(event: Dict[str, Any], conn) -> Dict[str, Any]:
    '''Get all events or single event by ID'''
    params = event.get('queryStringParameters') or {}
    event_id = params.get('id')
    search = params.get('search')
    occupancy = params.get('occupancy')
    visible_only = params.get('visible', 'true').lower() == 'true'
    
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    if event_id:
        cursor.execute(
            "SELECT * FROM events WHERE id = %s",
            (event_id,)
        )
        result = cursor.fetchone()
        cursor.close()
        
        if result:
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps(dict(result), default=str),
                'isBase64Encoded': False
            }
        else:
            return {
                'statusCode': 404,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Event not found'}),
                'isBase64Encoded': False
            }
    
    query = "SELECT * FROM events WHERE 1=1"
    query_params: List[Any] = []
    
    if visible_only:
        query += " AND is_visible = true"
    
    if search:
        query += " AND (title ILIKE %s OR short_description ILIKE %s)"
        search_pattern = f'%{search}%'
        query_params.extend([search_pattern, search_pattern])
    
    if occupancy:
        query += " AND occupancy = %s"
        query_params.append(occupancy)
    
    query += " ORDER BY event_date DESC, created_at DESC"
    
    cursor.execute(query, query_params)
    results = cursor.fetchall()
    cursor.close()
    
    events_list = [dict(row) for row in results]
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps(events_list, default=str),
        'isBase64Encoded': False
    }

def create_event(event: Dict[str, Any], conn) -> Dict[str, Any]:
    '''Create new event'''
    body_data = json.loads(event.get('body', '{}'))
    
    required_fields = ['title', 'event_date']
    for field in required_fields:
        if not body_data.get(field):
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': f'Field {field} is required'}),
                'isBase64Encoded': False
            }
    
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    cursor.execute("""
        INSERT INTO events (
            title, short_description, full_description, event_date,
            start_time, end_time, occupancy, price, image_url, is_visible,
            event_type, event_type_icon
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING *
    """, (
        body_data.get('title'),
        body_data.get('short_description'),
        body_data.get('full_description'),
        body_data.get('event_date'),
        body_data.get('start_time'),
        body_data.get('end_time'),
        body_data.get('occupancy', 'low'),
        body_data.get('price'),
        body_data.get('image_url'),
        body_data.get('is_visible', True),
        body_data.get('event_type', 'знакомство'),
        body_data.get('event_type_icon', 'Users')
    ))
    
    result = cursor.fetchone()
    conn.commit()
    cursor.close()
    
    return {
        'statusCode': 201,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps(dict(result), default=str),
        'isBase64Encoded': False
    }

def update_event(event: Dict[str, Any], conn) -> Dict[str, Any]:
    '''Update existing event'''
    body_data = json.loads(event.get('body', '{}'))
    event_id = body_data.get('id')
    
    if not event_id:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Event ID is required'}),
            'isBase64Encoded': False
        }
    
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    update_fields = []
    update_values = []
    
    fields_map = {
        'title': 'title',
        'short_description': 'short_description',
        'full_description': 'full_description',
        'event_date': 'event_date',
        'start_time': 'start_time',
        'end_time': 'end_time',
        'occupancy': 'occupancy',
        'price': 'price',
        'image_url': 'image_url',
        'is_visible': 'is_visible',
        'event_type': 'event_type',
        'event_type_icon': 'event_type_icon'
    }
    
    for field, column in fields_map.items():
        if field in body_data:
            update_fields.append(f"{column} = %s")
            update_values.append(body_data[field])
    
    if not update_fields:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'No fields to update'}),
            'isBase64Encoded': False
        }
    
    update_fields.append("updated_at = CURRENT_TIMESTAMP")
    update_values.append(event_id)
    
    query = f"UPDATE events SET {', '.join(update_fields)} WHERE id = %s RETURNING *"
    
    cursor.execute(query, update_values)
    result = cursor.fetchone()
    
    if not result:
        cursor.close()
        return {
            'statusCode': 404,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Event not found'}),
            'isBase64Encoded': False
        }
    
    conn.commit()
    cursor.close()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps(dict(result), default=str),
        'isBase64Encoded': False
    }

def delete_event(event: Dict[str, Any], conn) -> Dict[str, Any]:
    '''Delete event by ID'''
    params = event.get('queryStringParameters') or {}
    event_id = params.get('id')
    
    if not event_id:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Event ID is required'}),
            'isBase64Encoded': False
        }
    
    cursor = conn.cursor()
    cursor.execute("DELETE FROM events WHERE id = %s", (event_id,))
    deleted_count = cursor.rowcount
    conn.commit()
    cursor.close()
    
    if deleted_count > 0:
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'message': 'Event deleted successfully'}),
            'isBase64Encoded': False
        }
    else:
        return {
            'statusCode': 404,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Event not found'}),
            'isBase64Encoded': False
        }

def get_bookings(event: Dict[str, Any], conn) -> Dict[str, Any]:
    '''Get all bookings or single booking by ID'''
    params = event.get('queryStringParameters') or {}
    booking_id = params.get('id')
    status_filter = params.get('status')
    
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    if booking_id:
        cursor.execute("SELECT * FROM bookings WHERE id = %s", (booking_id,))
        result = cursor.fetchone()
        cursor.close()
        
        if result:
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps(dict(result), default=str),
                'isBase64Encoded': False
            }
        else:
            return {
                'statusCode': 404,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Booking not found'}),
                'isBase64Encoded': False
            }
    
    query = "SELECT * FROM bookings WHERE 1=1"
    query_params: List[Any] = []
    
    if status_filter:
        query += " AND status = %s"
        query_params.append(status_filter)
    
    query += " ORDER BY created_at DESC"
    
    cursor.execute(query, query_params)
    results = cursor.fetchall()
    cursor.close()
    
    bookings_list = [dict(row) for row in results]
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps(bookings_list, default=str),
        'isBase64Encoded': False
    }

def update_booking(event: Dict[str, Any], conn) -> Dict[str, Any]:
    '''Update booking status or notes'''
    body_data = json.loads(event.get('body', '{}'))
    booking_id = body_data.get('id')
    
    if not booking_id:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Booking ID is required'}),
            'isBase64Encoded': False
        }
    
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    update_fields = []
    update_values = []
    
    if 'status' in body_data:
        update_fields.append("status = %s")
        update_values.append(body_data['status'])
    
    if not update_fields:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'No fields to update'}),
            'isBase64Encoded': False
        }
    
    update_fields.append("updated_at = CURRENT_TIMESTAMP")
    update_values.append(booking_id)
    
    query = f"UPDATE bookings SET {', '.join(update_fields)} WHERE id = %s RETURNING *"
    
    cursor.execute(query, update_values)
    result = cursor.fetchone()
    
    if not result:
        cursor.close()
        return {
            'statusCode': 404,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Booking not found'}),
            'isBase64Encoded': False
        }
    
    conn.commit()
    cursor.close()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps(dict(result), default=str),
        'isBase64Encoded': False
    }

def send_telegram_notification(booking_data: Dict[str, Any]) -> None:
    '''Send booking notification to Telegram'''
    bot_token = os.environ.get('TELEGRAM_BOT_TOKEN')
    chat_id = os.environ.get('TELEGRAM_CHAT_ID')
    
    if not bot_token or not chat_id:
        return
    
    total_price = Decimal(str(booking_data['total_price']))
    deposit = int(total_price * Decimal('0.3'))
    
    message = f"""🔔 Новая заявка #{booking_data['id']}

👤 Клиент: {booking_data['client_name']}
📱 Телефон: {booking_data['client_phone']}
📧 Email: {booking_data.get('client_email', 'не указан')}

📦 Пакет: {booking_data.get('package_name', 'не выбран')}
📅 Дата: {booking_data.get('event_date', 'не указана')}
👥 Количество: {booking_data.get('person_count', 0)} чел.

💰 Стоимость: {int(total_price):,} ₽
💵 Депозит: {deposit:,} ₽

Статус: {booking_data['status']}"""
    
    url = f'https://api.telegram.org/bot{bot_token}/sendMessage'
    data = urllib.parse.urlencode({
        'chat_id': chat_id,
        'text': message,
        'parse_mode': 'HTML'
    }).encode()
    
    try:
        req = urllib.request.Request(url, data=data)
        urllib.request.urlopen(req)
    except Exception:
        pass

def create_booking(event: Dict[str, Any], conn) -> Dict[str, Any]:
    '''Create new booking from calculator'''
    body_data = json.loads(event.get('body', '{}'))
    
    required_fields = ['client_name', 'client_phone', 'total_price', 'event_date']
    for field in required_fields:
        if not body_data.get(field):
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': f'Field {field} is required'}),
                'isBase64Encoded': False
            }
    
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    selected_addons = body_data.get('selected_addons', [])
    calculation_details = body_data.get('calculation_details', {})
    
    cursor.execute("""
        INSERT INTO bookings (
            client_name, client_phone, client_email,
            package_id, service_area_id, event_date, person_count,
            selected_addons, promo_code, base_price, total_price, discount_amount,
            calculation_details, consent_given, status
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING *
    """, (
        body_data.get('client_name'),
        body_data.get('client_phone'),
        body_data.get('client_email'),
        body_data.get('package_id'),
        body_data.get('service_area_id'),
        body_data.get('event_date'),
        body_data.get('person_count', 0),
        json.dumps(selected_addons),
        body_data.get('promo_code'),
        body_data.get('base_price', 0),
        body_data.get('total_price'),
        body_data.get('discount_amount', 0),
        json.dumps(calculation_details),
        body_data.get('consent_given', False),
        'new'
    ))
    
    result = cursor.fetchone()
    conn.commit()
    cursor.close()
    
    booking_dict = dict(result)
    booking_dict['package_name'] = body_data.get('package_name', '')
    send_telegram_notification(booking_dict)
    
    return {
        'statusCode': 201,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps(booking_dict, default=str),
        'isBase64Encoded': False
    }