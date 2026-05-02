import json
import os
import random
import psycopg2
import psycopg2.extras
import requests
from datetime import datetime

from shared import *

VK_API_URL = "https://api.vk.com/method"
VK_API_VERSION = "5.131"


def vk_api(method, params):
    """Вызов VK API с токеном сообщества."""
    token = os.environ.get("VK_COMMUNITY_TOKEN", "")
    if not token:
        return {"error": {"error_msg": "VK_COMMUNITY_TOKEN not set"}}
    params["access_token"] = token
    params["v"] = VK_API_VERSION
    r = requests.post(f"{VK_API_URL}/{method}", data=params, timeout=10)
    return r.json()


def send_vk_message(vk_user_id: int, message: str) -> dict:
    community_id = int(os.environ.get("VK_COMMUNITY_ID", "0"))
    result = vk_api("messages.send", {
        "user_id": vk_user_id,
        "message": message,
        "random_id": random.randint(1, 2**31),
        "group_id": community_id,
    })
    return result


def send_tg_message(chat_id: int, message: str) -> dict:
    bot_token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
    if not bot_token:
        return {"error": "TELEGRAM_BOT_TOKEN not set"}
    r = requests.post(
        f"https://api.telegram.org/bot{bot_token}/sendMessage",
        json={"chat_id": chat_id, "text": message, "parse_mode": "HTML"},
        timeout=10
    )
    return r.json()


