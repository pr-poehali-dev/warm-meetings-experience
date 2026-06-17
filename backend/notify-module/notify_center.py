"""Единый центр настройки уведомлений для бизнес-пользователей.

Действия (через ?action=...), авторизация по session-токену:
  GET  notify_center      — агрегированное состояние: каналы + типы событий + расписание
  POST set_event_sub      — вкл/выкл подписку на тип события (по каналам или целиком)
  POST set_schedule       — таймзона и тихие часы

Каналы (вкл/выкл целиком) остаются в channels.py (set_channel/set_prefs).
Здесь — подписки на конкретные типы событий и расписание тишины.
"""

import json
import re

import psycopg2.extras

from shared import get_user_from_token, respond


VALID_CHANNELS = ('telegram', 'email', 'vk')

_EMAIL_RE = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')


def _user(cur, schema, token):
    return get_user_from_token(cur, schema, token)


def handle_notify_center(method, params, body, conn, token):
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    from shared import get_schema
    schema = get_schema()

    user = _user(cur, schema, token)
    if not user:
        return respond(401, {"error": "Необходима авторизация"})
    uid = user['id']

    action = params.get("action") or body.get("action", "")

    if method == "GET" and action == "notify_center":
        return _get_center(cur, schema, uid, user)
    if method == "POST" and action == "set_event_sub":
        return _set_event_sub(cur, conn, schema, uid, body)
    if method == "POST" and action == "set_schedule":
        return _set_schedule(cur, conn, schema, uid, body)
    if method == "POST" and action == "set_email":
        return _set_email(cur, conn, schema, uid, user, body)

    return respond(400, {"error": "Неизвестное действие"})


def _get_center(cur, schema, uid, user=None):
    # 0. Роли пользователя для фильтрации событий
    cur.execute(f"""
        SELECT r.slug FROM {schema}.user_roles ur
        JOIN {schema}.roles r ON r.id = ur.role_id
        WHERE ur.user_id = {int(uid)} AND ur.status = 'active'
    """)
    user_roles = {row['slug'] for row in cur.fetchall()}
    # Маппинг: slug роли → название в recipient_roles
    ROLE_MAP = {'parmaster': 'master', 'organizer': 'organizer', 'partner': 'partner',
                'bath_owner': 'partner'}
    user_recipient_roles = {ROLE_MAP[s] for s in user_roles if s in ROLE_MAP}
    if not user_recipient_roles:
        user_recipient_roles = {'master'}  # fallback

    # 1. Состояние каналов
    cur.execute(f"""
        SELECT u.email, u.vk_id, u.vk_notify_allowed, u.tg_chat_id, u.tg_notify_allowed,
               COALESCE(u.notify_email, true)  AS notify_email,
               COALESCE(u.notify_telegram, false) AS notify_telegram,
               COALESCE(u.notify_vk, false)    AS notify_vk,
               la.telegram_user_id AS linked_tg
        FROM {schema}.users u
        LEFT JOIN (
            SELECT DISTINCT ON (user_id) user_id, telegram_user_id
            FROM {schema}.tg_linked_accounts
            ORDER BY user_id, linked_at DESC
        ) la ON la.user_id = u.id
        WHERE u.id = {int(uid)}
    """)
    u = cur.fetchone() or {}
    email_ok = bool(u.get('email') and '@vk.local' not in (u.get('email') or ''))
    # Telegram подключён, если есть chat_id ИЛИ привязка через бота (tg_linked_accounts)
    tg_connected = bool(u.get('tg_chat_id') or u.get('linked_tg'))
    channels = {
        "telegram": {
            "connected": tg_connected,
            "active": bool(u.get('notify_telegram')),
        },
        "email": {
            "connected": email_ok,
            "active": bool(u.get('notify_email')),
            "value": u.get('email') if email_ok else None,
        },
        "vk": {
            "connected": bool(u.get('vk_id')),
            "active": bool(u.get('notify_vk') and u.get('vk_notify_allowed')),
            "vk_id": u.get('vk_id') or None,
            "allowed": bool(u.get('vk_notify_allowed')),
        },
    }

    # 2. Доступные типы событий (для бизнес-аудитории) + текущие подписки
    cur.execute(f"""
        SELECT t.event_type, t.name, t.description, t.category,
               t.default_channels, t.recipient_roles,
               s.channels AS sub_channels, s.enabled AS sub_enabled
        FROM {schema}.notification_templates t
        LEFT JOIN {schema}.notify_event_subscriptions s
               ON s.event_type = t.event_type AND s.user_id = {int(uid)}
        WHERE t.is_active = TRUE AND t.audience = 'business'
        ORDER BY t.category, t.name
    """)
    events = []
    for r in cur.fetchall():
        # Фильтр по ролям: показываем событие только если роль пользователя входит в recipient_roles
        rec_roles = r['recipient_roles']
        if rec_roles is not None and not isinstance(rec_roles, list):
            rec_roles = json.loads(rec_roles or '[]')
        if rec_roles and not user_recipient_roles.intersection(set(rec_roles)):
            continue

        default_ch = r['default_channels'] if isinstance(r['default_channels'], list) \
            else json.loads(r['default_channels'] or '[]')
        sub_ch = r['sub_channels']
        if sub_ch is not None and not isinstance(sub_ch, dict):
            sub_ch = json.loads(sub_ch or '{}')
        # Итоговое состояние по каналам: подписка opt-out (нет записи = вкл по умолчанию)
        per_channel = {}
        for ch in VALID_CHANNELS:
            if ch in default_ch:
                if sub_ch and ch in sub_ch:
                    per_channel[ch] = bool(sub_ch[ch])
                else:
                    per_channel[ch] = True
        events.append({
            "event_type": r['event_type'],
            "name": r['name'],
            "description": r['description'],
            "category": r['category'],
            "available_channels": [c for c in VALID_CHANNELS if c in default_ch],
            "enabled": True if r['sub_enabled'] is None else bool(r['sub_enabled']),
            "channels": per_channel,
            "recipient_roles": rec_roles if rec_roles else [],
        })

    # 3. Расписание
    cur.execute(f"""
        SELECT timezone, quiet_enabled, quiet_from, quiet_to
        FROM {schema}.notify_schedule WHERE user_id = {int(uid)}
    """)
    sch = cur.fetchone()
    schedule = {
        "timezone": sch['timezone'] if sch else 'Europe/Moscow',
        "quiet_enabled": bool(sch['quiet_enabled']) if sch else False,
        "quiet_from": int(sch['quiet_from']) if sch else 22,
        "quiet_to": int(sch['quiet_to']) if sch else 8,
    }

    return respond(200, {
        "channels": channels,
        "events": events,
        "schedule": schedule,
        "user_roles": sorted(user_recipient_roles),
    })


