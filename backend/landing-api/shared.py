import json
import os
import re

import psycopg2
import psycopg2.extras


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def get_schema():
    return os.environ.get('MAIN_DB_SCHEMA', 'public')


def get_cursor(conn):
    return conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)


CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Authorization, X-Session-Token, X-Admin-Token',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json',
}


def options_response():
    return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}


def respond(status, body):
    return {'statusCode': status, 'headers': CORS_HEADERS, 'body': json.dumps(body, default=str, ensure_ascii=False)}


def ok(body):
    return respond(200, body)


def err(message, status=400):
    return respond(status, {'error': message})


def get_token(event):
    headers = event.get('headers') or {}
    for k in ('X-Session-Token', 'x-session-token', 'X-Auth-Token', 'x-auth-token'):
        v = headers.get(k)
        if v:
            return v.strip()
    return ''


def get_user_from_token(cur, schema, token):
    if not token:
        return None
    t = token.replace("'", "''")
    cur.execute(f"""
        SELECT u.id, u.name, u.email, u.phone, u.telegram, u.avatar_url
        FROM {schema}.user_sessions s
        JOIN {schema}.users u ON u.id = s.user_id
        WHERE s.token = '{t}' AND s.expires_at > NOW() AND u.is_active = true
    """)
    return cur.fetchone()


def has_commercial_role(cur, schema, user_id):
    cur.execute(f"""
        SELECT 1 FROM {schema}.user_roles ur
        JOIN {schema}.roles r ON r.id = ur.role_id
        WHERE ur.user_id = {int(user_id)}
          AND r.slug IN ('parmaster', 'organizer', 'partner', 'bath_owner', 'admin')
          AND ur.status = 'active'
        LIMIT 1
    """)
    return cur.fetchone() is not None


# Зарезервированные slug'и — пересечение со всеми системными роутами фронта и общими словами
RESERVED_SLUGS = {
    # Системные роуты фронта
    'admin', 'login', 'register', 'logout', 'account', 'workspace',
    'master', 'masters', 'baths', 'bath', 'partner', 'organizer', 'organizer-cabinet',
    'events', 'event', 'e', 'blog', 'about', 'principles', 'documents', 'privacy', 'terms',
    'invite', 'invite-verify', 'verify-email', 'forgot-password', 'reset-password',
    'auth', 'oauth', 'callback', 'steam-master-guide',
    'functional', 'account-demo', 'events-demo', 'events-glass', 'index-glass', 'home-new',
    # Общие зарезервированные слова
    'support', 'help', 'faq', 'docs', 'documentation', 'api', 'static', 'media', 'assets',
    'css', 'js', 'fonts', 'upload', 'images', 'files', 'img', 'image', 'video', 'videos',
    '404', '500', 'search', 'webhook', 'telegram', 'vk', 'yandex', 'google', 'facebook',
    'instagram', 'twitter', 'whatsapp', 'youtube',
    'sparcom', 'sparkom', 'sparkomru', 'www', 'http', 'https', 'ftp', 'mail', 'email',
    'phone', 'order', 'payment', 'checkout', 'cart', 'basket', 'catalog', 'category',
    'product', 'service', 'services', 'news', 'article', 'post', 'page', 'home', 'index',
    'root', 'main', 'start', 'go', 'goto', 'link', 'ref', 'referral', 'promo', 'coupon',
    'discount', 'special', 'premium', 'pro', 'business', 'enterprise', 'affiliate',
    'invite', 'join', 'signup', 'signin', 'forgot', 'reset', 'confirm', 'verify',
    'unsubscribe', 'subscribe', 'notification', 'message', 'chat', 'feedback',
    'rating', 'review', 'reviews', 'vote', 'poll', 'survey', 'quiz', 'form',
    'application', 'request', 'invoice', 'receipt', 'transaction', 'history',
    'archive', 'report', 'statistic', 'statistics', 'analytics', 'dashboard',
    'control', 'panel', 'console', 'moderator', 'manager', 'operator', 'agent',
    'staff', 'team', 'company', 'organization', 'group', 'club', 'community',
    'project', 'program', 'campaign', 'meetup', 'workshop', 'webinar',
    'course', 'training', 'lecture', 'seminar', 'conference', 'forum',
    'photo', 'gallery', 'album', 'portfolio', 'work', 'job', 'career', 'vacancy',
    'resume', 'cv', 'profile', 'settings', 'preferences', 'security', 'data',
    'information', 'content', 'file', 'download', 'stream', 'live', 'record',
    'audio', 'music', 'voice', 'sound', 'player', 'movie', 'film', 'tv',
    'channel', 'broadcast', 'podcast', 'creator', 'artist', 'designer', 'developer',
    'cookie', 'legal', 'impressum', 'offline', 'maintenance', 'error', 'redirect',
    'old', 'new', 'temp', 'test', 'demo', 'example', 'sample', 'default',
    'banya', 'sauna', 'spa', 'parmaster',
}


SLUG_RE = re.compile(r'^[a-z0-9_-]{3,30}$')


def slug_validation_error(slug: str):
    if not slug:
        return 'Введите адрес'
    s = slug.lower().strip()
    if not SLUG_RE.match(s):
        return 'Только латиница, цифры, _ и - (3–30 символов)'
    if s in RESERVED_SLUGS:
        return 'Этот адрес зарезервирован'
    if s.startswith('-') or s.endswith('-') or s.startswith('_') or s.endswith('_'):
        return 'Нельзя начинать/заканчивать на - или _'
    return None
