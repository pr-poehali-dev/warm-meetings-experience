"""
Notification Hub — единый движок отправки уведомлений.

Все модули платформы шлют уведомления через ОДИН endpoint. Hub сам:
  - находит шаблон по event_type,
  - подставляет переменные {var},
  - отправляет на нужные каналы (telegram / email / vk; push/sms/max — позже),
  - пишет результат в notification_log.

Ресурсы (queryStringParameters['resource']):
  POST  ?resource=send       — отправить уведомление (главный движок)
  GET   ?resource=templates  — список шаблонов (admin)
  POST  ?resource=templates  — создать/обновить шаблон (admin)
  GET   ?resource=channels   — какие каналы поддерживаются (публично)

Авторизация:
  - send: внутренний вызов (X-Internal-Token = ADMIN-схема) ИЛИ admin-токен.
  - templates: только admin (X-Admin-Token).
"""

import json
import os

import psycopg2
import psycopg2.extras

from shared import (
    get_conn, get_schema, options_response, respond, err,
    verify_admin_token,
)
from err_log import with_error_logging
from engine import send_notification, CHANNELS
from templates import handle_templates
from logs import handle_logs
from user_channels import handle_user_channels


@with_error_logging('notification-hub')
def handler(event, context):
    """Единый движок отправки уведомлений: шаблоны, каналы, лог доставки."""
    if event.get('httpMethod') == 'OPTIONS':
        return options_response()

    method = event.get('httpMethod', 'GET')
    params = event.get('queryStringParameters') or {}
    resource = (params.get('resource') or 'send').strip()
    headers_in = event.get('headers') or {}

    schema = get_schema()
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    try:
        # Публично: список поддерживаемых каналов
        if resource == 'channels' and method == 'GET':
            return respond(200, {'channels': list(CHANNELS.keys())})

        # Отправка уведомления — главный движок
        if resource == 'send' and method == 'POST':
            return _route_send(cur, conn, schema, event)

        # Управление шаблонами — только админ
        if resource == 'templates':
            admin_token = headers_in.get('X-Admin-Token') or headers_in.get('x-admin-token') or ''
            if not verify_admin_token(admin_token):
                return respond(403, {'error': 'Доступ запрещён'})
            return handle_templates(cur, conn, schema, method, params, event)

        # Журнал доставки и статистика — только админ
        if resource == 'logs':
            admin_token = headers_in.get('X-Admin-Token') or headers_in.get('x-admin-token') or ''
            if not verify_admin_token(admin_token):
                return respond(403, {'error': 'Доступ запрещён'})
            return handle_logs(cur, schema, method, params)

        # Обзор каналов пользователей + отключение — только админ
        if resource == 'user_channels':
            admin_token = headers_in.get('X-Admin-Token') or headers_in.get('x-admin-token') or ''
            if not verify_admin_token(admin_token):
                return respond(403, {'error': 'Доступ запрещён'})
            try:
                uc_body = json.loads(event.get('body') or '{}')
            except Exception:
                uc_body = {}
            return handle_user_channels(cur, conn, schema, method, params, uc_body)

        return err('Неизвестный ресурс', 404)
    finally:
        conn.close()


def _route_send(cur, conn, schema, event):
    try:
        body = json.loads(event.get('body') or '{}')
    except Exception:
        return err('Некорректный JSON')

    # Авторизация отправки: токен можно передать в заголовке ИЛИ в теле запроса.
    # Передача в теле (auth_token) нужна для вызовов между бэкенд-функциями —
    # платформенный прокси может фильтровать кастомные заголовки.
    headers_in = event.get('headers') or {}
    internal = headers_in.get('X-Internal-Token') or headers_in.get('x-internal-token') or ''
    admin_token = headers_in.get('X-Admin-Token') or headers_in.get('x-admin-token') or ''
    body_token = body.get('auth_token') or ''
    admin_pwd = os.environ.get('ADMIN_PASSWORD', '__none__')
    internal_ok = bool(internal) and internal == admin_pwd
    body_internal_ok = bool(body_token) and body_token == admin_pwd
    if not (internal_ok or body_internal_ok
            or verify_admin_token(admin_token) or verify_admin_token(body_token)):
        return respond(403, {'error': 'Доступ запрещён'})

    event_type = (body.get('event_type') or '').strip()
    if not event_type:
        return err('Не указан event_type')

    user_id = body.get('user_id')
    variables = body.get('variables') or {}
    channels = body.get('channels')  # список или None → берём из шаблона/настроек
    # Прямые контакты (если у получателя ещё нет user_id в системе)
    direct = body.get('direct') or {}  # {email, tg_chat_id, vk_id, name}

    result = send_notification(
        cur, schema, event_type,
        user_id=user_id, variables=variables,
        channels=channels, direct=direct,
        related_id=body.get('related_id'),
        owner_id=body.get('owner_id'),
        respect_prefs=body.get('respect_prefs', True),
    )
    conn.commit()
    return respond(200, result)