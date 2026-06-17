"""Слияние дублирующихся аккаунтов: обнаружение, подтверждение email-кодом, выполнение слияния и API для админки."""

import json
import os
import hashlib
import secrets
import re
import random
import urllib.request
import urllib.parse
import urllib.error
from datetime import datetime, timedelta

import psycopg2
import psycopg2.extras

from shared import send_email

# ---------------------------------------------------------------------------
# Константы
# ---------------------------------------------------------------------------

MERGE_CODE_TTL_MIN = 15
MERGE_MAX_ATTEMPTS = 5

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Authorization, X-Session-Token, X-Admin-Token',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json',
}

# ---------------------------------------------------------------------------
# Вспомогательные функции
# ---------------------------------------------------------------------------

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def get_schema():
    return os.environ.get('MAIN_DB_SCHEMA', 'public')


def respond(status, body):
    return {
        'statusCode': status,
        'headers': CORS_HEADERS,
        'body': json.dumps(body, default=str, ensure_ascii=False),
    }


def hash_code(code: str) -> str:
    return hashlib.sha256(code.encode()).hexdigest()


def gen_code() -> str:
    return f"{secrets.randbelow(900000) + 100000:06d}"


def mask_email(email: str) -> str:
    """Маскирует email как 'a***@domain.com'."""
    if not email or '@' not in email:
        return email
    local, domain = email.split('@', 1)
    if len(local) <= 1:
        return f"{local}***@{domain}"
    return f"{local[0]}***@{domain}"


def verify_admin(token: str) -> bool:
    return bool(token) and token == os.environ.get('ADMIN_PASSWORD', '')


def get_user_from_session(cur, schema, token):
    """Возвращает пользователя по токену сессии или None."""
    if not token:
        return None
    t = token.replace("'", "''")
    cur.execute(f"""
        SELECT u.id, u.name, u.email, u.vk_id, u.is_active
        FROM {schema}.users u
        JOIN {schema}.user_sessions s ON s.user_id = u.id
        WHERE s.token = '{t}'
          AND s.expires_at > NOW()
          AND s.is_active = true
          AND u.is_active = true
    """)
    return cur.fetchone()


# ---------------------------------------------------------------------------
# Отправка email через Unisender Go
# ---------------------------------------------------------------------------

def send_merge_code_email(to_email: str, to_name: str, code: str,
                          source_name: str, target_name: str) -> bool:
    """Отправляет письмо с кодом подтверждения слияния аккаунтов.

    Использует единый shared.send_email (Unisender Go, корректный from_email/from_name).
    """
    html = f"""
<html>
<body style="font-family: Arial, sans-serif; color: #222; max-width: 520px; margin: 0 auto;">
  <h2 style="color: #333;">Подтверждение объединения аккаунтов</h2>
  <p>Здравствуйте, <b>{target_name}</b>!</p>
  <p>Был создан запрос на объединение двух аккаунтов:</p>
  <ul>
    <li>Дополнительный (VK): <b>{source_name}</b></li>
    <li>Основной: <b>{target_name}</b></li>
  </ul>
  <p>После объединения все данные дополнительного аккаунта (записи, бронирования, роли)
     будут перенесены на основной аккаунт, а дополнительный будет деактивирован.</p>
  <p>Для подтверждения введите код:</p>
  <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px;
              background: #f5f5f5; padding: 20px 30px; border-radius: 8px;
              display: inline-block; margin: 10px 0;">
    {code}
  </div>
  <p style="color: #888; font-size: 13px;">
    Код действителен {MERGE_CODE_TTL_MIN} минут.<br>
    Если вы не запрашивали объединение — просто проигнорируйте это письмо.
  </p>
</body>
</html>
"""
    return send_email(
        to_email,
        'Подтверждение объединения аккаунтов',
        html,
        to_name=to_name,
        tags=['account-merge'],
    )


# ---------------------------------------------------------------------------
# Слияние аккаунтов
# ---------------------------------------------------------------------------

