import json
import os
import threading
import psycopg2.extras
from datetime import datetime
from shared import CORS_HEADERS, get_conn, get_schema, send_email, tg_send, vk_send, admin_email
from booking_validator import (
    acquire_master_lock, validate_booking_create, get_buffer_minutes,
    require_master_id, recalc_slot_status, ensure_master_access,
    check_public_booking_ratelimit,
)
from time_utils import (
    fetch_master_tz, parse_client_dt, to_master_iso, localize_rows,
)
import re as _re
from notify_utils import hub_notify, get_master_user_id, fmt_dt


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


_TPL_VAR_RE = _re.compile(r'\{(\w+)\}')


def _render_template(cur, schema, event_type, channel, field, variables, fallback):
    """Берёт текст канала из центрального шаблона notification_templates и
    подставляет переменные {var}. Если шаблона нет/отключён — вернёт fallback.
    Никогда не падает.
    """
    try:
        cur.execute(f"""
            SELECT bodies, is_active
            FROM {schema}.notification_templates
            WHERE event_type = %s
        """, (event_type,))
        row = cur.fetchone()
        if not row or not row.get('is_active'):
            return fallback
        bodies = row['bodies'] if isinstance(row['bodies'], dict) else json.loads(row['bodies'] or '{}')
        raw = (bodies.get(channel) or {}).get(field)
        if not raw:
            return fallback

        def repl(m):
            v = variables.get(m.group(1))
            return '' if v is None else str(v)
        return _TPL_VAR_RE.sub(repl, raw)
    except Exception:
        return fallback


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
                   u.vk_id AS vk_id,
                   COALESCE(u.notify_vk, false) AS notify_vk,
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
        print(f"[notify_master] master_id={master_id} email={m.get('email')} linked_tg={m.get('linked_tg')} user_tg={m.get('user_tg')} notify_email={m.get('notify_email')} notify_telegram={m.get('notify_telegram')} vk_id={m.get('vk_id')} notify_vk={m.get('notify_vk')}")

        client_name = booking.get('client_name', '')
        client_phone = booking.get('client_phone', '')
        client_email = booking.get('client_email', '') or ''
        dt_start = booking.get('datetime_start', '')
        dt_end = booking.get('datetime_end', '')
        price = booking.get('price', 0)
        status = booking.get('status', 'pending')
        comment = booking.get('comment', '') or ''

        # Место встречи (выезд мастера на дом): адрес + координаты
        meeting_address = (booking.get('meeting_address') or '').strip()
        meeting_lat = booking.get('meeting_latitude')
        meeting_lng = booking.get('meeting_longitude')
        maps_url = ''
        if meeting_lat is not None and meeting_lng is not None:
            maps_url = f'https://yandex.ru/maps/?pt={meeting_lng},{meeting_lat}&z=17&l=map'

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

        # Тип события: новая бронь или перенос (меняет заголовки уведомлений)
        is_reschedule = booking.get('_event') == 'reschedule'
        subject_prefix = 'Перенос записи' if is_reschedule else 'Новая запись'

        # Синтетические VK-адреса не являются реальными почтами — отправлять на них нельзя
        raw_email = m.get('email') or ''
        is_fake_email = raw_email.endswith('.vk.local') or raw_email.endswith('@vk.local')

        # Если мастер вошёл через VK и у него нет реального email — VK-уведомление
        # включаем автоматически, даже если он не нажал галочку вручную
        vk_id = m.get('vk_id')
        notify_vk_effective = m.get('notify_vk') or (bool(vk_id) and is_fake_email)

        # === Telegram ===
        # Шлём ПЕРВЫМ — это самый быстрый и приоритетный канал.
        # Раньше Telegram стоял после Email: медленный ответ Unisender
        # съедал время выполнения функции, и отправка в TG падала по таймауту.
        # Приоритет chat_id: tg_linked_accounts (бот точно привязан),
        # запасной вариант — users.tg_chat_id.
        tg_chat_id = m.get('linked_tg') or m.get('user_tg')
        # Отправляем только если notify_telegram явно не False.
        # None (не задано) → разрешаем, если есть chat_id.
        tg_disabled = m.get('notify_telegram') is False
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
            if meeting_address or maps_url:
                lines.append('')
                if meeting_address:
                    lines.append(f'📍 <b>Выезд:</b> {meeting_address}')
                if maps_url:
                    lines.append(f'🗺 <a href="{maps_url}">Открыть на карте</a>')
            if contra_accepted:
                when = contra_at_human or 'только что'
                ip_part = f' · IP {contra_ip}' if contra_ip else ''
                lines.append('')
                lines.append('✅ <i>Клиент ознакомлен с противопоказаниями</i>')
                lines.append(f'<i>{when}{ip_part}</i>')
            lines.append('')
            lines.append(f'<i>Статус: {status_human}</i>')
            # Богатое авто-сообщение — это fallback. Если админ настроил
            # центральный шаблон (notification_templates) — используем его текст,
            # чтобы тексты редактировались из «Центра уведомлений» без кода.
            tpl_vars = {
                'service_name': service_name or 'Услуга',
                'date': dt_human,
                'time': '',
                'price': int(float(price)) if price else 0,
                'client_name': client_name,
                'client_phone': client_phone,
                'status': status_human,
            }
            tg_text = _render_template(
                cur, schema, 'master_booking_new', 'telegram', 'text',
                tpl_vars, '\n'.join(lines),
            )
            ok_tg = tg_send(tg_chat_id, tg_text)
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

        # === Email ===
        if m.get('notify_email') and raw_email and not is_fake_email:
            if os.environ.get('UNISENDER_API_KEY') and os.environ.get('UNISENDER_SENDER_EMAIL'):
                subject = f'{subject_prefix}: {client_name} на {dt_human}'

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
                            {f'<tr><td colspan="2" style="padding-top: 12px; border-top: 1px solid #eee;"></td></tr>' if meeting_address or maps_url else ''}
                            {f'<tr><td style="color: #666; padding: 4px 0; vertical-align: top;">📍 Адрес выезда:</td><td style="font-weight: 600;">{meeting_address}</td></tr>' if meeting_address else ''}
                            {f'<tr><td style="color: #666; padding: 4px 0;">На карте:</td><td><a href="{maps_url}" style="color: #C8834A; text-decoration: none;">Открыть в Яндекс.Картах →</a></td></tr>' if maps_url else ''}
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

        # === VK ===
        if vk_id and notify_vk_effective:
            vk_lines = [
                f'🎫 Новая запись на сеанс',
                '',
                f'📌 {service_name or "Услуга"}',
                f'📅 {dt_human}',
                f'💰 {int(float(price))} ₽',
                '',
                f'👤 {client_name}',
                f'📞 {client_phone}',
            ]
            if client_email:
                vk_lines.append(f'✉️ {client_email}')
            if comment:
                vk_lines.append(f'💬 {comment}')
            if meeting_address:
                vk_lines.append(f'📍 Выезд: {meeting_address}')
            if maps_url:
                vk_lines.append(f'🗺 На карте: {maps_url}')
            vk_lines.append('')
            vk_lines.append(f'Статус: {status_human}')
            ok_vk = vk_send(vk_id, '\n'.join(vk_lines))
            _log_notification(cur, schema,
                channel='vk', event_type='master_booking_new',
                recipient=str(vk_id), subject='Новая запись на сеанс',
                status='success' if ok_vk else 'failed',
                error_code=None if ok_vk else 'send_failed',
                user_id=m.get('user_id'), related_id=booking.get('id'),
                payload={'master_id': master_id, 'client_name': client_name})

    except Exception:
        # Любые проблемы с уведомлениями не должны ломать бронь
        pass


