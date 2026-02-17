import json
import os
import hashlib
import time

def handler(event, context):
    """Авторизация в админ-панели по паролю"""
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }

    headers = {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'}

    if event.get('httpMethod') != 'POST':
        return {'statusCode': 405, 'headers': headers, 'body': json.dumps({'error': 'Method not allowed'})}

    body = json.loads(event.get('body', '{}'))
    password = body.get('password', '')

    admin_password = os.environ.get('ADMIN_PASSWORD', '')

    if not admin_password:
        return {'statusCode': 500, 'headers': headers, 'body': json.dumps({'error': 'Admin password not configured'})}

    if password != admin_password:
        return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Неверный пароль'})}

    token = hashlib.sha256(f"{admin_password}:{int(time.time() // 86400)}".encode()).hexdigest()
    expires_at = time.strftime('%Y-%m-%dT23:59:59Z', time.gmtime(time.time() + 86400))

    return {
        'statusCode': 200,
        'headers': headers,
        'body': json.dumps({
            'token': token,
            'expires_at': expires_at
        })
    }
