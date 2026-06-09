import base64
import json
import os
import re
import uuid
from datetime import datetime

import boto3
import psycopg2
import psycopg2.extras

from shared import (
    get_conn, get_schema, options_response, ok, err,
    get_user_from_token, has_role, verify_admin_token, CORS_HEADERS
)

# ═══════════════════════════════════════════════════════════════
# Раздел 1: Загрузка файлов (бывший upload-media)
# ═══════════════════════════════════════════════════════════════

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif", "image/heic"}
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/quicktime", "video/x-msvideo", "video/webm", "video/x-matroska"}

MAX_IMAGE_SIZE    = 10  * 1024 * 1024
MAX_VIDEO_H_SIZE  = 100 * 1024 * 1024
MAX_VIDEO_V_SIZE  = 50  * 1024 * 1024

EXT_MAP = {
    "image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png",
    "image/webp": "webp", "image/gif": "gif", "image/heic": "heic",
    "video/mp4": "mp4", "video/quicktime": "mov",
    "video/x-msvideo": "avi", "video/webm": "webm", "video/x-matroska": "mkv",
}
VIDEO_BY_EXT = {
    "mp4": "video/mp4", "mov": "video/quicktime", "avi": "video/x-msvideo",
    "webm": "video/webm", "mkv": "video/x-matroska",
}
IMAGE_BY_EXT = {
    "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
    "gif": "image/gif", "webp": "image/webp", "heic": "image/heic",
}


def get_s3():
    return boto3.client(
        "s3",
        endpoint_url="https://bucket.poehali.dev",
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
    )


def make_cdn_url(key):
    return f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"


def _upload_file(event: dict) -> dict:
    """POST — загрузить файл в S3 (фото или видео)."""
    params = event.get("queryStringParameters") or {}
    body = json.loads(event.get("body") or "{}")

    file_data = body.get("file") or body.get("image", "")
    filename   = body.get("filename", "file.jpg")
    folder     = body.get("folder", "events")
    bath_slug  = body.get("slug")
    media_type = body.get("media_type", "photo")  # photo | video_horizontal | video_vertical

    if not file_data:
        return err("Файл не передан")

    # Декодируем base64
    file_type = None
    if "base64," in file_data:
        header, b64 = file_data.split("base64,", 1)
        if ":" in header:
            file_type = header.split(":")[1].split(";")[0].strip()
    else:
        b64 = file_data

    raw  = base64.b64decode(b64)
    size = len(raw)

    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "jpg"
    if not file_type or file_type in ("image/jpeg", "application/octet-stream"):
        if ext in VIDEO_BY_EXT:
            file_type = VIDEO_BY_EXT[ext]
        elif ext in IMAGE_BY_EXT:
            file_type = IMAGE_BY_EXT[ext]
        else:
            file_type = file_type or "image/jpeg"

    is_image = file_type in ALLOWED_IMAGE_TYPES
    is_video = file_type in ALLOWED_VIDEO_TYPES

    if not is_image and not is_video:
        return err(f"Неподдерживаемый тип: {file_type}")
    if is_image and size > MAX_IMAGE_SIZE:
        return err("Фото не должно превышать 10 МБ")
    if is_video and media_type == "video_vertical" and size > MAX_VIDEO_V_SIZE:
        return err("Вертикальное видео не должно превышать 50 МБ")
    if is_video and media_type != "video_vertical" and size > MAX_VIDEO_H_SIZE:
        return err("Видео не должно превышать 100 МБ")

    file_ext = EXT_MAP.get(file_type, ext or "bin")
    uid = uuid.uuid4().hex[:8]

    if folder == "baths" and bath_slug:
        key = f"baths/{bath_slug}/{media_type}/{uid}.{file_ext}"
    else:
        date_prefix = datetime.now().strftime("%Y%m")
        key = f"{folder}/{date_prefix}/{uid}.{file_ext}"

    get_s3().put_object(Bucket="files", Key=key, Body=raw, ContentType=file_type)
    url = make_cdn_url(key)

    # Сохраняем в БД только для бань
    if folder == "baths" and bath_slug:
        conn = get_conn()
        cur  = conn.cursor()
        schema = get_schema()
        media_item = {"key": key, "url": url, "type": media_type, "mime": file_type}
        db_field   = "photos" if (is_image or media_type == "photo") else "videos"

        cur.execute(f"SELECT {db_field} FROM {schema}.baths WHERE slug = %s", [bath_slug])
        row   = cur.fetchone()
        items = row[0] if (row and isinstance(row[0], list)) else json.loads((row[0] if row else None) or "[]")
        items.append(media_item)
        cur.execute(
            f"UPDATE {schema}.baths SET {db_field} = %s WHERE slug = %s",
            [json.dumps(items, ensure_ascii=False), bath_slug],
        )
        conn.commit()
        cur.close()
        conn.close()

    return ok({
        "url": url,
        "key": key,
        "type": "video" if is_video else "image",
        "content_type": file_type,
        "media_type": media_type,
        "size_kb": round(size / 1024),
    })


