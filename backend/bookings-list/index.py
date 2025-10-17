'''
Business: Получает список бронирований с фильтрацией для админки
Args: event - dict с httpMethod, queryStringParameters (status, date_from, date_to, search)
      context - объект с request_id
Returns: HTTP response со списком бронирований
'''

import json
import os
from datetime import datetime
from typing import Dict, Any, List
import psycopg2
from psycopg2.extras import RealDictCursor
from zoneinfo import ZoneInfo

MOSCOW_TZ = ZoneInfo('Europe/Moscow')

def get_db_connection():
    dsn = os.environ.get('DATABASE_URL')
    return psycopg2.connect(dsn)

def serialize_datetime(obj):
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Type {type(obj)} not serializable")

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    if method != 'GET':
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    try:
        params = event.get('queryStringParameters') or {}
        status_filter = params.get('status')
        date_from = params.get('date_from')
        date_to = params.get('date_to')
        search = params.get('search', '')
        
        conn = get_db_connection()
        
        query = '''
            SELECT 
                id, package_id, service_area_id, persons,
                start_at, duration_minutes, prep_minutes, cleanup_minutes,
                total_block_from, total_block_to,
                status, hold_expires_at, price, deposit_amount,
                customer_name, customer_phone, customer_email, notes,
                addons, promo_code, created_at, updated_at, confirmed_at
            FROM bookings
            WHERE deleted_at IS NULL
        '''
        
        query_params = []
        
        if status_filter and status_filter != 'all':
            query += ' AND status = %s'
            query_params.append(status_filter.upper())
        
        if date_from:
            query += ' AND start_at >= %s'
            query_params.append(f"{date_from}T00:00:00+03:00")
        
        if date_to:
            query += ' AND start_at <= %s'
            query_params.append(f"{date_to}T23:59:59+03:00")
        
        if search:
            query += ' AND (customer_name ILIKE %s OR customer_phone LIKE %s)'
            search_pattern = f"%{search}%"
            query_params.extend([search_pattern, search_pattern])
        
        query += ' ORDER BY start_at DESC LIMIT 100'
        
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, query_params)
            bookings = cur.fetchall()
        
        conn.close()
        
        bookings_list = [dict(booking) for booking in bookings]
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'bookings': bookings_list,
                'count': len(bookings_list)
            }, default=serialize_datetime),
            'isBase64Encoded': False
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)}),
            'isBase64Encoded': False
        }