def _do_merge(cur, conn, schema, source_id: int, target_id: int) -> dict:
    """
    Переносит данные с source на target в транзакции.
    Возвращает словарь с количеством перенесённых записей.
    """
    signups_moved = 0
    bookings_moved = 0
    roles_moved = 0
    vk_linked = False

    # 1. event_signups
    try:
        cur.execute(f"""
            UPDATE {schema}.event_signups
            SET user_id = {target_id}
            WHERE user_id = {source_id}
        """)
        signups_moved = cur.rowcount
        print(f"[merge-accounts] _do_merge: signups_moved={signups_moved}")
    except Exception as exc:
        print(f"[merge-accounts] _do_merge: event_signups error: {exc}")

    # 2. master_bookings
    try:
        cur.execute(f"""
            UPDATE {schema}.master_bookings
            SET client_id = {target_id}
            WHERE client_id = {source_id}
        """)
        bookings_moved = cur.rowcount
        print(f"[merge-accounts] _do_merge: bookings_moved={bookings_moved}")
    except Exception as exc:
        print(f"[merge-accounts] _do_merge: master_bookings error: {exc}")

    # 3. user_favorites (может не существовать)
    try:
        cur.execute(f"""
            UPDATE {schema}.user_favorites
            SET user_id = {target_id}
            WHERE user_id = {source_id}
        """)
        print(f"[merge-accounts] _do_merge: user_favorites moved={cur.rowcount}")
    except Exception as exc:
        print(f"[merge-accounts] _do_merge: user_favorites skip: {exc}")

    # 4. crm_notes (если есть user_id)
    try:
        cur.execute(f"""
            UPDATE {schema}.crm_notes
            SET user_id = {target_id}
            WHERE user_id = {source_id}
        """)
        print(f"[merge-accounts] _do_merge: crm_notes moved={cur.rowcount}")
    except Exception as exc:
        print(f"[merge-accounts] _do_merge: crm_notes skip: {exc}")

    # 5. user_roles — перенос ролей без дублирования
    try:
        cur.execute(f"""
            INSERT INTO {schema}.user_roles (user_id, role_id, status, verified_at, created_at)
            SELECT {target_id}, role_id, status, verified_at, created_at
            FROM {schema}.user_roles
            WHERE user_id = {source_id}
            ON CONFLICT (user_id, role_id) DO NOTHING
        """)
        roles_moved = cur.rowcount
        print(f"[merge-accounts] _do_merge: roles_moved={roles_moved}")
        cur.execute(f"DELETE FROM {schema}.user_roles WHERE user_id = {source_id}")
    except Exception as exc:
        print(f"[merge-accounts] _do_merge: user_roles error: {exc}")

    # 6. Перенести vk_id от source на target если у target нет vk_id
    try:
        cur.execute(f"""
            UPDATE {schema}.users
            SET vk_id = (SELECT vk_id FROM {schema}.users WHERE id = {source_id}),
                notify_vk = TRUE
            WHERE id = {target_id}
              AND vk_id IS NULL
              AND (SELECT vk_id FROM {schema}.users WHERE id = {source_id}) IS NOT NULL
        """)
        vk_linked = cur.rowcount > 0
        print(f"[merge-accounts] _do_merge: vk_linked={vk_linked}")
    except Exception as exc:
        print(f"[merge-accounts] _do_merge: vk_id transfer error: {exc}")

    # 7. Деактивировать source
    try:
        cur.execute(f"""
            UPDATE {schema}.users
            SET is_active = false,
                blocked_reason = 'duplicate',
                email = email || '.merged.' || '{source_id}',
                updated_at = NOW()
            WHERE id = {source_id}
        """)
        print(f"[merge-accounts] _do_merge: source user {source_id} deactivated")
    except Exception as exc:
        print(f"[merge-accounts] _do_merge: deactivate source error: {exc}")

    # 8. Инвалидировать сессии source
    try:
        cur.execute(f"""
            UPDATE {schema}.user_sessions
            SET expires_at = NOW() - INTERVAL '1 second'
            WHERE user_id = {source_id}
        """)
        print(f"[merge-accounts] _do_merge: sessions invalidated for source {source_id}")
    except Exception as exc:
        print(f"[merge-accounts] _do_merge: invalidate sessions error: {exc}")

    conn.commit()

    return {
        'signups_moved': signups_moved,
        'bookings_moved': bookings_moved,
        'roles_moved': roles_moved,
        'vk_linked': vk_linked,
    }


