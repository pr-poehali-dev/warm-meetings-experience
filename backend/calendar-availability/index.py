'''
Business: Проверяет доступность слотов для бронирования с учётом буферов подготовки и уборки
Args: event - dict с httpMethod, body (package_id, service_area_id, date_from, date_to, persons)
      context - объект с request_id
Returns: HTTP response с доступными таймслотами в московском часовом поясе
'''

import json
import os
from datetime import datetime, timedelta
from typing import Dict, Any, List
import psycopg2
from psycopg2.extras import RealDictCursor
from zoneinfo import ZoneInfo

MOSCOW_TZ = ZoneInfo('Europe/Moscow')

def get_db_connection():
    dsn = os.environ.get('DATABASE_URL')
    return psycopg2.connect(dsn)

def get_buffers(package_id: str, service_area_id: str, conn) -> tuple:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute('''
            SELECT prep_minutes, cleanup_minutes FROM buffers_config
            WHERE scope_type = 'global' AND scope_id IS NULL
            LIMIT 1
        ''')
        
        result = cur.fetchone()
        if result:
            return result['prep_minutes'], result['cleanup_minutes']
    return 30, 30

def get_package_duration(package_id: str, conn) -> int:
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute('SELECT duration_hours FROM packages WHERE id = %s', (int(package_id),))
            result = cur.fetchone()
            if result and result['duration_hours']:
                return result['duration_hours'] * 60
    except Exception as e:
        print(f"Error getting package duration: {e}, package_id={package_id}")
    return 120

def get_occupied_windows(date_from: str, date_to: str, conn) -> List[tuple]:
    with conn.cursor() as cur:
        cur.execute('''
            SELECT total_block_from, total_block_to
            FROM bookings
            WHERE status IN ('confirmed', 'hold')
            AND archived_at IS NULL
            AND total_block_to >= %s::timestamptz
            AND total_block_from <= %s::timestamptz
            AND total_block_from IS NOT NULL
            AND total_block_to IS NOT NULL
            
            UNION ALL
            
            SELECT block_from, block_to
            FROM calendar_blocks
            WHERE block_to >= %s::timestamptz
            AND block_from <= %s::timestamptz
        ''', (date_from, date_to, date_from, date_to))
        
        return [(row[0], row[1]) for row in cur.fetchall()]

def is_slot_available(start_time: datetime, duration: int, prep: int, cleanup: int, occupied: List[tuple]) -> bool:
    total_start = start_time - timedelta(minutes=prep)
    total_end = start_time + timedelta(minutes=duration + cleanup)
    
    for occ_start, occ_end in occupied:
        if not (total_end <= occ_start or total_start >= occ_end):
            return False
    
    return True

def generate_time_slots(date_str: str, granularity_minutes: int = 15) -> List[datetime]:
    date = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
    moscow_date = date.astimezone(MOSCOW_TZ).replace(hour=10, minute=0, second=0, microsecond=0)
    
    slots = []
    end_of_day = moscow_date.replace(hour=23, minute=0)
    
    current = moscow_date
    while current <= end_of_day:
        slots.append(current)
        current += timedelta(minutes=granularity_minutes)
    
    return slots

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    try:
        body = json.loads(event.get('body', '{}'))
        package_id = body.get('package_id')
        service_area_id = body.get('service_area_id')
        date_from = body.get('date_from')
        date_to = body.get('date_to', date_from)
        
        if not all([package_id, date_from]):
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Missing required fields: package_id and date_from'}),
                'isBase64Encoded': False
            }
        
        try:
            conn = get_db_connection()
        except Exception as e:
            return {
                'statusCode': 500,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': f'Database connection failed: {str(e)}'}),
                'isBase64Encoded': False
            }
        
        try:
            prep_minutes, cleanup_minutes = get_buffers(package_id, service_area_id or '1', conn)
            duration_minutes = get_package_duration(package_id, conn)
            
            date_from_full = f"{date_from}T00:00:00+03:00"
            date_to_full = f"{date_to}T23:59:59+03:00"
            occupied_windows = get_occupied_windows(date_from_full, date_to_full, conn)
            
            all_slots = generate_time_slots(date_from)
            available_slots = []
            
            for slot in all_slots:
                if is_slot_available(slot, duration_minutes, prep_minutes, cleanup_minutes, occupied_windows):
                    available_slots.append(slot.isoformat())
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'available_slots': available_slots,
                    'granularity_minutes': 15,
                    'prep_minutes': prep_minutes,
                    'cleanup_minutes': cleanup_minutes,
                    'duration_minutes': duration_minutes
                }),
                'isBase64Encoded': False
            }
        finally:
            if conn:
                conn.close()
        
    except Exception as e:
        import traceback
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e), 'traceback': traceback.format_exc()}),
            'isBase64Encoded': False
        }