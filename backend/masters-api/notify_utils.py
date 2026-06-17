"""Утилита для вызова notification-hub из masters-api.

Отправляет уведомления мастеру (owner) через централизованный hub,
который учитывает подписки, тихие часы и шаблоны пользователя.

ВАЖНО: hub_notify работает fire-and-forget через поток — не блокирует основной запрос.
"""
import json
import os
import threading
import urllib.request
import urllib.error


_HUB_URL = None


def _hub_url():
    global _HUB_URL
    if not _HUB_URL:
        _HUB_URL = os.environ.get('NOTIFICATION_HUB_URL', '')
    return _HUB_URL


def _do_notify(url, body, token, event_type, user_id):
    req = urllib.request.Request(
        f'{url}?resource=send',
        data=body,
        headers={
            'Content-Type': 'application/json',
            'X-Internal-Token': token,
        },
        method='POST',
    )
    try:
        with urllib.request.urlopen(req, timeout=12) as resp:
            raw = resp.read().decode('utf-8', 'replace')
            print(f'[hub_notify] {event_type} user={user_id} → {raw[:200]}')
    except urllib.error.HTTPError as e:
        body_err = ''
        try:
            body_err = e.read().decode('utf-8', 'replace')[:300]
        except Exception:
            pass
        print(f'[hub_notify] HTTP {e.code} event={event_type}: {body_err}')
    except Exception as exc:
        print(f'[hub_notify] EXC event={event_type}: {type(exc).__name__}: {exc}')


def hub_notify(event_type, *, user_id, variables=None, related_id=None, owner_id=None):
    """Отправляет событие в notification-hub для конкретного пользователя.

    Не бросает исключений — ошибки логируются в stdout.
    Работает асинхронно: не блокирует основной запрос.
    """
    url = _hub_url()
    if not url:
        print(f'[hub_notify] NOTIFICATION_HUB_URL not set, skip {event_type}')
        return

    token = os.environ.get('ADMIN_PASSWORD', '')
    payload = {
        'event_type': event_type,
        'user_id': user_id,
        'variables': variables or {},
        'respect_prefs': True,
    }
    if related_id is not None:
        payload['related_id'] = related_id
    if owner_id is not None:
        payload['owner_id'] = owner_id

    body = json.dumps(payload).encode('utf-8')
    t = threading.Thread(
        target=_do_notify,
        args=(url, body, token, event_type, user_id),
        daemon=True,
    )
    t.start()


def get_master_user_id(cur, schema, master_id):
    """Возвращает user_id мастера по master_id."""
    cur.execute(f'SELECT user_id FROM {schema}.masters WHERE id = {int(master_id)} LIMIT 1')
    row = cur.fetchone()
    return row['user_id'] if row else None


def fmt_dt(dt_str, tz='Europe/Moscow'):
    """Форматирует datetime строку в читаемый вид 'ДД.ММ.ГГГГ ЧЧ:ММ'."""
    try:
        from datetime import datetime, timedelta
        import re
        s = re.sub(r'\.\d+', '', str(dt_str)).replace('+00:00', '').replace('Z', '').strip()
        dt = datetime.strptime(s[:19], '%Y-%m-%d %H:%M:%S')
        dt = dt + timedelta(hours=3)
        return dt.strftime('%d.%m.%Y'), dt.strftime('%H:%M')
    except Exception:
        s = str(dt_str or '')
        return s[:10], s[11:16]