def _delete_file(event: dict) -> dict:
    """DELETE — удалить файл из S3 и БД (только для бань)."""
    params    = event.get("queryStringParameters") or {}
    key       = params.get("key")
    bath_slug = params.get("slug")
    media_type = params.get("media_type", "photo")

    if not key or not bath_slug:
        return err("key и slug обязательны")

    get_s3().delete_object(Bucket="files", Key=key)

    conn   = get_conn()
    cur    = conn.cursor()
    schema = get_schema()
    db_field = "photos" if media_type == "photo" else "videos"

    cur.execute(f"SELECT {db_field} FROM {schema}.baths WHERE slug = %s", [bath_slug])
    row = cur.fetchone()
    if row:
        items = row[0] if isinstance(row[0], list) else json.loads(row[0] or "[]")
        items = [x for x in items if x.get("key") != key]
        cur.execute(
            f"UPDATE {schema}.baths SET {db_field} = %s WHERE slug = %s",
            [json.dumps(items, ensure_ascii=False), bath_slug],
        )
        conn.commit()

    cur.close()
    conn.close()
    return ok({"ok": True})


# ═══════════════════════════════════════════════════════════════
# Раздел 1б: Медиа событий (event_media)
# ═══════════════════════════════════════════════════════════════

def _event_media_list(params: dict) -> dict:
    """GET ?event_media=1&event_id=N — список медиафайлов события."""
    event_id = params.get('event_id')
    if not event_id:
        return err('Не указан event_id')
    schema = get_schema()
    conn = get_conn(); cur = conn.cursor()
    cur.execute(
        f"SELECT id, event_id, s3_key, url, media_type, mime_type, sort_order, created_at "
        f"FROM {schema}.event_media WHERE event_id = %s ORDER BY sort_order ASC, id ASC",
        [int(event_id)],
    )
    rows = cur.fetchall(); cols = [d[0] for d in cur.description]
    cur.close(); conn.close()
    return ok({'media': [dict(zip(cols, r)) for r in rows]})


def _event_media_upload(event: dict, user_token: str) -> dict:
    """POST ?event_media=1 — загрузить файл и записать в event_media."""
    if not user_token:
        return err('Не авторизован', 401)
    schema = get_schema()
    conn = get_conn(); cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    user = get_user_from_token(cur, schema, user_token)
    if not user:
        conn.close(); return err('Не авторизован', 401)

    body = json.loads(event.get('body') or '{}')
    event_id = body.get('event_id')
    if not event_id:
        conn.close(); return err('Не указан event_id')

    # Проверяем что пользователь — организатор события или админ
    cur.execute(f"SELECT organizer_id FROM {schema}.events WHERE id = %s", [int(event_id)])
    ev_row = cur.fetchone()
    if not ev_row:
        conn.close(); return err('Событие не найдено', 404)
    is_admin = has_role(cur, schema, user['id'], 'admin')
    if not is_admin and ev_row['organizer_id'] != user['id']:
        conn.close(); return err('Нет прав', 403)

    # Загружаем файл в S3 (переиспользуем _upload_file логику)
    file_data = body.get('file') or body.get('image', '')
    filename = body.get('filename', 'file.jpg')
    if not file_data:
        conn.close(); return err('Файл не передан')

    file_type = None
    if 'base64,' in file_data:
        header, b64 = file_data.split('base64,', 1)
        if ':' in header:
            file_type = header.split(':')[1].split(';')[0].strip()
    else:
        b64 = file_data

    raw = base64.b64decode(b64)
    size = len(raw)
    ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else 'jpg'
    if not file_type or file_type in ('image/jpeg', 'application/octet-stream'):
        if ext in VIDEO_BY_EXT:
            file_type = VIDEO_BY_EXT[ext]
        elif ext in IMAGE_BY_EXT:
            file_type = IMAGE_BY_EXT[ext]
        else:
            file_type = file_type or 'image/jpeg'

    is_image = file_type in ALLOWED_IMAGE_TYPES
    is_video = file_type in ALLOWED_VIDEO_TYPES
    if not is_image and not is_video:
        conn.close(); return err(f'Неподдерживаемый тип: {file_type}')
    if is_image and size > MAX_IMAGE_SIZE:
        conn.close(); return err('Фото не должно превышать 10 МБ')
    if is_video and size > MAX_VIDEO_H_SIZE:
        conn.close(); return err('Видео не должно превышать 100 МБ')

    file_ext = EXT_MAP.get(file_type, ext or 'bin')
    uid = uuid.uuid4().hex[:8]
    date_prefix = datetime.now().strftime('%Y%m')
    key = f"events/{event_id}/{date_prefix}/{uid}.{file_ext}"

    get_s3().put_object(Bucket='files', Key=key, Body=raw, ContentType=file_type)
    url = make_cdn_url(key)
    media_type = 'video' if is_video else 'photo'

    cur.execute(
        f"SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM {schema}.event_media WHERE event_id = %s",
        [int(event_id)],
    )
    sort_order = (cur.fetchone() or {}).get('next_order', 0)

    cur.execute(
        f"INSERT INTO {schema}.event_media (event_id, s3_key, url, media_type, mime_type, sort_order) "
        f"VALUES (%s, %s, %s, %s, %s, %s) RETURNING id",
        [int(event_id), key, url, media_type, file_type, sort_order],
    )
    new_id = (cur.fetchone() or {}).get('id')
    conn.commit(); cur.close(); conn.close()
    return ok({'ok': True, 'id': new_id, 'url': url, 'key': key, 'media_type': media_type})


