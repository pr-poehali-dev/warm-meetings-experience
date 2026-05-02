import json
import os
import hashlib
import secrets as pysecrets
from datetime import datetime, timedelta

import psycopg2
import psycopg2.extras
import requests

from shared import *


def handler(event, context):
    """Система ролей: получение ролей пользователя, прогресса, бейджей, подача заявок и администрирование"""
    if event.get('httpMethod') == 'OPTIONS':
        return options_response()

    headers_in = event.get('headers') or {}
    token = headers_in.get('X-Session-Token') or headers_in.get('x-session-token') or ''
    admin_token = headers_in.get('X-Admin-Token') or headers_in.get('x-admin-token') or ''

    method = event.get('httpMethod', 'GET')
    params = event.get('queryStringParameters') or {}
    resource = params.get('resource', 'my-roles')

    if resource == 'all-roles':
        return handle_all_roles()

    if resource.startswith('admin-'):
        if not verify_admin_token(admin_token):
            return respond(403, {'error': 'Доступ запрещён'})
        schema = get_schema()
        conn = get_conn()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        if resource == 'admin-applications':
            return handle_admin_applications(cur, conn, schema)
        elif resource == 'admin-review' and method == 'POST':
            body = json.loads(event.get('body', '{}'))
            return handle_admin_review(cur, conn, schema, body)
        elif resource == 'admin-grant' and method == 'POST':
            body = json.loads(event.get('body', '{}'))
            return handle_admin_grant(cur, conn, schema, body)
        conn.close()
        return respond(400, {'error': 'Unknown admin resource'})

    schema = get_schema()
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    user = get_user_from_token(cur, schema, token)
    if not user:
        conn.close()
        return respond(401, {'error': 'Не авторизован'})

    if resource == 'my-roles':
        return handle_my_roles(cur, conn, schema, user)
    elif resource == 'progress':
        return handle_progress(cur, conn, schema, user)
    elif resource == 'badges':
        return handle_badges(cur, conn, schema, user)
    elif resource == 'apply' and method == 'POST':
        body = json.loads(event.get('body', '{}'))
        ip = (headers_in.get('X-Forwarded-For') or headers_in.get('x-forwarded-for') or '').split(',')[0].strip() or None
        ua = headers_in.get('User-Agent') or headers_in.get('user-agent') or ''
        return handle_apply(cur, conn, schema, user, body, ip, ua)
    elif resource == 'verify-email-code' and method == 'POST':
        body = json.loads(event.get('body', '{}'))
        ip = (headers_in.get('X-Forwarded-For') or headers_in.get('x-forwarded-for') or '').split(',')[0].strip() or None
        ua = headers_in.get('User-Agent') or headers_in.get('user-agent') or ''
        return handle_verify_email_code(cur, conn, schema, user, body, ip, ua)
    elif resource == 'resend-email-code' and method == 'POST':
        body = json.loads(event.get('body', '{}'))
        ip = (headers_in.get('X-Forwarded-For') or headers_in.get('x-forwarded-for') or '').split(',')[0].strip() or None
        ua = headers_in.get('User-Agent') or headers_in.get('user-agent') or ''
        return handle_resend_email_code(cur, conn, schema, user, body, ip, ua)
    elif resource == 'start-oauth-2fa' and method == 'POST':
        body = json.loads(event.get('body', '{}'))
        ip = (headers_in.get('X-Forwarded-For') or headers_in.get('x-forwarded-for') or '').split(',')[0].strip() or None
        ua = headers_in.get('User-Agent') or headers_in.get('user-agent') or ''
        return handle_start_oauth_2fa(cur, conn, schema, user, body, ip, ua)
    elif resource == 'verify-oauth-2fa' and method == 'POST':
        body = json.loads(event.get('body', '{}'))
        ip = (headers_in.get('X-Forwarded-For') or headers_in.get('x-forwarded-for') or '').split(',')[0].strip() or None
        ua = headers_in.get('User-Agent') or headers_in.get('user-agent') or ''
        return handle_verify_oauth_2fa(cur, conn, schema, user, body, ip, ua)
    elif resource == 'switch-role' and method == 'POST':
        body = json.loads(event.get('body', '{}'))
        return handle_switch_role(cur, conn, schema, user, body)

    conn.close()
    return respond(400, {'error': 'Unknown resource'})


def handle_all_roles():
    schema = get_schema()
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    cur.execute(f"""
        SELECT r.id, r.name, r.slug, r.description, r.icon, r.sort_order,
               json_agg(json_build_object(
                   'id', rr.id,
                   'type', rr.type,
                   'value', rr.value,
                   'description', rr.description
               ) ORDER BY rr.sort_order) FILTER (WHERE rr.id IS NOT NULL) as requirements
        FROM {schema}.roles r
        LEFT JOIN {schema}.role_requirements rr ON rr.role_id = r.id AND rr.is_active = true
        WHERE r.is_active = true AND r.slug != 'admin'
        GROUP BY r.id
        ORDER BY r.sort_order
    """)
    roles = [dict(r) for r in cur.fetchall()]
    conn.close()
    return respond(200, {'roles': roles})


