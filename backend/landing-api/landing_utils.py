"""Локальные утилиты landing-api: валидация slug для персональных мини-сайтов.

Этот модуль остаётся ТОЛЬКО в backend/landing-api/ и не синхронизируется
скриптом sync_shared.py.
"""
import re

# Зарезервированные slug'и — пересечение со всеми системными роутами фронта
# и общими словами, которые нельзя занимать как персональный адрес.
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
