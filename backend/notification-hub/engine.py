"""
Движок отправки: рендер шаблонов, выбор каналов, отправка, логирование.

Каналы расширяемы: чтобы добавить push/sms/max — допишите функцию-отправщик
и зарегистрируйте её в CHANNELS. Остальной код менять не нужно.
"""

import json
import re
from datetime import datetime, timezone, timedelta

from shared import tg_send, send_email, vk_send


# ─── Реестр каналов ────────────────────────────────────────────────────────
# Каждый канал: как достать адрес получателя + как отправить.
# Чтобы добавить push/sms/max — добавьте сюда новую запись.

def _send_telegram(recipient, rendered):
    return tg_send(recipient, rendered.get('text', ''))

def _send_email(recipient, rendered):
    return send_email(recipient, rendered.get('subject', ''), rendered.get('html', ''))

def _send_vk(recipient, rendered):
    return vk_send(recipient, rendered.get('text', ''))


CHANNELS = {
    'telegram': {
        # как достать адрес из данных получателя
        'addr': lambda r: r.get('tg_chat_id'),
        'send': _send_telegram,
        # какие ключи шаблона нужны
        'fields': ['text'],
    },
    'email': {
        'addr': lambda r: r.get('email'),
        'send': _send_email,
        'fields': ['subject', 'html'],
    },
    'vk': {
        'addr': lambda r: r.get('vk_id'),
        'send': _send_vk,
        'fields': ['text'],
    },
    # 'push': {...}, 'sms': {...}, 'max': {...}  — добавятся позже
}


# ─── Подстановка переменных ──────────────────────────────────────────────────

_VAR_RE = re.compile(r'\{(\w+)\}')

def render(template_str, variables):
    """Заменяет {var} на значения. Неизвестные переменные остаются пустыми."""
    if not template_str:
        return ''
    def repl(m):
        key = m.group(1)
        val = variables.get(key)
        return '' if val is None else str(val)
    return _VAR_RE.sub(repl, template_str)


# ─── Получатель ──────────────────────────────────────────────────────────────

def _resolve_recipient(cur, schema, user_id, direct):
    """Собирает контакты получателя: из direct (приоритет) + из БД по user_id."""
    rec = {
        'user_id': user_id,
        'email': direct.get('email'),
        'tg_chat_id': direct.get('tg_chat_id'),
        'vk_id': direct.get('vk_id'),
        'name': direct.get('name'),
        'notify': {},  # настройки пользователя по каналам
    }
    if not user_id:
        return rec

    cur.execute(f"""
        SELECT u.email, u.vk_id, u.name,
               u.tg_chat_id AS user_tg,
               la.telegram_user_id AS linked_tg,
               COALESCE(u.notify_email, true)   AS notify_email,
               u.notify_telegram                AS notify_telegram,
               COALESCE(u.notify_vk, false)     AS notify_vk
        FROM {schema}.users u
        LEFT JOIN (
            SELECT DISTINCT ON (user_id) user_id, telegram_user_id
            FROM {schema}.tg_linked_accounts
            ORDER BY user_id, linked_at DESC
        ) la ON la.user_id = u.id
        WHERE u.id = {int(user_id)}
    """)
    row = cur.fetchone()
    if row:
        rec['email'] = rec['email'] or row.get('email')
        rec['vk_id'] = rec['vk_id'] or row.get('vk_id')
        rec['name'] = rec['name'] or row.get('name')
        rec['tg_chat_id'] = rec['tg_chat_id'] or row.get('linked_tg') or row.get('user_tg')
        rec['notify'] = {
            'email': row.get('notify_email'),
            'telegram': row.get('notify_telegram'),
            'vk': row.get('notify_vk'),
        }
    return rec


# ─── Персональные настройки получателя (подписки + тихие часы) ──────────────

