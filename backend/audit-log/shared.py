import hashlib
import json
import os
import time

import psycopg2
import psycopg2.extras


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def get_schema():
    return os.environ.get('MAIN_DB_SCHEMA', 'public')


def get_cursor(conn):
    return conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)


CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Authorization, X-Session-Token, X-Admin-Token',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json',
}


def options_response():
    return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}


def respond(status, body):
    return {
        'statusCode': status,
        'headers': CORS_HEADERS,
        'body': json.dumps(body, default=str, ensure_ascii=False),
    }


def ok(body):
    return respond(200, body)


def err(message, status=400):
    return respond(status, {'error': message})


def verify_admin_token(token):
    if not token:
        return False
    admin_pwd = os.environ.get('ADMIN_PASSWORD', '')
    if not admin_pwd:
        return False
    expected = hashlib.sha256(
        f"{admin_pwd}:{int(time.time() // 86400)}".encode()
    ).hexdigest()
    return token == expected
