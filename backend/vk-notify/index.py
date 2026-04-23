import json
import os
import random
import psycopg2
import psycopg2.extras
import requests
from datetime import datetime

VK_API_URL = "https://api.vk.com/method"
VK_API_VERSION = "5.131"


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def get_schema():
    return os.environ.get("MAIN_DB_SCHEMA", "public")


def get_community_token():
    return os.environ.get("VK_COMMUNITY_TOKEN", "")


def get_community_id():
    return int(os.environ.get("VK_COMMUNITY_ID", "0"))


def cors_headers():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-User-Id, X-Auth-Token",
        "Content-Type": "application/json",
    }


def respond(code, body):
    return {"statusCode": code, "headers": cors_headers(), "body": json.dumps(body, default=str)}


def vk_api(method, params):
    """Вызов VK API с токеном сообщества."""
    params["access_token"] = get_community_token()
    params["v"] = VK_API_VERSION
    r = requests.post(f"{VK_API_URL}/{method}", data=params, timeout=10)
    return r.json()


def send_vk_message(vk_user_id: int, message: str) -> dict:
    """Отправить сообщение пользователю от имени сообщества."""
    result = vk_api("messages.send", {
        "user_id": vk_user_id,
        "message": message,
        "random_id": random.randint(1, 2**31),
        "group_id": get_community_id(),
    })
    return result


def get_user_from_token(cur, schema, token):
    if not token:
        return None
    t = token.replace("'", "''")
    cur.execute(f"""
        SELECT u.id, u.email, u.name, u.vk_id, u.vk_notify_allowed
        FROM {schema}.user_sessions s
        JOIN {schema}.users u ON u.id = s.user_id
        WHERE s.token = '{t}' AND s.expires_at > NOW()
    """)
    return cur.fetchone()


def handler(event: dict, context) -> dict:
    """VK-уведомления: отправка сообщений пользователям через VK сообщество и управление настройками."""
    if event.get("httpMethod") == "OPTIONS":
        return respond(200, {})

    method = event.get("httpMethod", "GET")
    params = event.get("queryStringParameters") or {}
    token = (event.get("headers") or {}).get("X-Auth-Token", "")
    body = {}
    if method == "POST":
        try:
            body = json.loads(event.get("body") or "{}")
        except Exception:
            return respond(400, {"error": "Invalid JSON"})

    action = params.get("action") or body.get("action", "")

    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    schema = get_schema()

    # --- GET preferences ---
    if method == "GET" and action == "preferences":
        user = get_user_from_token(cur, schema, token)
        if not user:
            conn.close()
            return respond(401, {"error": "Необходима авторизация"})

        cur.execute(f"""
            SELECT channel, notify_service, notify_reminders, notify_marketing
            FROM {schema}.notification_preferences
            WHERE user_id = {user['id']}
        """)
        prefs = {row["channel"]: dict(row) for row in cur.fetchall()}
        conn.close()
        return respond(200, {
            "vk_notify_allowed": bool(user["vk_notify_allowed"]),
            "vk_id": user["vk_id"],
            "preferences": prefs
        })

    # --- POST set_preferences ---
    if method == "POST" and action == "set_preferences":
        user = get_user_from_token(cur, schema, token)
        if not user:
            conn.close()
            return respond(401, {"error": "Необходима авторизация"})

        channel = body.get("channel", "vk")
        notify_service = bool(body.get("notify_service", True))
        notify_reminders = bool(body.get("notify_reminders", True))
        notify_marketing = bool(body.get("notify_marketing", False))

        cur.execute(f"""
            INSERT INTO {schema}.notification_preferences (user_id, channel, notify_service, notify_reminders, notify_marketing, updated_at)
            VALUES ({user['id']}, '{channel}', {notify_service}, {notify_reminders}, {notify_marketing}, NOW())
            ON CONFLICT (user_id, channel)
            DO UPDATE SET notify_service = {notify_service}, notify_reminders = {notify_reminders},
                          notify_marketing = {notify_marketing}, updated_at = NOW()
        """)
        conn.commit()
        conn.close()
        return respond(200, {"ok": True})

    # --- POST send (admin/system use) ---
    if method == "POST" and action == "send":
        admin_pass = body.get("admin_password", "")
        if admin_pass != os.environ.get("ADMIN_PASSWORD", ""):
            conn.close()
            return respond(403, {"error": "Нет доступа"})

        user_ids = body.get("user_ids")
        message = (body.get("message") or "").strip()
        notify_type = body.get("notify_type", "service")

        if not message:
            conn.close()
            return respond(400, {"error": "Сообщение не может быть пустым"})

        type_field = {
            "service": "notify_service",
            "reminder": "notify_reminders",
            "marketing": "notify_marketing",
        }.get(notify_type, "notify_service")

        if user_ids:
            ids_str = ",".join(str(int(i)) for i in user_ids)
            cur.execute(f"""
                SELECT u.id, u.vk_id, u.name,
                       COALESCE(np.{type_field}, TRUE) as allowed
                FROM {schema}.users u
                LEFT JOIN {schema}.notification_preferences np ON np.user_id = u.id AND np.channel = 'vk'
                WHERE u.id IN ({ids_str})
                  AND u.vk_id IS NOT NULL AND u.vk_notify_allowed = TRUE
            """)
        else:
            cur.execute(f"""
                SELECT u.id, u.vk_id, u.name,
                       COALESCE(np.{type_field}, TRUE) as allowed
                FROM {schema}.users u
                LEFT JOIN {schema}.notification_preferences np ON np.user_id = u.id AND np.channel = 'vk'
                WHERE u.vk_id IS NOT NULL AND u.vk_notify_allowed = TRUE
            """)

        users = [dict(r) for r in cur.fetchall() if r["allowed"]]
        conn.close()

        sent, failed = [], []
        for u in users:
            try:
                result = send_vk_message(int(u["vk_id"]), message)
                if "error" in result:
                    failed.append({"user_id": u["id"], "error": result["error"].get("error_msg", "VK error")})
                else:
                    sent.append(u["id"])
            except Exception as e:
                failed.append({"user_id": u["id"], "error": str(e)})

        return respond(200, {"sent": len(sent), "failed": len(failed), "failed_details": failed})

    # --- POST allow_notify (пользователь разрешает уведомления) ---
    if method == "POST" and action == "allow_notify":
        user = get_user_from_token(cur, schema, token)
        if not user:
            conn.close()
            return respond(401, {"error": "Необходима авторизация"})
        if not user["vk_id"]:
            conn.close()
            return respond(400, {"error": "VK не привязан"})

        allow = bool(body.get("allow", True))
        cur.execute(f"UPDATE {schema}.users SET vk_notify_allowed = {allow} WHERE id = {user['id']}")
        conn.commit()
        conn.close()
        return respond(200, {"ok": True, "vk_notify_allowed": allow})

    conn.close()
    return respond(400, {"error": "Неизвестное действие"})