def _send_vk_consent_message(vk_id):
    """Отправляет приветственное сообщение пользователю от сообщества после успешного объединения аккаунтов."""
    try:
        community_token = os.environ.get('VK_COMMUNITY_TOKEN', '')
        community_id = os.environ.get('VK_COMMUNITY_ID', '')
        if not community_token or not community_id or not vk_id:
            return
        msg = (
            'Я подключаю уведомления от СПАРКОМ. '
            'Согласен получать сообщения о моих записях, бронированиях и новостях платформы. '
            'Буду рад быть на связи!'
        )
        params = urllib.parse.urlencode({
            'user_id': vk_id,
            'message': msg,
            'random_id': random.randint(0, 2**31),
            'access_token': community_token,
            'v': '5.131',
        })
        req = urllib.request.Request(
            f'https://api.vk.com/method/messages.send?{params}',
            method='GET'
        )
        urllib.request.urlopen(req, timeout=5)
    except Exception:
        pass


# ---------------------------------------------------------------------------
# Handlers
# ---------------------------------------------------------------------------

def handle_detect(event, params, cur, conn, schema):
    """Обнаруживает потенциальный дубль при VK-входе.
    Вызывается после VK-callback когда у пользователя email вида vk_NNN@vk.local.
    Ищет в БД другой аккаунт с реальным email и похожим именем или по переданному vk_email."""

    vk_user_id = params.get('vk_user_id', '').strip()
    vk_email = (params.get('vk_email') or '').strip().lower()

    if not vk_user_id:
        return respond(400, {'error': 'Параметр vk_user_id обязателен'})

    safe_vk_id = vk_user_id.replace("'", "''")

    # 1. Найти пользователя с vk_id = vk_user_id
    cur.execute(f"""
        SELECT id, name, email, vk_id
        FROM {schema}.users
        WHERE vk_id = '{safe_vk_id}'
          AND is_active = true
        LIMIT 1
    """)
    source = cur.fetchone()

    if not source:
        return respond(404, {'error': 'VK user not found'})

    source_id = source['id']
    source_name = source['name'] or ''
    source_email = source['email'] or ''

    # 3. Если у него email НЕ заканчивается на '@vk.local' — у него уже реальный email
    if not source_email.lower().endswith('@vk.local'):
        return respond(200, {'merge_hint': None})

    # 4. Поиск кандидата для слияния
    candidate = None
    reason = None

    if vk_email:
        safe_ve = vk_email.replace("'", "''")
        cur.execute(f"""
            SELECT id, name, email
            FROM {schema}.users
            WHERE LOWER(email) = LOWER('{safe_ve}')
              AND is_active = true
              AND id != {source_id}
            LIMIT 1
        """)
        candidate = cur.fetchone()
        if candidate:
            reason = 'email_match'

    if not candidate and source_name:
        safe_name = source_name.replace("'", "''")
        cur.execute(f"""
            SELECT id, name, email
            FROM {schema}.users
            WHERE LOWER(name) ILIKE LOWER('{safe_name}')
              AND email NOT LIKE '%@vk.local'
              AND is_active = true
              AND id != {source_id}
            LIMIT 3
        """)
        rows = cur.fetchall()
        if rows:
            candidate = rows[0]
            reason = 'name_match'

    if not candidate:
        return respond(200, {'merge_hint': None})

    return respond(200, {
        'merge_hint': {
            'source_user_id': source_id,
            'target_user_id': candidate['id'],
            'target_email_masked': mask_email(candidate['email']),
            'target_name': candidate['name'],
            'reason': reason,
        }
    })