def _set_event_sub(cur, conn, schema, uid, body):
    event_type = (body.get("event_type") or "").strip()
    if not event_type:
        return respond(400, {"error": "Не указан event_type"})

    # Проверяем, что тип существует и доступен бизнесу
    cur.execute(f"""
        SELECT 1 FROM {schema}.notification_templates
        WHERE event_type = %s AND is_active = TRUE AND audience = 'business'
    """, (event_type,))
    if not cur.fetchone():
        return respond(403, {"error": "Этот тип уведомления недоступен для настройки"})

    enabled = bool(body.get("enabled", True))
    # channels: {"telegram": true/false, ...} — частичный апдейт допустим
    in_channels = body.get("channels") or {}
    channels = {}
    for ch in VALID_CHANNELS:
        if ch in in_channels:
            channels[ch] = bool(in_channels[ch])

    cur.execute(f"""
        INSERT INTO {schema}.notify_event_subscriptions
            (user_id, event_type, channels, enabled, updated_at)
        VALUES (%s, %s, %s, %s, NOW())
        ON CONFLICT (user_id, event_type) DO UPDATE SET
            channels = EXCLUDED.channels,
            enabled = EXCLUDED.enabled,
            updated_at = NOW()
    """, (int(uid), event_type, json.dumps(channels), enabled))
    conn.commit()
    return respond(200, {"ok": True, "event_type": event_type})


def _set_schedule(cur, conn, schema, uid, body):
    tz = (body.get("timezone") or "Europe/Moscow").strip()[:64]
    quiet_enabled = bool(body.get("quiet_enabled", False))
    try:
        quiet_from = int(body.get("quiet_from", 22)) % 24
        quiet_to = int(body.get("quiet_to", 8)) % 24
    except (TypeError, ValueError):
        return respond(400, {"error": "Некорректные часы тишины"})

    cur.execute(f"""
        INSERT INTO {schema}.notify_schedule
            (user_id, timezone, quiet_enabled, quiet_from, quiet_to, updated_at)
        VALUES (%s, %s, %s, %s, %s, NOW())
        ON CONFLICT (user_id) DO UPDATE SET
            timezone = EXCLUDED.timezone,
            quiet_enabled = EXCLUDED.quiet_enabled,
            quiet_from = EXCLUDED.quiet_from,
            quiet_to = EXCLUDED.quiet_to,
            updated_at = NOW()
    """, (int(uid), tz, quiet_enabled, quiet_from, quiet_to))
    conn.commit()
    return respond(200, {"ok": True})


def _set_email(cur, conn, schema, uid, user, body):
    """Сохраняет email для уведомлений и включает Email-канал.

    Если у пользователя уже есть настоящий email (логин) — менять его нельзя,
    только включаем канал. Заглушку @vk.local разрешено заменить реальным адресом.
    """
    new_email = (body.get("email") or "").strip().lower()
    current = (user.get("email") or "").strip()
    has_real = bool(current and "@vk.local" not in current)

    if has_real:
        # email уже задан и используется для входа — просто включаем канал
        cur.execute(f"UPDATE {schema}.users SET notify_email = TRUE WHERE id = {int(uid)}")
        conn.commit()
        return respond(200, {"ok": True, "email": current})

    if not _EMAIL_RE.match(new_email):
        return respond(400, {"error": "Укажите корректный email"})

    # email не должен быть занят другим аккаунтом
    safe = new_email.replace("'", "''")
    cur.execute(f"""
        SELECT id FROM {schema}.users
        WHERE lower(email) = '{safe}' AND id <> {int(uid)} LIMIT 1
    """)
    if cur.fetchone():
        return respond(409, {"error": "Этот email уже привязан к другому аккаунту"})

    cur.execute(f"""
        UPDATE {schema}.users
        SET email = '{safe}', notify_email = TRUE
        WHERE id = {int(uid)}
    """)
    conn.commit()
    return respond(200, {"ok": True, "email": new_email})


NOTIFY_CENTER_ACTIONS = {"notify_center", "set_event_sub", "set_schedule", "set_email"}