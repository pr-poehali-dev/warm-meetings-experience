import json
import os
import hashlib
import secrets
import urllib.request
import urllib.parse
import random

import bcrypt
import pyotp
import psycopg2
import psycopg2.extras

from shared import *


def write_audit_log(cur, schema, user_id, action, resource=None, resource_id=None, ip_address=None, details=None):
    details_str = json.dumps(details) if details else 'null'
    ip_str = f"'{ip_address}'" if ip_address else 'NULL'
    res_str = f"'{resource}'" if resource else 'NULL'
    res_id_str = str(resource_id) if resource_id else 'NULL'
    cur.execute(f"""
        INSERT INTO {schema}.audit_logs (user_id, action, resource, resource_id, ip_address, details)
        VALUES ({user_id}, '{action}', {res_str}, {res_id_str}, {ip_str}, '{details_str}'::jsonb)
    """)

def mask_email(email):
    if not email or '@' not in email:
        return email or ''
    local, domain = email.split('@', 1)
    if len(local) <= 2:
        masked_local = local[0] + '*'
    else:
        masked_local = local[0] + '***' + local[-1]
    return f'{masked_local}@{domain}'

def hash_password(password):
    hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(rounds=12))
    return hashed.decode('utf-8')

def verify_password(password, stored_hash):
    if not stored_hash:
        return False
    if stored_hash.startswith('$2b$') or stored_hash.startswith('$2a$'):
        return bcrypt.checkpw(password.encode('utf-8'), stored_hash.encode('utf-8'))
    return hashlib.sha256(password.encode()).hexdigest() == stored_hash


_PROFILE_EXTRA_FIELDS = 'u.vk_id, u.yandex_id, u.password_hash, u.totp_enabled, u.login_2fa_method, u.consent_photo, u.email_verified, u.created_at, u.avatar_url, u.onboarding_account_at, u.onboarding_workspace_at'


def handler(event, context):
    """Личный кабинет: профиль пользователя, записи на события, смена пароля, удаление аккаунта"""
    if event.get('httpMethod') == 'OPTIONS':
        return options_response()

    headers_in = event.get('headers') or {}
    token = headers_in.get('X-Session-Token') or headers_in.get('x-session-token') or ''

    schema = get_schema()
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    method = event.get('httpMethod', 'GET')
    params = event.get('queryStringParameters') or {}
    resource = params.get('resource', 'profile')
    ip = (event.get('requestContext') or {}).get('identity', {}).get('sourceIp')

    if resource == 'verify-email' and method == 'POST':
        body = json.loads(event.get('body', '{}'))
        return handle_verify_email(cur, conn, schema, body, ip)

    user = get_user_from_token(cur, schema, token, extra_fields=_PROFILE_EXTRA_FIELDS)
    if not user:
        conn.close()
        return respond(401, {'error': 'Не авторизован'})

    if resource == 'profile':
        if method == 'GET':
            cur.execute(f"""
                SELECT r.id, r.name, r.slug, r.description, r.icon, ur.status,
                       ur.verified_at, ur.created_at
                FROM {schema}.user_roles ur
                JOIN {schema}.roles r ON r.id = ur.role_id
                WHERE ur.user_id = {user['id']} AND ur.status = 'active'
                ORDER BY r.sort_order
            """)
            roles = [dict(r) for r in cur.fetchall()]
            conn.close()
            user_data = dict(user)
            user_data['has_password'] = bool(user_data.pop('password_hash', None))
            user_data['email_verified'] = bool(user_data.get('email_verified'))
            user_data['onboarding_account_done'] = bool(user_data.pop('onboarding_account_at', None))
            user_data['onboarding_workspace_done'] = bool(user_data.pop('onboarding_workspace_at', None))
            user_data['roles'] = roles
            return respond(200, {'user': user_data})
        if method == 'PUT':
            body = json.loads(event.get('body', '{}'))
            return handle_update_profile(cur, conn, schema, user, body, ip)

    if resource == 'onboarding':
        body = json.loads(event.get('body', '{}')) if event.get('body') else {}
        return handle_onboarding(cur, conn, schema, user, method, body)

    if resource == 'signups':
        if method == 'GET':
            return handle_get_signups(cur, conn, schema, user, ip)

    if resource == 'password':
        if method == 'PUT':
            body = json.loads(event.get('body', '{}'))
            return handle_change_password(cur, conn, schema, user, body, token, ip)

    if resource == 'delete-account':
        if method == 'DELETE':
            body = json.loads(event.get('body', '{}'))
            return handle_delete_account(cur, conn, schema, user, body, ip)

    if resource == 'link-vk':
        if method == 'POST':
            body = json.loads(event.get('body', '{}'))
            return handle_link_vk(cur, conn, schema, user, body, ip)
        if method == 'DELETE':
            return handle_unlink_vk(cur, conn, schema, user, ip)

    if resource == 'verify-vk':
        if method == 'POST':
            return handle_verify_vk(cur, conn, schema, user)

    if resource == 'link-yandex':
        if method == 'POST':
            body = json.loads(event.get('body', '{}'))
            return handle_link_yandex(cur, conn, schema, user, body, ip)
        if method == 'DELETE':
            return handle_unlink_yandex(cur, conn, schema, user, ip)

    if resource == 'totp-setup':
        if method == 'POST':
            return handle_totp_setup(cur, conn, schema, user, ip)

    if resource == 'totp-verify':
        if method == 'POST':
            body = json.loads(event.get('body', '{}'))
            return handle_totp_verify(cur, conn, schema, user, body, ip)

    if resource == 'totp-disable':
        if method == 'POST':
            body = json.loads(event.get('body', '{}'))
            return handle_totp_disable(cur, conn, schema, user, body, ip)

    if resource == 'login-2fa':
        if method == 'GET':
            return handle_get_login_2fa(cur, conn, schema, user)
        if method == 'POST':
            body = json.loads(event.get('body', '{}'))
            return handle_set_login_2fa(cur, conn, schema, user, body, ip)
        if method == 'DELETE':
            body = json.loads(event.get('body', '{}'))
            return handle_disable_login_2fa(cur, conn, schema, user, body, ip)

    if resource == 'my-data':
        if method == 'GET':
            return handle_my_data_export(cur, conn, schema, user, ip)

    if resource == 'send-verify':
        if method == 'POST':
            return handle_send_verify(cur, conn, schema, user, ip)

    if resource == 'favorites':
        if method == 'GET':
            return handle_get_favorites(cur, conn, schema, user)
        if method == 'POST':
            body = json.loads(event.get('body', '{}'))
            return handle_add_favorite(cur, conn, schema, user, body)
        if method == 'DELETE':
            body = json.loads(event.get('body', '{}'))
            return handle_remove_favorite(cur, conn, schema, user, body)

    if resource == 'wallet':
        if method == 'GET':
            return handle_get_wallet(cur, conn, schema, user)

    if resource == 'referrals':
        if method == 'GET':
            return handle_get_referrals(cur, conn, schema, user)

    if resource == 'inbox':
        if method == 'GET':
            return handle_inbox_list(cur, conn, schema, user, params)

    if resource == 'inbox_read':
        if method == 'POST':
            body = json.loads(event.get('body', '{}'))
            return handle_inbox_read(cur, conn, schema, user, body)

    if resource == 'inbox_reply':
        if method == 'POST':
            body = json.loads(event.get('body', '{}'))
            return handle_inbox_reply(cur, conn, schema, user, body)

    if resource == 'refunds':
        if method == 'GET':
            return handle_refunds_list(cur, conn, schema, user)

    if resource == 'refund_choose':
        if method == 'POST':
            body = json.loads(event.get('body', '{}'))
            return handle_refund_choose(cur, conn, schema, user, body)

    conn.close()
    return respond(400, {'error': 'Unknown resource'})


