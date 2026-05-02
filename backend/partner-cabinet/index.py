import json
import os
import psycopg2
import psycopg2.extras

from shared import *


def check_partner_role(cur, schema, user_id):
    cur.execute(f"""
        SELECT 1 FROM {schema}.user_roles ur
        JOIN {schema}.roles r ON r.id = ur.role_id
        WHERE ur.user_id = {user_id} AND ur.status = 'active' AND r.slug = 'partner'
        LIMIT 1
    """)
    return cur.fetchone() is not None

def check_bath_owner(cur, schema, bath_id, user_id):
    cur.execute(f"""
        SELECT id FROM {schema}.baths WHERE id = {bath_id} AND owner_id = {user_id}
    """)
    return cur.fetchone() is not None


def handler(event, context):
    """Партнёрский кабинет: управление банями, статистика, верификация"""
    if event.get('httpMethod') == 'OPTIONS':
        return options_response()

    headers_in = event.get('headers') or {}
    token = headers_in.get('X-Session-Token') or headers_in.get('x-session-token') or ''

    schema = get_schema()
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    method = event.get('httpMethod', 'GET')
    params = event.get('queryStringParameters') or {}
    resource = params.get('resource', 'baths')

    user = get_user_from_token(cur, schema, token)
    if not user:
        conn.close()
        return respond(401, {'error': 'Не авторизован'})

    is_partner = check_partner_role(cur, schema, user['id'])
    if not is_partner:
        conn.close()
        return respond(403, {'error': 'Недостаточно прав. Требуется роль партнёра.'})

    if resource == 'baths':
        if method == 'GET':
            bath_id = params.get('id')
            if bath_id:
                return handle_get_bath(cur, conn, schema, user, int(bath_id))
            return handle_list_baths(cur, conn, schema, user)
        if method == 'POST':
            body = json.loads(event.get('body', '{}'))
            return handle_create_bath(cur, conn, schema, user, body)
        if method == 'PUT':
            bath_id = params.get('id')
            if not bath_id:
                conn.close()
                return respond(400, {'error': 'Укажите id бани'})
            body = json.loads(event.get('body', '{}'))
            return handle_update_bath(cur, conn, schema, user, int(bath_id), body)

    if resource == 'verify':
        if method == 'POST':
            body = json.loads(event.get('body', '{}'))
            return handle_request_verify(cur, conn, schema, user, body)

    if resource == 'stats':
        if method == 'GET':
            bath_id = params.get('id')
            return handle_get_stats(cur, conn, schema, user, int(bath_id) if bath_id else None)

    if resource == 'deactivate':
        if method == 'POST':
            body = json.loads(event.get('body', '{}'))
            return handle_deactivate_bath(cur, conn, schema, user, body)

    conn.close()
    return respond(400, {'error': 'Unknown resource'})


# =============================================================================
# СПИСОК БАНЬ ПАРТНЁРА
# =============================================================================

def handle_list_baths(cur, conn, schema, user):
    uid = user['id']
    cur.execute(f"""
        SELECT b.id, b.slug, b.name, b.address, b.city, b.phone, b.is_active,
               b.is_verified, b.verification_requested_at,
               b.price_from, b.price_per_hour, b.rating, b.reviews_count,
               b.capacity_min, b.capacity_max, b.created_at, b.updated_at,
               COALESCE((
                 SELECT COUNT(*) FROM {schema}.bath_views bv
                 WHERE bv.bath_id = b.id
                 AND bv.viewed_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
               ), 0) AS views_30d,
               (SELECT photos -> 0 FROM {schema}.baths WHERE id = b.id) AS cover_photo
        FROM {schema}.baths b
        WHERE b.owner_id = {uid}
        ORDER BY b.created_at DESC
    """)
    baths = [dict(r) for r in cur.fetchall()]
    conn.close()
    return respond(200, {'baths': baths})


# =============================================================================
# ДЕТАЛИ КОНКРЕТНОЙ БАНИ
# =============================================================================

def handle_get_bath(cur, conn, schema, user, bath_id):
    if not check_bath_owner(cur, schema, bath_id, user['id']):
        conn.close()
        return respond(403, {'error': 'Нет доступа к этой бане'})

    cur.execute(f"""
        SELECT b.*,
               COALESCE((
                 SELECT COUNT(*) FROM {schema}.bath_views bv WHERE bv.bath_id = b.id
                 AND bv.viewed_at > CURRENT_TIMESTAMP - INTERVAL '7 days'
               ), 0) AS views_7d,
               COALESCE((
                 SELECT COUNT(*) FROM {schema}.bath_views bv WHERE bv.bath_id = b.id
                 AND bv.viewed_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
               ), 0) AS views_30d
        FROM {schema}.baths b
        WHERE b.id = {bath_id}
    """)
    bath = cur.fetchone()
    conn.close()
    if not bath:
        return respond(404, {'error': 'Баня не найдена'})
    return respond(200, {'bath': dict(bath)})


