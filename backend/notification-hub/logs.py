"""Журнал доставки уведомлений и сводная статистика (admin)."""

from shared import respond, err


def handle_logs(cur, schema, method, params):
    if method != 'GET':
        return err('Метод не поддерживается', 405)

    action = (params.get('action') or 'list').strip()
    if action == 'stats':
        return _stats(cur, schema, params)
    return _list(cur, schema, params)


def _build_filters(params):
    filters = []
    status_f = (params.get('status') or '').strip()
    channel_f = (params.get('channel') or '').strip()
    event_type_f = (params.get('event_type') or '').strip()
    search_f = (params.get('search') or '').strip()
    date_from_f = (params.get('date_from') or '').strip()
    date_to_f = (params.get('date_to') or '').strip()

    if status_f in ('success', 'failed', 'pending'):
        filters.append(f"status = '{status_f}'")
    if channel_f in ('email', 'telegram', 'vk', 'push', 'sms', 'max'):
        filters.append(f"channel = '{channel_f}'")
    if event_type_f:
        et = event_type_f.replace("'", "''")[:60]
        filters.append(f"event_type = '{et}'")
    if search_f:
        s = search_f.replace("'", "''")[:100]
        filters.append(f"(recipient ILIKE '%{s}%' OR error_text ILIKE '%{s}%' OR subject ILIKE '%{s}%')")
    if date_from_f:
        d = date_from_f.replace("'", "''")[:30]
        filters.append(f"created_at >= '{d}'")
    if date_to_f:
        d = date_to_f.replace("'", "''")[:30]
        filters.append(f"created_at <= '{d}'")
    return ('WHERE ' + ' AND '.join(filters)) if filters else ''


def _list(cur, schema, params):
    page = max(1, int(params.get('page', 1)))
    per_page = min(100, max(1, int(params.get('per_page', 30))))
    offset = (page - 1) * per_page
    where = _build_filters(params)

    cur.execute(f"SELECT COUNT(*) AS total FROM {schema}.notification_log {where}")
    total = cur.fetchone()['total']

    cur.execute(f"""
        SELECT id, channel, event_type, recipient, subject, status,
               error_code, error_text, user_id, related_id, template_id,
               created_at
        FROM {schema}.notification_log
        {where}
        ORDER BY created_at DESC
        LIMIT {per_page} OFFSET {offset}
    """)
    rows = [dict(r) for r in cur.fetchall()]
    return respond(200, {
        'logs': rows,
        'total': total,
        'page': page,
        'per_page': per_page,
        'pages': (total + per_page - 1) // per_page,
    })


def _stats(cur, schema, params):
    where = _build_filters(params)

    # Сводка по каналам и статусам
    cur.execute(f"""
        SELECT channel, status, COUNT(*) AS cnt
        FROM {schema}.notification_log
        {where}
        GROUP BY channel, status
    """)
    by_channel = {}
    totals = {'total': 0, 'success': 0, 'failed': 0}
    for r in cur.fetchall():
        ch = r['channel']
        st = r['status']
        cnt = r['cnt']
        by_channel.setdefault(ch, {'total': 0, 'success': 0, 'failed': 0})
        by_channel[ch]['total'] += cnt
        by_channel[ch][st] = by_channel[ch].get(st, 0) + cnt
        totals['total'] += cnt
        if st in totals:
            totals[st] += cnt

    # Топ типов уведомлений
    cur.execute(f"""
        SELECT event_type, COUNT(*) AS cnt
        FROM {schema}.notification_log
        {where}
        GROUP BY event_type
        ORDER BY cnt DESC
        LIMIT 10
    """)
    by_event = [dict(r) for r in cur.fetchall()]

    delivery_rate = round(100.0 * totals['success'] / totals['total'], 1) if totals['total'] else 0.0

    return respond(200, {
        'totals': totals,
        'delivery_rate': delivery_rate,
        'by_channel': by_channel,
        'by_event': by_event,
    })
