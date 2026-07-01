"""Напоминания гостю о предстоящей записи за 24 часа.

Функция handle_reminders вызывается по расписанию (cron) через
?resource=reminders. Идемпотентна: помечает отправленные напоминания
в master_bookings.reminder_24h_sent_at, чтобы не слать дважды.

Логика:
1. Берём активные брони (pending/confirmed), у которых старт наступит в окне
   [now + 23ч, now + 25ч] и напоминание ещё не отправлено.
2. Проверяем, что у мастера включён флаг notify_24h_reminder.
3. Шлём гостю напоминание (email + Telegram + VK) и ставим отметку.
"""
import os
from datetime import datetime, timezone

import psycopg2.extras

from shared import get_conn, send_email, tg_send, vk_send
from bookings import _log_notification, _ics_download_url


def _local_dt_human(dt_raw, tz_name):
    """Дата/время в экранной зоне мастера: 'ДД.ММ.ГГГГ в ЧЧ:ММ'."""
    try:
        from zoneinfo import ZoneInfo
        local_tz = ZoneInfo(tz_name or 'Europe/Moscow')
    except Exception:
        from datetime import timezone as _tz, timedelta as _td
        local_tz = _tz(_td(hours=3))
    try:
        dtv = datetime.fromisoformat(str(dt_raw).replace('Z', '+00:00'))
        if dtv.tzinfo is None:
            dtv = dtv.replace(tzinfo=timezone.utc)
        return dtv.astimezone(local_tz).strftime('%d.%m.%Y в %H:%M')
    except Exception:
        return str(dt_raw)


def _map_url(booking):
    addr = (booking.get('meeting_address') or '').strip()
    if not addr:
        return ''
    lat = booking.get('meeting_latitude')
    lng = booking.get('meeting_longitude')
    if lat is not None and lng is not None:
        return f'https://yandex.ru/maps/?pt={lng},{lat}&z=17&l=map'
    from urllib.parse import quote as _quote
    return f'https://yandex.ru/maps/?text={_quote(addr)}'


def _send_reminder(cur, schema, booking, master_name, tz_name, service_name):
    """Отправляет напоминание гостю по всем доступным каналам."""
    client_email = (booking.get('client_email') or '').strip()
    client_name = (booking.get('client_name') or '').strip() or 'клиент'
    client_user_id = booking.get('client_id')
    dt_human = _local_dt_human(booking.get('datetime_start'), tz_name)
    meeting_address = (booking.get('meeting_address') or '').strip()
    map_url = _map_url(booking)
    ics_url = _ics_download_url(booking.get('reply_token'))

    sent_any = False

    # === Email ===
    email_ok = (
        bool(client_email)
        and not client_email.endswith('.vk.local')
        and not client_email.endswith('@vk.local')
        and bool(os.environ.get('UNISENDER_API_KEY'))
        and bool(os.environ.get('UNISENDER_SENDER_EMAIL'))
    )
    if email_ok:
        svc_block = f'<p style="color: #6b7280;">Услуга: <b>{service_name}</b></p>' if service_name else ''
        addr_block = ''
        if meeting_address:
            addr_block = (
                f'<p style="color: #6b7280; margin-top: 12px;">Адрес: <b>{meeting_address}</b><br>'
                f'<a href="{map_url}" style="color: #c8834a; text-decoration: none;">'
                f'&#128205; Посмотреть на карте</a></p>'
            )
        ics_block = ''
        if ics_url:
            ics_block = (
                f'<p style="margin-top: 12px;"><a href="{ics_url}" '
                f'style="display: inline-block; padding: 10px 18px; background: #c8834a; '
                f'color: #fff; border-radius: 8px; text-decoration: none;">'
                f'&#128197; Добавить в календарь</a></p>'
            )
        subject = f'Напоминание: запись завтра, {dt_human}'
        body_html = f"""
        <div style="font-family: -apple-system, Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #2d2318;">
            <h2 style="color: #0f172a;">Здравствуйте, {client_name}!</h2>
            <p>Напоминаем о вашей записи к мастеру <b>{master_name}</b> — уже завтра, <b>{dt_human}</b>.</p>
            {svc_block}
            {addr_block}
            {ics_block}
            <p style="color: #6b7280; margin-top: 16px;">Если планы изменились — свяжитесь с мастером заранее.</p>
        </div>
        """.strip()
        ok = send_email(client_email, subject, body_html, tags=['booking-reminder-24h'])
        sent_any = sent_any or bool(ok)
        _log_notification(cur, schema,
            channel='email', event_type='client_booking_reminder_24h',
            recipient=client_email, subject=subject,
            status='success' if ok else 'failed',
            related_id=booking.get('id'),
            payload={'client_name': client_name})

    # === Telegram / VK (для залогиненного гостя) ===
    if client_user_id:
        cur.execute(f"""
            SELECT u.vk_id AS vk_id,
                   COALESCE(u.notify_vk, false) AS notify_vk,
                   u.tg_chat_id AS user_tg,
                   u.notify_telegram AS notify_telegram,
                   la.telegram_user_id AS linked_tg
            FROM {schema}.users u
            LEFT JOIN (
                SELECT DISTINCT ON (user_id) user_id, telegram_user_id
                FROM {schema}.tg_linked_accounts
                ORDER BY user_id, linked_at DESC
            ) la ON la.user_id = u.id
            WHERE u.id = {int(client_user_id)}
        """)
        u = cur.fetchone()
        if u:
            head = '⏰ Напоминание о записи'
            tg_chat_id = u.get('linked_tg') or u.get('user_tg')
            if tg_chat_id and u.get('notify_telegram') is not False:
                lines = [
                    f'⏰ <b>{head}</b>',
                    '',
                    f'Уже завтра, <b>{dt_human}</b>',
                    f'Мастер: <b>{master_name}</b>',
                ]
                if service_name:
                    lines.append(f'📌 {service_name}')
                if meeting_address:
                    lines.append(f'📍 {meeting_address}')
                if map_url:
                    lines.append(f'🗺 <a href="{map_url}">Открыть на карте</a>')
                if ics_url:
                    lines.append(f'📆 <a href="{ics_url}">Добавить в календарь</a>')
                ok_tg = tg_send(tg_chat_id, '\n'.join(lines))
                sent_any = sent_any or bool(ok_tg)
                _log_notification(cur, schema,
                    channel='telegram', event_type='client_booking_reminder_24h',
                    recipient=str(tg_chat_id), subject=head,
                    status='success' if ok_tg else 'failed',
                    user_id=client_user_id, related_id=booking.get('id'),
                    payload={'client_name': client_name})

            vk_id = u.get('vk_id')
            if vk_id and u.get('notify_vk'):
                vk_lines = [
                    f'⏰ {head}',
                    '',
                    f'Уже завтра, {dt_human}',
                    f'Мастер: {master_name}',
                ]
                if service_name:
                    vk_lines.append(f'📌 {service_name}')
                if meeting_address:
                    vk_lines.append(f'📍 {meeting_address}')
                if map_url:
                    vk_lines.append(f'🗺 На карте: {map_url}')
                if ics_url:
                    vk_lines.append(f'📆 В календарь: {ics_url}')
                ok_vk = vk_send(vk_id, '\n'.join(vk_lines))
                sent_any = sent_any or bool(ok_vk)
                _log_notification(cur, schema,
                    channel='vk', event_type='client_booking_reminder_24h',
                    recipient=str(vk_id), subject=head,
                    status='success' if ok_vk else 'failed',
                    user_id=client_user_id, related_id=booking.get('id'),
                    payload={'client_name': client_name})

    return sent_any


