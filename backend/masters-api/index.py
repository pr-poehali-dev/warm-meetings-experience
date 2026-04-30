import hashlib
import json
import os
import re
import time
import psycopg2
import psycopg2.extras
import datetime


def verify_admin_token(token):
    if not token:
        return False
    admin_pwd = os.environ.get('ADMIN_PASSWORD', '')
    if not admin_pwd:
        return False
    expected = hashlib.sha256(f"{admin_pwd}:{int(time.time() // 86400)}".encode()).hexdigest()
    return token == expected


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def get_schema():
    return os.environ.get('MAIN_DB_SCHEMA', 'public')


def slugify(text):
    text = text.lower().strip()
    translit = {
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'zh',
        'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o',
        'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts',
        'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
        ' ': '-'
    }
    result = ''
    for char in text:
        result += translit.get(char, char)
    result = re.sub(r'[^a-z0-9-]', '', result)
    result = re.sub(r'-+', '-', result).strip('-')
    return result


def cors_headers():
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Authorization, X-Admin-Token, X-Session-Token',
        'Access-Control-Max-Age': '86400',
        'Content-Type': 'application/json'
    }


def row_to_dict(row, cursor):
    cols = [d[0] for d in cursor.description]
    result = {}
    for col, val in zip(cols, row):
        if isinstance(val, (datetime.datetime, datetime.date)):
            result[col] = val.isoformat()
        else:
            result[col] = val
    return result


def get_user_from_token(cur, token, schema):
    t = token.replace("'", "''")
    cur.execute(f"""
        SELECT u.id FROM {schema}.user_sessions s
        JOIN {schema}.users u ON u.id = s.user_id
        WHERE s.token = '{t}' AND s.expires_at > NOW() AND u.is_active = true
    """)
    return cur.fetchone()


def is_parmaster(cur, user_id, schema):
    cur.execute(f"""
        SELECT 1 FROM {schema}.user_roles ur
        JOIN {schema}.roles r ON r.id = ur.role_id
        WHERE ur.user_id = {user_id} AND r.slug IN ('parmaster', 'admin') AND ur.status = 'active'
    """)
    return cur.fetchone() is not None