# =============================================================================
# СОЗДАНИЕ БАНИ
# =============================================================================

def handle_create_bath(cur, conn, schema, user, body):
    name = (body.get('name') or '').strip()
    if not name:
        conn.close()
        return respond(400, {'error': 'Название бани обязательно'})

    base_slug = slugify(name)
    slug = base_slug
    i = 2
    while True:
        cur.execute(f"SELECT id FROM {schema}.baths WHERE slug = '{slug}'")
        if not cur.fetchone():
            break
        slug = f"{base_slug}-{i}"
        i += 1

    address = (body.get('address') or '').strip()
    city = (body.get('city') or '').strip()
    phone = (body.get('phone') or '').strip()
    website = (body.get('website') or '').strip()
    description = (body.get('description') or '').strip()
    price_from = body.get('price_from') or 0
    price_per_hour = body.get('price_per_hour') or 0
    capacity_min = body.get('capacity_min') or 1
    capacity_max = body.get('capacity_max') or 10

    name_e = name.replace("'", "''")
    address_e = address.replace("'", "''")
    city_e = city.replace("'", "''")
    phone_e = phone.replace("'", "''")
    website_e = website.replace("'", "''")
    desc_e = description.replace("'", "''")

    cur.execute(f"""
        INSERT INTO {schema}.baths
            (slug, name, address, city, phone, website, description,
             price_from, price_per_hour, capacity_min, capacity_max,
             owner_id, is_active, is_verified, photos, features, bath_types)
        VALUES
            ('{slug}', '{name_e}', '{address_e}', '{city_e}', '{phone_e}',
             '{website_e}', '{desc_e}', {price_from}, {price_per_hour},
             {capacity_min}, {capacity_max}, {user['id']}, true, false,
             '[]'::jsonb, '[]'::jsonb, '[]'::jsonb)
        RETURNING id, slug, name
    """)
    bath = dict(cur.fetchone())
    conn.commit()
    conn.close()
    return respond(201, {'bath': bath, 'message': 'Баня успешно создана'})


# =============================================================================
# ОБНОВЛЕНИЕ БАНИ
# =============================================================================

def handle_update_bath(cur, conn, schema, user, bath_id, body):
    if not check_bath_owner(cur, schema, bath_id, user['id']):
        conn.close()
        return respond(403, {'error': 'Нет доступа к этой бане'})

    updates = []

    def safe_str(v):
        return v.replace("'", "''") if v else ''

    if 'name' in body and body['name']:
        updates.append(f"name = '{safe_str(body['name'])}'")
    if 'address' in body:
        updates.append(f"address = '{safe_str(body['address'])}'")
    if 'city' in body:
        updates.append(f"city = '{safe_str(body['city'])}'")
    if 'phone' in body:
        updates.append(f"phone = '{safe_str(body['phone'])}'")
    if 'website' in body:
        updates.append(f"website = '{safe_str(body['website'])}'")
    if 'description' in body:
        updates.append(f"description = '{safe_str(body['description'])}'")
    if 'price_from' in body:
        updates.append(f"price_from = {int(body['price_from'] or 0)}")
    if 'price_per_hour' in body:
        updates.append(f"price_per_hour = {int(body['price_per_hour'] or 0)}")
    if 'capacity_min' in body:
        updates.append(f"capacity_min = {int(body['capacity_min'] or 1)}")
    if 'capacity_max' in body:
        updates.append(f"capacity_max = {int(body['capacity_max'] or 10)}")
    if 'features' in body:
        features_json = json.dumps(body['features'], ensure_ascii=False).replace("'", "''")
        updates.append(f"features = '{features_json}'::jsonb")
    if 'bath_types' in body:
        bath_types_json = json.dumps(body['bath_types'], ensure_ascii=False).replace("'", "''")
        updates.append(f"bath_types = '{bath_types_json}'::jsonb")
    if 'work_hours' in body:
        wh_json = json.dumps(body['work_hours'], ensure_ascii=False).replace("'", "''")
        updates.append(f"work_hours = '{wh_json}'::jsonb")
    if 'social_links' in body:
        sl_json = json.dumps(body['social_links'], ensure_ascii=False).replace("'", "''")
        updates.append(f"social_links = '{sl_json}'::jsonb")
    if 'lat' in body and body['lat']:
        updates.append(f"lat = {float(body['lat'])}")
    if 'lng' in body and body['lng']:
        updates.append(f"lng = {float(body['lng'])}")

    if not updates:
        conn.close()
        return respond(400, {'error': 'Нет данных для обновления'})

    updates.append("updated_at = CURRENT_TIMESTAMP")
    set_clause = ', '.join(updates)

    cur.execute(f"""
        UPDATE {schema}.baths SET {set_clause}
        WHERE id = {bath_id}
        RETURNING id, slug, name, updated_at
    """)
    bath = dict(cur.fetchone())
    conn.commit()
    conn.close()
    return respond(200, {'bath': bath, 'message': 'Данные бани обновлены'})