def handle_reminders(event, method, params, schema, headers):
    """Рассылка напоминаний за 24ч. Вызывается по расписанию (cron).

    Находит активные брони со стартом в окне [now+23ч, now+25ч], у мастеров
    с включённым notify_24h_reminder, которым напоминание ещё не отправлено,
    шлёт напоминание гостю и проставляет reminder_24h_sent_at.
    """
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    processed = 0
    sent = 0
    errors = []
    try:
        cur.execute(f"""
            SELECT b.*, m.name AS master_name,
                   COALESCE(mcs.timezone, 'Europe/Moscow') AS tz,
                   COALESCE(mcs.notify_24h_reminder, true) AS reminder_enabled,
                   s.name AS service_name
            FROM {schema}.master_bookings b
            JOIN {schema}.masters m ON m.id = b.master_id
            LEFT JOIN {schema}.master_calendar_settings mcs ON mcs.master_id = b.master_id
            LEFT JOIN {schema}.master_services s ON s.id = b.service_id
            WHERE b.status IN ('pending', 'confirmed')
              AND b.reminder_24h_sent_at IS NULL
              AND b.datetime_start >= NOW() + INTERVAL '23 hours'
              AND b.datetime_start <= NOW() + INTERVAL '25 hours'
            ORDER BY b.datetime_start
            LIMIT 200
        """)
        rows = [dict(r) for r in cur.fetchall()]

        for b in rows:
            processed += 1
            bid = b['id']
            # Отметку ставим всегда (даже если канал недоступен), чтобы не
            # долбить одну и ту же бронь при каждом запуске.
            if not b.get('reminder_enabled'):
                cur.execute(f"""
                    UPDATE {schema}.master_bookings
                    SET reminder_24h_sent_at = NOW()
                    WHERE id = {int(bid)}
                """)
                conn.commit()
                continue
            try:
                ok = _send_reminder(cur, schema, b, b.get('master_name') or 'мастер',
                                    b.get('tz'), b.get('service_name') or '')
                if ok:
                    sent += 1
                cur.execute(f"""
                    UPDATE {schema}.master_bookings
                    SET reminder_24h_sent_at = NOW()
                    WHERE id = {int(bid)}
                """)
                conn.commit()
            except Exception as e:
                conn.rollback()
                errors.append({'booking_id': bid, 'error': str(e)[:200]})

        import json
        return {'statusCode': 200, 'headers': headers,
                'body': json.dumps({'ok': True, 'processed': processed,
                                    'sent': sent, 'errors': errors})}
    except Exception as e:
        conn.rollback()
        import json
        return {'statusCode': 500, 'headers': headers,
                'body': json.dumps({'error': str(e)[:500]})}
    finally:
        cur.close()
        conn.close()