def handle_my_roles(cur, conn, schema, user):
    cur.execute(f"""
        SELECT r.id, r.name, r.slug, r.description, r.icon,
               ur.status, ur.verified_at, ur.data, ur.created_at
        FROM {schema}.user_roles ur
        JOIN {schema}.roles r ON r.id = ur.role_id
        WHERE ur.user_id = {user['id']}
        ORDER BY r.sort_order
    """)
    active_roles = [dict(r) for r in cur.fetchall()]

    cur.execute(f"""
        SELECT ra.id, ra.status, ra.message, ra.admin_comment,
               ra.created_at, ra.reviewed_at,
               r.name as role_name, r.slug as role_slug, r.icon as role_icon
        FROM {schema}.role_applications ra
        JOIN {schema}.roles r ON r.id = ra.role_id
        WHERE ra.user_id = {user['id']}
        ORDER BY ra.created_at DESC
    """)
    applications = [dict(r) for r in cur.fetchall()]

    conn.close()
    return respond(200, {'roles': active_roles, 'applications': applications})


def handle_progress(cur, conn, schema, user):
    cur.execute(f"""
        SELECT r.id as role_id, r.name as role_name, r.slug as role_slug, r.icon as role_icon,
               rr.id as req_id, rr.type, rr.value as required_value, rr.description,
               COALESCE(ua.progress, 0) as progress,
               ua.completed_at
        FROM {schema}.roles r
        JOIN {schema}.role_requirements rr ON rr.role_id = r.id AND rr.is_active = true
        LEFT JOIN {schema}.user_achievements ua ON ua.requirement_id = rr.id AND ua.user_id = {user['id']}
        WHERE r.is_active = true AND r.slug != 'admin'
        ORDER BY r.sort_order, rr.sort_order
    """)
    rows = cur.fetchall()

    roles_progress = {}
    for row in rows:
        r = dict(row)
        slug = r['role_slug']
        if slug not in roles_progress:
            roles_progress[slug] = {
                'role_id': r['role_id'],
                'role_name': r['role_name'],
                'role_slug': slug,
                'role_icon': r['role_icon'],
                'requirements': [],
                'total': 0,
                'completed': 0
            }
        roles_progress[slug]['requirements'].append({
            'id': r['req_id'],
            'type': r['type'],
            'required_value': r['required_value'],
            'description': r['description'],
            'progress': r['progress'],
            'completed': r['completed_at'] is not None
        })
        roles_progress[slug]['total'] += 1
        if r['completed_at']:
            roles_progress[slug]['completed'] += 1

    conn.close()
    return respond(200, {'progress': list(roles_progress.values())})


def handle_badges(cur, conn, schema, user):
    cur.execute(f"""
        SELECT b.id, b.name, b.slug, b.description, b.icon,
               b.condition_type, b.condition_value,
               ub.earned_at
        FROM {schema}.badges b
        LEFT JOIN {schema}.user_badges ub ON ub.badge_id = b.id AND ub.user_id = {user['id']}
        WHERE b.is_active = true
        ORDER BY b.sort_order
    """)
    badges = [dict(r) for r in cur.fetchall()]
    conn.close()
    return respond(200, {'badges': badges})


CODE_TTL_MINUTES = 15
CODE_MAX_ATTEMPTS = 5
CODE_LOCK_MINUTES = 15
RESEND_COOLDOWN_SECONDS = 60


def hash_code(code: str) -> str:
    return hashlib.sha256(code.encode('utf-8')).hexdigest()


def generate_email_code() -> str:
    return f"{pysecrets.randbelow(900000) + 100000:06d}"


def log_2fa_event(cur, schema, app_id, user_id, method, event, success, ip, user_agent, details=None):
    det = json.dumps(details or {}).replace("'", "''")
    ip_val = f"'{ip}'" if ip else 'NULL'
    ua = (user_agent or '')[:500].replace("'", "''")
    cur.execute(f"""
        INSERT INTO {schema}.role_application_2fa_log
            (application_id, user_id, method, event, success, ip_address, user_agent, details)
        VALUES ({app_id}, {user_id}, '{method}', '{event}', {str(bool(success)).upper()}, {ip_val}, '{ua}', '{det}'::jsonb)
    """)


def create_email_code(cur, schema, app_id, email, ip, user_agent):
    code = generate_email_code()
    code_hash = hash_code(code)
    expires = (datetime.utcnow() + timedelta(minutes=CODE_TTL_MINUTES)).strftime('%Y-%m-%d %H:%M:%S')
    e = email.replace("'", "''")
    ip_val = f"'{ip}'" if ip else 'NULL'
    ua = (user_agent or '')[:500].replace("'", "''")
    cur.execute(f"""
        INSERT INTO {schema}.role_application_email_codes
            (application_id, email, code_hash, expires_at, ip_address, user_agent)
        VALUES ({app_id}, '{e}', '{code_hash}', '{expires}', {ip_val}, '{ua}')
        RETURNING id, expires_at
    """)
    row = dict(cur.fetchone())
    return code, row