def _event_media_delete(params: dict, user_token: str) -> dict:
    """DELETE ?event_media=1&media_id=N — удалить медиафайл события."""
    if not user_token:
        return err('Не авторизован', 401)
    media_id = params.get('media_id')
    if not media_id:
        return err('Не указан media_id')
    schema = get_schema()
    conn = get_conn(); cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    user = get_user_from_token(cur, schema, user_token)
    if not user:
        conn.close(); return err('Не авторизован', 401)

    cur.execute(
        f"SELECT em.s3_key, e.organizer_id FROM {schema}.event_media em "
        f"JOIN {schema}.events e ON e.id = em.event_id WHERE em.id = %s",
        [int(media_id)],
    )
    row = cur.fetchone()
    if not row:
        conn.close(); return err('Файл не найден', 404)
    s3_key, organizer_id = row['s3_key'], row['organizer_id']
    is_admin = has_role(cur, schema, user['id'], 'admin')
    if not is_admin and organizer_id != user['id']:
        conn.close(); return err('Нет прав', 403)

    get_s3().delete_object(Bucket='files', Key=s3_key)
    cur.execute(f"DELETE FROM {schema}.event_media WHERE id = %s", [int(media_id)])
    conn.commit(); cur.close(); conn.close()
    return ok({'ok': True})


# ═══════════════════════════════════════════════════════════════
# Раздел 2: Внешние видео (бывший videos-api)
# ═══════════════════════════════════════════════════════════════

VK_PATTERNS = [
    re.compile(r'(?:vk\.com|vk\.ru|vkvideo\.ru)/video(-?\d+)_(\d+)'),
    re.compile(r'(?:vk\.com|vk\.ru|vkvideo\.ru)/clip(-?\d+)_(\d+)'),
]
RUTUBE_PATTERN = re.compile(r'rutube\.ru/video/([a-zA-Z0-9]+)')
DIRECT_PATTERN = re.compile(r'https?://.+\.mp4(\?.*)?$', re.IGNORECASE)


def parse_video_url(url: str):
    url = url.strip()
    for pat in VK_PATTERNS:
        m = pat.search(url)
        if m:
            oid, vid = m.group(1), m.group(2)
            return 'vk_video', f"{oid}_{vid}", f"https://vk.com/video_ext.php?oid={oid}&id={vid}&hd=2&js_api=1"
    m = RUTUBE_PATTERN.search(url)
    if m:
        vid = m.group(1)
        return 'rutube', vid, f"https://rutube.ru/play/embed/{vid}/?skinColor=ff6600&quality=auto"
    if DIRECT_PATTERN.match(url):
        return 'direct', None, url
    return None, None, None


def _ext_videos_get(params: dict) -> dict:
    """GET публичный список одобренных внешних видео."""
    owner_type = params['owner_type']
    owner_id   = int(params['owner_id'])
    schema     = get_schema()
    conn = get_conn(); cur = conn.cursor()
    cur.execute(
        f"SELECT id, provider, embed_url, thumbnail_url, title, sort_order, status "
        f"FROM {schema}.videos "
        f"WHERE owner_type = %s AND owner_id = %s AND status = 'approved' "
        f"ORDER BY sort_order ASC, id ASC",
        [owner_type, owner_id],
    )
    rows = cur.fetchall(); cols = [d[0] for d in cur.description]
    cur.close(); conn.close()
    return ok({'videos': [dict(zip(cols, r)) for r in rows]})