# =============================================================================
# ЗАПРОС ВЕРИФИКАЦИИ
# =============================================================================

def handle_request_verify(cur, conn, schema, user, body):
    bath_id = body.get('bath_id')
    if not bath_id:
        conn.close()
        return respond(400, {'error': 'Укажите bath_id'})
    if not check_bath_owner(cur, schema, int(bath_id), user['id']):
        conn.close()
        return respond(403, {'error': 'Нет доступа'})
    cur.execute(f"""
        UPDATE {schema}.baths
        SET verification_requested_at = CURRENT_TIMESTAMP
        WHERE id = {int(bath_id)} AND is_verified = false
        RETURNING id, name
    """)
    row = cur.fetchone()
    conn.commit()
    conn.close()
    if not row:
        return respond(400, {'error': 'Баня уже верифицирована или не найдена'})
    return respond(200, {'message': 'Заявка на верификацию отправлена. Мы свяжемся с вами в течение 1-2 дней.'})


# =============================================================================
# ДЕАКТИВАЦИЯ БАНИ
# =============================================================================

def handle_deactivate_bath(cur, conn, schema, user, body):
    bath_id = body.get('bath_id')
    if not bath_id:
        conn.close()
        return respond(400, {'error': 'Укажите bath_id'})
    if not check_bath_owner(cur, schema, int(bath_id), user['id']):
        conn.close()
        return respond(403, {'error': 'Нет доступа'})
    active = body.get('is_active', False)
    cur.execute(f"""
        UPDATE {schema}.baths SET is_active = {active}, updated_at = CURRENT_TIMESTAMP
        WHERE id = {int(bath_id)}
    """)
    conn.commit()
    conn.close()
    return respond(200, {'message': 'Статус бани изменён'})


# =============================================================================
# СТАТИСТИКА
# =============================================================================

def handle_get_stats(cur, conn, schema, user, bath_id=None):
    uid = user['id']
    bath_filter = f"AND b.id = {bath_id}" if bath_id else ""
    bath_id_filter = f"AND bv.bath_id = {bath_id}" if bath_id else ""

    # Общее число бань
    cur.execute(f"""
        SELECT COUNT(*) as total, SUM(CASE WHEN is_active THEN 1 ELSE 0 END) as active,
               SUM(CASE WHEN is_verified THEN 1 ELSE 0 END) as verified
        FROM {schema}.baths WHERE owner_id = {uid} {bath_filter}
    """)
    counts = dict(cur.fetchone())

    # Просмотры за 7 и 30 дней
    cur.execute(f"""
        SELECT
          COUNT(CASE WHEN bv.viewed_at > CURRENT_TIMESTAMP - INTERVAL '7 days' THEN 1 END) as views_7d,
          COUNT(CASE WHEN bv.viewed_at > CURRENT_TIMESTAMP - INTERVAL '30 days' THEN 1 END) as views_30d
        FROM {schema}.bath_views bv
        JOIN {schema}.baths b ON b.id = bv.bath_id
        WHERE b.owner_id = {uid} {bath_id_filter}
    """)
    views = dict(cur.fetchone())

    # Просмотры по дням (последние 14 дней)
    cur.execute(f"""
        SELECT DATE(bv.viewed_at) as day, COUNT(*) as count
        FROM {schema}.bath_views bv
        JOIN {schema}.baths b ON b.id = bv.bath_id
        WHERE b.owner_id = {uid} {bath_id_filter}
        AND bv.viewed_at > CURRENT_TIMESTAMP - INTERVAL '14 days'
        GROUP BY DATE(bv.viewed_at)
        ORDER BY day
    """)
    views_by_day = [dict(r) for r in cur.fetchall()]

    conn.close()
    return respond(200, {
        'counts': counts,
        'views': views,
        'views_by_day': views_by_day
    })