def handle_request_merge(event, params, cur, conn, schema):
    """Создаёт запрос на слияние и отправляет 6-значный код на email целевого аккаунта."""

    raw_body = event.get('body') or '{}'
    try:
        body = json.loads(raw_body)
    except Exception:
        return respond(400, {'error': 'Некорректный JSON в теле запроса'})

    source_user_id = body.get('source_user_id')
    target_user_id = body.get('target_user_id')
    ip = (body.get('ip') or '').strip()

    if not source_user_id or not target_user_id:
        return respond(400, {'error': 'Параметры source_user_id и target_user_id обязательны'})

    try:
        source_user_id = int(source_user_id)
        target_user_id = int(target_user_id)
    except (TypeError, ValueError):
        return respond(400, {'error': 'source_user_id и target_user_id должны быть целыми числами'})

    if source_user_id == target_user_id:
        return respond(400, {'error': 'source и target не могут быть одним пользователем'})

    # 1. Проверить что оба пользователя существуют и активны
    cur.execute(f"""
        SELECT id, name, email, vk_id
        FROM {schema}.users
        WHERE id = {source_user_id} AND is_active = true
    """)
    source = cur.fetchone()
    if not source:
        return respond(404, {'error': 'Source пользователь не найден или неактивен'})

    cur.execute(f"""
        SELECT id, name, email
        FROM {schema}.users
        WHERE id = {target_user_id} AND is_active = true
    """)
    target = cur.fetchone()
    if not target:
        return respond(404, {'error': 'Target пользователь не найден или неактивен'})

    # 2. Проверить что source имеет vk_id
    if not source.get('vk_id'):
        return respond(400, {'error': 'Source пользователь не имеет привязанного VK аккаунта'})

    # 3. Проверить что target имеет реальный email (не @vk.local)
    target_email = target['email'] or ''
    if not target_email or target_email.lower().endswith('@vk.local'):
        return respond(400, {'error': 'Target пользователь не имеет реального email'})

    # 4. Проверить что нет pending запроса за последний час
    cur.execute(f"""
        SELECT id
        FROM {schema}.account_merge_requests
        WHERE source_user_id = {source_user_id}
          AND target_user_id = {target_user_id}
          AND status = 'pending_email'
          AND created_at > NOW() - INTERVAL '1 hour'
        LIMIT 1
    """)
    existing = cur.fetchone()
    if existing:
        return respond(409, {
            'error': 'Запрос уже создан, проверьте почту',
            'merge_request_id': existing['id'],
        })

    # 5. Генерация кода
    code = gen_code()
    code_hash = hash_code(code)
    safe_ip = ip.replace("'", "''") if ip else ''
    safe_email = target_email.replace("'", "''")
    ip_val = f"'{safe_ip}'" if safe_ip else 'NULL'

    # 6. INSERT в account_merge_requests
    cur.execute(f"""
        INSERT INTO {schema}.account_merge_requests
            (source_user_id, target_user_id, triggered_by, status,
             confirm_code_hash, confirm_email, ip_address)
        VALUES
            ({source_user_id}, {target_user_id}, 'vk_login', 'pending_email',
             '{code_hash}', '{safe_email}', {ip_val})
        RETURNING id
    """)
    new_row = cur.fetchone()
    new_id = new_row['id']
    conn.commit()

    print(f"[merge-accounts] handle_request_merge: created request id={new_id}, source={source_user_id}, target={target_user_id}")

    # 7. Отправить email
    source_name = source['name'] or 'VK пользователь'
    target_name = target['name'] or 'Пользователь'
    send_merge_code_email(target_email, target_name, code, source_name, target_name)

    # 8. Вернуть ответ
    return respond(200, {
        'merge_request_id': new_id,
        'email_masked': mask_email(target_email),
    })


