import json
import os
import psycopg2.extras
from datetime import datetime
from shared import CORS_HEADERS, get_conn, get_schema, send_email, tg_send, admin_email
from booking_validator import (
    acquire_master_lock, validate_booking_create, get_buffer_minutes,
    require_master_id, recalc_slot_status,
)


def _log_notification(cur, schema, *, channel, event_type, recipient, status,
                      subject=None, error_code=None, error_text=None,
                      provider_resp=None, user_id=None, related_id=None, payload=None):
    """Пишет запись в notification_log. Никогда не падает."""
    try:
        def _esc(v):
            if v is None:
                return 'NULL'
            return "'" + str(v).replace("'", "''")[:4000] + "'"
        payload_json = 'NULL'
        if payload is not None:
            try:
                payload_json = "'" + json.dumps(payload, default=str, ensure_ascii=False).replace("'", "''")[:6000] + "'"
            except Exception:
                payload_json = 'NULL'
        cur.execute(f"""
            INSERT INTO {schema}.notification_log
                (channel, event_type, recipient, subject, status,
                 error_code, error_text, provider_resp, payload, user_id, related_id)
            VALUES ({_esc(channel)}, {_esc(event_type)}, {_esc(recipient)}, {_esc(subject)}, {_esc(status)},
                    {_esc(error_code)}, {_esc(error_text)}, {_esc(provider_resp)}, {payload_json}::jsonb,
                    {'NULL' if user_id is None else int(user_id)},
                    {'NULL' if related_id is None else int(related_id)})
        """)
    except Exception:
        pass