def _notify_client_about_cancellation(cur, schema, master_id, booking, cancel_reason=''):
    """Шлёт клиенту email об отмене брони мастером.
    Все ошибки молча проглатываются — флоу cancel не должен ломаться от уведомлений.
    """
    try:
        client_email = (booking.get('client_email') or '').strip()
        client_name = (booking.get('client_name') or '').strip() or 'клиент'
        if not client_email:
            return
        if not (os.environ.get('UNISENDER_API_KEY') and os.environ.get('UNISENDER_SENDER_EMAIL')):
            return

        # Берём имя мастера и его TZ для красивого формата даты
        cur.execute(f"""
            SELECT m.name AS master_name, m.slug,
                   COALESCE(mcs.timezone, 'Europe/Moscow') AS tz
            FROM {schema}.masters m
            LEFT JOIN {schema}.master_calendar_settings mcs ON mcs.master_id = m.id
            WHERE m.id = {int(master_id)}
        """)
        m = cur.fetchone() or {}
        master_name = m.get('master_name') or 'мастер'
        master_slug = m.get('slug') or ''
        tz_name = m.get('tz') or 'Europe/Moscow'

        try:
            from zoneinfo import ZoneInfo
            local_tz = ZoneInfo(tz_name)
        except Exception:
            from datetime import timezone as _tz, timedelta as _td
            local_tz = _tz(_td(hours=3))

        dt_raw = booking.get('datetime_start')
        try:
            dtv = datetime.fromisoformat(str(dt_raw).replace('Z', '+00:00'))
            if dtv.tzinfo is None:
                from datetime import timezone as _tz
                dtv = dtv.replace(tzinfo=_tz.utc)
            dt_human = dtv.astimezone(local_tz).strftime('%d.%m.%Y в %H:%M')
        except Exception:
            dt_human = str(dt_raw)

        reason_block = ''
        if cancel_reason:
            reason_block = (
                f'<p style="margin: 16px 0; padding: 12px 14px; background: #fff7ed; '
                f'border: 1px solid #fcd9a8; border-radius: 10px; color: #92400e;">'
                f'<b>Причина:</b> {cancel_reason}</p>'
            )

        base = (os.environ.get('SITE_URL') or 'https://sparcom.ru').rstrip('/')
        rebook_block = ''
        if master_slug:
            link = f'{base}/master/{master_slug}'
            rebook_block = (
                f'<p style="margin-top: 20px;"><a href="{link}" '
                f'style="display: inline-block; padding: 10px 18px; background: #0ea5e9; '
                f'color: #fff; border-radius: 8px; text-decoration: none;">Выбрать другое время</a></p>'
            )

        # Ссылка на личный чат с мастером (по персональному токену брони)
        chat_block = ''
        reply_token = booking.get('reply_token')
        if reply_token:
            chat_link = f'{base}/m/{reply_token}'
            chat_block = (
                f'<p style="margin-top: 12px;"><a href="{chat_link}" '
                f'style="display: inline-block; padding: 10px 18px; background: #f1f5f9; '
                f'color: #0f172a; border: 1px solid #cbd5e1; border-radius: 8px; '
                f'text-decoration: none;">Написать мастеру</a></p>'
            )

        subject = f'Отмена записи на {dt_human}'
        body_html = f"""
        <div style="font-family: -apple-system, Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #2d2318;">
            <h2 style="color: #0f172a;">Здравствуйте, {client_name}!</h2>
            <p>К сожалению, ваша запись к мастеру <b>{master_name}</b> на <b>{dt_human}</b> была отменена.</p>
            {reason_block}
            <p>Приносим извинения за неудобства.</p>
            {rebook_block}
            {chat_block}
        </div>
        """.strip()

        ok = send_email(client_email, subject, body_html, tags=['booking-cancel'])
        _log_notification(cur, schema,
            channel='email', event_type='client_booking_canceled',
            recipient=client_email, subject=subject,
            status='success' if ok else 'failed',
            related_id=booking.get('id'),
            payload={'master_id': master_id, 'client_name': client_name})
    except Exception:
        pass