def handle_verify_code(event, params, cur, conn, schema):
    """Подтверждает код из email и выполняет слияние аккаунтов."""

    raw_body = event.get('body') or '{}'
    try:
        body = json.loads(raw_body)
    except Exception:
        return respond(400, {'error': 'Некорректный JSON в теле запроса'})

    merge_request_id = body.get('merge_request_id')
    code = str(body.get('code') or '').strip()

    if not merge_request_id or not code:
        return respond(400, {'error': 'Параметры merge_request_id и code обязательны'})

    try:
        merge_request_id = int(merge_request_id)
    except (TypeError, ValueError):
        return respond(400, {'error': 'merge_request_id должен быть целым числом'})

    # 1. Найти запрос по id WHERE status='pending_email'
    cur.execute(f"""
        SELECT id, source_user_id, target_user_id, confirm_code_hash,
               created_at, attempts, status
        FROM {schema}.account_merge_requests
        WHERE id = {merge_request_id}
          AND status = 'pending_email'
    """)
    req = cur.fetchone()

    # 2. Если не найден
    if not req:
        return respond(404, {'error': 'Запрос не найден или уже выполнен'})

    # 3. Проверить TTL
    created_at = req['created_at']
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at)
    # Убираем tzinfo для сравнения с naive datetime
    created_at_naive = created_at.replace(tzinfo=None) if hasattr(created_at, 'tzinfo') and created_at.tzinfo else created_at
    now_naive = datetime.utcnow()
    if created_at_naive + timedelta(minutes=MERGE_CODE_TTL_MIN) < now_naive:
        cur.execute(f"""
            UPDATE {schema}.account_merge_requests
            SET status = 'cancelled'
            WHERE id = {merge_request_id}
        """)
        conn.commit()
        return respond(410, {'error': 'Код истёк'})

    # 4. Проверить attempts
    attempts = req.get('attempts') or 0
    if attempts >= MERGE_MAX_ATTEMPTS:
        return respond(429, {'error': 'Слишком много попыток'})

    # 5. Увеличить счётчик попыток
    cur.execute(f"""
        UPDATE {schema}.account_merge_requests
        SET attempts = COALESCE(attempts, 0) + 1
        WHERE id = {merge_request_id}
    """)

    # Проверить код
    if hash_code(code) != req['confirm_code_hash']:
        conn.commit()
        return respond(400, {'error': 'Неверный код'})

    source_id = req['source_user_id']
    target_id = req['target_user_id']

    # 6. UPDATE status='confirmed'
    cur.execute(f"""
        UPDATE {schema}.account_merge_requests
        SET status = 'confirmed', confirmed_at = NOW()
        WHERE id = {merge_request_id}
    """)
    conn.commit()

    print(f"[merge-accounts] handle_verify_code: code confirmed for request {merge_request_id}, doing merge source={source_id} -> target={target_id}")

    # 7. Выполнить слияние
    summary = _do_merge(cur, conn, schema, source_id, target_id)

    # 8. UPDATE status='completed'
    safe_summary = json.dumps(summary, ensure_ascii=False).replace("'", "''")
    cur.execute(f"""
        UPDATE {schema}.account_merge_requests
        SET status = 'completed',
            completed_at = NOW(),
            merge_summary = '{safe_summary}'::jsonb
        WHERE id = {merge_request_id}
    """)
    conn.commit()

    print(f"[merge-accounts] handle_verify_code: merge completed, summary={summary}")

    # Отправляем согласие на уведомления в VK, если vk_id есть у итогового аккаунта
    if summary.get('vk_linked'):
        try:
            cur2 = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur2.execute(f"SELECT vk_id FROM {schema}.users WHERE id = {target_id}")
            row = cur2.fetchone()
            if row and row.get('vk_id'):
                _send_vk_consent_message(row['vk_id'])
        except Exception:
            pass

    return respond(200, {'ok': True, 'summary': summary})