def _alert_admin_critical(channel, error_code, error_text, recipient=''):
    """При критических сбоях (401/403/Forbidden) шлёт письмо админу проекта
    и дублирует в Telegram через единый shared.send_email/tg_send.
    """
    subject = f'[Sparcom] Критическая ошибка уведомлений: {channel} {error_code}'
    body_html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 560px; color: #1f2937;">
        <h2 style="color: #dc2626;">Сбой отправки уведомлений</h2>
        <p>Канал: <b>{channel}</b><br/>Код ошибки: <b>{error_code}</b></p>
        <p>Получатель: {recipient or '—'}</p>
        <pre style="background: #f3f4f6; padding: 12px; border-radius: 8px; white-space: pre-wrap;">{error_text}</pre>
        <p style="color: #6b7280; font-size: 13px;">Проверьте секреты UNISENDER_API_KEY / TG_PUBLISH_BOT_TOKEN в админке проекта.</p>
    </div>
    """.strip()
    addr = admin_email()
    if addr:
        send_email(addr, subject, body_html, tags=['admin-alert'])

    # Дублируем админу в Telegram
    admin_chat = os.environ.get('TELEGRAM_CHAT_ID', '')
    if admin_chat:
        text = (
            f'⚠️ <b>Сбой уведомлений</b>\n\n'
            f'Канал: {channel}\nКод: {error_code}\n'
            f'Получатель: {recipient or "—"}\n\n'
            f'<code>{(error_text or "")[:500]}</code>'
        )
        tg_send(admin_chat, text)


def _notify_master_about_booking(cur, schema, master_id, booking, service_name):
    """Отправляет email и Telegram уведомление мастеру о новой брони.
    Все ошибки молча проглатываются — уведомления не должны ломать сам флоу.
    """
    try:
        cur.execute(f"""
            SELECT m.name AS master_name, m.user_id, u.email,
                   la.telegram_user_id AS linked_tg,
                   u.tg_chat_id AS user_tg,
                   COALESCE(u.notify_email, true) AS notify_email,
                   u.notify_telegram AS notify_telegram,
                   COALESCE(mcs.timezone, 'Europe/Moscow') AS master_tz
            FROM {schema}.masters m
            LEFT JOIN {schema}.users u ON u.id = m.user_id
            LEFT JOIN {schema}.master_calendar_settings mcs ON mcs.master_id = m.id
            LEFT JOIN (
                SELECT DISTINCT ON (user_id) user_id, telegram_user_id
                FROM {schema}.tg_linked_accounts
                ORDER BY user_id, linked_at DESC
            ) la ON la.user_id = m.user_id
            WHERE m.id = {int(master_id)}
        """)
        m = cur.fetchone()
        if not m:
            print(f"[notify_master] master_id={master_id} not found")
            return
        print(f"[notify_master] master_id={master_id} email={m.get('email')} linked_tg={m.get('linked_tg')} user_tg={m.get('user_tg')} notify_email={m.get('notify_email')} notify_telegram={m.get('notify_telegram')}")

        client_name = booking.get('client_name', '')
        client_phone = booking.get('client_phone', '')
        client_email = booking.get('client_email', '') or ''
        dt_start = booking.get('datetime_start', '')
        dt_end = booking.get('datetime_end', '')
        price = booking.get('price', 0)
        status = booking.get('status', 'pending')
        comment = booking.get('comment', '') or ''

        # Согласие клиента с противопоказаниями
        contra_accepted = bool(booking.get('contraindications_accepted', False))
        contra_at_raw = booking.get('contraindications_accepted_at')
        contra_ip = booking.get('contraindications_accepted_ip') or ''
        contra_snapshot = booking.get('contraindications_snapshot') or ''
        # Часовой пояс мастера (по умолчанию Москва)
        master_tz_name = m.get('master_tz') or 'Europe/Moscow'
        try:
            from zoneinfo import ZoneInfo
            master_tz = ZoneInfo(master_tz_name)
        except Exception:
            from datetime import timezone, timedelta as _td
            master_tz = timezone(_td(hours=3))  # fallback МСК

        def _to_local_human(raw):
            """Парсит ISO datetime (с TZ или без) и возвращает локальное время мастера в формате '%d.%m.%Y %H:%M'.
            Без TZ → считаем UTC (так Postgres возвращает timestamptz по умолчанию).
            """
            if not raw:
                return ''
            s = str(raw)
            try:
                dtv = datetime.fromisoformat(s.replace('Z', '+00:00'))
                if dtv.tzinfo is None:
                    from datetime import timezone as _tz
                    dtv = dtv.replace(tzinfo=_tz.utc)
                return dtv.astimezone(master_tz).strftime('%d.%m.%Y %H:%M')
            except Exception:
                return s

        contra_at_human = _to_local_human(contra_at_raw)
        dt_human = _to_local_human(dt_start) or str(dt_start)

        status_human = 'подтверждена автоматически' if status == 'confirmed' else 'ожидает подтверждения'

        # === Email ===
        if m.get('notify_email') and m.get('email'):
            if os.environ.get('UNISENDER_API_KEY') and os.environ.get('UNISENDER_SENDER_EMAIL'):
                subject = f'Новая запись: {client_name} на {dt_human}'

                # Блок согласия с противопоказаниями
                contra_block = ''
                if contra_accepted:
                    snapshot_html = ''
                    if contra_snapshot:
                        items = [s.strip() for s in contra_snapshot.split(';') if s.strip()]
                        if items:
                            snapshot_html = (
                                '<ul style="margin: 6px 0 0 18px; padding: 0; color: #6b4f2a; font-size: 12px; line-height: 1.5;">'
                                + ''.join(f'<li>{x}</li>' for x in items)
                                + '</ul>'
                            )
                    ip_html = f' · IP {contra_ip}' if contra_ip else ''
                    when_html = contra_at_human or ''
                    contra_block = f"""
                        <div style="margin-top: 16px; padding: 12px 14px; background: #fff7ed; border: 1px solid #fcd9a8; border-radius: 10px;">
                            <div style="font-size: 13px; font-weight: 600; color: #92400e;">
                                ✓ Клиент подтвердил ознакомление с противопоказаниями
                            </div>
                            <div style="font-size: 12px; color: #92400e; opacity: .85; margin-top: 2px;">
                                {when_html}{ip_html}
                            </div>
                            {snapshot_html}
                        </div>
                    """
                elif service_name:
                    # Если согласия нет — на всякий случай напоминаем мастеру
                    contra_block = """
                        <div style="margin-top: 16px; padding: 10px 12px; background: #f3f4f6; border-radius: 10px; font-size: 12px; color: #6b7280;">
                            Согласие с противопоказаниями не запрашивалось (в карточке услуги они не указаны).
                        </div>
                    """

                body_html = f"""
                <div style="font-family: -apple-system, Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #2d2318;">
                    <div style="background: linear-gradient(135deg,#C8834A,#8FA89A); color: #fff; padding: 24px; border-radius: 16px 16px 0 0;">
                        <h1 style="margin: 0; font-size: 22px;">Новая запись на сеанс</h1>
                        <p style="margin: 6px 0 0; opacity: .9; font-size: 14px;">Запись {status_human}</p>
                    </div>
                    <div style="background: #fff; border: 1px solid #eee; border-top: none; padding: 20px; border-radius: 0 0 16px 16px;">
                        <p style="margin: 0 0 16px; font-size: 15px;">Здравствуйте{', ' + (m.get('master_name') or '') if m.get('master_name') else ''}!</p>
                        <table style="width: 100%; font-size: 14px; line-height: 1.6;">
                            <tr><td style="color: #666; padding: 4px 0;">Услуга:</td><td style="font-weight: 600;">{service_name or '—'}</td></tr>
                            <tr><td style="color: #666; padding: 4px 0;">Время:</td><td style="font-weight: 600;">{dt_human}</td></tr>
                            <tr><td style="color: #666; padding: 4px 0;">Стоимость:</td><td style="font-weight: 600;">{int(float(price))} ₽</td></tr>
                            <tr><td colspan="2" style="padding-top: 12px; border-top: 1px solid #eee;"></td></tr>
                            <tr><td style="color: #666; padding: 4px 0;">Клиент:</td><td style="font-weight: 600;">{client_name}</td></tr>
                            <tr><td style="color: #666; padding: 4px 0;">Телефон:</td><td><a href="tel:{client_phone}" style="color: #C8834A; text-decoration: none;">{client_phone}</a></td></tr>
                            {f'<tr><td style="color: #666; padding: 4px 0;">Email:</td><td><a href="mailto:{client_email}" style="color: #C8834A; text-decoration: none;">{client_email}</a></td></tr>' if client_email else ''}
                            {f'<tr><td style="color: #666; padding: 4px 0; vertical-align: top;">Комментарий:</td><td>{comment}</td></tr>' if comment else ''}
                        </table>
                        {contra_block}
                        <p style="margin: 20px 0 0; font-size: 13px; color: #888;">Управляйте записями в личном кабинете → «Записи».</p>
                    </div>
                </div>
                """.strip()
                ok_sent = send_email(
                    m['email'], subject, body_html,
                    to_name=m.get('master_name') or '',
                    tags=['master-booking-new'],
                )
                if ok_sent:
                    print(f"[notify_master] email sent to {m.get('email')}")
                    _log_notification(cur, schema,
                        channel='email', event_type='master_booking_new',
                        recipient=m.get('email'), subject=subject, status='success',
                        user_id=m.get('user_id'), related_id=booking.get('id'),
                        payload={'master_id': master_id, 'client_name': client_name})
                else:
                    print(f"[notify_master] email send FAILED for {m.get('email')}")
                    _log_notification(cur, schema,
                        channel='email', event_type='master_booking_new',
                        recipient=m.get('email'), subject=subject, status='failed',
                        error_code='send_failed',
                        error_text='shared.send_email returned False',
                        user_id=m.get('user_id'), related_id=booking.get('id'),
                        payload={'master_id': master_id, 'client_name': client_name})
                    _alert_admin_critical('email (Unisender)', 'send_failed',
                                          'shared.send_email returned False',
                                          recipient=m.get('email') or '')

        # === Telegram ===
        # Если у мастера в аккаунте привязан Telegram (через бота организатора)
        # — шлём туда уведомление о записи, как это сделано для событий.
        # Приоритет: запись в tg_linked_accounts (бот точно привязан),
        # запасной вариант — users.tg_chat_id.
        tg_chat_id = m.get('linked_tg') or m.get('user_tg')
        # Уважаем только явный отказ (false). По умолчанию (None) — отправляем,
        # потому что наличие привязки в tg_linked_accounts = пользователь сам подключил бота.
        tg_disabled = m.get('notify_telegram') is False and not m.get('linked_tg')
        if tg_chat_id and not tg_disabled:
            lines = [
                '🎫 <b>Новая запись на сеанс</b>',
                '',
                f'📌 {service_name or "Услуга"}',
                f'📅 {dt_human}',
                f'💰 {int(float(price))} ₽',
                '',
                f'👤 <b>{client_name}</b>',
                f'📞 {client_phone}',
            ]
            if client_email:
                lines.append(f'✉️ {client_email}')
            if comment:
                lines.append(f'💬 {comment}')
            if contra_accepted:
                when = contra_at_human or 'только что'
                ip_part = f' · IP {contra_ip}' if contra_ip else ''
                lines.append('')
                lines.append('✅ <i>Клиент ознакомлен с противопоказаниями</i>')
                lines.append(f'<i>{when}{ip_part}</i>')
            lines.append('')
            lines.append(f'<i>Статус: {status_human}</i>')
            ok_tg = tg_send(tg_chat_id, '\n'.join(lines))
            if ok_tg:
                print(f"[notify_master] telegram sent to chat_id={tg_chat_id}")
                _log_notification(cur, schema,
                    channel='telegram', event_type='master_booking_new',
                    recipient=str(tg_chat_id), subject='Новая запись на сеанс',
                    status='success', user_id=m.get('user_id'),
                    related_id=booking.get('id'),
                    payload={'master_id': master_id, 'client_name': client_name})
            else:
                print(f"[notify_master] telegram FAILED chat_id={tg_chat_id}")
                _log_notification(cur, schema,
                    channel='telegram', event_type='master_booking_new',
                    recipient=str(tg_chat_id), subject='Новая запись на сеанс',
                    status='failed', error_code='send_failed',
                    error_text='shared.tg_send returned False',
                    user_id=m.get('user_id'),
                    related_id=booking.get('id'),
                    payload={'master_id': master_id, 'client_name': client_name})
                _alert_admin_critical('telegram', 'send_failed',
                                      'shared.tg_send returned False',
                                      recipient=str(tg_chat_id or ''))
    except Exception:
        # Любые проблемы с уведомлениями не должны ломать бронь
        pass


def handle_bookings_root(event, method, params, schema, headers):
    """Маршрутизация подресурсов записей: bookings/public-slots/public-book/public-settings/stats/reviews"""
    sub = params.get('sub') or params.get('subresource') or 'bookings'
    if sub == 'bookings':
        return handle_bookings(event, method, params, schema, headers)
    elif sub == 'public-slots':
        return handle_public_slots(event, method, params, schema, headers)
    elif sub == 'public-book':
        return handle_public_book(event, method, params, schema, headers)
    elif sub == 'public-settings':
        return handle_public_settings(event, method, params, schema, headers)
    elif sub == 'stats':
        return handle_stats(event, method, params, schema, headers)
    return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Unknown bookings sub'})}


def handle_public_settings(event, method, params, schema, headers):
    """Публичные настройки мастера для виджета бронирования (буфер, авто-подтверждение)"""
    if method != 'GET':
        return {'statusCode': 405, 'headers': headers, 'body': json.dumps({'error': 'GET only'})}
    master_id = params.get('master_id')
    if not master_id:
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'master_id required'})}

    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute(f"""
        SELECT break_between_slots, prep_time
        FROM {schema}.master_calendar_settings
        WHERE master_id = {int(master_id)}
    """)
    row = cur.fetchone()
    conn.close()

    return {
        'statusCode': 200,
        'headers': headers,
        'body': json.dumps({
            'break_between_slots': (row.get('break_between_slots') if row else 0) or 0,
            'prep_time': (row.get('prep_time') if row else 0) or 0,
        })
    }


def handle_bookings(event, method, params, schema, headers):
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    if method == 'GET':
        master_id, err = require_master_id(params, headers)
        if err:
            conn.close()
            return err
        status_filter = params.get('status')
        date_from = params.get('date_from')
        date_to = params.get('date_to')

        query = f"""
            SELECT b.*, ms.name as service_name, ms.duration_minutes
            FROM {schema}.master_bookings b
            LEFT JOIN {schema}.master_services ms ON b.service_id = ms.id
            WHERE b.master_id = {int(master_id)}
        """
        if status_filter and status_filter != 'all':
            query += f" AND b.status = '{status_filter}'"
        if date_from:
            query += f" AND b.datetime_start >= '{date_from}'"
        if date_to:
            query += f" AND b.datetime_start <= '{date_to}'"
        query += " ORDER BY b.datetime_start DESC"

        cur.execute(query)
        rows = cur.fetchall()
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps(rows, default=str)}

    if method == 'POST':
        body = json.loads(event.get('body', '{}'))
        master_id = body.get('master_id')
        if not master_id:
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'master_id обязателен'})}
        slot_id = body.get('slot_id')
        client_name = body['client_name'].replace("'", "''")
        client_phone = body['client_phone'].replace("'", "''")
        client_email = (body.get('client_email') or '').replace("'", "''")
        service_id = body.get('service_id')
        dt_start = body['datetime_start']
        dt_end = body['datetime_end']
        price = float(body.get('price', 0))
        comment = (body.get('comment') or '').replace("'", "''")
        source = body.get('source', 'admin')
        force = bool(body.get('force', False))

        # Лочим мастера на время транзакции — защита от гонок.
        acquire_master_lock(cur, master_id)

        # Единая валидация: выходные дни, буфер, пересечения, заблокированные слоты.
        # ignore_buffer=True если админ явно подтвердил force (например, ставит впритык).
        problem = validate_booking_create(
            cur, schema, master_id, dt_start, dt_end,
            ignore_buffer=force,
        )
        if problem:
            conn.close()
            return {
                'statusCode': 409,
                'headers': headers,
                'body': json.dumps(problem, default=str, ensure_ascii=False),
            }

        slot_val = f"{int(slot_id)}" if slot_id else "NULL"
        svc_val = f"{int(service_id)}" if service_id else "NULL"

        cur.execute(f"""
            SELECT auto_confirm FROM {schema}.master_calendar_settings
            WHERE master_id = {int(master_id)}
        """)
        settings = cur.fetchone()
        auto_confirm = settings['auto_confirm'] if settings else False
        status = 'confirmed' if auto_confirm else 'pending'

        confirmed_at_val = 'CURRENT_TIMESTAMP' if auto_confirm else 'NULL'
        cur.execute(f"""
            INSERT INTO {schema}.master_bookings
            (slot_id, master_id, client_name, client_phone, client_email, service_id,
             datetime_start, datetime_end, price, status, source, comment,
             confirmed_at)
            VALUES ({slot_val}, {int(master_id)}, '{client_name}', '{client_phone}', '{client_email}',
             {svc_val}, '{dt_start}', '{dt_end}', {price}, '{status}', '{source}', '{comment}',
             {confirmed_at_val})
            RETURNING *
        """)
        booking = cur.fetchone()

        if slot_id:
            # Пересчитываем статус слота по фактическому числу активных броней.
            recalc_slot_status(cur, schema, slot_id)

        conn.commit()

        # Уведомление мастеру (email + Telegram). Сбои не должны ломать бронь.
        svc_name_for_notify = ''
        if service_id:
            try:
                cur.execute(f"SELECT name FROM {schema}.master_services WHERE id = {int(service_id)}")
                _svc = cur.fetchone()
                if _svc:
                    svc_name_for_notify = _svc.get('name') or ''
            except Exception:
                pass
        try:
            _notify_master_about_booking(cur, schema, master_id, dict(booking), svc_name_for_notify)
        except Exception:
            pass

        conn.close()
        return {'statusCode': 201, 'headers': headers, 'body': json.dumps(booking, default=str)}

    if method == 'PUT':
        body = json.loads(event.get('body', '{}'))
        booking_id = int(body['id'])
        action = body.get('action', 'update')

        if action == 'reschedule':
            # Перенос брони на новое время.
            # Валидируем: выходные мастера, пересечения с другими бронями (учитывая буфер),
            # blocked-слоты. Если бронь привязана к слоту, слот двигается синхронно.
            new_start = body.get('datetime_start')
            new_end = body.get('datetime_end')
            if not new_start or not new_end:
                conn.close()
                return {'statusCode': 400, 'headers': headers, 'body': json.dumps({
                    'error': 'missing_datetime',
                    'message': 'datetime_start и datetime_end обязательны',
                })}

            cur.execute(f"""
                SELECT id, master_id, slot_id, datetime_start, datetime_end, status
                FROM {schema}.master_bookings WHERE id = {booking_id}
            """)
            curr_b = cur.fetchone()
            if not curr_b:
                conn.close()
                return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'Бронь не найдена'})}
            if curr_b['status'] in ('canceled', 'completed', 'no_show'):
                conn.close()
                return {'statusCode': 400, 'headers': headers, 'body': json.dumps({
                    'error': 'invalid_status',
                    'message': 'Нельзя перенести завершённую или отменённую запись',
                })}

            master_id = curr_b['master_id']
            acquire_master_lock(cur, master_id)

            problem = validate_booking_create(
                cur, schema, master_id, new_start, new_end,
                exclude_booking_id=booking_id,
            )
            if problem:
                conn.close()
                return {'statusCode': 409, 'headers': headers, 'body': json.dumps(problem, default=str, ensure_ascii=False)}

            # Двигаем саму бронь
            cur.execute(f"""
                UPDATE {schema}.master_bookings SET
                    datetime_start = '{new_start}',
                    datetime_end = '{new_end}',
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = {booking_id}
                RETURNING *
            """)
            row = cur.fetchone()

            # Если есть привязанный слот — двигаем и его (расширяем границы под новое время).
            if curr_b.get('slot_id'):
                cur.execute(f"""
                    UPDATE {schema}.master_slots SET
                        datetime_start = '{new_start}',
                        datetime_end = '{new_end}',
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = {int(curr_b['slot_id'])}
                """)

            conn.commit()
            conn.close()
            return {'statusCode': 200, 'headers': headers, 'body': json.dumps(row, default=str)}

        if action == 'confirm':
            cur.execute(f"""
                UPDATE {schema}.master_bookings SET
                    status = 'confirmed', confirmed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                WHERE id = {int(booking_id)} RETURNING *
            """)
        elif action in ('cancel', 'complete', 'no_show'):
            # Все три статуса завершают активную фазу брони: место в слоте освобождается.
            reason = (body.get('cancel_reason') or '').replace("'", "''")
            if action == 'cancel':
                cur.execute(f"""
                    UPDATE {schema}.master_bookings SET
                        status = 'canceled', canceled_at = CURRENT_TIMESTAMP,
                        cancel_reason = '{reason}', updated_at = CURRENT_TIMESTAMP
                    WHERE id = {int(booking_id)} RETURNING slot_id
                """)
            elif action == 'complete':
                cur.execute(f"""
                    UPDATE {schema}.master_bookings SET
                        status = 'completed', completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                    WHERE id = {int(booking_id)} RETURNING slot_id
                """)
            else:  # no_show
                cur.execute(f"""
                    UPDATE {schema}.master_bookings SET
                        status = 'no_show', updated_at = CURRENT_TIMESTAMP
                    WHERE id = {int(booking_id)} RETURNING slot_id
                """)
            slot_row = cur.fetchone()
            # Пересчитываем статус слота по фактическому числу активных броней
            # (учитывает многоместные слоты — освобождаем только когда никого не осталось).
            if slot_row and slot_row.get('slot_id'):
                recalc_slot_status(cur, schema, slot_row['slot_id'])
            cur.execute(f"SELECT * FROM {schema}.master_bookings WHERE id = {int(booking_id)}")
        else:
            updates = []
            if 'client_name' in body:
                updates.append(f"client_name = '{body['client_name'].replace(chr(39), chr(39)+chr(39))}'")
            if 'client_phone' in body:
                updates.append(f"client_phone = '{body['client_phone'].replace(chr(39), chr(39)+chr(39))}'")
            if 'price' in body:
                updates.append(f"price = {float(body['price'])}")
            if 'comment' in body:
                updates.append(f"comment = '{(body['comment'] or '').replace(chr(39), chr(39)+chr(39))}'")
            if updates:
                updates.append("updated_at = CURRENT_TIMESTAMP")
                cur.execute(f"""
                    UPDATE {schema}.master_bookings SET {', '.join(updates)}
                    WHERE id = {int(booking_id)} RETURNING *
                """)

        row = cur.fetchone()
        conn.commit()
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps(row, default=str)}

    conn.close()
    return {'statusCode': 405, 'headers': headers, 'body': json.dumps({'error': 'Method not allowed'})}


def handle_public_slots(event, method, params, schema, headers):
    """
    Возвращает рабочие интервалы мастера (master_slots со статусом 'available')
    вместе со списком активных бронирований внутри них.
    Свободные «окна» вычисляются на фронте: интервал минус брони минус буфер.
    """
    if method != 'GET':
        return {'statusCode': 405, 'headers': headers, 'body': json.dumps({'error': 'GET only'})}

    master_id, err = require_master_id(params, headers)
    if err:
        return err
    date_from = params.get('date_from')

    if not date_from:
        date_from = datetime.now().strftime('%Y-%m-%d')

    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    # Рабочие интервалы (слоты со статусом 'available' или 'booked' — оба идут под нарезку)
    cur.execute(f"""
        SELECT s.id, s.master_id, s.service_id, s.datetime_start, s.datetime_end,
               s.max_clients, s.booked_count, s.status,
               ms.name as service_name, ms.duration_minutes, ms.price as service_price, ms.description as service_description
        FROM {schema}.master_slots s
        LEFT JOIN {schema}.master_services ms ON s.service_id = ms.id
        WHERE s.master_id = {int(master_id)}
          AND s.status IN ('available', 'booked')
          AND s.datetime_start >= '{date_from}'
          AND s.datetime_start <= '{date_from}'::date + interval '30 days'
        ORDER BY s.datetime_start
    """)
    slots = cur.fetchall()

    # Активные брони мастера в том же диапазоне
    cur.execute(f"""
        SELECT id, slot_id, datetime_start, datetime_end, status
        FROM {schema}.master_bookings
        WHERE master_id = {int(master_id)}
          AND status IN ('pending', 'confirmed')
          AND datetime_start >= '{date_from}'
          AND datetime_start <= '{date_from}'::date + interval '30 days'
    """)
    bookings = cur.fetchall()
    conn.close()

    return {
        'statusCode': 200,
        'headers': headers,
        'body': json.dumps({
            'slots': slots,
            'bookings': bookings,
        }, default=str)
    }


def handle_public_book(event, method, params, schema, headers):
    """
    Бронирование в новой модели «вычисление на лету»:
    - master_slots = рабочие интервалы, НЕ режутся
    - master_bookings = собственно брони, лежат внутри интервалов
    - Доступность проверяется по пересечениям с активными бронями
    """
    if method != 'POST':
        return {'statusCode': 405, 'headers': headers, 'body': json.dumps({'error': 'POST only'})}

    body = json.loads(event.get('body', '{}'))
    slot_id = body['slot_id']
    client_name = body['client_name'].replace("'", "''")
    client_phone = body['client_phone'].replace("'", "''")
    client_email = (body.get('client_email') or '').replace("'", "''")
    comment = (body.get('comment') or '').replace("'", "''")

    req_service_id = body.get('service_id')
    desired_start = body.get('desired_start')
    desired_end = body.get('desired_end')

    # Согласие с противопоказаниями (юр. фиксация)
    contra_accepted = bool(body.get('contraindications_accepted', False))
    contra_snapshot = (body.get('contraindications_snapshot') or '').replace("'", "''")
    client_ip = ''
    try:
        rc = event.get('requestContext') or {}
        client_ip = (rc.get('identity') or {}).get('sourceIp') or ''
    except Exception:
        client_ip = ''
    client_ip = client_ip.replace("'", "''")[:64]

    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    # Сначала получаем master_id из слота (без lock), чтобы поставить advisory lock.
    cur.execute(f"""
        SELECT master_id FROM {schema}.master_slots WHERE id = {int(slot_id)}
    """)
    pre = cur.fetchone()
    if not pre:
        conn.close()
        return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'Интервал не найден'})}

    # Лочим мастера целиком — никто не сможет создать пересекающуюся бронь параллельно.
    acquire_master_lock(cur, pre['master_id'])

    # Теперь лочим сам слот.
    cur.execute(f"""
        SELECT s.*, ms.price as service_price, ms.name as service_name, ms.duration_minutes as svc_duration
        FROM {schema}.master_slots s
        LEFT JOIN {schema}.master_services ms ON s.service_id = ms.id
        WHERE s.id = {int(slot_id)}
          AND s.status IN ('available', 'booked')
        FOR UPDATE OF s
    """)
    slot = cur.fetchone()
    if not slot:
        conn.close()
        return {'statusCode': 409, 'headers': headers, 'body': json.dumps({'error': 'Интервал недоступен'})}

    master_id = slot['master_id']
    booking_service_id = slot['service_id']
    booking_service_name = slot.get('service_name', '')
    booking_price = float(slot.get('service_price') or 0)
    dt_start = slot['datetime_start']
    dt_end = slot['datetime_end']

    # Если интервал универсальный (без услуги) и клиент выбрал услугу — берём её данные
    if not booking_service_id and req_service_id:
        cur.execute(f"""
            SELECT id, name, price, duration_minutes
            FROM {schema}.master_services
            WHERE id = {int(req_service_id)} AND master_id = {int(master_id)} AND is_active = true
        """)
        svc = cur.fetchone()
        if not svc:
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Услуга не найдена'})}
        booking_service_id = svc['id']
        booking_service_name = svc['name']
        booking_price = float(svc['price'] or 0)

        if desired_start and desired_end:
            try:
                ds = datetime.fromisoformat(str(desired_start).replace('Z', ''))
                de = datetime.fromisoformat(str(desired_end).replace('Z', ''))
                slot_s = slot['datetime_start']
                slot_e = slot['datetime_end']
                slot_s_naive = slot_s.replace(tzinfo=None) if hasattr(slot_s, 'tzinfo') and slot_s.tzinfo else slot_s
                slot_e_naive = slot_e.replace(tzinfo=None) if hasattr(slot_e, 'tzinfo') and slot_e.tzinfo else slot_e
                if ds < slot_s_naive or de > slot_e_naive or de <= ds:
                    conn.close()
                    return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Время вне рабочего интервала'})}
                dt_start = ds
                dt_end = de
            except (ValueError, TypeError):
                pass

    # Настройки
    cur.execute(f"""
        SELECT auto_confirm FROM {schema}.master_calendar_settings WHERE master_id = {int(master_id)}
    """)
    settings = cur.fetchone()
    auto_confirm = settings['auto_confirm'] if settings else False
    status = 'confirmed' if auto_confirm else 'pending'

    # Подготовка значений для проверки (поддержка timestamptz/datetime)
    from datetime import timedelta
    dt_start_naive = dt_start.replace(tzinfo=None) if hasattr(dt_start, 'tzinfo') and dt_start.tzinfo else dt_start
    dt_end_naive = dt_end.replace(tzinfo=None) if hasattr(dt_end, 'tzinfo') and dt_end.tzinfo else dt_end

    # Универсальная проверка: выходные, буфер, пересечение с бронями, blocked-слоты.
    problem = validate_booking_create(
        cur, schema, master_id, dt_start_naive, dt_end_naive,
    )
    if problem:
        conn.close()
        return {
            'statusCode': 409,
            'headers': headers,
            'body': json.dumps(problem, default=str, ensure_ascii=False),
        }

    svc_val = f"{int(booking_service_id)}" if booking_service_id else "NULL"
    confirmed_at_val = 'CURRENT_TIMESTAMP' if auto_confirm else 'NULL'
    dt_start_str = str(dt_start)
    dt_end_str = str(dt_end)

    # Поля согласия с противопоказаниями
    contra_accepted_sql = 'TRUE' if contra_accepted else 'FALSE'
    contra_accepted_at_sql = 'CURRENT_TIMESTAMP' if contra_accepted else 'NULL'
    contra_ip_sql = f"'{client_ip}'" if (contra_accepted and client_ip) else 'NULL'
    contra_snapshot_sql = f"'{contra_snapshot}'" if (contra_accepted and contra_snapshot) else 'NULL'

    cur.execute(f"""
        INSERT INTO {schema}.master_bookings
        (slot_id, master_id, client_name, client_phone, client_email, service_id,
         datetime_start, datetime_end, price, status, source, comment,
         confirmed_at,
         contraindications_accepted, contraindications_accepted_at,
         contraindications_accepted_ip, contraindications_snapshot)
        VALUES ({int(slot_id)}, {int(master_id)}, '{client_name}', '{client_phone}', '{client_email}',
         {svc_val}, '{dt_start_str}', '{dt_end_str}', {booking_price}, '{status}', 'public', '{comment}',
         {confirmed_at_val},
         {contra_accepted_sql}, {contra_accepted_at_sql},
         {contra_ip_sql}, {contra_snapshot_sql})
        RETURNING *
    """)
    booking = cur.fetchone()

    # Пересчитываем статус слота по фактическому числу активных броней.
    # Helper сам решит: 'booked' если все места заняты, иначе 'available'.
    recalc_slot_status(cur, schema, slot_id)

    conn.commit()

    # Уведомляем мастера (email + Telegram) — после коммита, чтобы не задерживать транзакцию
    try:
        _notify_master_about_booking(cur, schema, master_id, dict(booking), booking_service_name)
    except Exception:
        pass

    conn.close()

    return {
        'statusCode': 201,
        'headers': headers,
        'body': json.dumps({
            'booking_id': booking['id'],
            'status': status,
            'service_name': booking_service_name,
            'datetime_start': dt_start_str,
            'datetime_end': dt_end_str,
            'price': booking_price
        })
    }


def handle_reviews(event, method, params, schema, headers):
    """Отзывы о мастере: GET — список, POST — создать"""
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    if method == 'GET':
        master_id = params.get('master_id', '1')
        cur.execute(f"""
            SELECT id, master_id, client_name, rating, text, created_at
            FROM {schema}.master_reviews
            WHERE master_id = {int(master_id)} AND is_published = TRUE
            ORDER BY created_at DESC
            LIMIT 50
        """)
        rows = cur.fetchall()
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps(rows, default=str)}

    if method == 'POST':
        body = json.loads(event.get('body', '{}'))
        master_id = int(body.get('master_id', 0))
        client_name = (body.get('client_name') or '').strip().replace("'", "''")
        client_phone = (body.get('client_phone') or '').strip().replace("'", "''")
        rating = int(body.get('rating', 5))
        text = (body.get('text') or '').strip().replace("'", "''")
        booking_id = body.get('booking_id')

        if not master_id or not client_name or not (1 <= rating <= 5):
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Заполните обязательные поля'})}

        cur.execute(f"SELECT id FROM {schema}.masters WHERE id = {master_id}")
        if not cur.fetchone():
            conn.close()
            return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'Мастер не найден'})}

        booking_val = f"{int(booking_id)}" if booking_id else "NULL"
        phone_val = f"'{client_phone}'" if client_phone else "NULL"

        cur.execute(f"""
            INSERT INTO {schema}.master_reviews (master_id, booking_id, client_name, client_phone, rating, text)
            VALUES ({master_id}, {booking_val}, '{client_name}', {phone_val}, {rating}, '{text}')
            RETURNING id, master_id, client_name, rating, text, created_at
        """)
        review = cur.fetchone()

        cur.execute(f"""
            UPDATE {schema}.masters SET
                rating = (
                    SELECT ROUND(AVG(rating)::numeric, 2)
                    FROM {schema}.master_reviews
                    WHERE master_id = {master_id} AND is_published = TRUE
                ),
                reviews_count = (
                    SELECT COUNT(*) FROM {schema}.master_reviews
                    WHERE master_id = {master_id} AND is_published = TRUE
                ),
                updated_at = NOW()
            WHERE id = {master_id}
        """)

        conn.commit()
        conn.close()
        return {'statusCode': 201, 'headers': headers, 'body': json.dumps(review, default=str)}

    conn.close()
    return {'statusCode': 405, 'headers': headers, 'body': json.dumps({'error': 'Method not allowed'})}


def handle_stats(event, method, params, schema, headers):
    if method != 'GET':
        return {'statusCode': 405, 'headers': headers, 'body': json.dumps({'error': 'GET only'})}

    master_id, err = require_master_id(params, headers)
    if err:
        return err
    period = params.get('period', 'month')

    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    if period == 'month':
        interval = "interval '30 days'"
    elif period == 'week':
        interval = "interval '7 days'"
    else:
        interval = "interval '30 days'"

    cur.execute(f"""
        SELECT
            COUNT(*) FILTER (WHERE status = 'completed') as completed_sessions,
            COUNT(*) FILTER (WHERE status IN ('confirmed', 'pending')) as upcoming_sessions,
            COUNT(*) FILTER (WHERE status = 'canceled') as canceled_sessions,
            COUNT(*) as total_sessions,
            COALESCE(SUM(price) FILTER (WHERE status = 'completed'), 0) as total_revenue,
            COALESCE(SUM(price) FILTER (WHERE status IN ('confirmed', 'pending')), 0) as expected_revenue
        FROM {schema}.master_bookings
        WHERE master_id = {int(master_id)}
          AND datetime_start >= CURRENT_DATE - {interval}
    """)
    stats = cur.fetchone()

    cur.execute(f"""
        SELECT COUNT(*) as total_slots,
               COUNT(*) FILTER (WHERE status = 'available' AND booked_count < max_clients) as free_slots,
               COUNT(*) FILTER (WHERE status IN ('booked', 'pending')) as busy_slots
        FROM {schema}.master_slots
        WHERE master_id = {int(master_id)}
          AND datetime_start >= CURRENT_DATE
          AND datetime_start <= CURRENT_DATE + {interval}
          AND status != 'blocked'
    """)
    slot_stats = cur.fetchone()

    occupancy = 0
    if slot_stats['total_slots'] > 0:
        occupancy = round(slot_stats['busy_slots'] / slot_stats['total_slots'] * 100)

    conn.close()

    return {
        'statusCode': 200,
        'headers': headers,
        'body': json.dumps({
            **stats,
            **slot_stats,
            'occupancy_percent': occupancy
        }, default=str)
    }