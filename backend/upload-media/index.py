import json
import os
import base64
import uuid
import boto3
import psycopg2
from datetime import datetime

from shared import *

# Форматы медиа:
# Фото:              JPG/PNG/WebP/GIF/HEIC, до 10 МБ
# Видео горизонт.:   16:9 (1920x1080), MP4/MOV/AVI/WebM, до 100 МБ
# Видео вертикальн.: 9:16 (1080x1920), MP4/MOV, до 50 МБ

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif", "image/heic"}
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/quicktime", "video/x-msvideo", "video/webm", "video/x-matroska"}

MAX_IMAGE_SIZE = 10 * 1024 * 1024
MAX_VIDEO_H_SIZE = 100 * 1024 * 1024
MAX_VIDEO_V_SIZE = 50 * 1024 * 1024

EXT_MAP = {
    "image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png",
    "image/webp": "webp", "image/gif": "gif", "image/heic": "heic",
    "video/mp4": "mp4", "video/quicktime": "mov",
    "video/x-msvideo": "avi", "video/webm": "webm", "video/x-matroska": "mkv"
}

VIDEO_BY_EXT = {
    "mp4": "video/mp4", "mov": "video/quicktime", "avi": "video/x-msvideo",
    "webm": "video/webm", "mkv": "video/x-matroska"
}
IMAGE_BY_EXT = {
    "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
    "gif": "image/gif", "webp": "image/webp", "heic": "image/heic"
}

BATH_FOLDERS = {"baths"}
GENERAL_FOLDERS = {"events", "masters", "portfolio"}


def get_s3():
    return boto3.client(
        "s3",
        endpoint_url="https://bucket.poehali.dev",
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"]
    )


def make_cdn_url(key):
    return f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"


def handler(event: dict, context) -> dict:
    """Универсальная загрузка и удаление фото/видео.

    Режимы:
    - folder=baths + slug + media_type: загрузка для бань с сохранением в БД
    - folder=events|masters|portfolio: универсальная загрузка в S3

    DELETE: удаление файла из S3 и БД (только для бань, требует key + slug + media_type)
    """
    if event.get("httpMethod") == "OPTIONS":
        return options_response()

    method = event.get("httpMethod", "POST")
    params = event.get("queryStringParameters") or {}
    headers = CORS_HEADERS

    # DELETE — удалить файл бани
    if method == "DELETE":
        key = params.get("key")
        bath_slug = params.get("slug")
        media_type = params.get("media_type", "photo")

        if not key or not bath_slug:
            return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": "key и slug обязательны"})}

        get_s3().delete_object(Bucket="files", Key=key)

        conn = get_conn()
        cur = conn.cursor()
        schema = get_schema()
        db_field = "photos" if media_type == "photo" else "videos"

        cur.execute(f"SELECT {db_field} FROM {schema}.baths WHERE slug = %s", [bath_slug])
        row = cur.fetchone()
        if row:
            items = row[0] if isinstance(row[0], list) else json.loads(row[0] or "[]")
            items = [x for x in items if x.get("key") != key]
            cur.execute(f"UPDATE {schema}.baths SET {db_field} = %s WHERE slug = %s",
                        [json.dumps(items, ensure_ascii=False), bath_slug])
            conn.commit()

        cur.close()
        conn.close()
        return {"statusCode": 200, "headers": headers, "body": json.dumps({"ok": True})}

    # POST — загрузить файл
    body = json.loads(event.get("body") or "{}")
    file_data = body.get("file") or body.get("image", "")
    filename = body.get("filename", "file.jpg")
    folder = body.get("folder", "events")
    bath_slug = body.get("slug")
    media_type = body.get("media_type", "photo")  # photo | video_horizontal | video_vertical

    if not file_data:
        return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": "Файл не передан"})}

    # Декодируем base64
    file_type = None
    if "base64," in file_data:
        header, b64 = file_data.split("base64,", 1)
        if ":" in header:
            file_type = header.split(":")[1].split(";")[0].strip()
    else:
        b64 = file_data

    raw = base64.b64decode(b64)
    size = len(raw)

    # Определяем content_type по расширению если нет из data URI
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
        return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": f"Неподдерживаемый тип: {file_type}"})}

    if is_image and size > MAX_IMAGE_SIZE:
        return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": "Фото не должно превышать 10 МБ"})}

    if is_video and media_type == "video_vertical" and size > MAX_VIDEO_V_SIZE:
        return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": "Вертикальное видео не должно превышать 50 МБ"})}

    if is_video and media_type != "video_vertical" and size > MAX_VIDEO_H_SIZE:
        return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": "Видео не должно превышать 100 МБ"})}

    # Формируем S3 ключ
    file_ext = EXT_MAP.get(file_type, ext or "bin")
    uid = uuid.uuid4().hex[:8]

    if folder == "baths" and bath_slug:
        key = f"baths/{bath_slug}/{media_type}/{uid}.{file_ext}"
    else:
        date_prefix = datetime.now().strftime("%Y%m")
        key = f"{folder}/{date_prefix}/{uid}.{file_ext}"

    # Загрузка в S3
    get_s3().put_object(Bucket="files", Key=key, Body=raw, ContentType=file_type)
    url = make_cdn_url(key)

    # Сохраняем в БД только для бань
    if folder == "baths" and bath_slug:
        conn = get_conn()
        cur = conn.cursor()
        schema = get_schema()
        media_item = {"key": key, "url": url, "type": media_type, "mime": file_type}
        db_field = "photos" if (is_image or media_type == "photo") else "videos"

        cur.execute(f"SELECT {db_field} FROM {schema}.baths WHERE slug = %s", [bath_slug])
        row = cur.fetchone()
        items = row[0] if (row and isinstance(row[0], list)) else json.loads((row[0] if row else None) or "[]")
        items.append(media_item)
        cur.execute(f"UPDATE {schema}.baths SET {db_field} = %s WHERE slug = %s",
                    [json.dumps(items, ensure_ascii=False), bath_slug])
        conn.commit()
        cur.close()
        conn.close()

    return {"statusCode": 200, "headers": headers, "body": json.dumps({
        "url": url,
        "key": key,
        "type": "video" if is_video else "image",
        "content_type": file_type,
        "media_type": media_type,
        "size_kb": round(size / 1024)
    }, ensure_ascii=False)}