def handle_admin_list(event, params, cur, conn, schema):
    """Список merge-запросов для админки."""

    headers_in = event.get('headers') or {}
    admin_token = (
        headers_in.get('X-Admin-Token')
        or headers_in.get('x-admin-token')
        or ''
    )
    if not verify_admin(admin_token):
        return respond(403, {'error': 'Доступ запрещён'})

    status_filter = params.get('status', '')
    page = max(1, int(params.get('page', 1) or 1))
    per_page = max(1, min(100, int(params.get('per_page', 20) or 20)))
    offset = (page - 1) * per_page

    where_clause = ''
    if status_filter:
        safe_status = status_filter.replace("'", "''")
        where_clause = f"WHERE mr.status = '{safe_status}'"

    cur.execute(f"""
        SELECT mr.*,
               su.name AS source_name, su.email AS source_email,
               tu.name AS target_name, tu.email AS target_email
        FROM {schema}.account_merge_requests mr
        JOIN {schema}.users su ON su.id = mr.source_user_id
        JOIN {schema}.users tu ON tu.id = mr.target_user_id
        {where_clause}
        ORDER BY mr.created_at DESC
        LIMIT {per_page} OFFSET {offset}
    """)
    rows = cur.fetchall()

    cur.execute(f"""
        SELECT COUNT(*) AS cnt
        FROM {schema}.account_merge_requests mr
        {where_clause}
    """)
    total_row = cur.fetchone()
    total = total_row['cnt'] if total_row else 0

    return respond(200, {
        'requests': [dict(r) for r in rows],
        'total': total,
        'page': page,
    })


def handle_admin_merge(event, params, cur, conn, schema):
    """Принудительное слияние из админки без email-кода."""

    headers_in = event.get('headers') or {}
    admin_token = (
        headers_in.get('X-Admin-Token')
        or headers_in.get('x-admin-token')
        or ''
    )
    if not verify_admin(admin_token):
        return respond(403, {'error': 'Доступ запрещён'})

    raw_body = event.get('body') or '{}'
    try:
        body = json.loads(raw_body)
    except Exception:
        return respond(400, {'error': 'Некорректный JSON в теле запроса'})

    source_user_id = body.get('source_user_id')
    target_user_id = body.get('target_user_id')
    admin_note = (body.get('admin_note') or '').strip()

    if not source_user_id or not target_user_id:
        return respond(400, {'error': 'Параметры source_user_id и target_user_id обязательны'})

    try:
        source_user_id = int(source_user_id)
        target_user_id = int(target_user_id)
    except (TypeError, ValueError):
        return respond(400, {'error': 'source_user_id и target_user_id должны быть целыми числами'})

    if source_user_id == target_user_id:
        return respond(400, {'error': 'source и target не могут быть одним пользователем'})

    # 1. Валидировать оба user_id
    cur.execute(f"""
        SELECT id, name, email FROM {schema}.users
        WHERE id = {source_user_id} AND is_active = true
    """)
    source = cur.fetchone()
    if not source:
        return respond(404, {'error': 'Source пользователь не найден или неактивен'})

    cur.execute(f"""
        SELECT id, name, email FROM {schema}.users
        WHERE id = {target_user_id} AND is_active = true
    """)
    target = cur.fetchone()
    if not target:
        return respond(404, {'error': 'Target пользователь не найден или неактивен'})

    safe_note = admin_note.replace("'", "''")
    note_val = f"'{safe_note}'" if safe_note else 'NULL'

    # 2. INSERT в account_merge_requests
    cur.execute(f"""
        INSERT INTO {schema}.account_merge_requests
            (source_user_id, target_user_id, triggered_by, status,
             confirmed_at, admin_note)
        VALUES
            ({source_user_id}, {target_user_id}, 'admin', 'confirmed',
             NOW(), {note_val})
        RETURNING id
    """)
    new_row = cur.fetchone()
    new_id = new_row['id']
    conn.commit()

    print(f"[merge-accounts] handle_admin_merge: admin force merge request id={new_id}, source={source_user_id}, target={target_user_id}")

    # 3. Выполнить слияние
    summary = _do_merge(cur, conn, schema, source_user_id, target_user_id)

    # 4. UPDATE status='completed'
    safe_summary = json.dumps(summary, ensure_ascii=False).replace("'", "''")
    cur.execute(f"""
        UPDATE {schema}.account_merge_requests
        SET status = 'completed',
            completed_at = NOW(),
            merge_summary = '{safe_summary}'::jsonb
        WHERE id = {new_id}
    """)
    conn.commit()

    print(f"[merge-accounts] handle_admin_merge: completed, summary={summary}")

    # Отправляем согласие на уведомления в VK, если vk_id есть у итогового аккаунта
    if summary.get('vk_linked'):
        try:
            cur2 = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur2.execute(f"SELECT vk_id FROM {schema}.users WHERE id = {target_user_id}")
            row = cur2.fetchone()
            if row and row.get('vk_id'):
                _send_vk_consent_message(row['vk_id'])
        except Exception:
            pass

    return respond(200, {'ok': True, 'summary': summary})


