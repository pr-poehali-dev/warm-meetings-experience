"""VK Callback API — обработка входящих событий сообщества ВКонтакте.

Встроен в telegram-bot функцию (лимит 25 функций).
VK отправляет POST-запросы с JSON. Тип события — поле 'type'.

Поддерживаемые события:
  confirmation — подтверждение сервера (обязательно для активации)
  message_new  — новое личное сообщение → авто-ответ пользователю

Ответы:
  confirmation → тело = строка VK_CONFIRMATION_TOKEN
  все остальные → тело = 'ok' (иначе VK будет повторять запрос)
"""

import json
import os
import random
import urllib.request
import urllib.parse
import psycopg2
import psycopg2.extras

VK_API_URL = "https://api.vk.com/method"
VK_API_VERSION = "5.199"

AUTO_REPLY = (
    "Спасибо! Теперь мы сможем присылать вам уведомления и напоминания "
    "о бронированиях и других событиях СПАРКОМ ♨️"
)


def _vk_send(peer_id: int, text: str) -> bool:
    token = os.environ.get("VK_COMMUNITY_TOKEN", "")
    community_id = os.environ.get("VK_COMMUNITY_ID", "0")
    if not token:
        print("[vk-callback] VK_COMMUNITY_TOKEN не задан")
        return False
    params = {
        "peer_id": str(peer_id),
        "message": text,
        "random_id": str(random.randint(1, 2 ** 31)),
        "access_token": token,
        "v": VK_API_VERSION,
    }
    if community_id and community_id != "0":
        params["group_id"] = str(int(community_id))
    payload = urllib.parse.urlencode(params).encode("utf-8")
    req = urllib.request.Request(
        f"{VK_API_URL}/messages.send",
        data=payload,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    try:
        resp = urllib.request.urlopen(req, timeout=6)
        result = json.loads(resp.read().decode("utf-8"))
        if "error" in result:
            print(f"[vk-callback] messages.send error: {result['error']}")
            return False
        return True
    except Exception as e:
        print(f"[vk-callback] messages.send exception: {e}")
        return False


def _log_reply(vk_user_id: int, status: str, error=None):
    """Пишет авто-ответ в notification_log. Никогда не падает."""
    try:
        conn = psycopg2.connect(os.environ["DATABASE_URL"])
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        schema = os.environ.get("MAIN_DB_SCHEMA", "public")

        cur.execute(f"SELECT id FROM {schema}.users WHERE vk_id = '{int(vk_user_id)}'")
        row = cur.fetchone()
        uid = row["id"] if row else None

        def _e(v):
            if v is None:
                return "NULL"
            return "'" + str(v).replace("'", "''")[:4000] + "'"

        cur.execute(f"""
            INSERT INTO {schema}.notification_log
                (channel, event_type, recipient, subject, status, error_text, user_id)
            VALUES ('vk', 'vk_auto_reply', {_e(str(vk_user_id))},
                    'Авто-ответ при первом сообщении', {_e(status)},
                    {_e(error)}, {'NULL' if uid is None else int(uid)})
        """)
        conn.commit()
        conn.close()
    except Exception as ex:
        print(f"[vk-callback] _log_reply error: {ex}")


def handle_vk_callback(body: dict):
    """Главная точка входа — вызывается из handler telegram-bot при VK-событии.

    Возвращает строку (тело ответа), которую нужно вернуть VK.
    VK ждёт ровно строку 'ok' (без кавычек, без JSON).
    """
    event_type = body.get("type", "")
    group_id = body.get("group_id")

    # ── Подтверждение сервера ──────────────────────────────────────────────────
    if event_type == "confirmation":
        token = os.environ.get("VK_CONFIRMATION_TOKEN", "")
        if not token:
            print("[vk-callback] VK_CONFIRMATION_TOKEN не задан — добавьте секрет")
        expected_group = os.environ.get("VK_COMMUNITY_ID", "0")
        if expected_group and expected_group != "0" and str(group_id) != str(expected_group):
            print(f"[vk-callback] group_id mismatch: got {group_id}, expected {expected_group}")
        return token  # VK требует ровно эту строку, без обёрток

    # ── Проверка секретного ключа (опционально) ────────────────────────────────
    secret = os.environ.get("VK_WEBHOOK_SECRET", "")
    if secret and body.get("secret") != secret:
        print("[vk-callback] secret mismatch — игнорируем")
        return "ok"

    # ── Новое сообщение ────────────────────────────────────────────────────────
    if event_type == "message_new":
        msg_obj = body.get("object", {})
        message = msg_obj.get("message") or msg_obj
        from_id = message.get("from_id")

        if not from_id or int(from_id) <= 0:
            return "ok"

        print(f"[vk-callback] message_new from vk_id={from_id}")
        ok = _vk_send(int(from_id), AUTO_REPLY)
        print(f"[vk-callback] auto-reply to {from_id}: {'ok' if ok else 'failed'}")
        _log_reply(int(from_id), "success" if ok else "failed",
                   None if ok else "vk_send returned False")

    return "ok"