def handler(event, context):
    """API для управления мастерями — список, детали, специализации, связь с банями"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors_headers(), 'body': ''}

    headers = cors_headers()
    method = event.get('httpMethod', 'GET')
    params = event.get('queryStringParameters') or {}
    schema = get_schema()
    admin_token = (event.get('headers') or {}).get('X-Admin-Token', '')
    hdrs = event.get('headers') or {}
    user_token = (hdrs.get('X-Authorization') or hdrs.get('X-Session-Token') or '').replace('Bearer ', '')

    # GET /masters?me=1 — профиль текущего мастера
    if method == 'GET' and params.get('me') == '1':
        if not user_token:
            return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Не авторизован'})}
        conn = get_conn()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        user = get_user_from_token(cur, user_token, schema)
        if not user:
            conn.close()
            return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Не авторизован'})}
        if not is_parmaster(cur, user['id'], schema):
            conn.close()
            return {'statusCode': 403, 'headers': headers, 'body': json.dumps({'error': 'Доступ только для пармастеров'})}
        cur.execute(f"SELECT * FROM {schema}.masters WHERE id = %s", [user['id']])
        row = cur.fetchone()
        conn.close()
        if not row:
            return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'Профиль не найден'})}
        master = dict(row)
        master['rating'] = float(master['rating']) if master.get('rating') else 0
        for k, v in master.items():
            if hasattr(v, 'isoformat'):
                master[k] = v.isoformat()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'master': master}, ensure_ascii=False)}

    # PUT /masters?me=1 — обновить свой профиль
    if method == 'PUT' and params.get('me') == '1':
        if not user_token:
            return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Не авторизован'})}
        conn = get_conn()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        user = get_user_from_token(cur, user_token, schema)
        if not user:
            conn.close()
            return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Не авторизован'})}
        if not is_parmaster(cur, user['id'], schema):
            conn.close()
            return {'statusCode': 403, 'headers': headers, 'body': json.dumps({'error': 'Доступ только для пармастеров'})}
        body = json.loads(event.get('body') or '{}')
        allowed = ['name', 'tagline', 'bio', 'experience_years', 'city', 'phone', 'telegram', 'instagram', 'price_from', 'avatar']
        fields = []
        vals = []
        for f in allowed:
            if f in body:
                fields.append(f'{f} = %s')
                vals.append(body[f])
        for jsonf in ['portfolio', 'photos']:
            if jsonf in body:
                fields.append(f'{jsonf} = %s')
                vals.append(json.dumps(body[jsonf], ensure_ascii=False))
        if not fields:
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Нет полей для обновления'})}
        fields.append('updated_at = NOW()')
        vals.append(user['id'])
        cur.execute(f"UPDATE {schema}.masters SET {', '.join(fields)} WHERE id = %s RETURNING id, name, slug", vals)
        row = cur.fetchone()
        conn.commit()
        conn.close()
        if not row:
            return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'Профиль не найден. Обратитесь к администратору.'})}
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'ok': True, 'master': dict(row)}, ensure_ascii=False)}

    # GET /masters?admin=1 — список всех мастеров для админа
    if method == 'GET' and params.get('admin') == '1':
        if not verify_admin_token(admin_token):
            return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Не авторизован'})}
        conn = get_conn()
        cur = conn.cursor()
        search = params.get('search', '')
        verified = params.get('verified', '')
        where = ['1=1']
        args = []
        if search:
            where.append("(m.name ILIKE %s OR m.city ILIKE %s OR m.phone ILIKE %s)")
            args += [f'%{search}%', f'%{search}%', f'%{search}%']
        if verified == 'true':
            where.append('m.is_verified = true')
        elif verified == 'false':
            where.append('m.is_verified = false')
        where_sql = ' AND '.join(where)
        cur.execute(f"""
            SELECT m.id, m.slug, m.name, m.tagline, m.city, m.phone, m.telegram,
                   m.avatar, m.specialization_ids, m.rating, m.reviews_count,
                   m.price_from, m.is_verified, m.is_active, m.created_at
            FROM {schema}.masters m
            WHERE {where_sql}
            ORDER BY m.is_verified ASC, m.created_at DESC
        """, args)
        rows = cur.fetchall()
        masters = []
        for row in rows:
            d = row_to_dict(row, cur)
            d['rating'] = float(d['rating']) if d['rating'] else 0
            masters.append(d)
        cur.close()
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'masters': masters}, ensure_ascii=False)}

    # PUT /masters?admin_verify=1 — верификация/снятие верификации
    if method == 'PUT' and params.get('admin_verify') == '1':
        if not verify_admin_token(admin_token):
            return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Не авторизован'})}
        body = json.loads(event.get('body') or '{}')
        master_id = body.get('id')
        is_verified = body.get('is_verified')
        is_active = body.get('is_active')
        if not master_id:
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'id обязателен'})}
        conn = get_conn()
        cur = conn.cursor()
        fields = ['updated_at = NOW()']
        vals = []
        if is_verified is not None:
            fields.append('is_verified = %s')
            vals.append(bool(is_verified))
        if is_active is not None:
            fields.append('is_active = %s')
            vals.append(bool(is_active))
        vals.append(master_id)
        cur.execute(f"UPDATE {schema}.masters SET {', '.join(fields)} WHERE id = %s RETURNING id, name, is_verified, is_active", vals)
        row = cur.fetchone()
        conn.commit()
        result = row_to_dict(row, cur) if row else None
        cur.close()
        conn.close()
        if not result:
            return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'Мастер не найден'})}
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'ok': True, 'master': result})}

    # GET /masters?specializations=1 — список специализаций
    if method == 'GET' and params.get('specializations') == '1':
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f"SELECT * FROM {schema}.specializations ORDER BY sort_order")
        rows = cur.fetchall()
        specs = [row_to_dict(r, cur) for r in rows]
        cur.close()
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'specializations': specs}, ensure_ascii=False)}

    # GET /masters?slug=... — детальная страница мастера
    if method == 'GET' and params.get('slug'):
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f"SELECT * FROM {schema}.masters WHERE slug = %s AND is_active = true", [params['slug']])
        row = cur.fetchone()
        if not row:
            cur.close()
            conn.close()
            return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'Мастер не найден'})}

        master = row_to_dict(row, cur)
        master['rating'] = float(master['rating']) if master['rating'] else 0

        # Специализации мастера
        spec_ids = master.get('specialization_ids') or []
        specializations = []
        if spec_ids:
            cur.execute(f"SELECT * FROM {schema}.specializations WHERE id = ANY(%s::int[]) ORDER BY sort_order", [spec_ids])
            specializations = [row_to_dict(r, cur) for r in cur.fetchall()]
        master['specializations'] = specializations

        # Бани, где работает мастер
        cur.execute(f"""
            SELECT b.id, b.slug, b.name, b.address, b.city, b.photos, b.rating, mb.schedule
            FROM {schema}.master_baths mb
            JOIN {schema}.baths b ON b.id = mb.bath_id
            WHERE mb.master_id = %s AND b.is_active = true
        """, [master['id']])
        baths = []
        for r in cur.fetchall():
            d = row_to_dict(r, cur)
            d['rating'] = float(d['rating']) if d['rating'] else 0
            baths.append(d)
        master['baths'] = baths

        cur.close()
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'master': master}, ensure_ascii=False)}

    # GET /masters — список с фильтрами
    if method == 'GET':
        conn = get_conn()
        cur = conn.cursor()

        where = ['m.is_active = true']
        args = []

        city = params.get('city')
        if city:
            where.append('m.city = %s')
            args.append(city)

        spec = params.get('specialization')
        if spec:
            where.append("m.specialization_ids::text ILIKE %s")
            args.append(f'%{spec}%')

        search = params.get('search')
        if search:
            where.append("(m.name ILIKE %s OR m.bio ILIKE %s OR m.tagline ILIKE %s)")
            args += [f'%{search}%', f'%{search}%', f'%{search}%']

        bath_id = params.get('bath_id')
        if bath_id:
            where.append("EXISTS (SELECT 1 FROM {schema}.master_baths mb WHERE mb.master_id = m.id AND mb.bath_id = %s)".format(schema=schema))
            args.append(int(bath_id))

        where_sql = ' AND '.join(where)
        cur.execute(f"""
            SELECT m.id, m.slug, m.name, m.tagline, m.experience_years,
                   m.city, m.avatar, m.specialization_ids, m.rating, m.reviews_count,
                   m.price_from, m.is_verified, m.photos
            FROM {schema}.masters m
            WHERE {where_sql}
            ORDER BY m.is_verified DESC, m.rating DESC, m.reviews_count DESC
        """, args)

        rows = cur.fetchall()
        masters = []
        for row in rows:
            d = row_to_dict(row, cur)
            d['rating'] = float(d['rating']) if d['rating'] else 0
            masters.append(d)

        cur.close()
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'masters': masters}, ensure_ascii=False)}

    # POST — создать мастера
    if method == 'POST':
        body = json.loads(event.get('body') or '{}')
        name = body.get('name', '').strip()
        if not name:
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Имя обязательно'})}

        slug = body.get('slug') or slugify(name)
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f"""
            INSERT INTO {schema}.masters
                (slug, name, tagline, bio, experience_years, city, phone, telegram, instagram,
                 avatar, photos, portfolio, specialization_ids, price_from)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            RETURNING id, slug
        """, [
            slug, name,
            body.get('tagline', ''),
            body.get('bio', ''),
            body.get('experience_years', 0),
            body.get('city', 'Москва'),
            body.get('phone', ''),
            body.get('telegram', ''),
            body.get('instagram', ''),
            body.get('avatar', ''),
            json.dumps(body.get('photos', []), ensure_ascii=False),
            json.dumps(body.get('portfolio', []), ensure_ascii=False),
            json.dumps(body.get('specialization_ids', []), ensure_ascii=False),
            body.get('price_from', 0)
        ])
        row = cur.fetchone()
        master_id = row[0]
        master_slug = row[1]

        # Привязка бань
        for bath_id in body.get('bath_ids', []):
            cur.execute(f"""
                INSERT INTO {schema}.master_baths (master_id, bath_id, schedule)
                VALUES (%s, %s, %s)
                ON CONFLICT (master_id, bath_id) DO NOTHING
            """, [master_id, bath_id, body.get('schedule', '')])

        conn.commit()
        cur.close()
        conn.close()
        return {'statusCode': 201, 'headers': headers, 'body': json.dumps({'id': master_id, 'slug': master_slug})}

    # PUT — обновить мастера
    if method == 'PUT':
        body = json.loads(event.get('body') or '{}')
        slug = params.get('slug') or body.get('slug')
        if not slug:
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'slug обязателен'})}

        conn = get_conn()
        cur = conn.cursor()
        fields = []
        vals = []
        allowed = ['name', 'tagline', 'bio', 'experience_years', 'city', 'phone', 'telegram',
                   'instagram', 'avatar', 'price_from', 'is_active', 'is_verified']
        for f in allowed:
            if f in body:
                fields.append(f'{f} = %s')
                vals.append(body[f])
        for jsonf in ['photos', 'portfolio', 'specialization_ids']:
            if jsonf in body:
                fields.append(f'{jsonf} = %s')
                vals.append(json.dumps(body[jsonf], ensure_ascii=False))

        if fields:
            fields.append('updated_at = NOW()')
            vals.append(slug)
            cur.execute(f"UPDATE {schema}.masters SET {', '.join(fields)} WHERE slug = %s", vals)

        conn.commit()
        cur.close()
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'ok': True})}

    return {'statusCode': 405, 'headers': headers, 'body': json.dumps({'error': 'Method not allowed'})}