# =============================================================================
# ONBOARDING (обучающий тур по кабинетам)
# =============================================================================

_ONBOARDING_COLUMNS = {
    'account': 'onboarding_account_at',
    'workspace': 'onboarding_workspace_at',
}


def handle_onboarding(cur, conn, schema, user, method, body):
    """Отметка прохождения обучающего тура. POST — пройдено, DELETE — сбросить (повторить обучение)."""
    cabinet = (body.get('cabinet') or '').strip().lower()
    column = _ONBOARDING_COLUMNS.get(cabinet)
    if not column:
        conn.close()
        return respond(400, {'error': 'cabinet должен быть account или workspace'})

    value = 'CURRENT_TIMESTAMP' if method == 'POST' else 'NULL'
    cur.execute(f"UPDATE {schema}.users SET {column} = {value} WHERE id = {user['id']}")
    conn.commit()
    conn.close()
    return respond(200, {'ok': True, 'cabinet': cabinet, 'done': method == 'POST'})


# =============================================================================
# LOGIN 2FA (email / vk / yandex)
# =============================================================================

PRIVILEGED_ROLE_SLUGS = ('parmaster', 'partner', 'admin', 'organizer')


def has_privileged_role(cur, schema, user_id):
    slugs = ",".join(f"'{s}'" for s in PRIVILEGED_ROLE_SLUGS)
    cur.execute(f"""
        SELECT 1 FROM {schema}.user_roles ur
        JOIN {schema}.roles r ON r.id = ur.role_id
        WHERE ur.user_id = {user_id} AND ur.status = 'active' AND r.slug IN ({slugs})
        LIMIT 1
    """)
    return cur.fetchone() is not None


def handle_get_login_2fa(cur, conn, schema, user):
    mandatory = has_privileged_role(cur, schema, user['id'])
    method = (user.get('login_2fa_method') or '').lower() or None
    # Если привилегированная роль и метод не задан — считаем email принудительным
    effective = method or ('email' if mandatory else None)
    conn.close()
    return respond(200, {
        'enabled': bool(method) or mandatory,
        'method': effective,
        'explicit_method': method,
        'mandatory': mandatory,
        'vk_linked': bool(user.get('vk_id')),
        'yandex_linked': bool(user.get('yandex_id')),
        'totp_enabled': bool(user.get('totp_enabled')),
    })


def handle_set_login_2fa(cur, conn, schema, user, body, ip=None):
    method = (body.get('method') or '').strip().lower()
    password = body.get('password') or ''
    if method not in ('email', 'vk', 'yandex'):
        conn.close()
        return respond(400, {'error': 'Метод должен быть email, vk или yandex'})

    # Требуем подтверждение паролем для включения / смены метода
    if user.get('password_hash'):
        if not password or not verify_password(password, user['password_hash']):
            conn.close()
            return respond(401, {'error': 'Неверный пароль'})

    if method == 'vk' and not user.get('vk_id'):
        conn.close()
        return respond(400, {'error': 'Сначала привяжите VK-аккаунт в профиле'})
    if method == 'yandex' and not user.get('yandex_id'):
        conn.close()
        return respond(400, {'error': 'Сначала привяжите Яндекс-аккаунт в профиле'})

    cur.execute(f"UPDATE {schema}.users SET login_2fa_method = '{method}' WHERE id = {user['id']}")
    write_audit_log(cur, schema, user['id'], 'login_2fa_enabled', 'users', user['id'], ip, {'method': method})
    conn.commit()
    conn.close()
    return respond(200, {'enabled': True, 'method': method})


def handle_disable_login_2fa(cur, conn, schema, user, body, ip=None):
    password = body.get('password') or ''
    if user.get('password_hash'):
        if not password or not verify_password(password, user['password_hash']):
            conn.close()
            return respond(401, {'error': 'Неверный пароль'})

    mandatory = has_privileged_role(cur, schema, user['id'])
    if mandatory:
        conn.close()
        return respond(400, {'error': 'Для вашей роли двухфакторная аутентификация обязательна и не может быть отключена'})

    cur.execute(f"UPDATE {schema}.users SET login_2fa_method = NULL WHERE id = {user['id']}")
    write_audit_log(cur, schema, user['id'], 'login_2fa_disabled', 'users', user['id'], ip)
    conn.commit()
    conn.close()
    return respond(200, {'enabled': False, 'method': None})


