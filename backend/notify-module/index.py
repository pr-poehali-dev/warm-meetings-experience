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
from datetime import datetime

import psycopg2
import psycopg2.extras
import requests


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def schema():
    return os.environ.get("MAIN_DB_SCHEMA", "public")

def cors():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-Session-Token, X-Authorization",
        "Content-Type": "application/json",
    }

def ok(data, status=200):
    return {"statusCode": status, "headers": cors(), "body": json.dumps(data, ensure_ascii=False, default=str)}

def err(msg, status=400):
    return {"statusCode": status, "headers": cors(), "body": json.dumps({"error": msg}, ensure_ascii=False)}


def get_user(cur, token, s):
    cur.execute(f"""
        SELECT u.id, u.name, u.email FROM {s}.user_sessions ss
        JOIN {s}.users u ON u.id = ss.user_id
        WHERE ss.token = %s AND ss.expires_at > NOW() AND u.is_active = true
    """, (token,))
    return cur.fetchone()


def has_role(cur, user_id, slugs, s):
    placeholders = ",".join(["%s"] * len(slugs))
    cur.execute(f"""
        SELECT 1 FROM {s}.user_roles ur
        JOIN {s}.roles r ON r.id = ur.role_id
        WHERE ur.user_id = %s AND r.slug IN ({placeholders}) AND ur.status = 'active'
    """, (user_id, *slugs))
    return cur.fetchone() is not None


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
    return ok({"id": new_id, "message": "Сценарий создан"}, 201)


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
    event_id = params.get("event_id")
    if not event_id:
        return err("Укажите event_id")
    cur.execute(f"""
        SELECT es.id, es.name, es.email, es.telegram, es.status,
               u.id as user_id, u.telegram as tg_username
        FROM {s}.event_signups es
        LEFT JOIN {s}.users u ON u.id = es.user_id
        JOIN {s}.events e ON e.id = es.event_id
        WHERE es.event_id = %s AND e.organizer_id = %s
          AND es.status NOT IN ('cancelled')
        ORDER BY es.created_at
    """, (event_id, user_id))
    rows = cur.fetchall()
    cols = ["id","name","email","telegram","status","user_id","tg_username"]
    return ok({"recipients": [dict(zip(cols, r)) for r in rows], "total": len(rows)})


def handle_send(cur, conn, user_id, body, s):
    """Ручная отправка: по сценарию или прямая (subject + body_html)."""
    event_id = body.get("event_id")
    signup_ids = body.get("signup_ids", [])  # пустой = все участники события
    scenario_id = body.get("scenario_id")
    channel = body.get("channel", "email")

    # Получаем шаблон
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

    if not subject_tpl or not body_html_tpl:
        return err("Укажите тему и текст письма")

    # Получаем получателей
    if signup_ids:
        id_list = ",".join(str(int(i)) for i in signup_ids)
        cur.execute(f"""
            SELECT es.id, es.name, es.email, es.status,
                   e.id as eid, e.title, e.event_date, e.start_time, e.price_amount,
                   b.name as bath_name
            FROM {s}.event_signups es
            JOIN {s}.events e ON e.id = es.event_id
            LEFT JOIN {s}.baths b ON b.id = e.bath_id
            WHERE es.id IN ({id_list}) AND e.organizer_id = %s
        """, (user_id,))
    elif event_id:
        cur.execute(f"""
            SELECT es.id, es.name, es.email, es.status,
                   e.id as eid, e.title, e.event_date, e.start_time, e.price_amount,
                   b.name as bath_name
            FROM {s}.event_signups es
            JOIN {s}.events e ON e.id = es.event_id
            LEFT JOIN {s}.baths b ON b.id = e.bath_id
            WHERE es.event_id = %s AND e.organizer_id = %s
              AND es.status NOT IN ('cancelled') AND es.email IS NOT NULL
        """, (event_id, user_id))
    else:
        return err("Укажите event_id или signup_ids")

    signups = cur.fetchall()
    if not signups:
        return err("Нет получателей с email")

    sent, failed = 0, 0
    log_rows = []

    for row in signups:
        (sid, name, email, status,
         eid, title, edate, etime, price, bath_name) = row

        if channel == "email":
            if not email:
                failed += 1
                log_rows.append((scenario_id, user_id, eid, "email", None, email, name,
                                  subject_tpl, "failed", "Нет email", None))
                continue
            event_data = {"title": title, "event_date": edate, "start_time": etime,
                          "price_amount": price, "bath_name": bath_name}
            vars_ = build_vars({"name": name}, event_data)
            subj = render_template(subject_tpl, vars_)
            html = render_template(body_html_tpl, vars_)
            try:
                send_email_via_unisender(email, name, subj, html)
                sent += 1
                log_rows.append((scenario_id, user_id, eid, "email", None, email, name,
                                  subj, "sent", None, datetime.now()))
            except Exception as e:
                failed += 1
                log_rows.append((scenario_id, user_id, eid, "email", None, email, name,
                                  subj, "failed", str(e), None))

    # Сохраняем лог
    for lr in log_rows:
        cur.execute(f"""
            INSERT INTO {s}.notify_log
                (scenario_id, owner_id, event_id, channel, recipient_user_id,
                 recipient_email, recipient_name, subject, status, error_text, sent_at)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """, lr)
    conn.commit()

    return ok({"sent": sent, "failed": failed, "total": sent + failed})


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
        return {"statusCode": 200, "headers": cors(), "body": ""}

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

    s = schema()
    conn = get_conn()
    cur = conn.cursor()

    user = get_user(cur, token, s)
    if not user:
        cur.close(); conn.close()
        return err("Сессия истекла или недействительна", 401)

    user_id, user_name, user_email = user

    if not has_role(cur, user_id, ("organizer", "master", "admin"), s):
        cur.close(); conn.close()
        return err("Нет доступа. Модуль доступен организаторам и мастерам.", 403)

    # Определяем роль для новых сценариев
    cur.execute(f"""
        SELECT r.slug FROM {s}.user_roles ur
        JOIN {s}.roles r ON r.id = ur.role_id
        WHERE ur.user_id = %s AND r.slug IN ('organizer','master','admin') AND ur.status = 'active'
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

        return err(f"Неизвестный ресурс: {resource}", 404)

    finally:
        cur.close()
        conn.close()
