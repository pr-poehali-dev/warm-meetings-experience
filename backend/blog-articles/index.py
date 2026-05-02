import json
import os
from datetime import datetime

import psycopg2
import psycopg2.extras

from shared import *


def get_user_and_roles(cur, schema, token):
    """Получить пользователя и его роли по токену сессии"""
    t = token.replace("'", "''")
    cur.execute(f"""
        SELECT u.id, u.name, u.email
        FROM {schema}.user_sessions s
        JOIN {schema}.users u ON u.id = s.user_id
        WHERE s.token = '{t}' AND s.expires_at > CURRENT_TIMESTAMP AND u.is_active = true
    """)
    user = cur.fetchone()
    if not user:
        return None, []
    uid = user['id']
    cur.execute(f"""
        SELECT r.slug FROM {schema}.user_roles ur
        JOIN {schema}.roles r ON r.id = ur.role_id
        WHERE ur.user_id = {uid} AND ur.status = 'active'
    """)
    roles = [row['slug'] for row in cur.fetchall()]
    return dict(user), roles


def handler(event, context):
    """API для статей блога: чтение, создание, редактирование, модерация"""
    if event.get('httpMethod') == 'OPTIONS':
        return options_response()

    method = event.get('httpMethod', 'GET')
    params = event.get('queryStringParameters') or {}
    headers_in = event.get('headers') or {}
    token = headers_in.get('X-Session-Token', '')
    admin_token = headers_in.get('X-Admin-Token', '')
    raw_body = event.get('body') or '{}'
    body = json.loads(raw_body) if raw_body else {}

    schema = get_schema()
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    action = params.get('action', '')

    # --- Публичные: список опубликованных статей ---
    if method == 'GET' and not action:
        category = params.get('category', '')
        slug = params.get('slug', '')

        if slug:
            s = slug.replace("'", "''")
            cur.execute(f"""
                SELECT a.*, u.name as author_name
                FROM {schema}.blog_articles a
                JOIN {schema}.users u ON u.id = a.author_id
                WHERE a.slug = '{s}' AND a.status = 'published'
            """)
            article = cur.fetchone()
            conn.close()
            if not article:
                return respond(404, {'error': 'Статья не найдена'})
            return respond(200, {'article': dict(article)})

        where = "a.status = 'published'"
        if category:
            c = category.replace("'", "''")
            where += f" AND a.category = '{c}'"

        cur.execute(f"""
            SELECT a.id, a.title, a.slug, a.excerpt, a.category, a.image_url,
                   a.read_time, a.popular, a.published_at, a.created_at,
                   u.name as author_name
            FROM {schema}.blog_articles a
            JOIN {schema}.users u ON u.id = a.author_id
            WHERE {where}
            ORDER BY a.published_at DESC, a.created_at DESC
        """)
        articles = [dict(r) for r in cur.fetchall()]
        conn.close()
        return respond(200, {'articles': articles})

    # --- Мои статьи (авторизован) ---
    if method == 'GET' and action == 'my':
        if not token:
            conn.close()
            return respond(401, {'error': 'Не авторизован'})
        user, roles = get_user_and_roles(cur, schema, token)
        if not user:
            conn.close()
            return respond(401, {'error': 'Сессия истекла'})
        uid = user['id']
        cur.execute(f"""
            SELECT id, title, slug, excerpt, category, image_url,
                   status, reject_reason, read_time, popular, created_at, updated_at
            FROM {schema}.blog_articles
            WHERE author_id = {uid}
            ORDER BY created_at DESC
        """)
        articles = [dict(r) for r in cur.fetchall()]
        conn.close()
        return respond(200, {'articles': articles})

    # --- Все статьи для админа ---
    if method == 'GET' and action == 'admin':
        is_admin = verify_admin_token(admin_token)
        if not is_admin and token:
            _, roles = get_user_and_roles(cur, schema, token)
            is_admin = 'admin' in roles
        if not is_admin:
            conn.close()
            return respond(401, {'error': 'Не авторизован'})

        status_filter = params.get('status', '')
        where = '1=1'
        if status_filter:
            sf = status_filter.replace("'", "''")
            where = f"a.status = '{sf}'"

        cur.execute(f"""
            SELECT a.id, a.title, a.slug, a.excerpt, a.category, a.image_url,
                   a.status, a.reject_reason, a.read_time, a.popular,
                   a.published_at, a.created_at, a.updated_at,
                   u.name as author_name, u.id as author_id
            FROM {schema}.blog_articles a
            JOIN {schema}.users u ON u.id = a.author_id
            WHERE {where}
            ORDER BY
                CASE a.status WHEN 'pending' THEN 0 WHEN 'draft' THEN 1 WHEN 'published' THEN 2 ELSE 3 END,
                a.created_at DESC
        """)
        articles = [dict(r) for r in cur.fetchall()]
        conn.close()
        return respond(200, {'articles': articles})

    # --- Создать статью ---
    if method == 'POST' and action == 'create':
        if not token:
            conn.close()
            return respond(401, {'error': 'Не авторизован'})
        user, roles = get_user_and_roles(cur, schema, token)
        if not user:
            conn.close()
            return respond(401, {'error': 'Сессия истекла'})

        title = (body.get('title') or '').strip()
        content = (body.get('content') or '').strip()
        excerpt = (body.get('excerpt') or '').strip()
        category = (body.get('category') or 'rituals').strip()
        image_url = (body.get('image_url') or '').strip()
        read_time = int(body.get('read_time') or 5)

        if not title or not content:
            conn.close()
            return respond(400, {'error': 'Заголовок и текст обязательны'})

        # Редактор публикует сразу, остальные — на модерацию
        is_editor = 'editor' in roles or 'admin' in roles
        status = 'published' if is_editor else 'pending'
        published_at = f"'{datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}'" if is_editor else 'NULL'

        base_slug = slugify(title)
        slug = base_slug
        t = title.replace("'", "''")
        e = excerpt.replace("'", "''")
        c = content.replace("'", "''")
        cat = category.replace("'", "''")
        img = image_url.replace("'", "''")

        # уникальность slug
        counter = 1
        while True:
            sl = slug.replace("'", "''")
            cur.execute(f"SELECT id FROM {schema}.blog_articles WHERE slug = '{sl}'")
            if not cur.fetchone():
                break
            slug = f"{base_slug}-{counter}"
            counter += 1

        cur.execute(f"""
            INSERT INTO {schema}.blog_articles
                (title, slug, excerpt, content, category, image_url, author_id, status, read_time, published_at)
            VALUES
                ('{t}', '{slug}', '{e}', '{c}', '{cat}', '{img}', {user['id']}, '{status}', {read_time}, {published_at})
            RETURNING id, slug, status
        """)
        article = cur.fetchone()
        conn.commit()
        conn.close()
        return respond(200, {'article': dict(article), 'status': status})

    # --- Обновить статью (автор или админ) ---
    if method == 'PUT' and action == 'update':
        if not token:
            conn.close()
            return respond(401, {'error': 'Не авторизован'})
        user, roles = get_user_and_roles(cur, schema, token)
        if not user:
            conn.close()
            return respond(401, {'error': 'Сессия истекла'})

        article_id = int(body.get('id') or 0)
        if not article_id:
            conn.close()
            return respond(400, {'error': 'ID статьи обязателен'})

        cur.execute(f"SELECT * FROM {schema}.blog_articles WHERE id = {article_id}")
        existing = cur.fetchone()
        if not existing:
            conn.close()
            return respond(404, {'error': 'Статья не найдена'})

        is_admin = 'admin' in roles
        is_author = existing['author_id'] == user['id']
        if not is_admin and not is_author:
            conn.close()
            return respond(403, {'error': 'Нет доступа'})

        title = (body.get('title') or existing['title']).strip()
        content = (body.get('content') or existing['content']).strip()
        excerpt = (body.get('excerpt') or existing['excerpt'] or '').strip()
        category = (body.get('category') or existing['category']).strip()
        image_url = (body.get('image_url') or existing['image_url'] or '').strip()
        read_time = int(body.get('read_time') or existing['read_time'] or 5)
        popular = body.get('popular', existing['popular'])

        t = title.replace("'", "''")
        c = content.replace("'", "''")
        e = excerpt.replace("'", "''")
        cat = category.replace("'", "''")
        img = image_url.replace("'", "''")
        pop = 'true' if popular else 'false'

        # Если автор (не редактор) редактирует — снова на модерацию
        is_editor = 'editor' in roles or is_admin
        new_status = existing['status']
        published_at_set = ''
        if not is_editor and existing['status'] == 'published':
            new_status = 'pending'
            published_at_set = ", published_at = NULL"
        elif is_editor and existing['status'] != 'published' and body.get('publish'):
            new_status = 'published'
            published_at_set = f", published_at = '{datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}'"

        cur.execute(f"""
            UPDATE {schema}.blog_articles
            SET title='{t}', content='{c}', excerpt='{e}', category='{cat}',
                image_url='{img}', read_time={read_time}, popular={pop},
                status='{new_status}', updated_at=CURRENT_TIMESTAMP{published_at_set}
            WHERE id = {article_id}
            RETURNING id, slug, status
        """)
        updated = cur.fetchone()
        conn.commit()
        conn.close()
        return respond(200, {'article': dict(updated)})

    # --- Модерация (только админ) ---
    if method == 'PUT' and action == 'moderate':
        is_admin = verify_admin_token(admin_token)
        if not is_admin and token:
            _, roles = get_user_and_roles(cur, schema, token)
            is_admin = 'admin' in roles
        if not is_admin:
            conn.close()
            return respond(401, {'error': 'Не авторизован'})

        article_id = int(body.get('id') or 0)
        decision = body.get('decision', '')  # 'approve' | 'reject'
        reject_reason = (body.get('reject_reason') or '').strip()

        if not article_id or decision not in ('approve', 'reject'):
            conn.close()
            return respond(400, {'error': 'Неверные параметры'})

        if decision == 'approve':
            cur.execute(f"""
                UPDATE {schema}.blog_articles
                SET status='published', published_at=CURRENT_TIMESTAMP,
                    reject_reason=NULL, updated_at=CURRENT_TIMESTAMP
                WHERE id = {article_id}
                RETURNING id, slug, status
            """)
        else:
            rr = reject_reason.replace("'", "''")
            cur.execute(f"""
                UPDATE {schema}.blog_articles
                SET status='rejected', reject_reason='{rr}', updated_at=CURRENT_TIMESTAMP
                WHERE id = {article_id}
                RETURNING id, slug, status
            """)

        result = cur.fetchone()
        conn.commit()
        conn.close()
        return respond(200, {'article': dict(result)})

    # --- Установить popular (только админ) ---
    if method == 'PUT' and action == 'set-popular':
        is_admin = verify_admin_token(admin_token)
        if not is_admin and token:
            _, roles = get_user_and_roles(cur, schema, token)
            is_admin = 'admin' in roles
        if not is_admin:
            conn.close()
            return respond(401, {'error': 'Не авторизован'})

        article_id = int(body.get('id') or 0)
        popular = bool(body.get('popular', False))
        pop = 'true' if popular else 'false'

        cur.execute(f"""
            UPDATE {schema}.blog_articles SET popular={pop}, updated_at=CURRENT_TIMESTAMP
            WHERE id = {article_id}
            RETURNING id, popular
        """)
        result = cur.fetchone()
        conn.commit()
        conn.close()
        return respond(200, {'article': dict(result)})

    conn.close()
    return respond(400, {'error': 'Неизвестный запрос'})