def _ext_videos_add(event: dict, user_token: str) -> dict:
    """POST ?videos=1&me=1 — добавить внешнее видео."""
    if not user_token:
        return err('Не авторизован', 401)
    schema = get_schema()
    conn = get_conn(); cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    user = get_user_from_token(cur, schema, user_token)
    if not user:
        conn.close(); return err('Не авторизован', 401)
    if not has_role(cur, schema, user['id'], 'parmaster', 'bath_owner', 'organizer', 'partner', 'admin'):
        conn.close(); return err('Нет прав', 403)

    body        = json.loads(event.get('body') or '{}')
    url         = (body.get('url') or '').strip()
    title       = (body.get('title') or '').strip()[:500]
    thumbnail   = (body.get('thumbnail_url') or '').strip() or None
    owner_type  = body.get('owner_type', '')
    owner_id    = body.get('owner_id')

    if owner_type not in ('master', 'bath', 'event'):
        conn.close(); return err('Неверный тип владельца')
    if not owner_id:
        conn.close(); return err('Не указан owner_id')

    provider, external_id, embed_url = parse_video_url(url)
    if provider is None:
        conn.close()
        return err('Неподдерживаемый сервис. Используйте VK Video, RuTube или прямую ссылку на .mp4')

    cur.execute(
        f"SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM {schema}.videos WHERE owner_type = %s AND owner_id = %s",
        [owner_type, int(owner_id)],
    )
    sort_order = cur.fetchone()['next_order']
    status = 'approved'

    cur.execute(
        f"INSERT INTO {schema}.videos "
        f"(owner_type, owner_id, provider, external_id, embed_url, thumbnail_url, title, sort_order, status) "
        f"VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id",
        [owner_type, int(owner_id), provider, external_id, embed_url, thumbnail, title or None, sort_order, status],
    )
    new_id = cur.fetchone()['id']
    conn.commit()

    owner_label = {'master': 'Мастер', 'bath': 'Баня', 'event': 'Событие'}.get(owner_type, owner_type)
    video_title = title or provider
    tg_notify_admin(
        f"📹 Новое видео ({owner_label} #{owner_id})\n"
        f"Название: {video_title}\n"
        f"Провайдер: {provider}\n"
        f"Ссылка: {embed_url}\n"
        f"Чтобы заблокировать — откройте Админ → Видео"
    )

    cur.close(); conn.close()
    return ok({'ok': True, 'id': new_id, 'provider': provider, 'embed_url': embed_url, 'status': status})


def _ext_videos_update(event: dict, params: dict, user_token: str) -> dict:
    """PUT ?videos=1&me=1&video_id=N — обновить название/порядок."""
    if not user_token:
        return err('Не авторизован', 401)
    video_id = params.get('video_id')
    if not video_id:
        return err('Не указан video_id')
    schema = get_schema()
    conn = get_conn(); cur = conn.cursor()
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


def _user_owns_video(cur, schema: str, user_id: int, owner_type: str, owner_id: int) -> bool:
    """Проверяет, принадлежит ли owner-объект (мастер/баня/событие) пользователю."""
    if owner_type == 'master':
        cur.execute(f"SELECT 1 FROM {schema}.masters WHERE id = %s AND user_id = %s", [owner_id, user_id])
    elif owner_type == 'bath':
        cur.execute(f"SELECT 1 FROM {schema}.baths WHERE id = %s AND owner_id = %s", [owner_id, user_id])
    elif owner_type == 'event':
        cur.execute(f"SELECT 1 FROM {schema}.events WHERE id = %s AND organizer_id = %s", [owner_id, user_id])
    else:
        return False
    return cur.fetchone() is not None


def _ext_videos_delete(params: dict, user_token: str) -> dict:
    """DELETE ?videos=1&me=1&video_id=N — удаление видео владельцем."""
    if not user_token:
        return err('Не авторизован', 401)
    video_id = params.get('video_id')
    if not video_id:
        return err('Не указан video_id')
    schema = get_schema()
    conn = get_conn(); cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    user = get_user_from_token(cur, schema, user_token)
    if not user:
        conn.close(); return err('Не авторизован', 401)

    cur.execute(f"SELECT owner_type, owner_id FROM {schema}.videos WHERE id = %s", [int(video_id)])
    row = cur.fetchone()
    if not row:
        cur.close(); conn.close(); return ok({'ok': True})

    is_admin = has_role(cur, schema, user['id'], 'admin')
    if not is_admin and not _user_owns_video(cur, schema, user['id'], row['owner_type'], int(row['owner_id'])):
        cur.close(); conn.close(); return err('Нет прав', 403)

    cur.execute(f"DELETE FROM {schema}.videos WHERE id = %s", [int(video_id)])
    conn.commit(); cur.close(); conn.close()
    return ok({'ok': True})


