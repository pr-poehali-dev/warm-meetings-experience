import json
import os
import re

from shared import (
    get_conn, get_schema, options_response, ok, err,
    get_user_from_token, has_role, verify_admin_token, CORS_HEADERS
)


# ─── Парсинг ссылок ───────────────────────────────────────────────────────────

VK_PATTERNS = [
    # https://vk.com/video-123456_789  или  https://vkvideo.ru/video-123456_789
    re.compile(r'(?:vk\.com|vkvideo\.ru)/video(-?\d+)_(\d+)'),
    # https://vk.com/clip-123456_789
    re.compile(r'(?:vk\.com)/clip(-?\d+)_(\d+)'),
]

RUTUBE_PATTERN = re.compile(r'rutube\.ru/video/([a-zA-Z0-9]+)')
DIRECT_PATTERN = re.compile(r'https?://.+\.mp4(\?.*)?$', re.IGNORECASE)


def parse_video_url(url: str):
    """
    Возвращает (provider, external_id, embed_url) или (None, None, None).
    """
    url = url.strip()

    for pat in VK_PATTERNS:
        m = pat.search(url)
        if m:
            oid, vid = m.group(1), m.group(2)
            external_id = f"{oid}_{vid}"
            embed_url = f"https://vk.com/video_ext.php?oid={oid}&id={vid}&hd=2&js_api=1"
            return 'vk_video', external_id, embed_url

    m = RUTUBE_PATTERN.search(url)
    if m:
        vid = m.group(1)
        embed_url = f"https://rutube.ru/play/embed/{vid}/?skinColor=ff6600&quality=auto"
        return 'rutube', vid, embed_url

    if DIRECT_PATTERN.match(url):
        return 'direct', None, url

    return None, None, None


# ─── Handler ──────────────────────────────────────────────────────────────────

