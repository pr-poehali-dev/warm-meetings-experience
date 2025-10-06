import json
import os
from typing import Dict, Any
import hashlib
import secrets
from datetime import datetime, timedelta

sessions = {}

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: API для аутентификации админа с проверкой пароля
    Args: event - dict с httpMethod, body (password)
          context - объект с request_id
    Returns: HTTP response с токеном сессии или ошибкой
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    if method == 'POST':
        return login(event)
    elif method == 'GET':
        return verify_session(event)
    else:
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }

def login(event: Dict[str, Any]) -> Dict[str, Any]:
    '''Authenticate user with password'''
    try:
        body_data = json.loads(event.get('body', '{}'))
        password = body_data.get('password', '')
        
        admin_password = os.environ.get('ADMIN_PASSWORD', 'admin123')
        
        if password != admin_password:
            return {
                'statusCode': 401,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Неверный пароль'}),
                'isBase64Encoded': False
            }
        
        session_token = secrets.token_urlsafe(32)
        expires_at = (datetime.now() + timedelta(hours=24)).isoformat()
        
        sessions[session_token] = {
            'created_at': datetime.now().isoformat(),
            'expires_at': expires_at
        }
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'token': session_token,
                'expires_at': expires_at,
                'message': 'Вход выполнен успешно'
            }),
            'isBase64Encoded': False
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)}),
            'isBase64Encoded': False
        }

def verify_session(event: Dict[str, Any]) -> Dict[str, Any]:
    '''Verify if session token is valid'''
    headers = event.get('headers', {})
    token = headers.get('X-Session-Token') or headers.get('x-session-token')
    
    if not token or token not in sessions:
        return {
            'statusCode': 401,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Unauthorized', 'valid': False}),
            'isBase64Encoded': False
        }
    
    session = sessions[token]
    expires_at = datetime.fromisoformat(session['expires_at'])
    
    if datetime.now() > expires_at:
        del sessions[token]
        return {
            'statusCode': 401,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Session expired', 'valid': False}),
            'isBase64Encoded': False
        }
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'valid': True, 'expires_at': session['expires_at']}),
        'isBase64Encoded': False
    }