def send_role_application_code_email(to_email, name, role_name, code):
    api_key = os.environ.get('UNISENDER_API_KEY', '')
    sender_email = os.environ.get('UNISENDER_SENDER_EMAIL', '')
    sender_name = os.environ.get('UNISENDER_SENDER_NAME', '')
    if not api_key or not sender_email:
        return False

    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #fafafa;">
        <div style="background: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
            <div style="text-align: center; margin-bottom: 24px;">
                <div style="width: 56px; height: 56px; background: #e0f2fe; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 28px;">🛡️</div>
            </div>
            <h1 style="color: #1a1a1a; font-size: 22px; text-align: center; margin: 0 0 8px;">Подтверждение заявки</h1>
            <p style="color: #666; text-align: center; margin: 0 0 24px; font-size: 15px;">
                {name}, вы подали заявку на роль «{role_name}» на sparcom.ru
            </p>
            <div style="background: #f8f9fa; border-radius: 8px; padding: 24px; margin-bottom: 20px; text-align: center;">
                <p style="color: #666; font-size: 13px; margin: 0 0 10px; text-transform: uppercase; letter-spacing: 1px;">Код подтверждения</p>
                <p style="color: #1a1a1a; font-size: 32px; font-weight: 700; letter-spacing: 8px; margin: 0; font-family: 'Courier New', monospace;">{code}</p>
            </div>
            <p style="color: #888; font-size: 13px; text-align: center; margin: 0 0 20px;">
                Код действителен {CODE_TTL_MINUTES} минут. Если вы не подавали заявку — проигнорируйте это письмо.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
                Это автоматическое письмо. Отвечать на него не нужно.
            </p>
        </div>
    </div>
    """

    message = {
        "recipients": [{"email": to_email, "name": name}],
        "from_email": sender_email,
        "subject": f"Подтверждение заявки на роль «{role_name}» — Sparcom",
        "body": {"html": html},
        "track_links": 0,
        "track_read": 1,
        "tags": ["role-application-2fa"],
    }
    if sender_name:
        message["from_name"] = sender_name

    try:
        r = requests.post(
            "https://go2.unisender.ru/ru/transactional/api/v1/email/send.json",
            headers={"Content-Type": "application/json", "X-API-KEY": api_key},
            json={"message": message},
            timeout=10
        )
        return r.status_code < 400
    except Exception:
        return False


def handle_apply(cur, conn, schema, user, body, ip=None, user_agent=''):
    role_slug = (body.get('role_slug') or '').strip()
    message = (body.get('message') or '').strip()
    portfolio_data = body.get('portfolio_data', {})

    if not role_slug:
        conn.close()
        return respond(400, {'error': 'Укажите роль'})

    if role_slug == 'admin':
        conn.close()
        return respond(403, {'error': 'Эту роль может назначить только администратор'})

    if not user.get('email'):
        conn.close()
        return respond(400, {'error': 'К аккаунту не привязан email — невозможно подтвердить заявку'})

    rs = role_slug.replace("'", "''")
    cur.execute(f"SELECT id, name FROM {schema}.roles WHERE slug = '{rs}' AND is_active = true")
    role = cur.fetchone()
    if not role:
        conn.close()
        return respond(400, {'error': 'Роль не найдена'})

    cur.execute(f"""
        SELECT id FROM {schema}.user_roles
        WHERE user_id = {user['id']} AND role_id = {role['id']} AND status = 'active'
    """)
    if cur.fetchone():
        conn.close()
        return respond(400, {'error': 'У вас уже есть эта роль'})

    cur.execute(f"""
        SELECT id, status FROM {schema}.role_applications
        WHERE user_id = {user['id']} AND role_id = {role['id']} AND status IN ('pending', 'pending_2fa')
        ORDER BY created_at DESC LIMIT 1
    """)
    existing = cur.fetchone()
    if existing:
        if existing['status'] == 'pending':
            conn.close()
            return respond(400, {'error': 'Заявка на эту роль уже подана'})
        # Для pending_2fa — возвращаем существующую заявку, новый код не генерируем
        conn.close()
        return respond(200, {
            'application': {'id': existing['id'], 'status': 'pending_2fa'},
            'requires_email_code': True,
            'email_masked': mask_email(user['email']),
            'message': 'Код подтверждения уже отправлен на вашу почту. Проверьте письмо или запросите повторную отправку.'
        })

    m = message.replace("'", "''")
    pd_json = json.dumps(portfolio_data).replace("'", "''")
    tfa_email = user['email'].replace("'", "''")
    tfa_expires = (datetime.utcnow() + timedelta(minutes=CODE_TTL_MINUTES)).strftime('%Y-%m-%d %H:%M:%S')
    cur.execute(f"""
        INSERT INTO {schema}.role_applications
            (user_id, role_id, status, message, portfolio_data, tfa_method, tfa_identifier, tfa_expires_at)
        VALUES ({user['id']}, {role['id']}, 'pending_2fa', '{m}', '{pd_json}',
                'email', '{tfa_email}', '{tfa_expires}')
        RETURNING id, status, created_at
    """)
    app = dict(cur.fetchone())

    code, _ = create_email_code(cur, schema, app['id'], user['email'], ip, user_agent)
    log_2fa_event(cur, schema, app['id'], user['id'], 'email', 'code_sent', True, ip, user_agent,
                  {'role_slug': role_slug})
    conn.commit()

    sent_ok = send_role_application_code_email(user['email'], user.get('name') or 'участник', role['name'], code)
    if not sent_ok:
        log_2fa_event(cur, schema, app['id'], user['id'], 'email', 'email_send_failed', False, ip, user_agent)
        conn.commit()

    conn.close()
    return respond(200, {
        'application': app,
        'requires_email_code': True,
        'email_masked': mask_email(user['email']),
        'code_ttl_minutes': CODE_TTL_MINUTES,
        'message': f'Заявка на роль «{role["name"]}» создана. Введите код из письма для подтверждения.'
    })


def mask_email(email: str) -> str:
    if not email or '@' not in email:
        return email or ''
    local, domain = email.split('@', 1)
    if len(local) <= 2:
        masked_local = local[0] + '*'
    else:
        masked_local = local[0] + '*' * max(1, len(local) - 2) + local[-1]
    return f"{masked_local}@{domain}"


def handle_verify_email_code(cur, conn, schema, user, body, ip=None, user_agent=''):
    app_id = body.get('application_id')
    code = (body.get('code') or '').strip()

    if not app_id or not code:
        conn.close()
        return respond(400, {'error': 'Укажите application_id и code'})

    try:
        app_id = int(app_id)
    except (TypeError, ValueError):
        conn.close()
        return respond(400, {'error': 'Некорректный application_id'})

    cur.execute(f"""
        SELECT ra.id, ra.user_id, ra.role_id, ra.status, ra.tfa_identifier,
               r.name as role_name, r.slug as role_slug, ra.message
        FROM {schema}.role_applications ra
        JOIN {schema}.roles r ON r.id = ra.role_id
        WHERE ra.id = {app_id}
    """)
    app = cur.fetchone()
    if not app or app['user_id'] != user['id']:
        conn.close()
        return respond(404, {'error': 'Заявка не найдена'})

    if app['status'] == 'pending':
        conn.close()
        return respond(200, {'application_id': app_id, 'status': 'pending', 'message': 'Заявка уже подтверждена'})

    if app['status'] != 'pending_2fa':
        conn.close()
        return respond(400, {'error': 'Заявка уже обработана'})

    cur.execute(f"""
        SELECT id, code_hash, attempts, expires_at, locked_until, verified_at
        FROM {schema}.role_application_email_codes
        WHERE application_id = {app_id} AND verified_at IS NULL
        ORDER BY created_at DESC LIMIT 1
    """)
    rec = cur.fetchone()
    if not rec:
        conn.close()
        return respond(400, {'error': 'Код не найден. Запросите новый.'})

    now = datetime.utcnow()
    if rec.get('locked_until') and rec['locked_until'] > now:
        log_2fa_event(cur, schema, app_id, user['id'], 'email', 'verify_locked', False, ip, user_agent)
        conn.commit()
        conn.close()
        return respond(429, {'error': 'Слишком много попыток. Попробуйте позже.'})

    if rec['expires_at'] < now:
        log_2fa_event(cur, schema, app_id, user['id'], 'email', 'verify_expired', False, ip, user_agent)
        conn.commit()
        conn.close()
        return respond(400, {'error': 'Код истёк. Запросите новый.'})

    expected = rec['code_hash']
    actual = hash_code(code)
    if actual != expected:
        new_attempts = rec['attempts'] + 1
        if new_attempts >= CODE_MAX_ATTEMPTS:
            lock_until = (now + timedelta(minutes=CODE_LOCK_MINUTES)).strftime('%Y-%m-%d %H:%M:%S')
            cur.execute(f"""
                UPDATE {schema}.role_application_email_codes
                SET attempts = {new_attempts}, locked_until = '{lock_until}'
                WHERE id = {rec['id']}
            """)
            log_2fa_event(cur, schema, app_id, user['id'], 'email', 'verify_locked', False, ip, user_agent,
                          {'attempts': new_attempts})
            conn.commit()
            conn.close()
            return respond(429, {'error': 'Слишком много неверных попыток. Попробуйте через 15 минут.'})

        cur.execute(f"""
            UPDATE {schema}.role_application_email_codes
            SET attempts = {new_attempts}
            WHERE id = {rec['id']}
        """)
        log_2fa_event(cur, schema, app_id, user['id'], 'email', 'verify_failed', False, ip, user_agent,
                      {'attempts': new_attempts})
        conn.commit()
        conn.close()
        return respond(400, {
            'error': 'Неверный код',
            'attempts_left': max(0, CODE_MAX_ATTEMPTS - new_attempts)
        })

    # Успех — помечаем код как использованный, переводим заявку в pending
    cur.execute(f"""
        UPDATE {schema}.role_application_email_codes
        SET verified_at = CURRENT_TIMESTAMP
        WHERE id = {rec['id']}
    """)
    cur.execute(f"""
        UPDATE {schema}.role_applications
        SET status = 'pending', tfa_verified_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = {app_id}
    """)
    log_2fa_event(cur, schema, app_id, user['id'], 'email', 'verify_success', True, ip, user_agent)
    conn.commit()

    # Теперь можно уведомить админов
    send_telegram_notification(
        user,
        {'id': app['role_id'], 'name': app['role_name']},
        app.get('message') or ''
    )

    conn.close()
    return respond(200, {
        'application_id': app_id,
        'status': 'pending',
        'message': f'Заявка на роль «{app["role_name"]}» отправлена на рассмотрение'
    })


def handle_resend_email_code(cur, conn, schema, user, body, ip=None, user_agent=''):
    app_id = body.get('application_id')
    if not app_id:
        conn.close()
        return respond(400, {'error': 'Укажите application_id'})

    try:
        app_id = int(app_id)
    except (TypeError, ValueError):
        conn.close()
        return respond(400, {'error': 'Некорректный application_id'})

    cur.execute(f"""
        SELECT ra.id, ra.user_id, ra.status, r.name as role_name
        FROM {schema}.role_applications ra
        JOIN {schema}.roles r ON r.id = ra.role_id
        WHERE ra.id = {app_id}
    """)
    app = cur.fetchone()
    if not app or app['user_id'] != user['id']:
        conn.close()
        return respond(404, {'error': 'Заявка не найдена'})

    if app['status'] != 'pending_2fa':
        conn.close()
        return respond(400, {'error': 'Заявка уже подтверждена или обработана'})

    if not user.get('email'):
        conn.close()
        return respond(400, {'error': 'К аккаунту не привязан email'})

    # Cooldown — запрет повторной отправки чаще раза в минуту
    cur.execute(f"""
        SELECT created_at FROM {schema}.role_application_email_codes
        WHERE application_id = {app_id}
        ORDER BY created_at DESC LIMIT 1
    """)
    last = cur.fetchone()
    if last:
        delta = (datetime.utcnow() - last['created_at']).total_seconds()
        if delta < RESEND_COOLDOWN_SECONDS:
            wait = int(RESEND_COOLDOWN_SECONDS - delta)
            conn.close()
            return respond(429, {'error': f'Повторная отправка доступна через {wait} сек.'})

    # Инвалидируем предыдущие неиспользованные коды
    cur.execute(f"""
        UPDATE {schema}.role_application_email_codes
        SET expires_at = CURRENT_TIMESTAMP
        WHERE application_id = {app_id} AND verified_at IS NULL AND expires_at > CURRENT_TIMESTAMP
    """)

    code, _ = create_email_code(cur, schema, app_id, user['email'], ip, user_agent)
    log_2fa_event(cur, schema, app_id, user['id'], 'email', 'code_resent', True, ip, user_agent)
    conn.commit()

    sent_ok = send_role_application_code_email(user['email'], user.get('name') or 'участник', app['role_name'], code)
    if not sent_ok:
        log_2fa_event(cur, schema, app_id, user['id'], 'email', 'email_send_failed', False, ip, user_agent)
        conn.commit()

    conn.close()
    return respond(200, {
        'message': 'Код отправлен повторно',
        'email_masked': mask_email(user['email']),
        'code_ttl_minutes': CODE_TTL_MINUTES
    })


# =============================================================================
# OAUTH 2FA (VK / Яндекс) — для подтверждения заявки на роль
# =============================================================================

VK_AUTHORIZE_URL = "https://id.vk.com/authorize"
VK_TOKEN_URL = "https://id.vk.com/oauth2/auth"
VK_USER_INFO_URL = "https://id.vk.com/oauth2/user_info"

YANDEX_AUTH_URL = "https://oauth.yandex.ru/authorize"
YANDEX_TOKEN_URL = "https://oauth.yandex.ru/token"
YANDEX_USER_INFO_URL = "https://login.yandex.ru/info"

OAUTH_STATE_TTL_MINUTES = 10


def _urlencode(d):
    from urllib.parse import urlencode
    return urlencode(d)


def build_vk_auth_url(client_id, redirect_uri, state, code_challenge):
    params = {
        'client_id': client_id,
        'redirect_uri': redirect_uri,
        'response_type': 'code',
        'scope': '',
        'state': state,
        'code_challenge': code_challenge,
        'code_challenge_method': 'S256',
    }
    return f"{VK_AUTHORIZE_URL}?{_urlencode(params)}"


def build_yandex_auth_url(client_id, redirect_uri, state):
    params = {
        'client_id': client_id,
        'redirect_uri': redirect_uri,
        'response_type': 'code',
        'state': state,
        'force_confirm': 'yes',
    }
    return f"{YANDEX_AUTH_URL}?{_urlencode(params)}"


def exchange_vk_code(code, code_verifier, device_id, redirect_uri):
    client_id = os.environ.get('VK_CLIENT_ID', '')
    client_secret = os.environ.get('VK_CLIENT_SECRET', '')
    if not client_id or not client_secret:
        return None, 'VK не настроен'
    data = {
        'grant_type': 'authorization_code',
        'code': code,
        'redirect_uri': redirect_uri,
        'client_id': client_id,
        'client_secret': client_secret,
        'code_verifier': code_verifier,
    }
    if device_id:
        data['device_id'] = device_id
    try:
        r = requests.post(VK_TOKEN_URL, data=data, timeout=10)
        token_data = r.json()
    except Exception:
        return None, 'Ошибка запроса к VK'
    if 'error' in token_data:
        return None, token_data.get('error_description') or 'Не удалось авторизоваться через VK'
    access_token = token_data.get('access_token')
    if not access_token:
        return None, 'VK не вернул access_token'
    try:
        ur = requests.post(
            VK_USER_INFO_URL,
            data={'access_token': access_token, 'client_id': client_id},
            timeout=10,
        )
        info = ur.json()
        user = info.get('user') or {}
    except Exception:
        return None, 'Не удалось получить профиль VK'
    vk_id = str(user.get('user_id') or user.get('id') or '')
    if not vk_id:
        return None, 'VK не вернул идентификатор пользователя'
    return {'vk_id': vk_id, 'email': user.get('email'), 'raw': user}, None


def exchange_yandex_code(code):
    client_id = os.environ.get('YANDEX_CLIENT_ID', '')
    client_secret = os.environ.get('YANDEX_CLIENT_SECRET', '')
    if not client_id or not client_secret:
        return None, 'Яндекс не настроен'
    data = {
        'grant_type': 'authorization_code',
        'code': code,
        'client_id': client_id,
        'client_secret': client_secret,
    }
    try:
        r = requests.post(YANDEX_TOKEN_URL, data=data, timeout=10)
        token_data = r.json()
    except Exception:
        return None, 'Ошибка запроса к Яндексу'
    if 'error' in token_data:
        return None, token_data.get('error_description') or 'Не удалось авторизоваться через Яндекс'
    access_token = token_data.get('access_token')
    if not access_token:
        return None, 'Яндекс не вернул access_token'
    try:
        ur = requests.get(
            YANDEX_USER_INFO_URL,
            headers={'Authorization': f'OAuth {access_token}'},
            timeout=10,
        )
        info = ur.json()
    except Exception:
        return None, 'Не удалось получить профиль Яндекса'
    yandex_id = str(info.get('id') or '')
    if not yandex_id:
        return None, 'Яндекс не вернул идентификатор пользователя'
    return {'yandex_id': yandex_id, 'email': info.get('default_email'), 'raw': info}, None


def handle_start_oauth_2fa(cur, conn, schema, user, body, ip=None, user_agent=''):
    provider = (body.get('provider') or '').strip().lower()
    app_id = body.get('application_id')

    if provider not in ('vk', 'yandex'):
        conn.close()
        return respond(400, {'error': 'Поддерживаются только провайдеры vk и yandex'})
    if not app_id:
        conn.close()
        return respond(400, {'error': 'Укажите application_id'})
    try:
        app_id = int(app_id)
    except (TypeError, ValueError):
        conn.close()
        return respond(400, {'error': 'Некорректный application_id'})

    cur.execute(f"""
        SELECT id, user_id, status FROM {schema}.role_applications
        WHERE id = {app_id}
    """)
    app = cur.fetchone()
    if not app or app['user_id'] != user['id']:
        conn.close()
        return respond(404, {'error': 'Заявка не найдена'})
    if app['status'] != 'pending_2fa':
        conn.close()
        return respond(400, {'error': 'Заявка уже обработана'})

    state = pysecrets.token_urlsafe(24)

    resp = {'provider': provider, 'state': state}

    if provider == 'vk':
        client_id = os.environ.get('VK_CLIENT_ID', '')
        redirect_uri = os.environ.get('VK_REDIRECT_URI', '')
        if not client_id or not redirect_uri:
            conn.close()
            return respond(500, {'error': 'VK не настроен'})
        import base64 as b64
        code_verifier = b64.urlsafe_b64encode(pysecrets.token_bytes(32)).decode('utf-8').rstrip('=')
        code_challenge = b64.urlsafe_b64encode(
            hashlib.sha256(code_verifier.encode('utf-8')).digest()
        ).decode('utf-8').rstrip('=')
        auth_url = build_vk_auth_url(client_id, redirect_uri, state, code_challenge)
        resp.update({
            'auth_url': auth_url,
            'code_verifier': code_verifier,
            'redirect_uri': redirect_uri,
        })
    else:  # yandex
        client_id = os.environ.get('YANDEX_CLIENT_ID', '')
        redirect_uri = os.environ.get('YANDEX_REDIRECT_URI', '')
        if not client_id or not redirect_uri:
            conn.close()
            return respond(500, {'error': 'Яндекс не настроен'})
        auth_url = build_yandex_auth_url(client_id, redirect_uri, state)
        resp.update({
            'auth_url': auth_url,
            'redirect_uri': redirect_uri,
        })

    log_2fa_event(cur, schema, app_id, user['id'], provider, 'oauth_started', True, ip, user_agent)
    conn.commit()
    conn.close()
    return respond(200, resp)


def handle_verify_oauth_2fa(cur, conn, schema, user, body, ip=None, user_agent=''):
    app_id = body.get('application_id')
    provider = (body.get('provider') or '').strip().lower()
    code = (body.get('code') or '').strip()
    code_verifier = (body.get('code_verifier') or '').strip()
    device_id = (body.get('device_id') or '').strip()

    if provider not in ('vk', 'yandex'):
        conn.close()
        return respond(400, {'error': 'Поддерживаются только провайдеры vk и yandex'})
    if not app_id or not code:
        conn.close()
        return respond(400, {'error': 'Укажите application_id и code'})
    try:
        app_id = int(app_id)
    except (TypeError, ValueError):
        conn.close()
        return respond(400, {'error': 'Некорректный application_id'})

    cur.execute(f"""
        SELECT ra.id, ra.user_id, ra.role_id, ra.status, ra.message,
               r.name as role_name, r.slug as role_slug
        FROM {schema}.role_applications ra
        JOIN {schema}.roles r ON r.id = ra.role_id
        WHERE ra.id = {app_id}
    """)
    app = cur.fetchone()
    if not app or app['user_id'] != user['id']:
        conn.close()
        return respond(404, {'error': 'Заявка не найдена'})

    if app['status'] == 'pending':
        conn.close()
        return respond(200, {'application_id': app_id, 'status': 'pending', 'message': 'Заявка уже подтверждена'})
    if app['status'] != 'pending_2fa':
        conn.close()
        return respond(400, {'error': 'Заявка уже обработана'})

    # Обмениваем code → получаем ID провайдера
    if provider == 'vk':
        if not code_verifier:
            conn.close()
            return respond(400, {'error': 'Сессия устарела, начните подтверждение заново'})
        redirect_uri = os.environ.get('VK_REDIRECT_URI', '')
        oauth_user, err = exchange_vk_code(code, code_verifier, device_id, redirect_uri)
        external_id_field = 'vk_id'
    else:
        oauth_user, err = exchange_yandex_code(code)
        external_id_field = 'yandex_id'

    if err or not oauth_user:
        log_2fa_event(cur, schema, app_id, user['id'], provider, 'verify_failed', False, ip, user_agent,
                      {'error': err})
        conn.commit()
        conn.close()
        return respond(400, {'error': err or 'Не удалось подтвердить аккаунт'})

    provider_id = oauth_user.get(external_id_field)

    # Загружаем текущее значение vk_id / yandex_id из users
    cur.execute(f"SELECT vk_id, yandex_id FROM {schema}.users WHERE id = {user['id']}")
    current = cur.fetchone() or {}
    stored_id = current.get(external_id_field)

    if stored_id and str(stored_id) != str(provider_id):
        # Привязан другой аккаунт провайдера — отказ
        log_2fa_event(cur, schema, app_id, user['id'], provider, 'verify_id_mismatch', False, ip, user_agent,
                      {'stored': str(stored_id), 'got': str(provider_id)})
        conn.commit()
        conn.close()
        return respond(400, {'error': f'К вашему аккаунту привязан другой {provider.upper()}-профиль. Подтвердите заявку тем же аккаунтом.'})

    if not stored_id:
        # Проверяем, что этот provider_id не занят другим пользователем
        safe_pid = str(provider_id).replace("'", "''")
        cur.execute(f"""
            SELECT id FROM {schema}.users
            WHERE {external_id_field} = '{safe_pid}' AND id != {user['id']}
        """)
        occupied = cur.fetchone()
        if occupied:
            log_2fa_event(cur, schema, app_id, user['id'], provider, 'verify_id_taken', False, ip, user_agent,
                          {'provider_id': str(provider_id)})
            conn.commit()
            conn.close()
            return respond(400, {'error': f'Этот {provider.upper()}-аккаунт уже привязан к другому пользователю платформы'})

        # Автопривязка
        cur.execute(f"""
            UPDATE {schema}.users
            SET {external_id_field} = '{safe_pid}', updated_at = CURRENT_TIMESTAMP
            WHERE id = {user['id']}
        """)
        log_2fa_event(cur, schema, app_id, user['id'], provider, 'auto_linked', True, ip, user_agent,
                      {'provider_id': str(provider_id)})

    # Переводим заявку в pending
    safe_pid = str(provider_id).replace("'", "''")
    cur.execute(f"""
        UPDATE {schema}.role_applications
        SET status = 'pending', tfa_method = '{provider}', tfa_identifier = '{safe_pid}',
            tfa_verified_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = {app_id}
    """)
    log_2fa_event(cur, schema, app_id, user['id'], provider, 'verify_success', True, ip, user_agent,
                  {'provider_id': str(provider_id), 'linked': not bool(stored_id)})
    conn.commit()

    send_telegram_notification(
        user,
        {'id': app['role_id'], 'name': app['role_name']},
        app.get('message') or ''
    )

    conn.close()
    return respond(200, {
        'application_id': app_id,
        'status': 'pending',
        'linked': not bool(stored_id),
        'message': f'Аккаунт {provider.upper()} подтверждён. Заявка на роль «{app["role_name"]}» отправлена на рассмотрение'
    })


def handle_switch_role(cur, conn, schema, user, body):
    role_slug = (body.get('role_slug') or '').strip()
    if not role_slug:
        conn.close()
        return respond(400, {'error': 'Укажите роль'})

    rs = role_slug.replace("'", "''")
    cur.execute(f"""
        SELECT r.id, r.slug, r.name
        FROM {schema}.user_roles ur
        JOIN {schema}.roles r ON r.id = ur.role_id
        WHERE ur.user_id = {user['id']} AND r.slug = '{rs}' AND ur.status = 'active'
    """)
    role = cur.fetchone()
    if not role:
        conn.close()
        return respond(400, {'error': 'У вас нет этой роли'})

    conn.close()
    return respond(200, {'active_role': dict(role)})


def handle_admin_applications(cur, conn, schema):
    cur.execute(f"""
        SELECT ra.id, ra.user_id, u.name as user_name, u.email as user_email,
               r.name as role_name, r.slug as role_slug, r.icon as role_icon,
               ra.status, ra.message, ra.admin_comment,
               ra.created_at, ra.reviewed_at,
               ra.invite_event_id,
               e.title as invite_event_title
        FROM {schema}.role_applications ra
        JOIN {schema}.users u ON u.id = ra.user_id
        JOIN {schema}.roles r ON r.id = ra.role_id
        LEFT JOIN {schema}.events e ON e.id = ra.invite_event_id
        WHERE ra.status != 'pending_2fa'
        ORDER BY
            CASE WHEN ra.status = 'pending' THEN 0 ELSE 1 END,
            ra.created_at DESC
    """)
    applications = [dict(r) for r in cur.fetchall()]

    cur.execute(f"""
        SELECT u.id, u.name, u.email,
               json_agg(json_build_object(
                   'name', r.name, 'slug', r.slug, 'icon', r.icon, 'status', ur.status
               ) ORDER BY r.sort_order) as roles
        FROM {schema}.users u
        LEFT JOIN {schema}.user_roles ur ON ur.user_id = u.id
        LEFT JOIN {schema}.roles r ON r.id = ur.role_id
        WHERE u.is_active = true
        GROUP BY u.id
        ORDER BY u.name
    """)
    users = []
    for row in cur.fetchall():
        d = dict(row)
        if d['roles'] and d['roles'][0] and d['roles'][0].get('slug'):
            pass
        else:
            d['roles'] = []
        users.append(d)

    conn.close()
    return respond(200, {'applications': applications, 'users': users})


def handle_admin_review(cur, conn, schema, body):
    app_id = body.get('application_id')
    action = body.get('action', '')
    comment = (body.get('comment') or '').strip()

    if not app_id or action not in ('approve', 'reject'):
        conn.close()
        return respond(400, {'error': 'Укажите application_id и action (approve/reject)'})

    cur.execute(f"""
        SELECT ra.id, ra.user_id, ra.role_id, ra.status, ra.invite_event_id
        FROM {schema}.role_applications ra
        WHERE ra.id = {app_id}
    """)
    app = cur.fetchone()
    if not app:
        conn.close()
        return respond(404, {'error': 'Заявка не найдена'})

    if app['status'] != 'pending':
        conn.close()
        return respond(400, {'error': 'Заявка уже рассмотрена'})

    new_status = 'approved' if action == 'approve' else 'rejected'
    c = comment.replace("'", "''")
    cur.execute(f"""
        UPDATE {schema}.role_applications
        SET status = '{new_status}', admin_comment = '{c}',
            reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = {app_id}
    """)

    if action == 'approve':
        cur.execute(f"""
            INSERT INTO {schema}.user_roles (user_id, role_id, status, verified_at)
            VALUES ({app['user_id']}, {app['role_id']}, 'active', CURRENT_TIMESTAMP)
            ON CONFLICT (user_id, role_id)
            DO UPDATE SET status = 'active', verified_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        """)

        # Если заявка пришла по инвайту — добавляем пользователя в соорганизаторы события
        if app.get('invite_event_id'):
            event_id = app['invite_event_id']
            user_id = app['user_id']

            # Создаём organizer_profile если нет
            cur.execute(f"SELECT id FROM {schema}.organizer_profiles WHERE user_id = {user_id}")
            if not cur.fetchone():
                cur.execute(f"INSERT INTO {schema}.organizer_profiles (user_id) VALUES ({user_id}) ON CONFLICT DO NOTHING")

            # Добавляем в event_co_organizers
            cur.execute(f"""
                SELECT id, added_by FROM {schema}.event_co_organizers
                WHERE event_id = {event_id} AND user_id = {user_id}
            """)
            existing_co = cur.fetchone()
            if existing_co and existing_co['added_by'] == 0:
                cur.execute(f"""
                    UPDATE {schema}.event_co_organizers SET added_by = {user_id}
                    WHERE event_id = {event_id} AND user_id = {user_id}
                """)
            elif not existing_co:
                cur.execute(f"""
                    INSERT INTO {schema}.event_co_organizers (event_id, user_id, added_by)
                    VALUES ({event_id}, {user_id}, {user_id})
                """)

    conn.commit()
    conn.close()
    return respond(200, {'message': 'Заявка обработана'})


def handle_admin_grant(cur, conn, schema, body):
    user_id = body.get('user_id')
    role_slug = (body.get('role_slug') or '').strip()

    if not user_id or not role_slug:
        conn.close()
        return respond(400, {'error': 'Укажите user_id и role_slug'})

    rs = role_slug.replace("'", "''")
    cur.execute(f"SELECT id FROM {schema}.roles WHERE slug = '{rs}'")
    role = cur.fetchone()
    if not role:
        conn.close()
        return respond(400, {'error': 'Роль не найдена'})

    cur.execute(f"""
        INSERT INTO {schema}.user_roles (user_id, role_id, status, verified_at)
        VALUES ({user_id}, {role['id']}, 'active', CURRENT_TIMESTAMP)
        ON CONFLICT (user_id, role_id)
        DO UPDATE SET status = 'active', verified_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    """)
    conn.commit()
    conn.close()
    return respond(200, {'message': 'Роль назначена'})


def send_telegram_notification(user, role, message):
    bot_token = os.environ.get('TELEGRAM_BOT_TOKEN')
    chat_id = os.environ.get('TELEGRAM_CHAT_ID')
    if not bot_token or not chat_id:
        return

    text = (
        f"📋 Заявка на роль\n\n"
        f"👤 {user['name']} ({user['email']})\n"
        f"🎭 Роль: {role['name']}\n"
    )
    if message:
        text += f"💬 Сообщение: {message}\n"

    try:
        requests.post(
            f"https://api.telegram.org/bot{bot_token}/sendMessage",
            json={'chat_id': chat_id, 'text': text, 'parse_mode': 'HTML'},
            timeout=5
        )
    except Exception:
        pass