# Минимальная карта смещений таймзон (без зависимости от pytz/zoneinfo).
_TZ_OFFSETS = {
    'Europe/Kaliningrad': 2, 'Europe/Moscow': 3, 'Europe/Samara': 4,
    'Asia/Yekaterinburg': 5, 'Asia/Omsk': 6, 'Asia/Krasnoyarsk': 7,
    'Asia/Irkutsk': 8, 'Asia/Yakutsk': 9, 'Asia/Vladivostok': 10,
    'Asia/Magadan': 11, 'Asia/Kamchatka': 12, 'UTC': 0,
}


def _load_prefs(cur, schema, user_id, event_type):
    """Загружает подписку пользователя на тип события и его расписание.

    Возвращает dict:
      {'enabled': bool, 'channels': {ch: bool}, 'quiet': {...} | None}
    Если записей нет — подписка считается включённой (opt-out).
    """
    prefs = {'enabled': True, 'channels': {}, 'quiet': None}
    if not user_id:
        return prefs
    try:
        cur.execute(f"""
            SELECT channels, enabled
            FROM {schema}.notify_event_subscriptions
            WHERE user_id = {int(user_id)} AND event_type = %s
        """, (event_type,))
        row = cur.fetchone()
        if row:
            prefs['enabled'] = bool(row['enabled'])
            ch = row['channels']
            if ch is not None and not isinstance(ch, dict):
                ch = json.loads(ch or '{}')
            prefs['channels'] = ch or {}
    except Exception:
        pass

    try:
        cur.execute(f"""
            SELECT timezone, quiet_enabled, quiet_from, quiet_to
            FROM {schema}.notify_schedule
            WHERE user_id = {int(user_id)}
        """)
        sch = cur.fetchone()
        if sch and sch.get('quiet_enabled'):
            prefs['quiet'] = {
                'timezone': sch.get('timezone') or 'Europe/Moscow',
                'from': int(sch.get('quiet_from', 22)),
                'to': int(sch.get('quiet_to', 8)),
            }
    except Exception:
        pass
    return prefs


def _in_quiet_hours(quiet):
    """True, если сейчас (в таймзоне пользователя) — тихие часы."""
    if not quiet:
        return False
    offset = _TZ_OFFSETS.get(quiet.get('timezone'), 3)
    now_local = datetime.now(timezone.utc) + timedelta(hours=offset)
    h = now_local.hour
    q_from, q_to = quiet['from'], quiet['to']
    if q_from == q_to:
        return False
    if q_from < q_to:
        return q_from <= h < q_to
    # интервал через полночь (например, 22 → 8)
    return h >= q_from or h < q_to


# ─── Лог ───────────────────────────────────────────────────────────────────

