"""Публичный чат гостя с организатором по reply_token (без авторизации)."""
import json
import os
import psycopg2
import psycopg2.extras

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json',
}


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def get_schema():
    return os.environ.get('MAIN_DB_SCHEMA', 'public')


def respond(status, body):
    return {
        'statusCode': status,
        'headers': CORS_HEADERS,
        'body': json.dumps(body, default=str, ensure_ascii=False),
        'isBase64Encoded': False,
    }


def handler(event: dict, context) -> dict:
    """Публичный чат гостя по reply_token: получить переписку и отправить ответ."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': '', 'isBase64Encoded': False}

    method = event.get('httpMethod', 'GET')
    params = event.get('queryStringParameters') or {}

    token = (params.get('token') or '').strip()
    if method == 'POST':
        try:
            body_json = json.loads(event.get('body') or '{}')
        except Exception:
            body_json = {}
        token = (body_json.get('token') or token).strip()
    else:
        body_json = {}

    if not token or len(token) > 64 or not all(c.isalnum() for c in token):
        return respond(400, {'error': 'invalid token'})

    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    schema = get_schema()

    try:
        t = token.replace("'", "''")
        cur.execute(f"""
            SELECT s.id AS signup_id, s.event_id, s.name AS guest_name,
                   e.title AS event_title, e.event_date, e.start_time,
                   u.name AS organizer_name
            FROM {schema}.event_signups s
            JOIN {schema}.events e ON e.id = s.event_id
            LEFT JOIN {schema}.users u ON u.id = e.organizer_id
            WHERE s.reply_token = '{t}'
            LIMIT 1
        """)
        row = cur.fetchone()
        if not row:
            return respond(404, {'error': 'not found'})

        signup_id = row['signup_id']
        event_id = row['event_id']

        if method == 'POST':
            text = (body_json.get('message') or '').strip()
            if not text:
                return respond(400, {'error': 'message required'})
            if len(text) > 5000:
                text = text[:5000]
            t_esc = text.replace("'", "''")
            cur.execute(f"""
                INSERT INTO {schema}.guest_messages (event_id, signup_id, direction, channel, body, delivered)
                VALUES ({int(event_id)}, {int(signup_id)}, 'in', 'site', '{t_esc}', true)
                RETURNING id, direction, channel, body, delivered, created_at
            """)
            new_msg = cur.fetchone()
            # Помечаем, что гость "написал" — обновим wrote_at если пусто
            cur.execute(f"""
                UPDATE {schema}.event_signups
                SET wrote_at = COALESCE(wrote_at, NOW()),
                    status = CASE WHEN status = 'new' THEN 'wrote' ELSE status END
                WHERE id = {int(signup_id)}
            """)
            conn.commit()
            return respond(200, {'ok': True, 'message': dict(new_msg)})

        # GET: вернуть переписку
        cur.execute(f"""
            SELECT id, direction, channel, body, delivered, created_at
            FROM {schema}.guest_messages
            WHERE signup_id = {int(signup_id)}
            ORDER BY created_at ASC
            LIMIT 500
        """)
        messages = [dict(m) for m in cur.fetchall()]

        # Помечаем исходящие как прочитанные
        cur.execute(f"""
            UPDATE {schema}.guest_messages
            SET read_at = NOW()
            WHERE signup_id = {int(signup_id)}
              AND direction = 'out'
              AND read_at IS NULL
        """)
        conn.commit()

        event_date = row.get('event_date')
        start_time = row.get('start_time')
        return respond(200, {
            'guest_name': row.get('guest_name'),
            'event': {
                'id': event_id,
                'title': row.get('event_title'),
                'date': str(event_date) if event_date else None,
                'start_time': str(start_time) if start_time else None,
            },
            'organizer_name': row.get('organizer_name'),
            'messages': messages,
        })
    finally:
        try:
            conn.close()
        except Exception:
            pass
