import json
import os
import hashlib
import random
import psycopg2
from urllib.parse import urlencode
from datetime import datetime


HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Auth-Token, X-Session-Id',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json',
}

ROBOKASSA_URL = 'https://auth.robokassa.ru/Merchant/Index.aspx'

PRESET_AMOUNTS = [150, 500, 1000, 2000]
MIN_AMOUNT = 50
MAX_AMOUNT = 100000


def calculate_signature(*args) -> str:
    joined = ':'.join(str(a) for a in args)
    return hashlib.md5(joined.encode()).hexdigest()


def db():
    dsn = os.environ.get('DATABASE_URL')
    if not dsn:
        raise ValueError('DATABASE_URL not configured')
    return psycopg2.connect(dsn)


def respond(status: int, payload: dict) -> dict:
    return {
        'statusCode': status,
        'headers': HEADERS,
        'body': json.dumps(payload, default=str),
        'isBase64Encoded': False,
    }


def get_user_id(event: dict) -> int | None:
    headers = event.get('headers') or {}
    raw = headers.get('X-User-Id') or headers.get('x-user-id')
    if not raw:
        return None
    try:
        return int(raw)
    except (TypeError, ValueError):
        return None


def create_donation(event: dict) -> dict:
    """Создаёт черновик доната и возвращает ссылку Robokassa (если ключи настроены)."""
    body = json.loads(event.get('body') or '{}')

    try:
        amount = float(body.get('amount', 0))
    except (TypeError, ValueError):
        return respond(400, {'error': 'Сумма указана неверно'})

    if amount < MIN_AMOUNT or amount > MAX_AMOUNT:
        return respond(400, {'error': f'Сумма должна быть от {MIN_AMOUNT} до {MAX_AMOUNT} ₽'})

    is_anonymous = bool(body.get('is_anonymous', False))
    share_stats = bool(body.get('share_stats', True))
    source = (body.get('source') or 'header')[:60]
    message = (body.get('message') or '')[:500]

    user_id = get_user_id(event)
    guest_name = (body.get('guest_name') or '').strip()[:120]
    guest_email = (body.get('guest_email') or '').strip()[:255]
    guest_contact = (body.get('guest_contact') or '').strip()[:255]

    if not user_id:
        if not guest_name or len(guest_name) < 2:
            return respond(400, {'error': 'Укажите имя'})
        if not guest_email and not guest_contact:
            return respond(400, {'error': 'Укажите email или контакт'})

    success_url = (body.get('success_url') or '').strip()
    fail_url = (body.get('fail_url') or '').strip()

    conn = db()
    cur = conn.cursor()

    try:
        # Уникальный InvoiceID
        robokassa_inv_id = None
        for _ in range(10):
            candidate = random.randint(900000000, 2147483647)
            cur.execute("SELECT 1 FROM club_donations WHERE robokassa_inv_id = %s", (candidate,))
            if not cur.fetchone():
                robokassa_inv_id = candidate
                break

        cur.execute(
            """
            INSERT INTO club_donations
                (user_id, guest_name, guest_email, guest_contact, amount,
                 is_anonymous, share_stats, source, message, status,
                 payment_provider, robokassa_inv_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
            """,
            (
                user_id,
                guest_name or None,
                guest_email or None,
                guest_contact or None,
                round(amount, 2),
                is_anonymous,
                share_stats,
                source,
                message or None,
                'pending',
                'robokassa',
                robokassa_inv_id,
            ),
        )
        donation_id = cur.fetchone()[0]

        merchant_login = os.environ.get('ROBOKASSA_MERCHANT_LOGIN')
        password_1 = os.environ.get('ROBOKASSA_PASSWORD_1')

        payment_url = None
        if merchant_login and password_1 and robokassa_inv_id:
            amount_str = f"{amount:.2f}"
            description = f"Клубный взнос #{donation_id}"

            if success_url or fail_url:
                signature = calculate_signature(
                    merchant_login, amount_str, robokassa_inv_id,
                    success_url, 'GET', fail_url, 'GET', password_1,
                )
            else:
                signature = calculate_signature(merchant_login, amount_str, robokassa_inv_id, password_1)

            params = {
                'MerchantLogin': merchant_login,
                'OutSum': amount_str,
                'InvoiceID': robokassa_inv_id,
                'SignatureValue': signature,
                'Culture': 'ru',
                'Description': description,
            }
            if guest_email:
                params['Email'] = guest_email
            if success_url:
                params['SuccessUrl2'] = success_url
                params['SuccessUrl2Method'] = 'GET'
            if fail_url:
                params['FailUrl2'] = fail_url
                params['FailUrl2Method'] = 'GET'

            payment_url = f"{ROBOKASSA_URL}?{urlencode(params)}"

            cur.execute(
                "UPDATE club_donations SET payment_url = %s WHERE id = %s",
                (payment_url, donation_id),
            )

        conn.commit()

        return respond(200, {
            'donation_id': donation_id,
            'payment_url': payment_url,
            'amount': amount,
            'has_payment': payment_url is not None,
        })
    finally:
        cur.close()
        conn.close()


