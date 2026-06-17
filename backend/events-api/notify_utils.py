"""Вызов notification-hub для отправки уведомлений организатору событий.

Учитывает подписки пользователя, тихие часы и шаблоны (Центр уведомлений).
Не бросает исключений — ошибки логируются в stdout.

ВАЖНО: hub_notify работает fire-and-forget через поток — не блокирует основной запрос.
"""
import os
import threading

import requests


def _do_notify(url, payload, admin_password, event_type, user_id):
    try:
        resp = requests.post(
            f'{url}?resource=send',
            json=payload,
            headers={'X-Internal-Token': admin_password},
            timeout=12,
        )
        print(f'[hub_notify] {event_type} user={user_id} → {resp.status_code} {resp.text[:200]}')
    except Exception as exc:
        print(f'[hub_notify] EXC event={event_type}: {type(exc).__name__}: {exc}')


def hub_notify(event_type, *, user_id, variables=None, related_id=None, owner_id=None):
    url = os.environ.get('NOTIFICATION_HUB_URL', '')
    if not url:
        print(f'[hub_notify] NOTIFICATION_HUB_URL not set, skip {event_type}')
        return
    if not user_id:
        return

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

    t = threading.Thread(
        target=_do_notify,
        args=(url, payload, os.environ.get('ADMIN_PASSWORD', ''), event_type, user_id),
        daemon=True,
    )
    t.start()


def fmt_event_dt(event_date, start_time):
    """Форматирует дату и время события в читаемый вид."""
    d = str(event_date or '')[:10]
    t = str(start_time or '')[:5]
    return d, t