def _notify_client_about_confirmation(cur, schema, master_id, booking):
    """Шлёт клиенту email о подтверждении брони мастером + ссылку на чат.
    Ошибки молча проглатываются — флоу confirm не должен ломаться.
    """
    try:
        client_email = (booking.get('client_email') or '').strip()
        client_name = (booking.get('client_name') or '').strip() or 'клиент'
        if not client_email:
            return
        if not (os.environ.get('UNISENDER_API_KEY') and os.environ.get('UNISENDER_SENDER_EMAIL')):
            return

        cur.execute(f"""
            SELECT m.name AS master_name,
                   COALESCE(mcs.timezone, 'Europe/Moscow') AS tz
            FROM {schema}.masters m
            LEFT JOIN {schema}.master_calendar_settings mcs ON mcs.master_id = m.id
            WHERE m.id = {int(master_id)}
        """)
        m = cur.fetchone() or {}
        master_name = m.get('master_name') or 'мастер'
        tz_name = m.get('tz') or 'Europe/Moscow'

        try:
            from zoneinfo import ZoneInfo
            local_tz = ZoneInfo(tz_name)
        except Exception:
            from datetime import timezone as _tz, timedelta as _td
            local_tz = _tz(_td(hours=3))

        dt_raw = booking.get('datetime_start')
        try:
            dtv = datetime.fromisoformat(str(dt_raw).replace('Z', '+00:00'))
            if dtv.tzinfo is None:
                from datetime import timezone as _tz
                dtv = dtv.replace(tzinfo=_tz.utc)
            dt_human = dtv.astimezone(local_tz).strftime('%d.%m.%Y в %H:%M')
        except Exception:
            dt_human = str(dt_raw)

        base = (os.environ.get('SITE_URL') or 'https://sparcom.ru').rstrip('/')
        chat_block = ''
        reply_token = booking.get('reply_token')
        if reply_token:
            chat_link = f'{base}/m/{reply_token}'
            chat_block = (
                f'<p style="margin-top: 20px;"><a href="{chat_link}" '
                f'style="display: inline-block; padding: 10px 18px; background: #0ea5e9; '
                f'color: #fff; border-radius: 8px; text-decoration: none;">Написать мастеру</a></p>'
            )

        subject = f'Запись на {dt_human} подтверждена'
        body_html = f"""
        <div style="font-family: -apple-system, Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #2d2318;">
            <h2 style="color: #0f172a;">Здравствуйте, {client_name}!</h2>
            <p>Мастер <b>{master_name}</b> подтвердил вашу запись на <b>{dt_human}</b>.</p>
            <p>Если нужно уточнить детали встречи — напишите мастеру в чат.</p>
            {chat_block}
        </div>
        """.strip()

        ok = send_email(client_email, subject, body_html, tags=['booking-confirm'])
        _log_notification(cur, schema,
            channel='email', event_type='client_booking_confirmed',
            recipient=client_email, subject=subject,
            status='success' if ok else 'failed',
            related_id=booking.get('id'),
            payload={'master_id': master_id, 'client_name': client_name})
    except Exception:
        pass


