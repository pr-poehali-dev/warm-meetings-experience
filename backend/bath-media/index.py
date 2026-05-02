import json
import os
import base64
import uuid
import boto3
import psycopg2

from shared import *

# Форматы медиа для бань:
# Фото:              16:9, JPG/PNG/WebP, до 10 МБ — обложка и галерея
# Видео горизонт.:   16:9 (1920x1080), MP4/MOV, до 100 МБ — экскурсия, обзор
# Видео вертикальн.: 9:16 (1080x1920), MP4/MOV, до 50 МБ  — Reels/Stories формат

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/jpg"}
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/quicktime", "video/x-msvideo", "video/webm"}

MAX_IMAGE_SIZE = 10 * 1024 * 1024   # 10 МБ
MAX_VIDEO_H_SIZE = 100 * 1024 * 1024  # 100 МБ горизонтальное
MAX_VIDEO_V_SIZE = 50 * 1024 * 1024   # 50 МБ вертикальное


def get_s3():
    return boto3.client(
        "s3",
        endpoint_url="https://bucket.poehali.dev",
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"]
    )

def cdn_url(key):
    project_id = os.environ["AWS_ACCESS_KEY_ID"]
    return f"https://cdn.poehali.dev/projects/{project_id}/bucket/{key}"

def handler(event, context):
    """Загрузка и удаление фото/видео для бань.
    
    Форматы:
    - photo: 16:9 (горизонтальный), JPG/PNG/WebP до 10 МБ
    - video_horizontal: 16:9 (1920×1080), MP4/MOV до 100 МБ
    - video_vertical: 9:16 (1080×1920), MP4/MOV до 50 МБ
    """
    if event.get("httpMethod") == "OPTIONS":
        return options_response()

    method = event.get("httpMethod", "POST")
    params = event.get("queryStringParameters") or {}

    # DELETE — удалить файл
    if method == "DELETE":
        key = params.get("key")
        bath_slug = params.get("slug")
        media_type = params.get("media_type", "photo")
        if not key or not bath_slug:
            return {"statusCode": 400, "headers": CORS_HEADERS, "body": json.dumps({"error": "key и slug обязательны"})}

        s3 = get_s3()
        s3.delete_object(Bucket="files", Key=key)

        conn = get_conn()
        cur = conn.cursor()
        schema = get_schema()

        if media_type == "photo":
            cur.execute(f"SELECT photos FROM {schema}.baths WHERE slug = %s", [bath_slug])
            row = cur.fetchone()
            if row:
                items = row[0] if isinstance(row[0], list) else json.loads(row[0] or "[]")
                items = [x for x in items if x.get("key") != key]
                cur.execute(f"UPDATE {schema}.baths SET photos = %s WHERE slug = %s",
                            [json.dumps(items, ensure_ascii=False), bath_slug])
        else:
            cur.execute(f"SELECT videos FROM {schema}.baths WHERE slug = %s", [bath_slug])
            row = cur.fetchone()
            if row:
                items = row[0] if isinstance(row[0], list) else json.loads(row[0] or "[]")
                items = [x for x in items if x.get("key") != key]
                cur.execute(f"UPDATE {schema}.baths SET videos = %s WHERE slug = %s",
                            [json.dumps(items, ensure_ascii=False), bath_slug])

        conn.commit()
        cur.close()
        conn.close()
        return {"statusCode": 200, "headers": CORS_HEADERS, "body": json.dumps({"ok": True})}

    # POST — загрузить файл
    body = json.loads(event.get("body") or "{}")
    file_data = body.get("file")       # base64 data URL или чистый base64
    file_type = body.get("file_type")  # MIME type
    bath_slug = body.get("slug")
    media_type = body.get("media_type", "photo")  # photo | video_horizontal | video_vertical

    if not file_data or not bath_slug:
        return {"statusCode": 400, "headers": CORS_HEADERS, "body": json.dumps({"error": "file и slug обязательны"})}

    # Декодируем base64
    if "base64," in file_data:
        header, b64 = file_data.split("base64,", 1)
        if not file_type:
            file_type = header.replace("data:", "").replace(";", "").strip()
    else:
        b64 = file_data

    raw = base64.b64decode(b64)
    size = len(raw)

    # Валидация типа и размера
    is_image = file_type in ALLOWED_IMAGE_TYPES
    is_video = file_type in ALLOWED_VIDEO_TYPES

    if not is_image and not is_video:
        return {"statusCode": 400, "headers": CORS_HEADERS, "body": json.dumps({"error": f"Неподдерживаемый тип: {file_type}"})}

    if is_image and size > MAX_IMAGE_SIZE:
        return {"statusCode": 400, "headers": CORS_HEADERS, "body": json.dumps({"error": "Фото не должно превышать 10 МБ"})}

    if media_type == "video_vertical" and size > MAX_VIDEO_V_SIZE:
        return {"statusCode": 400, "headers": CORS_HEADERS, "body": json.dumps({"error": "Вертикальное видео не должно превышать 50 МБ"})}

    if media_type == "video_horizontal" and size > MAX_VIDEO_H_SIZE:
        return {"statusCode": 400, "headers": CORS_HEADERS, "body": json.dumps({"error": "Горизонтальное видео не должно превышать 100 МБ"})}

    # Расширение
    ext_map = {
        "image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png",
        "image/webp": "webp", "video/mp4": "mp4", "video/quicktime": "mov",
        "video/x-msvideo": "avi", "video/webm": "webm"
    }
    ext = ext_map.get(file_type, "bin")
    uid = str(uuid.uuid4())[:8]
    key = f"baths/{bath_slug}/{media_type}/{uid}.{ext}"

    # Загрузка на S3
    s3 = get_s3()
    s3.put_object(Bucket="files", Key=key, Body=raw, ContentType=file_type)
    url = cdn_url(key)

    # Сохранение в БД
    conn = get_conn()
    cur = conn.cursor()
    schema = get_schema()

    media_item = {"key": key, "url": url, "type": media_type, "mime": file_type}

    if is_image or media_type == "photo":
        cur.execute(f"SELECT photos FROM {schema}.baths WHERE slug = %s", [bath_slug])
        row = cur.fetchone()
        items = row[0] if (row and isinstance(row[0], list)) else json.loads((row[0] if row else None) or "[]")
        items.append(media_item)
        cur.execute(f"UPDATE {schema}.baths SET photos = %s WHERE slug = %s",
                    [json.dumps(items, ensure_ascii=False), bath_slug])
    else:
        cur.execute(f"SELECT videos FROM {schema}.baths WHERE slug = %s", [bath_slug])
        row = cur.fetchone()
        items = row[0] if (row and isinstance(row[0], list)) else json.loads((row[0] if row else None) or "[]")
        items.append(media_item)
        cur.execute(f"UPDATE {schema}.baths SET videos = %s WHERE slug = %s",
                    [json.dumps(items, ensure_ascii=False), bath_slug])

    conn.commit()
    cur.close()
    conn.close()

    return {"statusCode": 200, "headers": CORS_HEADERS, "body": json.dumps({
        "url": url,
        "key": key,
        "media_type": media_type,
        "size_kb": round(size / 1024)
    })}