def handler(event: dict, context) -> dict:
    """
    API для внешних видео: добавление, список, удаление, модерация.
    GET  ?owner_type=master&owner_id=1           — список видео объекта (публичный)
    POST ?me=1                                   — добавить видео (авторизован)
    DELETE ?me=1&video_id=5                      — удалить своё видео
    PUT  ?me=1&video_id=5                        — обновить название / sort_order
    GET  ?admin=1                                — все видео для модерации
    PUT  ?admin_moderate=1                       — сменить статус (admin)
    """
    if event.get('httpMethod') == 'OPTIONS':
        return options_response()

    method = event.get('httpMethod', 'GET')
    params = event.get('queryStringParameters') or {}
    schema = get_schema()
    hdrs = event.get('headers') or {}
    user_token = (hdrs.get('X-Authorization') or hdrs.get('X-Session-Token') or '').replace('Bearer ', '')
    admin_token = hdrs.get('X-Admin-Token', '')

    # ── GET публичный список видео ─────────────────────────────────────────────
    if method == 'GET' and params.get('owner_type') and params.get('owner_id'):
        owner_type = params['owner_type']
        owner_id = int(params['owner_id'])
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"SELECT id, provider, embed_url, thumbnail_url, title, sort_order, status "
            f"FROM {schema}.videos "
            f"WHERE owner_type = %s AND owner_id = %s AND status = 'approved' "
            f"ORDER BY sort_order ASC, id ASC",
            [owner_type, owner_id]
        )
        rows = cur.fetchall()
        cols = [d[0] for d in cur.description]
        videos = [dict(zip(cols, r)) for r in rows]
        cur.close(); conn.close()
        return ok({'videos': videos})

    # ── POST добавить видео ────────────────────────────────────────────────────
    if method == 'POST' and params.get('me') == '1':
        if not user_token:
            return err('Не авторизован', 401)
        conn = get_conn()
        cur = conn.cursor()
        user = get_user_from_token(cur, schema, user_token)
        if not user:
            conn.close(); return err('Не авторизован', 401)
        if not has_role(cur, schema, user['id'], 'parmaster', 'bath_owner', 'organizer', 'partner', 'admin'):
            conn.close(); return err('Нет прав', 403)

        body = json.loads(event.get('body') or '{}')
        url = (body.get('url') or '').strip()
        title = (body.get('title') or '').strip()[:500]
        thumbnail_url = (body.get('thumbnail_url') or '').strip() or None
        owner_type = body.get('owner_type', '')
        owner_id = body.get('owner_id')

        if owner_type not in ('master', 'bath', 'event'):
            conn.close(); return err('Неверный тип владельца')
        if not owner_id:
            conn.close(); return err('Не указан owner_id')

        provider, external_id, embed_url = parse_video_url(url)
        if provider is None:
            conn.close()
            return err('Неподдерживаемый сервис. Используйте VK Video, RuTube или прямую ссылку на .mp4')

        # Считаем sort_order
        cur.execute(
            f"SELECT COALESCE(MAX(sort_order), -1) + 1 FROM {schema}.videos WHERE owner_type = %s AND owner_id = %s",
            [owner_type, int(owner_id)]
        )
        sort_order = cur.fetchone()[0]

        # Статус: admin сразу approved, остальные — pending
        status = 'approved' if has_role(cur, schema, user['id'], 'admin') else 'pending'

        cur.execute(
            f"INSERT INTO {schema}.videos (owner_type, owner_id, provider, external_id, embed_url, thumbnail_url, title, sort_order, status) "
            f"VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id",
            [owner_type, int(owner_id), provider, external_id, embed_url, thumbnail_url, title or None, sort_order, status]
        )
        new_id = cur.fetchone()[0]
        conn.commit(); cur.close(); conn.close()
        return ok({'ok': True, 'id': new_id, 'provider': provider, 'embed_url': embed_url, 'status': status})

    # ── PUT обновить своё видео ────────────────────────────────────────────────
    if method == 'PUT' and params.get('me') == '1':
        if not user_token:
            return err('Не авторизован', 401)
        video_id = params.get('video_id')
        if not video_id:
            return err('Не указан video_id')
        conn = get_conn()
        cur = conn.cursor()
        user = get_user_from_token(cur, schema, user_token)
        if not user:
            conn.close(); return err('Не авторизован', 401)

        body = json.loads(event.get('body') or '{}')
        fields, vals = [], []
        if 'title' in body:
            fields.append('title = %s'); vals.append((body['title'] or '').strip()[:500] or None)
        if 'sort_order' in body:
            fields.append('sort_order = %s'); vals.append(int(body['sort_order']))
        if not fields:
            conn.close(); return err('Нет полей для обновления')
        vals.append(int(video_id))
        cur.execute(f"UPDATE {schema}.videos SET {', '.join(fields)} WHERE id = %s", vals)
        conn.commit(); cur.close(); conn.close()
        return ok({'ok': True})

    # ── DELETE удалить своё видео ──────────────────────────────────────────────
    if method == 'DELETE' and params.get('me') == '1':
        if not user_token:
            return err('Не авторизован', 401)
        video_id = params.get('video_id')
        if not video_id:
            return err('Не указан video_id')
        conn = get_conn()
        cur = conn.cursor()
        user = get_user_from_token(cur, schema, user_token)
        if not user:
            conn.close(); return err('Не авторизован', 401)
        cur.execute(
            f"UPDATE {schema}.videos SET status = 'deleted' WHERE id = %s",
            [int(video_id)]
        )
        conn.commit(); cur.close(); conn.close()
        return ok({'ok': True})

    # ── GET admin — все видео ──────────────────────────────────────────────────
    if method == 'GET' and params.get('admin') == '1':
        if not verify_admin_token(admin_token):
            return err('Не авторизован', 401)
        conn = get_conn()
        cur = conn.cursor()
        status_filter = params.get('status', 'pending')
        cur.execute(
            f"SELECT id, owner_type, owner_id, provider, embed_url, thumbnail_url, title, status, created_at "
            f"FROM {schema}.videos WHERE status = %s ORDER BY created_at DESC LIMIT 100",
            [status_filter]
        )
        rows = cur.fetchall()
        cols = [d[0] for d in cur.description]
        videos = [dict(zip(cols, r)) for r in rows]
        cur.close(); conn.close()
        return ok({'videos': videos})

    # ── PUT admin_moderate ─────────────────────────────────────────────────────
    if method == 'PUT' and params.get('admin_moderate') == '1':
        if not verify_admin_token(admin_token):
            return err('Не авторизован', 401)
        body = json.loads(event.get('body') or '{}')
        video_id = body.get('id')
        new_status = body.get('status')
        if not video_id or new_status not in ('approved', 'rejected', 'pending'):
            return err('Неверные параметры')
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f"UPDATE {schema}.videos SET status = %s WHERE id = %s", [new_status, int(video_id)])
        conn.commit(); cur.close(); conn.close()
        return ok({'ok': True})

    return err('Метод не поддерживается', 405)