def handle_update_profile(cur, conn, schema, user, body, ip=None):
    if 'phone' in body and body['phone']:
        p = str(body['phone']).replace("'", "''")
        cur.execute(f"SELECT id FROM {schema}.users WHERE phone = '{p}' AND id != {user['id']}")
        if cur.fetchone():
            conn.close()
            return respond(400, {'error': 'Этот номер телефона уже используется другим аккаунтом'})

    can_change_email = user.get('email', '').endswith('@vk.local') or not user.get('email_verified', True)

    if 'email' in body and body['email']:
        new_email = str(body['email']).strip().lower()
        if '@' not in new_email or '.' not in new_email.split('@')[-1]:
            conn.close()
            return respond(400, {'error': 'Некорректный email'})
        if not can_change_email:
            conn.close()
            return respond(400, {'error': 'Email уже подтверждён и не может быть изменён'})
        e_safe = new_email.replace("'", "''")
        cur.execute(f"SELECT id FROM {schema}.users WHERE LOWER(email) = '{e_safe}' AND id != {user['id']}")
        if cur.fetchone():
            conn.close()
            return respond(400, {'error': 'Этот email уже используется другим аккаунтом'})

    sets = []
    changed_fields = []
    if 'email' in body and body['email'] and can_change_email:
        val = str(body['email']).strip().lower().replace("'", "''")
        sets.append(f"email = '{val}', email_verified = false")
        changed_fields.append('email')
    for field in ['name', 'phone', 'telegram']:
        if field in body:
            val = str(body[field]).replace("'", "''")
            sets.append(f"{field} = '{val}'")
            changed_fields.append(field)

    if not sets:
        conn.close()
        return respond(400, {'error': 'Нечего обновлять'})

    sets.append("updated_at = CURRENT_TIMESTAMP")
    try:
        cur.execute(f"""
            UPDATE {schema}.users SET {', '.join(sets)}
            WHERE id = {user['id']}
            RETURNING id, email, name, phone, telegram, vk_id, password_hash, totp_enabled, created_at
        """)
    except psycopg2.errors.UniqueViolation:
        conn.close()
        return respond(400, {'error': 'Этот email уже используется другим аккаунтом'})
    updated = cur.fetchone()
    updated_data = dict(updated)
    updated_data['has_password'] = bool(updated_data.pop('password_hash', None))
    write_audit_log(cur, schema, user['id'], 'profile_update', 'users', user['id'], ip, {'changed_fields': changed_fields})
    conn.commit()
    conn.close()
    return respond(200, {'user': updated_data})


def handle_get_signups(cur, conn, schema, user, ip=None):
    cur.execute(f"""
        SELECT s.id, s.event_id, s.name, s.phone, s.email, s.status, s.created_at,
               e.title as event_title, e.event_date, e.start_time, e.end_time,
               e.bath_name, e.bath_address, e.slug as event_slug, e.image_url
        FROM {schema}.event_signups s
        JOIN {schema}.events e ON e.id = s.event_id
        WHERE s.user_id = {user['id']}
        ORDER BY e.event_date DESC, s.created_at DESC
    """)
    rows = cur.fetchall()
    write_audit_log(cur, schema, user['id'], 'view_signups', 'event_signups', None, ip, {'count': len(rows)})
    conn.commit()
    conn.close()

    signups = []
    for r in rows:
        d = dict(r)
        d['event_date'] = str(d.get('event_date', ''))
        d['start_time'] = str(d.get('start_time', ''))[:5] if d.get('start_time') else ''
        d['end_time'] = str(d.get('end_time', ''))[:5] if d.get('end_time') else ''
        signups.append(d)

    return respond(200, {'signups': signups})


def handle_change_password(cur, conn, schema, user, body, token, ip=None):
    current = (body.get('current_password') or '')
    new_pass = (body.get('new_password') or '')

    if not new_pass:
        conn.close()
        return respond(400, {'error': 'Введите новый пароль'})
    if len(new_pass) < 6:
        conn.close()
        return respond(400, {'error': 'Пароль должен быть не менее 6 символов'})

    cur.execute(f"SELECT password_hash FROM {schema}.users WHERE id = {user['id']}")
    row = cur.fetchone()

    if row.get('password_hash') and current:
        if not verify_password(current, row['password_hash']):
            conn.close()
            return respond(400, {'error': 'Текущий пароль неверный'})
    elif row.get('password_hash') and not current:
        conn.close()
        return respond(400, {'error': 'Введите текущий пароль'})

    new_hash = hash_password(new_pass)
    new_hash_escaped = new_hash.replace("'", "''")
    cur.execute(f"UPDATE {schema}.users SET password_hash = '{new_hash_escaped}', updated_at = CURRENT_TIMESTAMP WHERE id = {user['id']}")
    write_audit_log(cur, schema, user['id'], 'password_change', 'users', user['id'], ip)
    conn.commit()
    conn.close()

    return respond(200, {'message': 'Пароль успешно изменён'})


def handle_delete_account(cur, conn, schema, user, body, ip=None):
    password = (body.get('password') or '')
    confirm_text = (body.get('confirm_text') or '').strip()

    cur.execute(f"SELECT password_hash, vk_id FROM {schema}.users WHERE id = {user['id']}")
    row = cur.fetchone()

    has_password = bool(row and row.get('password_hash'))
    has_vk = bool(row and row.get('vk_id'))

    if has_password:
        if not password:
            conn.close()
            return respond(400, {'error': 'Введите пароль для подтверждения удаления'})
        if not verify_password(password, row.get('password_hash', '')):
            conn.close()
            return respond(400, {'error': 'Неверный пароль'})
    else:
        if confirm_text != 'УДАЛИТЬ':
            conn.close()
            return respond(400, {'error': 'Введите слово УДАЛИТЬ для подтверждения'})

    uid = user['id']

    anon_email = f"deleted_{uid}@deleted.sparcom.ru"
    cur.execute(f"""
        UPDATE {schema}.users SET
            email = '{anon_email}',
            name = 'Удалённый пользователь',
            phone = '',
            telegram = NULL,
            vk_id = NULL,
            password_hash = '',
            is_active = false,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = {uid}
    """)

    cur.execute(f"UPDATE {schema}.user_sessions SET expires_at = CURRENT_TIMESTAMP WHERE user_id = {uid}")

    write_audit_log(cur, schema, uid, 'account_deleted', 'users', uid, ip, {'anonymized': True})
    conn.commit()
    conn.close()

    return respond(200, {'message': 'Аккаунт удалён. Ваши персональные данные обезличены.'})


def handle_link_vk(cur, conn, schema, user, body, ip=None):
    vk_id = str(body.get('vk_id') or '').strip()
    vk_access_token = str(body.get('access_token') or '').strip()

    if not vk_id or not vk_access_token:
        conn.close()
        return respond(400, {'error': 'Не передан vk_id или access_token'})

    # Проверяем что vk_id не занят другим пользователем
    safe_vk_id = vk_id.replace("'", "''")
    cur.execute(f"SELECT id, email, name FROM {schema}.users WHERE vk_id = '{safe_vk_id}' AND id != {user['id']}")
    other = cur.fetchone()
    if other:
        conn.close()
        masked = mask_email(other.get('email') or '')
        return respond(409, {
            'error': f'Этот ВКонтакте уже привязан к другому аккаунту ({masked}). Войдите в тот аккаунт, если он ваш, или используйте другой ВК.',
            'code': 'vk_already_linked',
            'masked_email': masked,
            'other_user_id': other.get('id'),
            'other_name': other.get('name') or '',
            'current_user_id': user['id'],
            'current_email_masked': mask_email(user.get('email') or ''),
            'current_name': user.get('name') or '',
        })

    cur.execute(f"""
        UPDATE {schema}.users SET vk_id = '{safe_vk_id}', updated_at = CURRENT_TIMESTAMP
        WHERE id = {user['id']}
    """)
    write_audit_log(cur, schema, user['id'], 'link_vk', 'users', user['id'], ip)
    conn.commit()
    conn.close()

    # Отправляем приветственное сообщение сообщества пользователю
    try:
        community_token = os.environ.get('VK_COMMUNITY_TOKEN', '')
        community_id = os.environ.get('VK_COMMUNITY_ID', '')
        if community_token and community_id and vk_id:
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
            resp = urllib.request.urlopen(req, timeout=5)
            resp_body = resp.read().decode('utf-8')
            print(f'[user-profile] vk messages.send response: {resp_body}')
    except Exception as e:
        print(f'[user-profile] vk messages.send error: {e}')

    return respond(200, {'message': 'ВКонтакте успешно привязан', 'vk_id': vk_id})