def handle_admin_cancel(event, params, cur, conn, schema):
    """Отмена pending запроса из админки."""

    headers_in = event.get('headers') or {}
    admin_token = (
        headers_in.get('X-Admin-Token')
        or headers_in.get('x-admin-token')
        or ''
    )
    if not verify_admin(admin_token):
        return respond(403, {'error': 'Доступ запрещён'})

    raw_body = event.get('body') or '{}'
    try:
        body = json.loads(raw_body)
    except Exception:
        return respond(400, {'error': 'Некорректный JSON в теле запроса'})

    merge_request_id = body.get('merge_request_id')
    if not merge_request_id:
        return respond(400, {'error': 'Параметр merge_request_id обязателен'})

    try:
        merge_request_id = int(merge_request_id)
    except (TypeError, ValueError):
        return respond(400, {'error': 'merge_request_id должен быть целым числом'})

    cur.execute(f"""
        UPDATE {schema}.account_merge_requests
        SET status = 'cancelled', cancelled_at = NOW()
        WHERE id = {merge_request_id}
          AND status = 'pending_email'
    """)
    affected = cur.rowcount
    conn.commit()

    if affected == 0:
        return respond(404, {'error': 'Запрос не найден или не находится в статусе pending_email'})

    print(f"[merge-accounts] handle_admin_cancel: cancelled request {merge_request_id}")

    return respond(200, {'ok': True})


# ---------------------------------------------------------------------------
# Главный обработчик
# ---------------------------------------------------------------------------

def handler(event: dict, context) -> dict:
    """Слияние дублирующихся аккаунтов: обнаружение, подтверждение email-кодом, выполнение слияния и API для админки."""

    # OPTIONS preflight
    if event.get('httpMethod') == 'OPTIONS':
        return respond(200, {})

    params = event.get('queryStringParameters') or {}
    action = params.get('action', '')

    print(f"[merge-accounts] handler: method={event.get('httpMethod')}, action={action}")

    conn = None
    try:
        conn = get_conn()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        schema = get_schema()

        if action == 'detect':
            return handle_detect(event, params, cur, conn, schema)
        elif action == 'request_merge':
            return handle_request_merge(event, params, cur, conn, schema)
        elif action == 'verify_code':
            return handle_verify_code(event, params, cur, conn, schema)
        elif action == 'admin_list':
            return handle_admin_list(event, params, cur, conn, schema)
        elif action == 'admin_merge':
            return handle_admin_merge(event, params, cur, conn, schema)
        elif action == 'admin_cancel':
            return handle_admin_cancel(event, params, cur, conn, schema)
        else:
            return respond(404, {'error': 'Unknown action'})

    except Exception as exc:
        print(f"[merge-accounts] handler: unhandled exception: {exc}")
        import traceback
        traceback.print_exc()
        if conn:
            try:
                conn.rollback()
            except Exception:
                pass
        return respond(500, {'error': 'Внутренняя ошибка сервера'})
    finally:
        if conn:
            try:
                conn.close()
            except Exception:
                pass