def _notify_client_about_new_booking(cur, schema, master_id, booking, service_name=''):
    """Шлёт клиенту email-подтверждение сразу после создания записи.
    Текст зависит от статуса: confirmed (подтверждена) или pending (ожидает подтверждения).
    Ошибки молча проглатываются — флоу создания брони не должен ломаться.
    """
    try:
        client_email = (booking.get('client_email') or '').strip()
        client_name = (booking.get('client_name') or '').strip() or 'клиент'
        if not client_email or client_email.endswith('.vk.local') or client_email.endswith('@vk.local'):
            return
        if not (os.environ.get('UNISENDER_API_KEY') and os.environ.get('UNISENDER_SENDER_EMAIL')):
            return

        cur.execute(f"""
            SELECT m.name AS master_name,
                   COALESCE(mcs.timezone, 'Europe/Moscow') AS tz
            FROM {schema}.masters m
            LEFT JOIN {schema}.master_calendar_settings mcs ON mcs.master_id = m.id
            WHERE m.id = {int(master_id)}
        """)
        m = cur.fetchone() or {}
        master_name = m.get('master_name') or 'мастер'
        tz_name = m.get('tz') or 'Europe/Moscow'

        try:
            from zoneinfo import ZoneInfo
            local_tz = ZoneInfo(tz_name)
        except Exception:
            from datetime import timezone as _tz, timedelta as _td
            local_tz = _tz(_td(hours=3))

        dt_raw = booking.get('datetime_start')
        try:
            dtv = datetime.fromisoformat(str(dt_raw).replace('Z', '+00:00'))
            if dtv.tzinfo is None:
                from datetime import timezone as _tz
                dtv = dtv.replace(tzinfo=_tz.utc)
            dt_human = dtv.astimezone(local_tz).strftime('%d.%m.%Y в %H:%M')
        except Exception:
            dt_human = str(dt_raw)

        status = booking.get('status', 'pending')
        is_confirmed = status == 'confirmed'

        base = (os.environ.get('SITE_URL') or 'https://sparcom.ru').rstrip('/')
        chat_block = ''
        reply_token = booking.get('reply_token')
        if reply_token:
            chat_link = f'{base}/m/{reply_token}'
            chat_block = (
                f'<p style="margin-top: 20px;"><a href="{chat_link}" '
                f'style="display: inline-block; padding: 10px 18px; background: #0ea5e9; '
                f'color: #fff; border-radius: 8px; text-decoration: none;">Написать мастеру</a></p>'
            )

        svc_block = f'<p style="color: #6b7280;">Услуга: <b>{service_name}</b></p>' if service_name else ''

        if is_confirmed:
            subject = f'Запись на {dt_human} принята'
            status_text = f'Ваша запись к мастеру <b>{master_name}</b> на <b>{dt_human}</b> принята и подтверждена.'
        else:
            subject = f'Заявка на {dt_human} принята'
            status_text = (
                f'Ваша заявка на запись к мастеру <b>{master_name}</b> на <b>{dt_human}</b> принята '
                f'и ожидает подтверждения мастером. Мы пришлём вам письмо, как только мастер её подтвердит.'
            )

        body_html = f"""
        <div style="font-family: -apple-system, Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #2d2318;">
            <h2 style="color: #0f172a;">Здравствуйте, {client_name}!</h2>
            <p>{status_text}</p>
            {svc_block}
            {chat_block}
        </div>
        """.strip()

        ok = send_email(client_email, subject, body_html, tags=['booking-new-client'])
        _log_notification(cur, schema,
            channel='email', event_type='client_booking_created',
            recipient=client_email, subject=subject,
            status='success' if ok else 'failed',
            related_id=booking.get('id'),
            payload={'master_id': master_id, 'client_name': client_name, 'booking_status': status})
    except Exception:
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
    """Публичные настройки мастера для виджета бронирования (буфер, авто-подтверждение, часовой пояс)"""
    if method != 'GET':
        return {'statusCode': 405, 'headers': headers, 'body': json.dumps({'error': 'GET only'})}
    master_id = params.get('master_id')
    if not master_id:
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'master_id required'})}

    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute(f"""
        SELECT break_between_slots, prep_time, timezone
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
            'timezone': (row.get('timezone') if row else None) or 'Europe/Moscow',
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
              AND b.archived_at IS NULL
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
        bk_tz = fetch_master_tz(cur, schema, master_id)
        conn.close()
        localize_rows(rows, bk_tz)
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
        # Канон времени: «голую» строку трактуем как зону мастера, сохраняем с offset.
        adm_tz = fetch_master_tz(cur, schema, master_id)
        try:
            dt_start = to_master_iso(parse_client_dt(body['datetime_start'], adm_tz), adm_tz)
            dt_end = to_master_iso(parse_client_dt(body['datetime_end'], adm_tz), adm_tz)
        except (ValueError, TypeError, KeyError):
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({
                'error': 'invalid_datetime', 'message': 'Неверный формат времени'
            }, ensure_ascii=False)}
        price = float(body.get('price', 0))
        comment = (body.get('comment') or '').replace("'", "''")
        source = body.get('source', 'admin')
        force = bool(body.get('force', False))
        # Место встречи (для выездных услуг)
        meeting_address = (body.get('meeting_address') or '').strip()[:500].replace("'", "''")
        _m_lat = body.get('meeting_latitude')
        _m_lng = body.get('meeting_longitude')
        try:
            _m_lat = float(_m_lat) if _m_lat is not None else None
            _m_lng = float(_m_lng) if _m_lng is not None else None
        except (TypeError, ValueError):
            _m_lat = _m_lng = None
        meeting_address_sql = f"'{meeting_address}'" if meeting_address else 'NULL'
        meeting_lat_sql = f"{_m_lat}" if _m_lat is not None else 'NULL'
        meeting_lng_sql = f"{_m_lng}" if _m_lng is not None else 'NULL'

        # Проверяем, что админ имеет право создавать бронь у этого мастера.
        ok, err_resp = ensure_master_access(cur, schema, event, master_id, headers)
        if not ok:
            conn.close()
            return err_resp

        # Лочим мастера на время транзакции — защита от гонок.
        acquire_master_lock(cur, master_id, schema)

        # Единая валидация: выходные дни, буфер, пересечения, заблокированные слоты,
        # и опционально — попадание в рабочий слот (если нет slot_id).
        problem = validate_booking_create(
            cur, schema, master_id, dt_start, dt_end,
            ignore_buffer=force,
            require_within_slot=(not slot_id),
        )

        # Мастер создаёт бронь вручную на время, где ещё нет рабочего слота —
        # не блокируем, а автоматически создаём рабочий слот под это время и
        # привязываем к нему бронь. Прочие конфликты (выходной, занятость,
        # блокировка) остаются ошибками.
        if problem and problem.get('error') == 'outside_working_hours' and not slot_id:
            auto_max_clients = 1
            try:
                cur.execute(f"""
                    INSERT INTO {schema}.master_slots
                    (master_id, service_id, datetime_start, datetime_end,
                     max_clients, status, source, notes)
                    VALUES ({int(master_id)},
                            {f"{int(service_id)}" if service_id else "NULL"},
                            '{dt_start}', '{dt_end}',
                            {auto_max_clients}, 'available', 'manual',
                            'Создан автоматически под ручную бронь')
                    RETURNING id
                """)
                new_slot = cur.fetchone()
                slot_id = new_slot['id'] if new_slot else None
                problem = None
            except Exception:
                conn.rollback()
                conn.close()
                return {
                    'statusCode': 500,
                    'headers': headers,
                    'body': json.dumps({
                        'error': 'slot_autocreate_failed',
                        'message': 'Не удалось создать рабочий слот под бронь',
                    }, ensure_ascii=False),
                }

        if problem:
            conn.close()
            return {
                'statusCode': 409,
                'headers': headers,
                'body': json.dumps(problem, default=str, ensure_ascii=False),
            }

        slot_val = f"{int(slot_id)}" if slot_id else "NULL"
        svc_val = f"{int(service_id)}" if service_id else "NULL"

        # Если место встречи не задано вручную, но к слоту привязан адрес мастера —
        # фиксируем его в брони (та же логика, что и в публичном бронировании).
        if not meeting_address and slot_id:
            cur.execute(f"""
                SELECT a.address_text, a.latitude, a.longitude
                FROM {schema}.master_slots s
                JOIN {schema}.master_addresses a ON a.id = s.address_id
                WHERE s.id = {int(slot_id)}
            """)
            _sa = cur.fetchone()
            if _sa:
                meeting_address = (_sa.get('address_text') or '').strip()[:500].replace("'", "''")
                meeting_address_sql = f"'{meeting_address}'" if meeting_address else 'NULL'
                if _sa.get('latitude') is not None:
                    meeting_lat_sql = f"{float(_sa['latitude'])}"
                if _sa.get('longitude') is not None:
                    meeting_lng_sql = f"{float(_sa['longitude'])}"

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
             confirmed_at,
             meeting_address, meeting_latitude, meeting_longitude)
            VALUES ({slot_val}, {int(master_id)}, '{client_name}', '{client_phone}', '{client_email}',
             {svc_val}, '{dt_start}', '{dt_end}', {price}, '{status}', '{source}', '{comment}',
             {confirmed_at_val},
             {meeting_address_sql}, {meeting_lat_sql}, {meeting_lng_sql})
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

        # Уведомление мастеру через hub: master_booking_new (с учётом подписок)
        try:
            _uid = get_master_user_id(cur, schema, master_id)
            if _uid:
                _bdate, _btime = fmt_dt(booking.get('datetime_start'))
                hub_notify('master_booking_new', user_id=_uid, related_id=booking.get('id'), owner_id=_uid,
                           block=True,
                           variables={
                               'client_name': booking.get('client_name', ''),
                               'service_name': svc_name_for_notify,
                               'date': _bdate, 'time': _btime,
                               'master_name': '',
                           })
        except Exception:
            pass

        # Email/Telegram/VK уведомления — в фоновом потоке, чтобы не блокировать ответ
        _booking_snap = dict(booking)
        _svc_snap = svc_name_for_notify
        _schema_snap = schema
        _mid_snap = master_id

        def _bg_notify():
            try:
                _c = get_conn()
                _cur = _c.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
                try:
                    _notify_master_about_booking(_cur, _schema_snap, _mid_snap, _booking_snap, _svc_snap)
                except Exception:
                    pass
                try:
                    _notify_client_about_new_booking(_cur, _schema_snap, _mid_snap, _booking_snap, _svc_snap)
                except Exception:
                    pass
                _c.commit()
                _c.close()
            except Exception:
                pass

        threading.Thread(target=_bg_notify, daemon=True).start()

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

            # Канон времени: строку без offset трактуем как зону мастера и
            # сохраняем как ISO с явным offset (как в create). Иначе при прямой
            # вставке timestamptz Postgres использует зону сессии БД → сдвиг.
            resch_tz = fetch_master_tz(cur, schema, master_id)
            try:
                new_start = to_master_iso(parse_client_dt(new_start, resch_tz), resch_tz)
                new_end = to_master_iso(parse_client_dt(new_end, resch_tz), resch_tz)
            except (ValueError, TypeError):
                conn.close()
                return {'statusCode': 400, 'headers': headers, 'body': json.dumps({
                    'error': 'invalid_datetime', 'message': 'Неверный формат времени'
                }, ensure_ascii=False)}

            # Проверяем доступ — кто может переносить бронь у этого мастера.
            ok, err_resp = ensure_master_access(cur, schema, event, master_id, headers)
            if not ok:
                conn.close()
                return err_resp

            acquire_master_lock(cur, master_id, schema)

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

            # Уведомление мастеру о переносе записи.
            try:
                svc_name = ''
                if row.get('service_id'):
                    cur.execute(f"SELECT name FROM {schema}.master_services WHERE id = {int(row['service_id'])}")
                    _svc = cur.fetchone()
                    if _svc:
                        svc_name = _svc.get('name') or ''
                notify_payload = dict(row)
                # Маркер для шаблона письма — это перенос, а не новая запись
                notify_payload['_event'] = 'reschedule'
                _notify_master_about_booking(cur, schema, master_id, notify_payload, svc_name)
            except Exception:
                pass

            # Уведомление через hub: booking_rescheduled
            try:
                _uid = get_master_user_id(cur, schema, master_id)
                if _uid:
                    _old_date, _old_time = fmt_dt(curr_b.get('datetime_start'))
                    _new_date, _new_time = fmt_dt(row.get('datetime_start'))
                    hub_notify('booking_rescheduled', user_id=_uid, related_id=booking_id, owner_id=_uid,
                               block=True,
                               variables={
                                   'client_name': row.get('client_name', ''),
                                   'service_name': svc_name,
                                   'old_date': _old_date, 'old_time': _old_time,
                                   'new_date': _new_date, 'new_time': _new_time,
                               })
            except Exception:
                pass

            conn.close()
            return {'statusCode': 200, 'headers': headers, 'body': json.dumps(row, default=str)}

        if action == 'confirm':
            cur.execute(f"""
                UPDATE {schema}.master_bookings SET
                    status = 'confirmed', confirmed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                WHERE id = {int(booking_id)} RETURNING *
            """)
            confirmed_row = cur.fetchone()
            if confirmed_row:
                _cr = dict(confirmed_row)
                try:
                    _notify_client_about_confirmation(
                        cur, schema, _cr['master_id'], _cr,
                    )
                except Exception:
                    pass
                # Уведомление мастеру через hub: booking_confirmed
                try:
                    _uid = get_master_user_id(cur, schema, _cr['master_id'])
                    if _uid:
                        _svc_name = ''
                        if _cr.get('service_id'):
                            cur.execute(f"SELECT name FROM {schema}.master_services WHERE id = {int(_cr['service_id'])}")
                            _s = cur.fetchone()
                            if _s:
                                _svc_name = _s.get('name') or ''
                        _bdate, _btime = fmt_dt(_cr.get('datetime_start'))
                        hub_notify('booking_confirmed', user_id=_uid, related_id=booking_id, owner_id=_uid,
                                   block=True,
                                   variables={
                                       'client_name': _cr.get('client_name', ''),
                                       'service_name': _svc_name,
                                       'date': _bdate, 'time': _btime,
                                       'master_name': '',
                                   })
                except Exception:
                    pass
                # Возвращаем курсор к строке для общего return ниже
                cur.execute(f"SELECT * FROM {schema}.master_bookings WHERE id = {int(booking_id)}")
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
            # Уведомление клиента при отмене мастером (для completed/no_show не нужно).
            if action == 'cancel':
                try:
                    canceled_booking = cur.fetchone()
                    if canceled_booking:
                        _cb = dict(canceled_booking)
                        _notify_client_about_cancellation(
                            cur, schema, _cb['master_id'], _cb,
                            body.get('cancel_reason') or '',
                        )
                        # Уведомление мастеру через hub: booking_cancelled
                        try:
                            _uid = get_master_user_id(cur, schema, _cb['master_id'])
                            if _uid:
                                _svc_name = ''
                                if _cb.get('service_id'):
                                    cur.execute(f"SELECT name FROM {schema}.master_services WHERE id = {int(_cb['service_id'])}")
                                    _s = cur.fetchone()
                                    if _s:
                                        _svc_name = _s.get('name') or ''
                                _bdate, _btime = fmt_dt(_cb.get('datetime_start'))
                                hub_notify('booking_cancelled', user_id=_uid, related_id=booking_id, owner_id=_uid,
                                           block=True,
                                           variables={
                                               'client_name': _cb.get('client_name', ''),
                                               'service_name': _svc_name,
                                               'date': _bdate, 'time': _btime,
                                               'master_name': '',
                                           })
                        except Exception:
                            pass
                    # Возвращаем курсор на нужную запись для return ниже
                    cur.execute(f"SELECT * FROM {schema}.master_bookings WHERE id = {int(booking_id)}")
                except Exception:
                    pass
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
               ms.name as service_name, ms.duration_minutes, ms.price as service_price, ms.description as service_description,
               s.address_id,
               a.address_text as slot_address,
               a.latitude as slot_latitude,
               a.longitude as slot_longitude
        FROM {schema}.master_slots s
        LEFT JOIN {schema}.master_services ms ON s.service_id = ms.id
        LEFT JOIN {schema}.master_addresses a ON s.address_id = a.id
        WHERE s.master_id = {int(master_id)}
          AND s.status IN ('available', 'booked')
          AND s.datetime_start >= '{date_from}'
          AND s.datetime_start <= '{date_from}'::date + interval '30 days'
        ORDER BY s.datetime_start
    """)
    slots = cur.fetchall()
    for s in slots:
        if s.get('slot_latitude') is not None:
            s['slot_latitude'] = float(s['slot_latitude'])
        if s.get('slot_longitude') is not None:
            s['slot_longitude'] = float(s['slot_longitude'])

    # Активные брони мастера в том же диапазоне
    cur.execute(f"""
        SELECT id, slot_id, datetime_start, datetime_end, status
        FROM {schema}.master_bookings
        WHERE master_id = {int(master_id)}
          AND archived_at IS NULL
          AND status IN ('pending', 'confirmed')
          AND datetime_start >= '{date_from}'
          AND datetime_start <= '{date_from}'::date + interval '30 days'
    """)
    bookings = cur.fetchall()

    # Канон времени: отдаём в таймзоне мастера с явным offset (см. time_utils).
    master_tz = fetch_master_tz(cur, schema, master_id)
    conn.close()
    localize_rows(slots, master_tz)
    localize_rows(bookings, master_tz)

    return {
        'statusCode': 200,
        'headers': headers,
        'body': json.dumps({
            'slots': slots,
            'bookings': bookings,
            'timezone': master_tz,
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

    try:
        body = json.loads(event.get('body') or '{}')
    except (ValueError, TypeError):
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({
            'error': 'invalid_json', 'message': 'Тело запроса должно быть JSON'
        }, ensure_ascii=False)}

    # --- Валидация обязательных полей ---
    def _need(field, label, max_len=200):
        raw = body.get(field)
        if not raw or not str(raw).strip():
            return None, {
                'statusCode': 400, 'headers': headers,
                'body': json.dumps({'error': 'missing_field', 'field': field,
                                    'message': f'{label} обязательно'}, ensure_ascii=False),
            }
        v = str(raw).strip()[:max_len]
        return v.replace("'", "''"), None

    try:
        slot_id = int(body.get('slot_id'))
    except (TypeError, ValueError):
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({
            'error': 'missing_slot', 'message': 'slot_id обязателен'
        }, ensure_ascii=False)}

    client_name, err = _need('client_name', 'Имя', 80)
    if err: return err
    client_phone_raw, err = _need('client_phone', 'Телефон', 32)
    if err: return err

    # Анти-инъекция: имя — только буквы/пробелы/дефисы/точки.
    if not _re.match(r"^[\w\s\-\.А-яЁё']{1,80}$", client_name, _re.UNICODE):
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({
            'error': 'invalid_name', 'message': 'Имя содержит недопустимые символы'
        }, ensure_ascii=False)}

    # Телефон: оставляем только цифры и +. Минимум 7 цифр.
    phone_digits = _re.sub(r"[^\d+]", '', client_phone_raw)
    if len(_re.sub(r"\D", '', phone_digits)) < 7:
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({
            'error': 'invalid_phone', 'message': 'Введите корректный телефон'
        }, ensure_ascii=False)}
    client_phone = phone_digits.replace("'", "''")[:32]

    # Email опциональный, но если есть — валидируем.
    client_email_raw = (body.get('client_email') or '').strip()[:120]
    if client_email_raw and not _re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", client_email_raw):
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({
            'error': 'invalid_email', 'message': 'Введите корректный email'
        }, ensure_ascii=False)}
    client_email = client_email_raw.replace("'", "''")

    comment = (body.get('comment') or '').strip()[:500].replace("'", "''")

    req_service_id = body.get('service_id')
    if req_service_id is not None:
        try:
            req_service_id = int(req_service_id)
        except (TypeError, ValueError):
            req_service_id = None

    desired_start = body.get('desired_start')
    desired_end = body.get('desired_end')

    # Место встречи (для выездных услуг «Пригласить в гости»)
    meeting_address = (body.get('meeting_address') or '').strip()[:500].replace("'", "''")
    meeting_lat = body.get('meeting_latitude')
    meeting_lng = body.get('meeting_longitude')
    try:
        meeting_lat = float(meeting_lat) if meeting_lat is not None else None
        meeting_lng = float(meeting_lng) if meeting_lng is not None else None
    except (TypeError, ValueError):
        meeting_lat = meeting_lng = None

    # Согласие с противопоказаниями (юр. фиксация)
    contra_accepted = bool(body.get('contraindications_accepted', False))
    contra_snapshot = (body.get('contraindications_snapshot') or '')[:2000].replace("'", "''")
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

    # Rate-limit: защита от спама с одного IP (или IP+телефон).
    # Считаем по IP — даже если бот меняет телефон, IP остаётся.
    ok_rl, rl_err = check_public_booking_ratelimit(
        cur, schema, event, pre['master_id'],
        extra_key='',  # глобальный лимит по IP, не привязан к телефону
    )
    if not ok_rl:
        conn.commit()  # фиксируем счётчик попыток
        conn.close()
        return rl_err

    # Мастер должен быть активным и не скрытым владельцем — иначе бронь невозможна.
    cur.execute(f"""
        SELECT id, is_active, is_verified, hidden_by_owner
        FROM {schema}.masters WHERE id = {int(pre['master_id'])}
    """)
    m_check = cur.fetchone()
    if (not m_check
        or not m_check.get('is_active')
        or m_check.get('hidden_by_owner')):
        conn.close()
        return {'statusCode': 404, 'headers': headers, 'body': json.dumps({
            'error': 'master_unavailable', 'message': 'Мастер недоступен для бронирования'
        }, ensure_ascii=False)}

    # Лочим мастера целиком — никто не сможет создать пересекающуюся бронь параллельно.
    acquire_master_lock(cur, pre['master_id'], schema)

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

    # Парсим клиентское desired_start/end ВСЕГДА (не только для слотов без услуги).
    # КАНОН ВРЕМЕНИ: если фронт прислал строку БЕЗ offset — это время МАСТЕРА,
    # а не UTC (раньше тут вешался UTC, из-за чего бронь «уезжала» на +3 часа).
    if desired_start and desired_end:
        from datetime import timezone as _tz
        booking_master_tz = fetch_master_tz(cur, schema, master_id)
        def _to_utc_naive(v):
            if hasattr(v, 'tzinfo') and v.tzinfo:
                return v.astimezone(_tz.utc).replace(tzinfo=None)
            return v
        try:
            ds = parse_client_dt(desired_start, booking_master_tz)
            de = parse_client_dt(desired_end, booking_master_tz)
            ds_n = _to_utc_naive(ds)
            de_n = _to_utc_naive(de)
            slot_s_n = _to_utc_naive(slot['datetime_start'])
            slot_e_n = _to_utc_naive(slot['datetime_end'])
            if de_n <= ds_n:
                conn.close()
                return {'statusCode': 400, 'headers': headers, 'body': json.dumps({
                    'error': 'invalid_range', 'message': 'Конец брони должен быть позже начала'
                }, ensure_ascii=False)}
            if ds_n < slot_s_n or de_n > slot_e_n:
                conn.close()
                return {'statusCode': 400, 'headers': headers, 'body': json.dumps({
                    'error': 'outside_slot', 'message': 'Выбранное время выходит за пределы рабочего интервала'
                }, ensure_ascii=False)}
            # Используем aware-версию для записи в БД (Postgres сам приведёт к timestamptz)
            dt_start = ds if ds.tzinfo else ds.replace(tzinfo=_tz.utc)
            dt_end = de if de.tzinfo else de.replace(tzinfo=_tz.utc)
        except (ValueError, TypeError):
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({
                'error': 'invalid_datetime', 'message': 'Неверный формат времени'
            }, ensure_ascii=False)}

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

    # Если клиент не указал своё место встречи, но к слоту привязан адрес мастера
    # (студия/салон/партнёрская точка) — фиксируем этот адрес в брони, чтобы
    # клиент видел, куда приходить, а мастер — где принимать.
    if not meeting_address and slot.get('address_id'):
        cur.execute(f"""
            SELECT address_text, latitude, longitude
            FROM {schema}.master_addresses WHERE id = {int(slot['address_id'])}
        """)
        slot_addr = cur.fetchone()
        if slot_addr:
            meeting_address = (slot_addr.get('address_text') or '').strip()[:500].replace("'", "''")
            if slot_addr.get('latitude') is not None:
                meeting_lat = float(slot_addr['latitude'])
            if slot_addr.get('longitude') is not None:
                meeting_lng = float(slot_addr['longitude'])

    meeting_address_sql = f"'{meeting_address}'" if meeting_address else 'NULL'
    meeting_lat_sql = f"{meeting_lat}" if meeting_lat is not None else 'NULL'
    meeting_lng_sql = f"{meeting_lng}" if meeting_lng is not None else 'NULL'

    cur.execute(f"""
        INSERT INTO {schema}.master_bookings
        (slot_id, master_id, client_name, client_phone, client_email, service_id,
         datetime_start, datetime_end, price, status, source, comment,
         confirmed_at,
         contraindications_accepted, contraindications_accepted_at,
         contraindications_accepted_ip, contraindications_snapshot,
         meeting_address, meeting_latitude, meeting_longitude)
        VALUES ({int(slot_id)}, {int(master_id)}, '{client_name}', '{client_phone}', '{client_email}',
         {svc_val}, '{dt_start_str}', '{dt_end_str}', {booking_price}, '{status}', 'public', '{comment}',
         {confirmed_at_val},
         {contra_accepted_sql}, {contra_accepted_at_sql},
         {contra_ip_sql}, {contra_snapshot_sql},
         {meeting_address_sql}, {meeting_lat_sql}, {meeting_lng_sql})
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
    # Уведомляем клиента (email-подтверждение заявки)
    try:
        _notify_client_about_new_booking(cur, schema, master_id, dict(booking), booking_service_name)
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
            'price': booking_price,
            'chat_token': booking.get('reply_token'),
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

        # Уведомление мастеру через hub: review_new
        try:
            _uid = get_master_user_id(cur, schema, master_id)
            if _uid and review:
                hub_notify('review_new', user_id=_uid, related_id=review.get('id'), owner_id=_uid,
                           variables={
                               'client_name': body.get('client_name', '').strip(),
                               'rating': str(rating),
                               'text': body.get('text', '').strip(),
                               'service_name': '',
                           })
        except Exception:
            pass

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
            COUNT(*) FILTER (WHERE status = 'no_show') as no_show_sessions,
            COUNT(*) as total_sessions,
            COALESCE(SUM(price) FILTER (WHERE status = 'completed'), 0) as total_revenue,
            COALESCE(SUM(price) FILTER (WHERE status IN ('confirmed', 'pending')), 0) as expected_revenue,
            COALESCE(SUM(price) FILTER (WHERE status = 'no_show'), 0) as lost_revenue
        FROM {schema}.master_bookings
        WHERE master_id = {int(master_id)}
          AND archived_at IS NULL
          AND datetime_start >= CURRENT_DATE - {interval}
    """)
    stats = cur.fetchone()

    # Загрузка считается по реальным минутам, а не штукам слотов:
    # busy = суммарная длительность активных броней,
    # total = суммарная длительность всех рабочих слотов (без 'blocked'/'event').
    cur.execute(f"""
        WITH active_slots AS (
            SELECT id,
                   EXTRACT(EPOCH FROM (datetime_end - datetime_start)) / 60 AS dur_min,
                   status, booked_count, max_clients
            FROM {schema}.master_slots
            WHERE master_id = {int(master_id)}
              AND datetime_start >= CURRENT_DATE
              AND datetime_start <= CURRENT_DATE + {interval}
              AND status NOT IN ('blocked', 'event')
        ),
        active_bookings AS (
            SELECT EXTRACT(EPOCH FROM (datetime_end - datetime_start)) / 60 AS dur_min
            FROM {schema}.master_bookings
            WHERE master_id = {int(master_id)}
              AND archived_at IS NULL
              AND status IN ('pending', 'confirmed')
              AND datetime_start >= CURRENT_DATE
              AND datetime_start <= CURRENT_DATE + {interval}
        )
        SELECT
            (SELECT COUNT(*) FROM active_slots) AS total_slots,
            (SELECT COUNT(*) FROM active_slots WHERE status = 'available' AND booked_count < max_clients) AS free_slots,
            (SELECT COUNT(*) FROM active_slots WHERE status = 'booked' OR booked_count > 0) AS busy_slots,
            COALESCE((SELECT SUM(dur_min) FROM active_slots), 0) AS total_minutes,
            COALESCE((SELECT SUM(dur_min) FROM active_bookings), 0) AS busy_minutes
    """)
    slot_stats = cur.fetchone()

    occupancy = 0
    total_min = float(slot_stats.get('total_minutes') or 0)
    busy_min = float(slot_stats.get('busy_minutes') or 0)
    if total_min > 0:
        occupancy = min(100, round(busy_min / total_min * 100))

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