def handle_verify_vk(cur, conn, schema, user):
    """Отправляет приветственное сообщение от сообщества пользователю и включает notify_vk."""
    cur.execute(f"SELECT vk_id, notify_vk FROM {schema}.users WHERE id = {user['id']}")
    row = cur.fetchone()
    if not row or not row.get('vk_id'):
        return respond(400, {'error': 'VK не привязан'})

    vk_id = row['vk_id']
    token = os.environ.get('VK_COMMUNITY_TOKEN', '')
    community_id = os.environ.get('VK_COMMUNITY_ID', '0')

    if not token:
        return respond(500, {'error': 'Токен сообщества не настроен'})

    msg = (
        '✨ СПАРКОМ — ваш помощник в мире бани!\n\n'
        'Теперь вы будете получать уведомления о записях и бронированиях прямо в этом чате.\n'
        'Это удобно, чтобы ничего не пропустить.'
    )
    params = urllib.parse.urlencode({
        'peer_id': str(int(vk_id)),
        'message': msg,
        'random_id': random.randint(1, 2 ** 31),
        'access_token': token,
        'v': '5.199',
        **(({'group_id': str(int(community_id))} if community_id and community_id != '0' else {})),
    })
    req = urllib.request.Request(
        'https://api.vk.com/method/messages.send',
        data=params.encode('utf-8'),
        headers={'Content-Type': 'application/x-www-form-urlencoded'},
    )
    try:
        resp = urllib.request.urlopen(req, timeout=6)
        result = json.loads(resp.read().decode('utf-8'))
        print(f'[user-profile] verify-vk messages.send result: {result}')
        if 'error' in result:
            code = result['error'].get('error_code')
            # 901 — пользователь не написал сообществу первым
            if code == 901:
                return respond(403, {'error': 'Сначала напишите сообществу — тогда уведомления будут приходить', 'vk_error': 901})
            return respond(502, {'error': f'Ошибка VK: {result["error"].get("error_msg", "")}', 'vk_error': code})
    except Exception as e:
        print(f'[user-profile] verify-vk error: {e}')
        return respond(502, {'error': 'Не удалось связаться с VK'})

    # Включаем notify_vk и vk_notify_allowed (пользователь подтвердил согласие написав сообществу)
    cur.execute(f"UPDATE {schema}.users SET notify_vk = true, vk_notify_allowed = true, updated_at = NOW() WHERE id = {user['id']}")
    conn.commit()

    return respond(200, {'ok': True, 'message': 'Уведомления ВКонтакте подключены'})


def handle_unlink_vk(cur, conn, schema, user, ip=None):
    # Нельзя отвязать VK если нет пароля (единственный способ входа)
    cur.execute(f"SELECT password_hash, vk_id FROM {schema}.users WHERE id = {user['id']}")
    row = cur.fetchone()
    if not row or not row.get('vk_id'):
        conn.close()
        return respond(400, {'error': 'VK аккаунт не привязан'})
    cur.execute(f"UPDATE {schema}.users SET vk_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = {user['id']}")
    write_audit_log(cur, schema, user['id'], 'unlink_vk', 'users', user['id'], ip)
    conn.commit()
    conn.close()
    return respond(200, {'message': 'VK аккаунт отвязан'})


def handle_link_yandex(cur, conn, schema, user, body, ip=None):
    yandex_id = str(body.get('yandex_id') or '').strip()
    access_token = str(body.get('access_token') or '').strip()

    if not yandex_id or not access_token:
        conn.close()
        return respond(400, {'error': 'Не передан yandex_id или access_token'})

    safe_yandex_id = yandex_id.replace("'", "''")
    cur.execute(f"SELECT id, email FROM {schema}.users WHERE yandex_id = '{safe_yandex_id}' AND id != {user['id']}")
    other = cur.fetchone()
    if other:
        conn.close()
        masked = mask_email(other.get('email') or '')
        return respond(409, {
            'error': f'Этот Яндекс уже привязан к другому аккаунту ({masked}). Войдите в тот аккаунт, если он ваш, или используйте другой Яндекс.',
            'code': 'yandex_already_linked',
            'masked_email': masked,
        })

    cur.execute(f"""
        UPDATE {schema}.users SET yandex_id = '{safe_yandex_id}', updated_at = CURRENT_TIMESTAMP
        WHERE id = {user['id']}
    """)
    write_audit_log(cur, schema, user['id'], 'link_yandex', 'users', user['id'], ip)
    conn.commit()
    conn.close()
    return respond(200, {'message': 'Яндекс успешно привязан', 'yandex_id': yandex_id})


def handle_unlink_yandex(cur, conn, schema, user, ip=None):
    cur.execute(f"SELECT yandex_id FROM {schema}.users WHERE id = {user['id']}")
    row = cur.fetchone()
    if not row or not row.get('yandex_id'):
        conn.close()
        return respond(400, {'error': 'Яндекс аккаунт не привязан'})
    cur.execute(f"UPDATE {schema}.users SET yandex_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = {user['id']}")
    write_audit_log(cur, schema, user['id'], 'unlink_yandex', 'users', user['id'], ip)
    conn.commit()
    conn.close()
    return respond(200, {'message': 'Яндекс аккаунт отвязан'})


def handle_totp_setup(cur, conn, schema, user, ip=None):
    cur.execute(f"SELECT totp_enabled FROM {schema}.users WHERE id = {user['id']}")
    row = cur.fetchone()
    if row and row.get('totp_enabled'):
        conn.close()
        return respond(400, {'error': '2FA уже включена'})

    secret = pyotp.random_base32()
    safe_secret = secret.replace("'", "''")
    cur.execute(f"UPDATE {schema}.users SET totp_secret = '{safe_secret}', updated_at = CURRENT_TIMESTAMP WHERE id = {user['id']}")
    conn.commit()
    conn.close()

    email = user.get('email', '')
    totp = pyotp.TOTP(secret)
    provisioning_uri = totp.provisioning_uri(name=email, issuer_name='Sparcom')

    return respond(200, {'secret': secret, 'provisioning_uri': provisioning_uri})