def handler(event: dict, context) -> dict:
    """Управление каналами уведомлений пользователя: VK, Telegram, Email, SMS."""
    if event.get("httpMethod") == "OPTIONS":
        return options_response()

    method = event.get("httpMethod", "GET")
    params = event.get("queryStringParameters") or {}
    headers = event.get("headers") or {}
    token = headers.get("X-Session-Token", "") or headers.get("X-Auth-Token", "")
    body = {}
    if method in ("POST", "PUT"):
        try:
            body = json.loads(event.get("body") or "{}")
        except Exception:
            return respond(400, {"error": "Invalid JSON"})

    action = params.get("action") or body.get("action", "")

    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    schema = get_schema()

    # ── GET /channels — текущие настройки каналов пользователя ──────────────
    _VK_EXTRA = 'u.vk_id, u.vk_notify_allowed, u.tg_user_id, u.tg_chat_id, u.tg_notify_allowed, u.notify_email, u.notify_telegram, u.notify_vk, u.notify_sms'

    if method == "GET" and action == "channels":
        user = get_user_from_token(cur, schema, token, extra_fields=_VK_EXTRA)
        if not user:
            conn.close()
            return respond(401, {"error": "Необходима авторизация"})

        cur.execute(f"""
            SELECT channel, notify_service, notify_reminders, notify_marketing,
                   notify_booking, notify_urgent
            FROM {schema}.notification_preferences
            WHERE user_id = {user['id']}
        """)
        prefs = {row["channel"]: dict(row) for row in cur.fetchall()}
        conn.close()

        return respond(200, {
            "channels": {
                "email": {
                    "connected": bool(user["email"] and "@vk.local" not in user["email"]),
                    "active": bool(user["notify_email"]),
                    "value": user["email"] if user["email"] and "@vk.local" not in user["email"] else None,
                    "prefs": prefs.get("email", {"notify_service": True, "notify_reminders": True, "notify_marketing": True, "notify_booking": True, "notify_urgent": True}),
                },
                "vk": {
                    "connected": bool(user["vk_id"]),
                    "active": bool(user["notify_vk"] and user["vk_notify_allowed"]),
                    "allowed": bool(user["vk_notify_allowed"]),
                    "prefs": prefs.get("vk", {"notify_service": True, "notify_reminders": True, "notify_marketing": False, "notify_booking": True, "notify_urgent": True}),
                },
                "telegram": {
                    "connected": bool(user["tg_chat_id"]),
                    "active": bool(user["notify_telegram"] and user["tg_notify_allowed"]),
                    "allowed": bool(user["tg_notify_allowed"]),
                    "prefs": prefs.get("telegram", {"notify_service": True, "notify_reminders": True, "notify_marketing": False, "notify_booking": True, "notify_urgent": True}),
                },
                "sms": {
                    "connected": bool(user["phone"]),
                    "active": bool(user["notify_sms"]),
                    "value": user["phone"],
                    "prefs": prefs.get("sms", {"notify_service": False, "notify_reminders": False, "notify_marketing": False, "notify_booking": False, "notify_urgent": True}),
                },
            }
        })

    # ── POST /set_channel — включить/выключить канал ─────────────────────────
    if method == "POST" and action == "set_channel":
        user = get_user_from_token(cur, schema, token, extra_fields=_VK_EXTRA)
        if not user:
            conn.close()
            return respond(401, {"error": "Необходима авторизация"})

        channel = body.get("channel")
        active = bool(body.get("active", True))

        col_map = {"email": "notify_email", "telegram": "notify_telegram", "vk": "notify_vk", "sms": "notify_sms"}
        if channel not in col_map:
            conn.close()
            return respond(400, {"error": "Неизвестный канал"})

        col = col_map[channel]
        cur.execute(f"UPDATE {schema}.users SET {col} = {active} WHERE id = {user['id']}")
        conn.commit()
        conn.close()
        return respond(200, {"ok": True})

    # ── POST /set_prefs — тонкие настройки конкретного канала ───────────────
    if method == "POST" and action == "set_prefs":
        user = get_user_from_token(cur, schema, token, extra_fields=_VK_EXTRA)
        if not user:
            conn.close()
            return respond(401, {"error": "Необходима авторизация"})

        channel = body.get("channel", "vk")
        fields = {
            "notify_service": bool(body.get("notify_service", True)),
            "notify_reminders": bool(body.get("notify_reminders", True)),
            "notify_marketing": bool(body.get("notify_marketing", False)),
            "notify_booking": bool(body.get("notify_booking", True)),
            "notify_urgent": bool(body.get("notify_urgent", True)),
        }

        cur.execute(f"""
            INSERT INTO {schema}.notification_preferences
                (user_id, channel, notify_service, notify_reminders, notify_marketing, notify_booking, notify_urgent, updated_at)
            VALUES ({user['id']}, '{channel}', {fields['notify_service']}, {fields['notify_reminders']},
                    {fields['notify_marketing']}, {fields['notify_booking']}, {fields['notify_urgent']}, NOW())
            ON CONFLICT (user_id, channel)
            DO UPDATE SET
                notify_service = {fields['notify_service']},
                notify_reminders = {fields['notify_reminders']},
                notify_marketing = {fields['notify_marketing']},
                notify_booking = {fields['notify_booking']},
                notify_urgent = {fields['notify_urgent']},
                updated_at = NOW()
        """)
        conn.commit()
        conn.close()
        return respond(200, {"ok": True})

    # ── POST /allow_vk — пользователь разрешает VK-уведомления ─────────────
    if method == "POST" and action == "allow_vk":
        user = get_user_from_token(cur, schema, token, extra_fields=_VK_EXTRA)
        if not user:
            conn.close()
            return respond(401, {"error": "Необходима авторизация"})
        if not user["vk_id"]:
            conn.close()
            return respond(400, {"error": "VK не привязан"})

        allow = bool(body.get("allow", True))
        cur.execute(f"""
            UPDATE {schema}.users
            SET vk_notify_allowed = {allow}, notify_vk = {allow}
            WHERE id = {user['id']}
        """)
        conn.commit()
        conn.close()
        return respond(200, {"ok": True, "vk_notify_allowed": allow})

    # ── POST /send_broadcast — рассылка (только с паролем администратора) ───
    if method == "POST" and action == "send_broadcast":
        admin_pass = body.get("admin_password", "")
        if admin_pass != os.environ.get("ADMIN_PASSWORD", ""):
            conn.close()
            return respond(403, {"error": "Нет доступа"})

        user_ids = body.get("user_ids")
        message = (body.get("message") or "").strip()
        channels = body.get("channels", ["vk", "telegram"])
        notify_type = body.get("notify_type", "marketing")

        if not message:
            conn.close()
            return respond(400, {"error": "Сообщение пустое"})

        type_col = {"service": "notify_service", "reminder": "notify_reminders",
                    "marketing": "notify_marketing", "booking": "notify_booking", "urgent": "notify_urgent"}.get(notify_type, "notify_marketing")

        ids_clause = f"AND u.id IN ({','.join(str(int(i)) for i in user_ids)})" if user_ids else ""

        cur.execute(f"""
            SELECT u.id, u.vk_id, u.tg_chat_id, u.vk_notify_allowed, u.tg_notify_allowed,
                   u.notify_vk, u.notify_telegram,
                   np_vk.{type_col} as vk_pref_ok,
                   np_tg.{type_col} as tg_pref_ok
            FROM {schema}.users u
            LEFT JOIN {schema}.notification_preferences np_vk ON np_vk.user_id = u.id AND np_vk.channel = 'vk'
            LEFT JOIN {schema}.notification_preferences np_tg ON np_tg.user_id = u.id AND np_tg.channel = 'telegram'
            WHERE 1=1 {ids_clause}
        """)
        users = [dict(r) for r in cur.fetchall()]
        conn.close()

        sent_vk, sent_tg, failed = 0, 0, []
        for u in users:
            if "vk" in channels and u["vk_id"] and u["vk_notify_allowed"] and u["notify_vk"] and u.get("vk_pref_ok", True) is not False:
                try:
                    res = send_vk_message(int(u["vk_id"]), message)
                    if "error" in res:
                        failed.append({"user_id": u["id"], "channel": "vk", "error": res["error"].get("error_msg")})
                    else:
                        sent_vk += 1
                except Exception as e:
                    failed.append({"user_id": u["id"], "channel": "vk", "error": str(e)})

            if "telegram" in channels and u["tg_chat_id"] and u["tg_notify_allowed"] and u["notify_telegram"] and u.get("tg_pref_ok", True) is not False:
                try:
                    res = send_tg_message(int(u["tg_chat_id"]), message)
                    if not res.get("ok"):
                        failed.append({"user_id": u["id"], "channel": "telegram", "error": res.get("description")})
                    else:
                        sent_tg += 1
                except Exception as e:
                    failed.append({"user_id": u["id"], "channel": "telegram", "error": str(e)})

        return respond(200, {"sent_vk": sent_vk, "sent_tg": sent_tg, "failed": len(failed), "failed_details": failed})

    conn.close()
    return respond(400, {"error": "Неизвестное действие"})