def _log(cur, schema, *, channel, event_type, recipient, status,
         subject=None, error_text=None, user_id=None, related_id=None,
         template_id=None, payload=None):
    try:
        cur.execute(f"""
            INSERT INTO {schema}.notification_log
                (channel, event_type, recipient, subject, status,
                 error_text, user_id, related_id, template_id, payload)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            channel, event_type,
            (str(recipient) if recipient is not None else None),
            subject, status, error_text,
            user_id, related_id, template_id,
            json.dumps(payload, ensure_ascii=False) if payload else None,
        ))
    except Exception:
        pass


# ─── Главный движок ──────────────────────────────────────────────────────────

def get_effective_bodies(cur, schema, event_type, owner_id=None):
    """Возвращает (bodies, default_channels, is_active, template_id) с учётом
    персонального шаблона владельца. Персональные тексты канала имеют приоритет
    над глобальными; недостающие каналы берутся из глобального шаблона.
    """
    cur.execute(f"""
        SELECT id, bodies, default_channels, is_active
        FROM {schema}.notification_templates
        WHERE event_type = %s
    """, (event_type,))
    tpl = cur.fetchone()
    if not tpl:
        return None, None, None, None

    bodies = tpl['bodies'] if isinstance(tpl['bodies'], dict) else json.loads(tpl['bodies'] or '{}')
    default_channels = tpl['default_channels'] if isinstance(tpl['default_channels'], list) \
        else json.loads(tpl['default_channels'] or '[]')

    # Накладываем персональный шаблон владельца (если есть и активен)
    if owner_id:
        cur.execute(f"""
            SELECT bodies, is_active
            FROM {schema}.notification_templates_owner
            WHERE owner_id = %s AND event_type = %s
        """, (int(owner_id), event_type))
        own = cur.fetchone()
        if own and own.get('is_active'):
            own_bodies = own['bodies'] if isinstance(own['bodies'], dict) else json.loads(own['bodies'] or '{}')
            merged = dict(bodies)
            for ch, body in own_bodies.items():
                if body:
                    merged[ch] = body
            bodies = merged

    return bodies, default_channels, tpl.get('is_active'), tpl['id']


def send_notification(cur, schema, event_type, *, user_id=None, variables=None,
                      channels=None, direct=None, related_id=None, owner_id=None,
                      respect_prefs=True):
    """Отправляет уведомление по шаблону на выбранные каналы.

    owner_id — если задан, применяются персональные тексты этого владельца.
    respect_prefs — учитывать подписки получателя на тип события и тихие часы.
        Поставьте False для критичных/системных уведомлений (нельзя отключить).
    Возвращает: {ok, event_type, results: {channel: 'success'|'failed'|'skipped'}}.
    """
    variables = variables or {}
    direct = direct or {}

    # 1. Шаблон (с учётом персонального шаблона владельца)
    bodies, default_channels, is_active, template_id = get_effective_bodies(
        cur, schema, event_type, owner_id=owner_id)
    if bodies is None:
        return {'ok': False, 'error': f'Нет шаблона для event_type={event_type}'}
    if not is_active:
        return {'ok': False, 'error': 'Шаблон отключён', 'results': {}}

    # 2. Получатель
    rec = _resolve_recipient(cur, schema, user_id, direct)

    # 2.1. Персональные настройки получателя: подписка на тип события + тихие часы.
    # respect_prefs=False (системные/критичные уведомления) — пропускаем проверки.
    prefs = _load_prefs(cur, schema, user_id, event_type) if respect_prefs else {
        'enabled': True, 'channels': {}, 'quiet': None}

    # Событие целиком отключено пользователем — не шлём никуда.
    if not prefs['enabled']:
        return {'ok': True, 'event_type': event_type, 'results': {}, 'skipped_reason': 'unsubscribed'}

    # Тихие часы — не беспокоим (пока режим 'skip').
    if _in_quiet_hours(prefs.get('quiet')):
        return {'ok': True, 'event_type': event_type, 'results': {}, 'skipped_reason': 'quiet_hours'}

    # 3. Какие каналы шлём
    want = channels if channels else default_channels
    want = [c for c in want if c in CHANNELS]

    results = {}
    for ch in want:
        meta = CHANNELS[ch]
        addr = meta['addr'](rec)
        body = bodies.get(ch)

        # Нет шаблона канала или нет адреса — пропускаем
        if not body or not addr:
            results[ch] = 'skipped'
            continue

        # Уважаем настройку пользователя (None = не задано = разрешаем)
        if rec['notify'].get(ch) is False:
            results[ch] = 'skipped'
            continue

        # Подписка на этот тип события в данный канал (opt-out: нет ключа = разрешено)
        if prefs['channels'].get(ch) is False:
            results[ch] = 'skipped'
            continue

        # Рендер всех нужных полей канала
        rendered = {f: render(body.get(f, ''), variables) for f in meta['fields']}

        ok = False
        try:
            ok = meta['send'](addr, rendered)
        except Exception:
            ok = False

        results[ch] = 'success' if ok else 'failed'
        _log(cur, schema,
             channel=ch, event_type=event_type, recipient=addr,
             status=('success' if ok else 'failed'),
             subject=rendered.get('subject') or None,
             error_text=None if ok else 'send returned False',
             user_id=user_id, related_id=related_id,
             template_id=template_id,
             payload={'variables': variables})

    return {'ok': True, 'event_type': event_type, 'results': results}