def handle_totp_verify(cur, conn, schema, user, body, ip=None):
    code = str(body.get('code') or '').strip()
    if not code or len(code) != 6:
        conn.close()
        return respond(400, {'error': 'Введите 6-значный код'})

    cur.execute(f"SELECT totp_secret, totp_enabled FROM {schema}.users WHERE id = {user['id']}")
    row = cur.fetchone()
    if not row or not row.get('totp_secret'):
        conn.close()
        return respond(400, {'error': 'Сначала настройте 2FA'})
    if row.get('totp_enabled'):
        conn.close()
        return respond(400, {'error': '2FA уже включена'})

    totp = pyotp.TOTP(row['totp_secret'])
    if not totp.verify(code, valid_window=1):
        conn.close()
        return respond(400, {'error': 'Неверный код'})

    backup_codes = [secrets.token_hex(4) for _ in range(8)]
    backup_json = json.dumps(backup_codes).replace("'", "''")
    cur.execute(f"""
        UPDATE {schema}.users
        SET totp_enabled = true, totp_backup_codes = '{backup_json}', updated_at = CURRENT_TIMESTAMP
        WHERE id = {user['id']}
    """)
    write_audit_log(cur, schema, user['id'], 'totp_enable', 'users', user['id'], ip)
    conn.commit()
    conn.close()

    return respond(200, {'message': '2FA включена', 'backup_codes': backup_codes})


def handle_totp_disable(cur, conn, schema, user, body, ip=None):
    password = (body.get('password') or '')
    code = str(body.get('code') or '').strip()

    cur.execute(f"SELECT password_hash, totp_enabled, totp_secret FROM {schema}.users WHERE id = {user['id']}")
    row = cur.fetchone()
    if not row or not row.get('totp_enabled'):
        conn.close()
        return respond(400, {'error': '2FA не включена'})

    if row.get('password_hash') and password:
        if not verify_password(password, row['password_hash']):
            conn.close()
            return respond(400, {'error': 'Неверный пароль'})
    elif code:
        totp = pyotp.TOTP(row['totp_secret'])
        if not totp.verify(code, valid_window=1):
            conn.close()
            return respond(400, {'error': 'Неверный код'})
    else:
        conn.close()
        return respond(400, {'error': 'Введите пароль или код из приложения'})

    cur.execute(f"""
        UPDATE {schema}.users
        SET totp_enabled = false, totp_secret = NULL, totp_backup_codes = NULL, updated_at = CURRENT_TIMESTAMP
        WHERE id = {user['id']}
    """)
    write_audit_log(cur, schema, user['id'], 'totp_disable', 'users', user['id'], ip)
    conn.commit()
    conn.close()

    return respond(200, {'message': '2FA отключена'})


def handle_my_data_export(cur, conn, schema, user, ip=None):
    cur.execute(f"""
        SELECT id, email, name, phone, telegram, vk_id, created_at, updated_at, last_login_at, email_verified
        FROM {schema}.users WHERE id = {user['id']}
    """)
    profile = cur.fetchone()

    cur.execute(f"""
        SELECT s.id, s.event_id, s.name, s.phone, s.email, s.status, s.created_at,
               e.title as event_title, e.event_date
        FROM {schema}.event_signups s
        LEFT JOIN {schema}.events e ON e.id = s.event_id
        WHERE s.user_id = {user['id']}
        ORDER BY s.created_at DESC
    """)
    signups = [dict(r) for r in cur.fetchall()]

    cur.execute(f"""
        SELECT action, ip_address, created_at, details
        FROM {schema}.audit_logs
        WHERE user_id = {user['id']}
        ORDER BY created_at DESC
        LIMIT 100
    """)
    audit = [dict(r) for r in cur.fetchall()]

    cur.execute(f"""
        SELECT r.name as role_name, ur.status, ur.assigned_at
        FROM {schema}.user_roles ur
        JOIN {schema}.roles r ON r.id = ur.role_id
        WHERE ur.user_id = {user['id']}
    """)
    roles = [dict(r) for r in cur.fetchall()]

    write_audit_log(cur, schema, user['id'], 'data_export', 'users', user['id'], ip)
    conn.commit()
    conn.close()

    export = {
        'profile': dict(profile) if profile else {},
        'signups': signups,
        'roles': roles,
        'audit_log': audit,
        'exported_at': str(json.dumps(None, default=str))
    }

    from datetime import datetime
    export['exported_at'] = datetime.utcnow().isoformat()

    return respond(200, {'data': export})


def handle_send_verify(cur, conn, schema, user, ip=None):
    import secrets as _secrets
    from datetime import datetime, timedelta

    email = user.get('email', '')
    if not email or email.endswith('@vk.local'):
        conn.close()
        return respond(400, {'error': 'Сначала укажите настоящий email'})
    if user.get('email_verified'):
        conn.close()
        return respond(400, {'error': 'Email уже подтверждён'})

    cur.execute(f"""
        SELECT created_at FROM {schema}.email_verify_tokens
        WHERE user_id = {user['id']} AND used = false AND expires_at > CURRENT_TIMESTAMP
        ORDER BY created_at DESC LIMIT 1
    """)
    last = cur.fetchone()
    if last:
        from datetime import datetime as dt
        elapsed = (dt.utcnow() - last['created_at'].replace(tzinfo=None)).total_seconds()
        if elapsed < 60:
            conn.close()
            return respond(400, {'error': f'Подождите {int(60 - elapsed)} сек. перед повторной отправкой'})

    token = _secrets.token_urlsafe(32)
    expires = (datetime.utcnow() + timedelta(hours=24)).strftime('%Y-%m-%d %H:%M:%S')
    cur.execute(f"""
        INSERT INTO {schema}.email_verify_tokens (user_id, token, expires_at)
        VALUES ({user['id']}, '{token}', '{expires}')
    """)
    write_audit_log(cur, schema, user['id'], 'email_verify_sent', 'users', user['id'], ip)
    conn.commit()
    conn.close()

    send_verify_email(email, user.get('name', ''), token)
    return respond(200, {'message': 'Письмо отправлено'})


