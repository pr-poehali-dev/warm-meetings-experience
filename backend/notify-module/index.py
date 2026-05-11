"""
Модуль персонализированных уведомлений — организаторы и мастера.
Управление сценариями (шаблонами) и отправка писем/сообщений участникам событий.

Ресурсы:
  GET/POST/PUT  ?resource=scenarios          — список, создание, обновление сценариев
  DELETE        ?resource=scenarios&id=N     — удаление сценария
  POST          ?resource=send               — ручная отправка по сценарию или прямая
  GET           ?resource=log                — история отправок
  GET           ?resource=recipients         — получатели события (для превью)
"""

import json
import os
import random
import re
from datetime import datetime

import psycopg2
import psycopg2.extras
import requests

from shared import *

VK_API_URL = "https://api.vk.com/method"
VK_API_VERSION = "5.131"
TG_BOT_URL = "https://functions.poehali.dev/c54f8799-96a5-4519-a2c7-e1b2e5f9d8c1"


def get_event_access(cur, s, user_id, event_id):
    """
    Универсальная утилита: какой доступ есть у user_id к event_id.
    Возвращает dict: {has_access: bool, role: 'organizer'|'partner'|None,
                      total_signups: int, exists: bool}.
    Доступ есть, если пользователь:
      - организатор события (events.organizer_id = user_id), ИЛИ
      - владелец бани события (baths.owner_id = user_id через events.bath_id).
    """
    cur.execute(f"""
        SELECT e.organizer_id, b.owner_id,
               (SELECT COUNT(*) FROM {s}.event_signups es WHERE es.event_id = e.id)
        FROM {s}.events e
        LEFT JOIN {s}.baths b ON b.id = e.bath_id
        WHERE e.id = %s
        LIMIT 1
    """, (event_id,))
    row = cur.fetchone()
    if not row:
        return {"has_access": False, "role": None, "total_signups": 0, "exists": False}
    organizer_id, bath_owner_id, total = row
    role = None
    if organizer_id == user_id:
        role = "organizer"
    elif bath_owner_id == user_id:
        role = "partner"
    return {"has_access": role is not None, "role": role,
            "total_signups": int(total or 0), "exists": True}


# Статусы записей, которые НИКОГДА не получают рассылку
EXCLUDED_SIGNUP_STATUSES = ("cancelled", "canceled", "declined", "spam")


