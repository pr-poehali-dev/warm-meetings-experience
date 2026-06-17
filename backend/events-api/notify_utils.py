"""Вызов notification-hub для отправки уведомлений организатору событий.

Учитывает подписки пользователя, тихие часы и шаблоны (Центр уведомлений).
Не бросает исключений — ошибки логируются в stdout.
"""
import os

import requests


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

    try:
        resp = requests.post(
            f'{url}?resource=send',
            json=payload,
            headers={'X-Internal-Token': os.environ.get('ADMIN_PASSWORD', '')},
            timeout=8,
        )
        print(f'[hub_notify] {event_type} user={user_id} → {resp.status_code} {resp.text[:200]}')
    except Exception as exc:
        print(f'[hub_notify] EXC event={event_type}: {type(exc).__name__}: {exc}')


def fmt_event_dt(event_date, start_time):
    """Форматирует дату и время события в читаемый вид."""
    d = str(event_date or '')[:10]
    t = str(start_time or '')[:5]
    return d, t