def handle_verify_email(cur, conn, schema, body, ip=None):
    token = (body.get('token') or '').strip()
    if not token:
        conn.close()
        return respond(400, {'error': 'Токен обязателен'})

    t = token.replace("'", "''")
    cur.execute(f"""
        SELECT id, user_id FROM {schema}.email_verify_tokens
        WHERE token = '{t}' AND used = false AND expires_at > CURRENT_TIMESTAMP
    """)
    row = cur.fetchone()
    if not row:
        conn.close()
        return respond(400, {'error': 'Ссылка недействительна или устарела'})

    user_id = row['user_id']
    cur.execute(f"UPDATE {schema}.users SET email_verified = true, updated_at = CURRENT_TIMESTAMP WHERE id = {user_id}")
    cur.execute(f"UPDATE {schema}.email_verify_tokens SET used = true WHERE id = {row['id']}")
    write_audit_log(cur, schema, user_id, 'email_verified', 'users', user_id, ip)

    # Сразу выдаём сессию — чтобы после подтверждения по ссылке
    # пользователь попадал в кабинет без повторного ввода кода.
    from datetime import datetime, timedelta
    cur.execute(f"""
        SELECT id, email, name, phone, vk_id, created_at
        FROM {schema}.users WHERE id = {user_id}
    """)
    u = cur.fetchone()

    session_token = secrets.token_urlsafe(48)
    expires = (datetime.utcnow() + timedelta(days=30)).strftime('%Y-%m-%d %H:%M:%S')
    cur.execute(f"""
        INSERT INTO {schema}.user_sessions (user_id, token, expires_at)
        VALUES ({user_id}, '{session_token}', '{expires}')
    """)
    conn.commit()
    conn.close()

    user_data = {k: u[k] for k in ['id', 'email', 'name', 'phone', 'vk_id', 'created_at']} if u else {'id': user_id}
    user_data['email_verified'] = True
    return respond(200, {'message': 'Email подтверждён', 'user': user_data, 'token': session_token, 'expires_at': expires})