def html_to_text(html):
    """Грубая конвертация HTML в plain text для VK/Telegram."""
    if not html:
        return ""
    text = re.sub(r"<br\s*/?>", "\n", html, flags=re.IGNORECASE)
    text = re.sub(r"</p>", "\n\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"&nbsp;", " ", text)
    text = re.sub(r"&amp;", "&", text)
    text = re.sub(r"&lt;", "<", text)
    text = re.sub(r"&gt;", ">", text)
    text = re.sub(r"&quot;", '"', text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def send_vk_message(vk_user_id, message):
    """Отправка ЛС в VK от имени сообщества. Возвращает (ok, error)."""
    token = os.environ.get("VK_COMMUNITY_TOKEN", "")
    community_id = os.environ.get("VK_COMMUNITY_ID", "0")
    if not token:
        return False, "VK_COMMUNITY_TOKEN not set"
    try:
        r = requests.post(
            f"{VK_API_URL}/messages.send",
            data={
                "peer_id": int(vk_user_id),
                "message": message,
                "random_id": random.randint(1, 2**31),
                "group_id": int(community_id) if community_id else 0,
                "access_token": token,
                "v": VK_API_VERSION,
            },
            timeout=10,
        )
        result = r.json()
        if "error" in result:
            err = result["error"]
            return False, f"code={err.get('error_code')} {err.get('error_msg')}"
        return True, None
    except Exception as e:
        return False, str(e)


def send_telegram_message(chat_id, message):
    """Отправка сообщения в Telegram через бот-функцию. Возвращает (ok, error)."""
    try:
        r = requests.post(
            TG_BOT_URL,
            json={"action": "send_message", "chat_id": chat_id, "text": message},
            timeout=10,
        )
        if r.status_code != 200:
            return False, f"TG status {r.status_code}"
        return True, None
    except Exception as e:
        return False, str(e)


def send_email_via_unisender(to_email, to_name, subject, body_html):
    """Отправляет письмо через Unisender Go."""
    api_key = os.environ.get("UNISENDER_API_KEY", "")
    sender_email = os.environ.get("UNISENDER_SENDER_EMAIL", "")
    sender_name = os.environ.get("UNISENDER_SENDER_NAME", "Sparcom")
    if not api_key or not sender_email:
        raise ValueError("Unisender не настроен: отсутствует UNISENDER_API_KEY или UNISENDER_SENDER_EMAIL")

    payload = {
        "message": {
            "recipients": [{"email": to_email, "substitutions": {"to_name": to_name or ""}}],
            "sender_email": sender_email,
            "sender_name": sender_name,
            "subject": subject,
            "body": {"html": body_html},
            "track_links": 1,
            "track_read": 1,
        }
    }
    resp = requests.post(
        "https://go2.unisender.ru/ru/transactional/api/v1/email/send.json",
        headers={"X-API-KEY": api_key, "Content-Type": "application/json"},
        json=payload,
        timeout=15,
    )
    data = resp.json()
    if resp.status_code != 200 or data.get("status") == "error":
        raise RuntimeError(data.get("message") or "Ошибка отправки через Unisender")
    return data


def render_template(text, variables):
    """Подставляет переменные {{var}} в текст."""
    for key, val in variables.items():
        text = text.replace("{{" + key + "}}", str(val or ""))
    return text


def build_vars(signup, event):
    """Собирает словарь переменных из данных участника и события."""
    return {
        "name": signup.get("name") or signup.get("recipient_name") or "участник",
        "event_title": event.get("title", ""),
        "event_date": str(event.get("event_date", "")),
        "event_time": str(event.get("start_time", "")),
        "bath_name": event.get("bath_name") or "",
        "price": str(event.get("price_amount") or ""),
    }


# ─── Handlers ─────────────────────────────────────────────────────────────────

def handle_scenarios_get(cur, user_id, s, params):
    cur.execute(f"""
        SELECT id, name, trigger_type, trigger_hours, trigger_status,
               channels, subject, body_html, body_text, is_active, created_at, updated_at
        FROM {s}.notify_scenarios
        WHERE owner_id = %s
        ORDER BY created_at DESC
    """, (user_id,))
    rows = cur.fetchall()
    cols = ["id","name","trigger_type","trigger_hours","trigger_status",
            "channels","subject","body_html","body_text","is_active","created_at","updated_at"]
    return ok({"scenarios": [dict(zip(cols, r)) for r in rows]})


def handle_scenarios_post(cur, conn, user_id, owner_role, body, s):
    name = (body.get("name") or "").strip()
    if not name:
        return err("Укажите название сценария")
    trigger_type = body.get("trigger_type", "manual")
    allowed_triggers = ("manual", "before_event", "after_event", "on_signup", "on_status_change")
    if trigger_type not in allowed_triggers:
        return err(f"Недопустимый trigger_type. Допустимые: {', '.join(allowed_triggers)}")
    channels = body.get("channels", ["email"])
    if not isinstance(channels, list) or not channels:
        return err("Укажите хотя бы один канал отправки")

    cur.execute(f"""
        INSERT INTO {s}.notify_scenarios
            (owner_id, owner_role, name, trigger_type, trigger_hours, trigger_status,
             channels, subject, body_html, body_text, is_active)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        RETURNING id
    """, (
        user_id, owner_role, name, trigger_type,
        body.get("trigger_hours"), body.get("trigger_status"),
        json.dumps(channels),
        body.get("subject", ""), body.get("body_html", ""), body.get("body_text", ""),
        body.get("is_active", True),
    ))
    new_id = cur.fetchone()[0]
    conn.commit()
    return respond(201, {"id": new_id, "message": "Сценарий создан"})


def handle_scenarios_put(cur, conn, user_id, body, s):
    sid = body.get("id")
    if not sid:
        return err("Укажите id сценария")
    cur.execute(f"SELECT owner_id FROM {s}.notify_scenarios WHERE id = %s", (sid,))
    row = cur.fetchone()
    if not row:
        return err("Сценарий не найден", 404)
    if row[0] != user_id:
        return err("Нет доступа", 403)

    fields, vals = [], []
    for col in ("name","trigger_type","trigger_hours","trigger_status","subject","body_html","body_text","is_active"):
        if col in body:
            fields.append(f"{col} = %s")
            vals.append(body[col])
    if "channels" in body:
        fields.append("channels = %s")
        vals.append(json.dumps(body["channels"]))
    fields.append("updated_at = NOW()")
    vals.append(sid)
    vals.append(user_id)
    cur.execute(f"UPDATE {s}.notify_scenarios SET {', '.join(fields)} WHERE id = %s AND owner_id = %s", vals)
    conn.commit()
    return ok({"message": "Сценарий обновлён"})


def handle_scenarios_delete(cur, conn, user_id, params, s):
    sid = params.get("id")
    if not sid:
        return err("Укажите id")
    cur.execute(f"SELECT owner_id FROM {s}.notify_scenarios WHERE id = %s", (sid,))
    row = cur.fetchone()
    if not row:
        return err("Не найден", 404)
    if row[0] != user_id:
        return err("Нет доступа", 403)
    cur.execute(f"UPDATE {s}.notify_scenarios SET is_active = false WHERE id = %s", (sid,))
    conn.commit()
    return ok({"message": "Сценарий деактивирован"})


def handle_recipients_get(cur, user_id, params, s):
    source = params.get("source", "event_signup")

    # ─── Источник: записи мастера ──────────────────────────────────────────────
    if source == "master_booking":
        booking_id = params.get("booking_id")
        # Получаем master_id текущего пользователя
        cur.execute(f"SELECT id FROM {s}.masters WHERE user_id = %s LIMIT 1", (user_id,))
        m = cur.fetchone()
        if not m:
            return err("У вас нет профиля мастера", 403)
        master_id = m[0]

        where = "mb.master_id = %s AND mb.status NOT IN ('canceled','no_show')"
        vals = [master_id]
        if booking_id:
            where += " AND mb.id = %s"
            vals.append(int(booking_id))

        cur.execute(f"""
            SELECT mb.id, mb.client_name as name, mb.client_email as email,
                   NULL as telegram, mb.status, NULL as preferred_channel,
                   u.id as user_id, u.telegram as tg_username,
                   u.vk_id, u.vk_notify_allowed,
                   u.tg_chat_id, u.tg_notify_allowed,
                   u.notify_email, u.notify_vk, u.notify_telegram
            FROM {s}.master_bookings mb
            LEFT JOIN {s}.users u ON u.id = mb.client_id
            WHERE {where}
            ORDER BY mb.created_at DESC
        """, tuple(vals))
        rows = cur.fetchall()
        cols = ["id","name","email","telegram","status","preferred_channel","user_id","tg_username",
                "vk_id","vk_notify_allowed","tg_chat_id","tg_notify_allowed",
                "notify_email","notify_vk","notify_telegram"]
        recipients = []
        for r in rows:
            d = dict(zip(cols, r))
            has_vk = bool(d.get("vk_id") and d.get("vk_notify_allowed"))
            has_tg = bool(d.get("tg_chat_id") and d.get("tg_notify_allowed"))
            has_email = bool(d.get("email") and "@vk.local" not in (d.get("email") or ""))
            has_site = bool(d.get("user_id"))
            d["has_vk"] = has_vk
            d["has_tg"] = has_tg
            d["has_email"] = has_email
            d["has_site"] = has_site
            auto = None
            if has_vk: auto = "vk"
            elif has_tg: auto = "telegram"
            elif has_email: auto = "email"
            elif has_site: auto = "site"
            d["auto_channel"] = auto
            recipients.append(d)
        return ok({"recipients": recipients, "total": len(recipients)})

    # ─── Источник: брони ритуалов (для партнёра) ───────────────────────────────
    if source == "ritual_booking":
        booking_id = params.get("booking_id")
        where = """rb.status NOT IN ('canceled','cancelled','no_show')
                   AND rl.bath_id IN (SELECT id FROM {s}.baths WHERE owner_id = %s)""".format(s=s)
        vals = [user_id]
        if booking_id:
            where += " AND rb.id = %s"
            vals.append(int(booking_id))
        cur.execute(f"""
            SELECT rb.id, rb.client_name as name, rb.client_email as email,
                   NULL as telegram, rb.status, NULL as preferred_channel,
                   u.id as user_id, u.telegram as tg_username,
                   u.vk_id, u.vk_notify_allowed,
                   u.tg_chat_id, u.tg_notify_allowed,
                   u.notify_email, u.notify_vk, u.notify_telegram
            FROM {s}.ritual_bookings rb
            LEFT JOIN {s}.ritual_locations rl ON rl.id = rb.location_id
            LEFT JOIN {s}.users u ON u.email = rb.client_email
            WHERE {where}
            ORDER BY rb.created_at DESC
        """, tuple(vals))
        rows = cur.fetchall()
        cols = ["id","name","email","telegram","status","preferred_channel","user_id","tg_username",
                "vk_id","vk_notify_allowed","tg_chat_id","tg_notify_allowed",
                "notify_email","notify_vk","notify_telegram"]
        recipients = []
        for r in rows:
            d = dict(zip(cols, r))
            has_vk = bool(d.get("vk_id") and d.get("vk_notify_allowed"))
            has_tg = bool(d.get("tg_chat_id") and d.get("tg_notify_allowed"))
            has_email = bool(d.get("email") and "@vk.local" not in (d.get("email") or ""))
            has_site = bool(d.get("user_id"))
            d["has_vk"] = has_vk
            d["has_tg"] = has_tg
            d["has_email"] = has_email
            d["has_site"] = has_site
            auto = None
            if has_vk: auto = "vk"
            elif has_tg: auto = "telegram"
            elif has_email: auto = "email"
            elif has_site: auto = "site"
            d["auto_channel"] = auto
            recipients.append(d)
        return ok({"recipients": recipients, "total": len(recipients)})

    # ─── Источник: события (по умолчанию) ──────────────────────────────────────
    event_id = params.get("event_id")
    if not event_id:
        return err("Укажите event_id")

    access = get_event_access(cur, s, user_id, int(event_id))
    if not access["exists"]:
        return err("Событие не найдено", 404)
    if not access["has_access"]:
        return err("Нет доступа к участникам этого события", 403)

    excluded = ",".join(f"'{x}'" for x in EXCLUDED_SIGNUP_STATUSES)
    cur.execute(f"""
        SELECT es.id, es.name, es.email, es.telegram, es.status, es.preferred_channel,
               u.id as user_id, u.telegram as tg_username,
               u.vk_id, u.vk_notify_allowed,
               u.tg_chat_id, u.tg_notify_allowed,
               u.notify_email, u.notify_vk, u.notify_telegram
        FROM {s}.event_signups es
        LEFT JOIN {s}.users u ON u.id = es.user_id
        WHERE es.event_id = %s
          AND COALESCE(es.status, '') NOT IN ({excluded})
        ORDER BY es.created_at
    """, (event_id,))
    rows = cur.fetchall()
    cols = ["id","name","email","telegram","status","preferred_channel","user_id","tg_username",
            "vk_id","vk_notify_allowed","tg_chat_id","tg_notify_allowed",
            "notify_email","notify_vk","notify_telegram"]
    recipients = []
    for r in rows:
        d = dict(zip(cols, r))
        # Определяем доступные каналы
        has_vk = bool(d.get("vk_id") and d.get("vk_notify_allowed"))
        has_tg = bool(d.get("tg_chat_id") and d.get("tg_notify_allowed"))
        has_email = bool(d.get("email") and "@vk.local" not in (d.get("email") or ""))
        has_site = bool(d.get("user_id"))
        d["has_vk"] = has_vk
        d["has_tg"] = has_tg
        d["has_email"] = has_email
        d["has_site"] = has_site
        # Авто-канал: предпочтение пользователя → лучший доступный
        pref = d.get("preferred_channel") or "site"
        auto = None
        if pref == "vk" and has_vk:
            auto = "vk"
        elif pref == "telegram" and has_tg:
            auto = "telegram"
        elif pref == "email" and has_email:
            auto = "email"
        elif pref == "site" and has_site:
            auto = "site"
        else:
            if has_vk: auto = "vk"
            elif has_tg: auto = "telegram"
            elif has_email: auto = "email"
            elif has_site: auto = "site"
        d["auto_channel"] = auto
        recipients.append(d)
    return ok({
        "recipients": recipients,
        "total": len(recipients),
        "total_signups": access["total_signups"],
        "access_role": access["role"],
    })


def handle_send_master_bookings(cur, conn, user_id, booking_ids, scenario_id, channel,
                                 subject_tpl, body_html_tpl, s):
    """Отправка сообщений клиентам мастера по записям master_bookings."""
    cur.execute(f"SELECT id FROM {s}.masters WHERE user_id = %s LIMIT 1", (user_id,))
    m = cur.fetchone()
    if not m:
        return err("У вас нет профиля мастера", 403)
    master_id = m[0]

    if not booking_ids:
        return err("Укажите booking_ids")
    id_list = ",".join(str(int(i)) for i in booking_ids)

    cur.execute(f"""
        SELECT mb.id, mb.client_name, mb.client_email, mb.status,
               u.id as user_id_v, u.vk_id, u.vk_notify_allowed,
               u.tg_chat_id, u.tg_notify_allowed,
               mb.datetime_start, ms.name as service_name, mb.price
        FROM {s}.master_bookings mb
        LEFT JOIN {s}.users u ON u.id = mb.client_id
        LEFT JOIN {s}.master_services ms ON ms.id = mb.service_id
        WHERE mb.id IN ({id_list}) AND mb.master_id = %s
    """, (master_id,))
    bookings = cur.fetchall()
    if not bookings:
        return err("Нет получателей")

    def pick(has_vk, has_tg, has_email, has_site, requested):
        if requested == "auto":
            if has_vk: return "vk"
            if has_tg: return "telegram"
            if has_email: return "email"
            if has_site: return "site"
            return None
        if requested == "vk" and has_vk: return "vk"
        if requested == "telegram" and has_tg: return "telegram"
        if requested == "email" and has_email: return "email"
        if requested == "site" and has_site: return "site"
        return None

    sent, failed, skipped = 0, 0, 0
    by_channel = {"vk": 0, "telegram": 0, "email": 0, "site": 0}
    log_rows = []
    failures_detail = []

    for row in bookings:
        (bid, name, email, status, user_id_v,
         vk_id, vk_allowed, tg_chat_id, tg_allowed,
         dt_start, service_name, price) = row

        has_vk = bool(vk_id and vk_allowed)
        has_tg = bool(tg_chat_id and tg_allowed)
        has_email = bool(email and "@vk.local" not in (email or ""))
        has_site = bool(user_id_v)
        actual = pick(has_vk, has_tg, has_email, has_site, channel)

        booking_data = {
            "title": service_name or "Запись",
            "event_date": dt_start.date() if dt_start else None,
            "start_time": dt_start.time() if dt_start else None,
            "price_amount": price,
            "bath_name": "",
        }
        vars_ = build_vars({"name": name}, booking_data)
        subj = render_template(subject_tpl, vars_) if subject_tpl else ""
        html = render_template(body_html_tpl, vars_)
        plain = html_to_text(html)

        if not actual:
            skipped += 1
            failures_detail.append({"booking_id": bid, "name": name, "reason": "Нет доступного канала связи"})
            log_rows.append((scenario_id, user_id, None, "skip", None, email, name,
                             subj, "failed", "Нет доступного канала", None, "master_booking", bid))
            continue

        ok_send, err_msg = False, None
        if actual == "vk":
            ok_send, err_msg = send_vk_message(vk_id, plain)
        elif actual == "telegram":
            ok_send, err_msg = send_telegram_message(tg_chat_id, plain)
        elif actual == "email":
            try:
                send_email_via_unisender(email, name, subj or "Уведомление", html)
                ok_send = True
            except Exception as e:
                err_msg = str(e)
        elif actual == "site":
            ok_send = True

        if ok_send:
            sent += 1
            by_channel[actual] = by_channel.get(actual, 0) + 1
            log_rows.append((scenario_id, user_id, None, actual, None, email, name,
                             subj, "sent", None, datetime.now(), "master_booking", bid))
            try:
                cur.execute(f"""
                    INSERT INTO {s}.client_messages
                        (owner_id, source_type, source_id, direction, channel, body, delivered)
                    VALUES (%s, 'master_booking', %s, 'out', %s, %s, TRUE)
                """, (user_id, bid, actual, plain))
            except Exception:
                pass
        else:
            failed += 1
            failures_detail.append({"booking_id": bid, "name": name, "channel": actual, "reason": err_msg or "Ошибка отправки"})
            log_rows.append((scenario_id, user_id, None, actual, None, email, name,
                             subj, "failed", err_msg, None, "master_booking", bid))

    for lr in log_rows:
        cur.execute(f"""
            INSERT INTO {s}.notify_log
                (scenario_id, owner_id, event_id, channel, recipient_user_id,
                 recipient_email, recipient_name, subject, status, error_text, sent_at,
                 source_type, source_id)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """, lr)
    conn.commit()

    return ok({
        "sent": sent,
        "failed": failed,
        "skipped": skipped,
        "total": sent + failed + skipped,
        "by_channel": by_channel,
        "failures": failures_detail,
    })


def handle_send_ritual_bookings(cur, conn, user_id, booking_ids, scenario_id, channel,
                                subject_tpl, body_html_tpl, s):
    """Отправка сообщений клиентам броней ритуалов (для партнёра — владельца бани)."""
    if not booking_ids:
        return err("Укажите booking_ids")
    id_list = ",".join(str(int(i)) for i in booking_ids)

    cur.execute(f"""
        SELECT rb.id, rb.client_name, rb.client_email, rb.status,
               u.id as user_id_v, u.vk_id, u.vk_notify_allowed,
               u.tg_chat_id, u.tg_notify_allowed,
               rb.selected_date, rf.name as ritual_name, rb.total_price,
               rl.name as location_name, rl.bath_id, b.owner_id
        FROM {s}.ritual_bookings rb
        LEFT JOIN {s}.ritual_locations rl ON rl.id = rb.location_id
        LEFT JOIN {s}.baths b ON b.id = rl.bath_id
        LEFT JOIN {s}.ritual_formats rf ON rf.id = rb.ritual_format_id
        LEFT JOIN {s}.users u ON u.email = rb.client_email
        WHERE rb.id IN ({id_list}) AND b.owner_id = %s
    """, (user_id,))
    bookings = cur.fetchall()
    if not bookings:
        return err("Нет получателей или нет доступа к броням")

    def pick(has_vk, has_tg, has_email, has_site, requested):
        if requested == "auto":
            if has_vk: return "vk"
            if has_tg: return "telegram"
            if has_email: return "email"
            if has_site: return "site"
            return None
        if requested == "vk" and has_vk: return "vk"
        if requested == "telegram" and has_tg: return "telegram"
        if requested == "email" and has_email: return "email"
        if requested == "site" and has_site: return "site"
        return None

    sent, failed, skipped = 0, 0, 0
    by_channel = {"vk": 0, "telegram": 0, "email": 0, "site": 0}
    log_rows = []
    failures_detail = []

    for row in bookings:
        (bid, name, email, status, user_id_v,
         vk_id, vk_allowed, tg_chat_id, tg_allowed,
         sel_date, ritual_name, total_price,
         location_name, bath_id_v, owner_id_v) = row

        has_vk = bool(vk_id and vk_allowed)
        has_tg = bool(tg_chat_id and tg_allowed)
        has_email = bool(email and "@vk.local" not in (email or ""))
        has_site = bool(user_id_v)
        actual = pick(has_vk, has_tg, has_email, has_site, channel)

        booking_data = {
            "title": ritual_name or "Бронь",
            "event_date": sel_date,
            "start_time": None,
            "price_amount": total_price,
            "bath_name": location_name or "",
        }
        vars_ = build_vars({"name": name}, booking_data)
        subj = render_template(subject_tpl, vars_) if subject_tpl else ""
        html = render_template(body_html_tpl, vars_)
        plain = html_to_text(html)

        if not actual:
            skipped += 1
            failures_detail.append({"booking_id": bid, "name": name, "reason": "Нет доступного канала связи"})
            log_rows.append((scenario_id, user_id, None, "skip", None, email, name,
                             subj, "failed", "Нет доступного канала", None, "ritual_booking", bid))
            continue

        ok_send, err_msg = False, None
        if actual == "vk":
            ok_send, err_msg = send_vk_message(vk_id, plain)
        elif actual == "telegram":
            ok_send, err_msg = send_telegram_message(tg_chat_id, plain)
        elif actual == "email":
            try:
                send_email_via_unisender(email, name, subj or "Уведомление", html)
                ok_send = True
            except Exception as e:
                err_msg = str(e)
        elif actual == "site":
            ok_send = True

        if ok_send:
            sent += 1
            by_channel[actual] = by_channel.get(actual, 0) + 1
            log_rows.append((scenario_id, user_id, None, actual, None, email, name,
                             subj, "sent", None, datetime.now(), "ritual_booking", bid))
            try:
                cur.execute(f"""
                    INSERT INTO {s}.client_messages
                        (owner_id, source_type, source_id, direction, channel, body, delivered)
                    VALUES (%s, 'ritual_booking', %s, 'out', %s, %s, TRUE)
                """, (user_id, bid, actual, plain))
            except Exception:
                pass
        else:
            failed += 1
            failures_detail.append({"booking_id": bid, "name": name, "channel": actual, "reason": err_msg or "Ошибка отправки"})
            log_rows.append((scenario_id, user_id, None, actual, None, email, name,
                             subj, "failed", err_msg, None, "ritual_booking", bid))

    for lr in log_rows:
        cur.execute(f"""
            INSERT INTO {s}.notify_log
                (scenario_id, owner_id, event_id, channel, recipient_user_id,
                 recipient_email, recipient_name, subject, status, error_text, sent_at,
                 source_type, source_id)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """, lr)
    conn.commit()

    return ok({
        "sent": sent,
        "failed": failed,
        "skipped": skipped,
        "total": sent + failed + skipped,
        "by_channel": by_channel,
        "failures": failures_detail,
    })


def handle_send(cur, conn, user_id, body, s):
    """Ручная отправка: по сценарию или прямая. channel='auto' — умная отправка по доступному каналу."""
    source = body.get("source", "event_signup")
    event_id = body.get("event_id")
    signup_ids = body.get("signup_ids", [])
    booking_ids = body.get("booking_ids", [])
    scenario_id = body.get("scenario_id")
    channel = body.get("channel", "auto")

    subject_tpl = body.get("subject", "")
    body_html_tpl = body.get("body_html", "")

    if scenario_id:
        cur.execute(f"""
            SELECT subject, body_html, channels FROM {s}.notify_scenarios
            WHERE id = %s AND owner_id = %s AND is_active = true
        """, (scenario_id, user_id))
        sc = cur.fetchone()
        if not sc:
            return err("Сценарий не найден или недоступен", 404)
        subject_tpl = subject_tpl or sc[0]
        body_html_tpl = body_html_tpl or sc[1]

    if not body_html_tpl:
        return err("Укажите текст сообщения")
    if channel == "email" and not subject_tpl:
        return err("Для email укажите тему письма")

    # ─── Источник: записи мастера ──────────────────────────────────────────────
    if source == "master_booking":
        return handle_send_master_bookings(
            cur, conn, user_id, booking_ids, scenario_id, channel,
            subject_tpl, body_html_tpl, s
        )

    # ─── Источник: брони ритуалов (для партнёра) ───────────────────────────────
    if source == "ritual_booking":
        return handle_send_ritual_bookings(
            cur, conn, user_id, booking_ids, scenario_id, channel,
            subject_tpl, body_html_tpl, s
        )

    # ─── Источник: события (по умолчанию) ──────────────────────────────────────
    if not event_id and not signup_ids:
        return err("Укажите event_id или signup_ids")

    # Если указан event_id — проверяем доступ ОДИН раз через утилиту
    if event_id:
        acc = get_event_access(cur, s, user_id, int(event_id))
        if not acc["exists"]:
            return err("Событие не найдено", 404)
        if not acc["has_access"]:
            return err("Нет доступа к участникам этого события", 403)

    base_select = f"""
        SELECT es.id, es.name, es.email, es.status, es.preferred_channel,
               u.id as user_id_v, u.vk_id, u.vk_notify_allowed,
               u.tg_chat_id, u.tg_notify_allowed,
               e.id as eid, e.title, e.event_date, e.start_time, e.price_amount,
               COALESCE(b.name, e.bath_name) as bath_name
        FROM {s}.event_signups es
        LEFT JOIN {s}.users u ON u.id = es.user_id
        JOIN {s}.events e ON e.id = es.event_id
        LEFT JOIN {s}.baths b ON b.id = e.bath_id
    """
    excluded = ",".join(f"'{x}'" for x in EXCLUDED_SIGNUP_STATUSES)
    if signup_ids:
        # При выборочной отправке доступ проверяем по каждому event
        id_list = ",".join(str(int(i)) for i in signup_ids)
        cur.execute(
            base_select + f" WHERE es.id IN ({id_list}) "
            f"AND (e.organizer_id = %s OR b.owner_id = %s)",
            (user_id, user_id),
        )
    else:
        cur.execute(
            base_select + f" WHERE es.event_id = %s "
            f"AND COALESCE(es.status, '') NOT IN ({excluded})",
            (event_id,),
        )

    signups = cur.fetchall()
    if not signups:
        return err("Нет получателей")

    def pick_channel(pref, has_vk, has_tg, has_email, has_site, requested):
        """Выбор фактического канала. requested='auto' — умный выбор."""
        if requested == "auto":
            if pref == "vk" and has_vk: return "vk"
            if pref == "telegram" and has_tg: return "telegram"
            if pref == "email" and has_email: return "email"
            if pref == "site" and has_site: return "site"
            if has_vk: return "vk"
            if has_tg: return "telegram"
            if has_email: return "email"
            if has_site: return "site"
            return None
        if requested == "vk" and has_vk: return "vk"
        if requested == "telegram" and has_tg: return "telegram"
        if requested == "email" and has_email: return "email"
        if requested == "site" and has_site: return "site"
        return None

    sent, failed, skipped = 0, 0, 0
    by_channel = {"vk": 0, "telegram": 0, "email": 0, "site": 0}
    log_rows = []
    failures_detail = []

    for row in signups:
        (sid, name, email, status, pref, user_id_v,
         vk_id, vk_allowed, tg_chat_id, tg_allowed,
         eid, title, edate, etime, price, bath_name) = row

        has_vk = bool(vk_id and vk_allowed)
        has_tg = bool(tg_chat_id and tg_allowed)
        has_email = bool(email and "@vk.local" not in (email or ""))
        has_site = bool(user_id_v)

        actual = pick_channel(pref or "site", has_vk, has_tg, has_email, has_site, channel)

        event_data = {"title": title, "event_date": edate, "start_time": etime,
                      "price_amount": price, "bath_name": bath_name}
        vars_ = build_vars({"name": name}, event_data)
        subj = render_template(subject_tpl, vars_) if subject_tpl else ""
        html = render_template(body_html_tpl, vars_)
        plain = html_to_text(html)

        if not actual:
            skipped += 1
            failures_detail.append({"signup_id": sid, "name": name, "reason": "Нет доступного канала связи"})
            log_rows.append((scenario_id, user_id, eid, "skip", None, email, name,
                             subj, "failed", "Нет доступного канала", None))
            continue

        ok_send, err_msg = False, None
        if actual == "vk":
            ok_send, err_msg = send_vk_message(vk_id, plain)
        elif actual == "telegram":
            ok_send, err_msg = send_telegram_message(tg_chat_id, plain)
        elif actual == "email":
            try:
                send_email_via_unisender(email, name, subj or title or "Уведомление", html)
                ok_send = True
            except Exception as e:
                err_msg = str(e)
        elif actual == "site":
            # Канал «Сайт» — доставка происходит через INSERT в guest_messages ниже
            ok_send = True

        if ok_send:
            sent += 1
            by_channel[actual] = by_channel.get(actual, 0) + 1
            log_rows.append((scenario_id, user_id, eid, actual, None, email, name,
                             subj, "sent", None, datetime.now()))
            # синхронизируем с диалогом гостя
            try:
                cur.execute(f"""
                    INSERT INTO {s}.guest_messages (event_id, signup_id, direction, channel, body, delivered)
                    VALUES (%s, %s, 'out', %s, %s, TRUE)
                """, (eid, sid, actual, plain))
                cur.execute(f"""
                    UPDATE {s}.event_signups
                    SET status = CASE WHEN status IN ('new', 'новая') THEN 'wrote' ELSE status END,
                        wrote_at = NOW()
                    WHERE id = %s
                """, (sid,))
            except Exception:
                pass
        else:
            failed += 1
            failures_detail.append({"signup_id": sid, "name": name, "channel": actual, "reason": err_msg or "Ошибка отправки"})
            log_rows.append((scenario_id, user_id, eid, actual, None, email, name,
                             subj, "failed", err_msg, None))

    for lr in log_rows:
        cur.execute(f"""
            INSERT INTO {s}.notify_log
                (scenario_id, owner_id, event_id, channel, recipient_user_id,
                 recipient_email, recipient_name, subject, status, error_text, sent_at)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """, lr)
    conn.commit()

    return ok({
        "sent": sent,
        "failed": failed,
        "skipped": skipped,
        "total": sent + failed + skipped,
        "by_channel": by_channel,
        "failures": failures_detail,
    })


def handle_partner_events_list(cur, user_id, s):
    """События в банях партнёра + события, где он сам организатор."""
    cur.execute(f"""
        SELECT DISTINCT e.id, e.title, e.event_date, e.start_time, e.status,
               COALESCE(b.name, e.bath_name) as bath_name
        FROM {s}.events e
        LEFT JOIN {s}.baths b ON b.id = e.bath_id
        WHERE e.organizer_id = %s
           OR b.owner_id = %s
        ORDER BY e.event_date DESC NULLS LAST
        LIMIT 200
    """, (user_id, user_id))
    rows = cur.fetchall()
    cols = ["id","title","event_date","start_time","status","bath_name"]
    return ok({"events": [dict(zip(cols, r)) for r in rows]})


def handle_ritual_bookings_list(cur, user_id, s):
    """Список броней ритуалов в банях партнёра."""
    cur.execute(f"""
        SELECT rb.id, rb.client_name, rb.client_phone, rb.client_email,
               rb.selected_date, rb.status, rf.name as ritual_name,
               rl.name as location_name
        FROM {s}.ritual_bookings rb
        LEFT JOIN {s}.ritual_locations rl ON rl.id = rb.location_id
        LEFT JOIN {s}.ritual_formats rf ON rf.id = rb.ritual_format_id
        WHERE rl.bath_id IN (SELECT id FROM {s}.baths WHERE owner_id = %s)
          AND rb.status NOT IN ('canceled','cancelled','no_show')
        ORDER BY rb.selected_date DESC NULLS LAST, rb.created_at DESC
        LIMIT 200
    """, (user_id,))
    rows = cur.fetchall()
    cols = ["id","client_name","client_phone","client_email","selected_date","status","ritual_name","location_name"]
    return ok({"bookings": [dict(zip(cols, r)) for r in rows]})


def handle_master_bookings_list(cur, user_id, s):
    """Список записей текущего мастера для выбора получателей в рассылке."""
    cur.execute(f"SELECT id FROM {s}.masters WHERE user_id = %s LIMIT 1", (user_id,))
    m = cur.fetchone()
    if not m:
        return ok({"bookings": []})
    master_id = m[0]
    cur.execute(f"""
        SELECT mb.id, mb.client_name, mb.client_phone, mb.client_email,
               mb.datetime_start, mb.status, ms.name as service_name
        FROM {s}.master_bookings mb
        LEFT JOIN {s}.master_services ms ON ms.id = mb.service_id
        WHERE mb.master_id = %s AND mb.status NOT IN ('canceled','no_show')
        ORDER BY mb.datetime_start DESC NULLS LAST, mb.created_at DESC
        LIMIT 200
    """, (master_id,))
    rows = cur.fetchall()
    cols = ["id","client_name","client_phone","client_email","datetime_start","status","service_name"]
    return ok({"bookings": [dict(zip(cols, r)) for r in rows]})


def handle_log_get(cur, user_id, params, s):
    event_id = params.get("event_id")
    limit = min(int(params.get("limit", 50)), 200)
    where = f"WHERE nl.owner_id = %s"
    vals = [user_id]
    if event_id:
        where += " AND nl.event_id = %s"
        vals.append(event_id)
    cur.execute(f"""
        SELECT nl.id, nl.channel, nl.recipient_email, nl.recipient_name,
               nl.subject, nl.status, nl.error_text, nl.sent_at, nl.created_at,
               ns.name as scenario_name, e.title as event_title
        FROM {s}.notify_log nl
        LEFT JOIN {s}.notify_scenarios ns ON ns.id = nl.scenario_id
        LEFT JOIN {s}.events e ON e.id = nl.event_id
        {where}
        ORDER BY nl.created_at DESC
        LIMIT %s
    """, (*vals, limit))
    rows = cur.fetchall()
    cols = ["id","channel","recipient_email","recipient_name","subject","status",
            "error_text","sent_at","created_at","scenario_name","event_title"]
    return ok({"log": [dict(zip(cols, r)) for r in rows]})


# ─── Entry point ──────────────────────────────────────────────────────────────

def handler(event: dict, context) -> dict:
    """Модуль персонализированных уведомлений для организаторов и мастеров."""
    if event.get("httpMethod") == "OPTIONS":
        return options_response()

    token = (event.get("headers") or {}).get("X-Session-Token") or \
            (event.get("headers") or {}).get("x-session-token") or \
            (event.get("headers") or {}).get("X-Authorization", "").replace("Bearer ", "") or \
            (event.get("headers") or {}).get("x-authorization", "").replace("Bearer ", "")
    if not token:
        return err("Необходима авторизация", 401)

    params = event.get("queryStringParameters") or {}
    resource = params.get("resource", "")
    method = event.get("httpMethod", "GET").upper()

    body = {}
    if event.get("body"):
        try:
            body = json.loads(event["body"])
        except Exception:
            return err("Некорректный JSON")

    s = get_schema()
    conn = get_conn()
    cur = conn.cursor()

    user = get_user_from_token(cur, s, token)
    if not user:
        cur.close(); conn.close()
        return err("Сессия истекла или недействительна", 401)

    user_id, user_name, user_email = user['id'], user['name'], user['email']

    if not has_role(cur, s, user_id, "organizer", "master", "parmaster", "partner", "admin"):
        cur.close(); conn.close()
        return err("Нет доступа. Модуль доступен коммерческим пользователям.", 403)

    # Определяем роль для новых сценариев
    cur.execute(f"""
        SELECT r.slug FROM {s}.user_roles ur
        JOIN {s}.roles r ON r.id = ur.role_id
        WHERE ur.user_id = %s AND r.slug IN ('organizer','master','parmaster','partner','admin') AND ur.status = 'active'
        LIMIT 1
    """, (user_id,))
    role_row = cur.fetchone()
    owner_role = role_row[0] if role_row else "organizer"

    try:
        if resource == "scenarios":
            if method == "GET":
                return handle_scenarios_get(cur, user_id, s, params)
            elif method == "POST":
                return handle_scenarios_post(cur, conn, user_id, owner_role, body, s)
            elif method == "PUT":
                return handle_scenarios_put(cur, conn, user_id, body, s)
            elif method == "DELETE":
                return handle_scenarios_delete(cur, conn, user_id, params, s)

        elif resource == "send":
            if method == "POST":
                return handle_send(cur, conn, user_id, body, s)

        elif resource == "log":
            if method == "GET":
                return handle_log_get(cur, user_id, params, s)

        elif resource == "recipients":
            if method == "GET":
                return handle_recipients_get(cur, user_id, params, s)

        elif resource == "master_bookings":
            if method == "GET":
                return handle_master_bookings_list(cur, user_id, s)

        elif resource == "partner_events":
            if method == "GET":
                return handle_partner_events_list(cur, user_id, s)

        elif resource == "ritual_bookings":
            if method == "GET":
                return handle_ritual_bookings_list(cur, user_id, s)

        return err(f"Неизвестный ресурс: {resource}", 404)

    finally:
        cur.close()
        conn.close()