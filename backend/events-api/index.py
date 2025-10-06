import json
import os
from typing import Dict, Any, List, Optional
from datetime import datetime
import psycopg2
from psycopg2.extras import RealDictCursor

def get_db_connection():
    '''
    Create database connection using DATABASE_URL environment variable
    '''
    return psycopg2.connect(os.environ['DATABASE_URL'])

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: API для управления мероприятиями (CRUD операции)
    Args: event - dict с httpMethod, body, queryStringParameters, pathParams
          context - объект с request_id, function_name
    Returns: HTTP response dict с данными мероприятий
    '''
    method: str = event.get('httpMethod', 'GET')
    
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
            start_time, end_time, occupancy, image_url, is_visible
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING *
    """, (
        body_data.get('title'),
        body_data.get('short_description'),
        body_data.get('full_description'),
        body_data.get('event_date'),
        body_data.get('start_time'),
        body_data.get('end_time'),
        body_data.get('occupancy', 'low'),
        body_data.get('image_url'),
        body_data.get('is_visible', True)
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
        'image_url': 'image_url',
        'is_visible': 'is_visible'
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