def get_my_donations(event: dict) -> dict:
    user_id = get_user_id(event)
    if not user_id:
        return respond(401, {'error': 'Нужна авторизация'})

    conn = db()
    cur = conn.cursor()
    try:
        cur.execute(
            """
            SELECT id, amount, status, source, is_anonymous, created_at, paid_at
            FROM club_donations
            WHERE user_id = %s
            ORDER BY created_at DESC
            LIMIT 100
            """,
            (user_id,),
        )
        rows = cur.fetchall()
        items = [
            {
                'id': r[0],
                'amount': float(r[1]),
                'status': r[2],
                'source': r[3],
                'is_anonymous': r[4],
                'created_at': r[5].isoformat() if r[5] else None,
                'paid_at': r[6].isoformat() if r[6] else None,
            }
            for r in rows
        ]

        cur.execute(
            """
            SELECT COALESCE(SUM(amount), 0), COUNT(*)
            FROM club_donations
            WHERE user_id = %s AND status = 'succeeded'
            """,
            (user_id,),
        )
        total_amount, total_count = cur.fetchone()

        return respond(200, {
            'items': items,
            'total_amount': float(total_amount),
            'total_count': int(total_count),
        })
    finally:
        cur.close()
        conn.close()


def get_top_donors(event: dict) -> dict:
    conn = db()
    cur = conn.cursor()
    try:
        cur.execute(
            """
            SELECT
                d.id,
                d.amount,
                d.paid_at,
                d.is_anonymous,
                d.share_stats,
                COALESCE(u.name, d.guest_name) AS display_name
            FROM club_donations d
            LEFT JOIN users u ON u.id = d.user_id
            WHERE d.status = 'succeeded' AND d.share_stats = true
            ORDER BY d.paid_at DESC NULLS LAST
            LIMIT 20
            """,
        )
        rows = cur.fetchall()
        items = [
            {
                'id': r[0],
                'amount': float(r[1]),
                'paid_at': r[2].isoformat() if r[2] else None,
                'name': 'Аноним' if r[3] else (r[5] or 'Друг клуба'),
            }
            for r in rows
        ]
        return respond(200, {'items': items})
    finally:
        cur.close()
        conn.close()


def get_stats(event: dict) -> dict:
    conn = db()
    cur = conn.cursor()
    try:
        cur.execute(
            """
            SELECT
                COALESCE(SUM(amount), 0) AS total_amount,
                COUNT(*) AS total_count,
                COUNT(DISTINCT COALESCE(user_id::text, guest_email)) AS supporters
            FROM club_donations
            WHERE status = 'succeeded'
            """,
        )
        row = cur.fetchone()
        return respond(200, {
            'total_amount': float(row[0] or 0),
            'total_count': int(row[1] or 0),
            'supporters_count': int(row[2] or 0),
        })
    finally:
        cur.close()
        conn.close()


def handler(event: dict, context) -> dict:
    '''
    Клубные добровольные взносы.
    Routes (query ?resource=):
      - donate  (POST)  — создать взнос и получить ссылку на оплату
      - mine    (GET)   — мои взносы (нужен X-User-Id)
      - top     (GET)   — последние публичные сторонники
      - stats   (GET)   — общая статистика клуба
    '''
    method = (event.get('httpMethod') or 'GET').upper()

    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': HEADERS, 'body': '', 'isBase64Encoded': False}

    qs = event.get('queryStringParameters') or {}
    resource = (qs.get('resource') or '').lower()

    try:
        if method == 'POST' and resource in ('donate', 'donations', ''):
            return create_donation(event)
        if method == 'GET' and resource == 'mine':
            return get_my_donations(event)
        if method == 'GET' and resource == 'top':
            return get_top_donors(event)
        if method == 'GET' and resource == 'stats':
            return get_stats(event)
        return respond(404, {'error': 'Unknown resource'})
    except Exception as e:
        return respond(500, {'error': str(e)})
