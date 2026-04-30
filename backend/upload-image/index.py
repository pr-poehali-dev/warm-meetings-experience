import os
import base64
import boto3
import uuid
import json
from datetime import datetime


VIDEO_CONTENT_TYPES = {
    'mp4': 'video/mp4',
    'mov': 'video/quicktime',
    'avi': 'video/x-msvideo',
    'webm': 'video/webm',
    'mkv': 'video/x-matroska',
}

IMAGE_CONTENT_TYPES = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'heic': 'image/heic',
}


def handler(event: dict, context) -> dict:
    """Загрузка изображений и видео в S3. Поддерживает folder: events, masters, portfolio"""

    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400',
            },
            'body': ''
        }

    raw_body = event.get('body') or '{}'
    body = json.loads(raw_body) if raw_body.strip() else {}
    file_data = body.get('image', '') or body.get('file', '')
    filename = body.get('filename', 'file.jpg')
    folder = body.get('folder', 'events')

    if not file_data:
        return {
            'statusCode': 400,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'No file provided'})
        }

    if ',' in file_data:
        header, encoded = file_data.split(',', 1)
        content_type = header.split(':')[1].split(';')[0] if ':' in header else 'image/jpeg'
    else:
        encoded = file_data
        content_type = 'image/jpeg'

    file_bytes = base64.b64decode(encoded)

    ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else 'jpg'

    # Определяем content_type по расширению если не определён из заголовка data URI
    if content_type in ('image/jpeg', 'application/octet-stream'):
        if ext in VIDEO_CONTENT_TYPES:
            content_type = VIDEO_CONTENT_TYPES[ext]
        elif ext in IMAGE_CONTENT_TYPES:
            content_type = IMAGE_CONTENT_TYPES[ext]

    is_video = content_type.startswith('video/')
    date_prefix = datetime.now().strftime('%Y%m')
    unique_name = f"{folder}/{date_prefix}/{uuid.uuid4().hex}.{ext}"

    s3 = boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
    )

    s3.put_object(
        Bucket='files',
        Key=unique_name,
        Body=file_bytes,
        ContentType=content_type,
    )

    cdn_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{unique_name}"

    return {
        'statusCode': 200,
        'headers': {'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'url': cdn_url, 'type': 'video' if is_video else 'image', 'content_type': content_type})
    }
