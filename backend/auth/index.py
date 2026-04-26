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

    day_index = int(time.time() // 86400)
    token = hashlib.sha256(f"{admin_password}:{day_index}".encode()).hexdigest()
    # Токен меняется в 00:00 UTC при смене day_index — выставляем expires ровно до конца UTC-дня
    expires_ts = (day_index + 1) * 86400 - 1
    expires_at = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(expires_ts))

    return {
        'statusCode': 200,
        'headers': headers,
        'body': json.dumps({
            'token': token,
            'expires_at': expires_at
        })
    }