def send_verify_email(to_email, name, token):
    import requests as _requests
    api_key = os.environ.get('UNISENDER_API_KEY', '')
    sender_email = os.environ.get('UNISENDER_SENDER_EMAIL', '')
    sender_name = os.environ.get('UNISENDER_SENDER_NAME', '')
    if not api_key or not sender_email:
        return

    verify_url = f"https://sparcom.ru/verify-email?token={token}"
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #fafafa;">
        <div style="background: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
            <div style="text-align: center; margin-bottom: 24px;">
                <div style="width: 56px; height: 56px; background: #dbeafe; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 28px;">&#9993;</div>
            </div>
            <h1 style="color: #1a1a1a; font-size: 22px; text-align: center; margin: 0 0 8px;">Подтверждение email</h1>
            <p style="color: #666; text-align: center; margin: 0 0 28px; font-size: 15px;">
                {name}, подтвердите ваш email на sparcom.ru
            </p>
            <div style="text-align: center; margin-bottom: 24px;">
                <a href="{verify_url}" style="display: inline-block; background: #1a1a1a; color: #ffffff; padding: 12px 32px; border-radius: 24px; text-decoration: none; font-size: 14px; font-weight: 600;">Подтвердить email</a>
            </div>
            <p style="color: #888; font-size: 13px; text-align: center; margin: 0 0 20px;">
                Ссылка действительна 24 часа. Если вы не запрашивали подтверждение — проигнорируйте письмо.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">Это автоматическое письмо. Отвечать на него не нужно.</p>
        </div>
    </div>
    """
    message = {
        "recipients": [{"email": to_email, "name": name}],
        "from_email": sender_email,
        "subject": "Подтвердите email — Sparcom",
        "body": {"html": html},
        "track_links": 0,
        "track_read": 1,
        "tags": ["email-verify"],
    }
    if sender_name:
        message["from_name"] = sender_name
    try:
        _requests.post(
            "https://go2.unisender.ru/ru/transactional/api/v1/email/send.json",
            headers={{"Content-Type": "application/json", "X-API-KEY": api_key}},
            json={{"message": message}},
            timeout=10
        )
    except Exception:
        pass


# =============================================================================
# ИЗБРАННОЕ
# =============================================================================

def handle_get_favorites(cur, conn, schema, user):
    """Получить избранные бани и мастера пользователя"""
    uid = user['id']

    cur.execute(f"""
        SELECT uf.id, uf.item_type, uf.item_id, uf.created_at,
               CASE
                 WHEN uf.item_type = 'bath' THEN b.name
                 WHEN uf.item_type = 'master' THEN m.name
                 ELSE NULL
               END as name,
               CASE
                 WHEN uf.item_type = 'bath' THEN b.slug
                 WHEN uf.item_type = 'master' THEN m.slug
                 ELSE NULL
               END as slug,
               CASE
                 WHEN uf.item_type = 'bath' THEN (b.photos::jsonb -> 0) #>> '{{}}'
                 WHEN uf.item_type = 'master' THEN m.avatar
                 ELSE NULL
               END as image,
               CASE
                 WHEN uf.item_type = 'bath' THEN b.address
                 WHEN uf.item_type = 'master' THEN m.tagline
                 ELSE NULL
               END as subtitle
        FROM {schema}.user_favorites uf
        LEFT JOIN {schema}.baths b ON b.id = uf.item_id AND uf.item_type = 'bath'
        LEFT JOIN {schema}.masters m ON m.id = uf.item_id AND uf.item_type = 'master'
        WHERE uf.user_id = {uid}
        ORDER BY uf.created_at DESC
    """)
    favorites = [dict(r) for r in cur.fetchall()]
    conn.close()
    return respond(200, {'favorites': favorites})


def handle_add_favorite(cur, conn, schema, user, body):
    """Добавить в избранное"""
    uid = user['id']
    item_type = (body.get('item_type') or '').strip()
    item_id = body.get('item_id')
    if item_type not in ('bath', 'master', 'event') or not item_id:
        conn.close()
        return respond(400, {'error': 'Укажите item_type и item_id'})
    cur.execute(f"""
        INSERT INTO {schema}.user_favorites (user_id, item_type, item_id)
        VALUES ({uid}, '{item_type}', {int(item_id)})
        ON CONFLICT (user_id, item_type, item_id) DO NOTHING
    """)
    conn.commit()
    conn.close()
    return respond(200, {'ok': True})


def handle_remove_favorite(cur, conn, schema, user, body):
    """Удалить из избранного"""
    uid = user['id']
    item_type = (body.get('item_type') or '').strip()
    item_id = body.get('item_id')
    if not item_type or not item_id:
        conn.close()
        return respond(400, {'error': 'Укажите item_type и item_id'})
    cur.execute(f"""
        UPDATE {schema}.user_favorites
        SET user_id = user_id
        WHERE user_id = {uid} AND item_type = '{item_type}' AND item_id = {int(item_id)}
        RETURNING id
    """)
    # Мягкое удаление через флаг — или прямое через DELETE (нет ограничения для user's own data)
    cur.execute(f"""
        DELETE FROM {schema}.user_favorites
        WHERE user_id = {uid} AND item_type = '{item_type}' AND item_id = {int(item_id)}
    """)
    conn.commit()
    conn.close()
    return respond(200, {'ok': True})


# =============================================================================
# КОШЕЛЁК
# =============================================================================

def handle_get_wallet(cur, conn, schema, user):
    """Баланс и история транзакций кошелька"""
    uid = user['id']
    cur.execute(f"""
        SELECT wallet_balance, bonus_balance FROM {schema}.users WHERE id = {uid}
    """)
    balances = cur.fetchone()
    cur.execute(f"""
        SELECT id, type, amount, description, ref_type, ref_id, created_at
        FROM {schema}.wallet_transactions
        WHERE user_id = {uid}
        ORDER BY created_at DESC
        LIMIT 50
    """)
    transactions = [dict(r) for r in cur.fetchall()]
    conn.close()
    return respond(200, {
        'wallet_balance': balances['wallet_balance'] if balances else 0,
        'bonus_balance': balances['bonus_balance'] if balances else 0,
        'transactions': transactions
    })


# =============================================================================
# РЕФЕРАЛЫ
# =============================================================================

def handle_get_referrals(cur, conn, schema, user):
    """Реферальный код и список приглашённых"""
    uid = user['id']

    # Генерируем реферальный код если нет
    cur.execute(f"SELECT referral_code FROM {schema}.users WHERE id = {uid}")
    row = cur.fetchone()
    ref_code = row['referral_code'] if row else None
    if not ref_code:
        import secrets as _s
        ref_code = _s.token_urlsafe(8).upper()[:12]
        cur.execute(f"""
            UPDATE {schema}.users SET referral_code = '{ref_code}' WHERE id = {uid}
        """)
        conn.commit()

    cur.execute(f"""
        SELECT u.name, u.created_at, r.bonus_paid
        FROM {schema}.referrals r
        JOIN {schema}.users u ON u.id = r.referred_id
        WHERE r.referrer_id = {uid}
        ORDER BY r.created_at DESC
    """)
    invited = [dict(r) for r in cur.fetchall()]
    conn.close()
    return respond(200, {
        'referral_code': ref_code,
        'invited': invited,
        'total_invited': len(invited),
        'total_bonuses_earned': sum(1 for r in invited if r['bonus_paid'])
    })


# =============================================================================
# INBOX (входящие сообщения от организаторов на канал «Сайт»)
# =============================================================================

def handle_inbox_list(cur, conn, schema, user, params):
    """Список сообщений пользователя из всех событий, на которые он записан.
    По умолчанию возвращает все исходящие от организаторов (что мы получили).
    Параметр unread=1 — только непрочитанные. Параметр count=1 — только число.
    """
    uid = user['id']
    only_unread = params.get('unread') == '1'
    count_only = params.get('count') == '1'

    if count_only:
        cur.execute(f"""
            SELECT COUNT(*) AS n
            FROM {schema}.guest_messages gm
            JOIN {schema}.event_signups s ON s.id = gm.signup_id
            WHERE s.user_id = {uid}
              AND gm.direction = 'out'
              AND gm.read_at IS NULL
        """)
        row = cur.fetchone()
        unread_msgs = int(row['n']) if row else 0

        cur.execute(f"""
            SELECT COUNT(*) AS n
            FROM {schema}.event_questions q
            WHERE q.guest_user_id = {uid}
              AND q.answer_text IS NOT NULL
              AND q.answer_user_read_at IS NULL
        """)
        row2 = cur.fetchone()
        unread_answers = int(row2['n']) if row2 else 0

        conn.close()
        return respond(200, {'unread': unread_msgs + unread_answers})

    where_unread = "AND gm.read_at IS NULL" if only_unread else ""
    cur.execute(f"""
        SELECT gm.id, gm.signup_id, gm.event_id, gm.direction, gm.channel,
               gm.body, gm.delivered, gm.created_at, gm.read_at,
               e.title AS event_title,
               e.event_date,
               e.start_time,
               u.id AS organizer_id,
               u.name AS organizer_name,
               u.avatar_url AS organizer_avatar
        FROM {schema}.guest_messages gm
        JOIN {schema}.event_signups s ON s.id = gm.signup_id
        JOIN {schema}.events e ON e.id = gm.event_id
        JOIN {schema}.users u ON u.id = e.organizer_id
        WHERE s.user_id = {uid}
          {where_unread}
        ORDER BY gm.created_at DESC
        LIMIT 200
    """)
    rows = [dict(r) for r in cur.fetchall()]

    # Ответы организаторов на вопросы (event_questions) — для авторизованных пользователей
    where_q_unread = "AND q.answer_user_read_at IS NULL" if only_unread else ""
    cur.execute(f"""
        SELECT q.id AS q_id, q.event_id, q.message AS original_question,
               q.answer_text AS body, q.answer_channel AS channel,
               q.answer_sent_at AS created_at, q.answer_user_read_at AS read_at,
               e.title AS event_title, e.event_date, e.start_time,
               u.id AS organizer_id, u.name AS organizer_name, u.avatar_url AS organizer_avatar
        FROM {schema}.event_questions q
        JOIN {schema}.events e ON e.id = q.event_id
        LEFT JOIN {schema}.users u ON u.id = e.organizer_id
        WHERE q.guest_user_id = {uid}
          AND q.answer_text IS NOT NULL
          {where_q_unread}
        ORDER BY q.answer_sent_at DESC
        LIMIT 100
    """)
    answers = []
    for r in cur.fetchall():
        d = dict(r)
        answers.append({
            'id': -int(d['q_id']),  # отрицательный, чтобы не конфликтовать с guest_messages.id
            'kind': 'question_answer',
            'question_id': int(d['q_id']),
            'signup_id': None,
            'event_id': d.get('event_id'),
            'direction': 'out',
            'channel': d.get('channel') or 'site',
            'body': d.get('body') or '',
            'original_question': d.get('original_question') or '',
            'delivered': True,
            'created_at': d.get('created_at'),
            'read_at': d.get('read_at'),
            'event_title': d.get('event_title'),
            'event_date': d.get('event_date'),
            'start_time': d.get('start_time'),
            'organizer_id': d.get('organizer_id'),
            'organizer_name': d.get('organizer_name'),
            'organizer_avatar': d.get('organizer_avatar'),
        })

    all_rows = rows + answers
    # сортируем по created_at DESC (str-сравнение работает для ISO дат)
    def _sort_key(r):
        c = r.get('created_at')
        return str(c) if c is not None else ''
    all_rows.sort(key=_sort_key, reverse=True)

    conn.close()
    return respond(200, {'messages': all_rows, 'total': len(all_rows)})


def handle_inbox_read(cur, conn, schema, user, body):
    """Пометить сообщения прочитанными. body: {ids:[..]} | {signup_id:N} | {question_id:N}."""
    uid = user['id']
    ids = body.get('ids') or []
    signup_id = body.get('signup_id')
    question_id = body.get('question_id')

    if question_id:
        cur.execute(f"""
            UPDATE {schema}.event_questions
            SET answer_user_read_at = NOW()
            WHERE id = {int(question_id)}
              AND guest_user_id = {uid}
              AND answer_text IS NOT NULL
              AND answer_user_read_at IS NULL
        """)
        conn.commit()
        conn.close()
        return respond(200, {'ok': True})

    if ids:
        id_list = ",".join(str(int(i)) for i in ids)
        cur.execute(f"""
            UPDATE {schema}.guest_messages gm
            SET read_at = NOW()
            FROM {schema}.event_signups s
            WHERE gm.signup_id = s.id
              AND s.user_id = {uid}
              AND gm.direction = 'out'
              AND gm.read_at IS NULL
              AND gm.id IN ({id_list})
        """)
    elif signup_id:
        cur.execute(f"""
            UPDATE {schema}.guest_messages gm
            SET read_at = NOW()
            FROM {schema}.event_signups s
            WHERE gm.signup_id = s.id
              AND s.user_id = {uid}
              AND s.id = {int(signup_id)}
              AND gm.direction = 'out'
              AND gm.read_at IS NULL
        """)
    else:
        cur.execute(f"""
            UPDATE {schema}.guest_messages gm
            SET read_at = NOW()
            FROM {schema}.event_signups s
            WHERE gm.signup_id = s.id
              AND s.user_id = {uid}
              AND gm.direction = 'out'
              AND gm.read_at IS NULL
        """)
        # И пометим прочитанными все ответы на вопросы
        cur.execute(f"""
            UPDATE {schema}.event_questions
            SET answer_user_read_at = NOW()
            WHERE guest_user_id = {uid}
              AND answer_text IS NOT NULL
              AND answer_user_read_at IS NULL
        """)
    conn.commit()
    conn.close()
    return respond(200, {'ok': True})


def handle_inbox_reply(cur, conn, schema, user, body):
    """Ответ организатору. Создаёт запись direction='in' channel='site'."""
    uid = user['id']
    signup_id = body.get('signup_id')
    text = (body.get('message') or '').strip()
    if not signup_id or not text:
        conn.close()
        return respond(400, {'error': 'signup_id и message обязательны'})

    cur.execute(f"""
        SELECT s.id, s.event_id FROM {schema}.event_signups s
        WHERE s.id = {int(signup_id)} AND s.user_id = {uid}
    """)
    sig = cur.fetchone()
    if not sig:
        conn.close()
        return respond(404, {'error': 'Запись не найдена'})

    safe_text = text.replace("$msg$", "")
    cur.execute(f"""
        INSERT INTO {schema}.guest_messages (event_id, signup_id, direction, channel, body, delivered)
        VALUES ({sig['event_id']}, {sig['id']}, 'in', 'site', $msg${safe_text}$msg$, TRUE)
        RETURNING id, created_at
    """)
    new_msg = cur.fetchone()
    conn.commit()
    conn.close()
    return respond(200, {'ok': True, 'id': new_msg['id'], 'created_at': str(new_msg['created_at'])})


# =============================================================================
# REFUND REQUESTS (отмена событий «в складчину»)
# =============================================================================

def handle_refunds_list(cur, conn, schema, user):
    """Список заявок на возврат у пользователя (по отменённым событиям)."""
    uid = user['id']
    cur.execute(f"""
        SELECT r.id, r.signup_id, r.event_id, r.amount, r.method, r.status,
               r.reason, r.chosen_at, r.processed_at, r.created_at,
               e.title AS event_title, e.event_date, e.start_time,
               e.bath_name, e.cf_cancelled_at
        FROM {schema}.refund_requests r
        JOIN {schema}.events e ON e.id = r.event_id
        WHERE r.user_id = {uid}
        ORDER BY r.created_at DESC
        LIMIT 100
    """)
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return respond(200, {'refunds': rows, 'total': len(rows)})


def handle_refund_choose(cur, conn, schema, user, body):
    """Гость выбирает способ возврата: bonus | card."""
    uid = user['id']
    rid = body.get('id')
    method = (body.get('method') or '').strip()
    card_hint = (body.get('card_payment_hint') or '').strip()[:500]

    if not rid or method not in ('bonus', 'card'):
        conn.close()
        return respond(400, {'error': 'id и method (bonus|card) обязательны'})

    cur.execute(f"""
        SELECT r.id, r.amount, r.status, r.signup_id, r.event_id
        FROM {schema}.refund_requests r
        WHERE r.id = {int(rid)} AND r.user_id = {uid}
    """)
    r = cur.fetchone()
    if not r:
        conn.close()
        return respond(404, {'error': 'Заявка не найдена'})
    if r['status'] != 'pending':
        conn.close()
        return respond(409, {'error': 'Заявка уже обработана'})

    amount = int(r['amount'])
    eid = int(r['event_id'])

    if method == 'bonus':
        # Зачисляем мгновенно
        cur.execute(
            f"UPDATE {schema}.users SET bonus_balance = COALESCE(bonus_balance,0) + {amount} "
            f"WHERE id = {uid}"
        )
        cur.execute(
            f"INSERT INTO {schema}.wallet_transactions "
            f"(user_id, type, amount, description, ref_type, ref_id) "
            f"VALUES ({uid}, 'refund_bonus', {amount}, "
            f"'Возврат бонусом за отменённое событие #{eid}', 'refund_request', {int(rid)})"
        )
        cur.execute(
            f"UPDATE {schema}.refund_requests "
            f"SET method = 'bonus', status = 'done', chosen_at = NOW(), processed_at = NOW() "
            f"WHERE id = {int(rid)}"
        )
        new_status = 'done'
    else:
        # card — ставим в очередь на ручную обработку
        hint_safe = card_hint.replace("'", "''")
        cur.execute(
            f"UPDATE {schema}.refund_requests "
            f"SET method = 'card', chosen_at = NOW(), card_payment_hint = '{hint_safe}' "
            f"WHERE id = {int(rid)}"
        )
        new_status = 'pending'

    conn.commit()
    conn.close()
    return respond(200, {'ok': True, 'method': method, 'status': new_status, 'amount': amount})