def _ext_videos_admin_list(params: dict, admin_token: str) -> dict:
    """GET ?videos=1&admin=1 — список видео для администратора."""
    if not verify_admin_token(admin_token):
        return err('Не авторизован', 401)
    schema = get_schema()
    conn = get_conn(); cur = conn.cursor()
    status_filter = params.get('status', 'approved')
    cur.execute(
        f"SELECT id, owner_type, owner_id, provider, embed_url, thumbnail_url, title, status, created_at "
        f"FROM {schema}.videos WHERE status = %s ORDER BY created_at DESC LIMIT 100",
        [status_filter],
    )
    rows = cur.fetchall(); cols = [d[0] for d in cur.description]
    cur.close(); conn.close()
    return ok({'videos': [dict(zip(cols, r)) for r in rows]})


def _ext_videos_admin_moderate(event: dict, admin_token: str) -> dict:
    """PUT ?admin_moderate=1 — заблокировать/разблокировать видео."""
    if not verify_admin_token(admin_token):
        return err('Не авторизован', 401)
    body       = json.loads(event.get('body') or '{}')
    video_id   = body.get('id')
    new_status = body.get('status')
    if not video_id or new_status not in ('approved', 'blocked'):
        return err('Неверные параметры')
    schema = get_schema()
    conn = get_conn(); cur = conn.cursor()
    cur.execute(f"UPDATE {schema}.videos SET status = %s WHERE id = %s", [new_status, int(video_id)])
    conn.commit(); cur.close(); conn.close()
    return ok({'ok': True})


# ═══════════════════════════════════════════════════════════════
# Главный handler
# ═══════════════════════════════════════════════════════════════

def handler(event: dict, context) -> dict:
    """
    Единый API для медиа-файлов и внешних видео.

    — Загрузка файлов (фото/видео на S3):
      POST   /              body: {file, filename, folder, ...}
      DELETE /?key=&slug=   удалить файл бани

    — Внешние видео (?videos=1):
      GET    /?videos=1&owner_type=master&owner_id=1
      POST   /?videos=1&me=1
      PUT    /?videos=1&me=1&video_id=N
      DELETE /?videos=1&me=1&video_id=N
      GET    /?videos=1&admin=1&status=pending
      PUT    /?admin_moderate=1
    """
    if event.get('httpMethod') == 'OPTIONS':
        return options_response()

    method = event.get('httpMethod', 'GET')
    params = event.get('queryStringParameters') or {}
    hdrs   = event.get('headers') or {}
    user_token  = (hdrs.get('X-Authorization') or hdrs.get('X-Session-Token') or '').replace('Bearer ', '')
    admin_token = hdrs.get('X-Admin-Token', '')

    # ── Роутинг медиа событий (?event_media=1) ───────────────────────────────
    if params.get('event_media') == '1':
        if method == 'GET':
            return _event_media_list(params)
        if method == 'POST':
            return _event_media_upload(event, user_token)
        if method == 'DELETE':
            return _event_media_delete(params, user_token)
        return err('Метод не поддерживается', 405)

    # ── Роутинг внешних видео (?videos=1 или ?admin_moderate=1) ───────────────
    is_videos = params.get('videos') == '1'
    is_moderate = params.get('admin_moderate') == '1'

    if is_videos or is_moderate:
        if is_moderate:
            return _ext_videos_admin_moderate(event, admin_token)

        if method == 'GET' and params.get('owner_type') and params.get('owner_id'):
            return _ext_videos_get(params)
        if method == 'GET' and params.get('admin') == '1':
            return _ext_videos_admin_list(params, admin_token)
        if method == 'POST' and params.get('me') == '1':
            return _ext_videos_add(event, user_token)
        if method == 'PUT' and params.get('me') == '1':
            return _ext_videos_update(event, params, user_token)
        if method == 'DELETE' and params.get('me') == '1':
            return _ext_videos_delete(params, user_token)
        return err('Метод не поддерживается', 405)

    # ── Роутинг загрузки файлов ────────────────────────────────────────────────
    try:
        if method == 'DELETE':
            return _delete_file(event)
        if method == 'POST':
            return _upload_file(event)
    except Exception as e:
        return err(f'Ошибка сервера: {str(e)[:200]}', 500)

    return err('Метод не поддерживается', 405)