import json
import os
import re
import psycopg2
import psycopg2.extras

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def get_schema():
    return os.environ.get('MAIN_DB_SCHEMA', 'public')

def slugify(text):
    text = text.lower().strip()
    translit = {
        'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'yo','ж':'zh',
        'з':'z','и':'i','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o',
        'п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f','х':'kh','ц':'ts',
        'ч':'ch','ш':'sh','щ':'shch','ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya',
        ' ':'-'
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
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Authorization',
        'Access-Control-Max-Age': '86400',
        'Content-Type': 'application/json'
    }

def row_to_dict(row, cursor):
    import datetime
    cols = [d[0] for d in cursor.description]
    result = {}
    for col, val in zip(cols, row):
        if isinstance(val, (datetime.datetime, datetime.date)):
            result[col] = val.isoformat()
        else:
            result[col] = val
    return result

def handler(event, context):
    """API для управления банями — список, детали, CRUD, фильтрация"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors_headers(), 'body': ''}

    headers = cors_headers()
    method = event.get('httpMethod', 'GET')
    params = event.get('queryStringParameters') or {}
    schema = get_schema()

    # GET /baths — список с фильтрами
    if method == 'GET' and not params.get('slug'):
        conn = get_conn()
        cur = conn.cursor()

        where = [f'b.is_active = true']
        args = []

        city = params.get('city')
        if city:
            where.append('b.city = %s')
            args.append(city)

        bath_type = params.get('bath_type')
        if bath_type:
            where.append("b.bath_types::text ILIKE %s")
            args.append(f'%{bath_type}%')

        feature = params.get('feature')
        if feature:
            where.append("b.features::text ILIKE %s")
            args.append(f'%{feature}%')

        search = params.get('search')
        if search:
            where.append("(b.name ILIKE %s OR b.description ILIKE %s OR b.address ILIKE %s)")
            args += [f'%{search}%', f'%{search}%', f'%{search}%']

        price_max = params.get('price_max')
        if price_max:
            where.append('b.price_from <= %s')
            args.append(int(price_max))

        where_sql = ' AND '.join(where)
        cur.execute(f"""
            SELECT b.id, b.slug, b.name, b.description, b.address, b.city,
                   b.lat, b.lng, b.phone, b.website, b.photos, b.features,
                   b.bath_types, b.capacity_min, b.capacity_max,
                   b.price_from, b.price_per_hour, b.rating, b.reviews_count
            FROM {schema}.baths b
            WHERE {where_sql}
            ORDER BY b.rating DESC, b.reviews_count DESC
        """, args)

        rows = cur.fetchall()
        baths = []
        for row in rows:
            d = row_to_dict(row, cur)
            d['lat'] = float(d['lat']) if d['lat'] else None
            d['lng'] = float(d['lng']) if d['lng'] else None
            d['rating'] = float(d['rating']) if d['rating'] else 0
            baths.append(d)

        cur.close()
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'baths': baths}, ensure_ascii=False)}

    # GET /baths?slug=... — детальная
    if method == 'GET' and params.get('slug'):
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f"""
            SELECT * FROM {schema}.baths WHERE slug = %s AND is_active = true
        """, [params['slug']])
        row = cur.fetchone()
        if not row:
            cur.close(); conn.close()
            return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'Баня не найдена'})}

        d = row_to_dict(row, cur)
        d['lat'] = float(d['lat']) if d['lat'] else None
        d['lng'] = float(d['lng']) if d['lng'] else None
        d['rating'] = float(d['rating']) if d['rating'] else 0
        cur.close(); conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'bath': d}, ensure_ascii=False)}

    # POST — создать баню (только для авторов)
    if method == 'POST':
        body = json.loads(event.get('body') or '{}')
        name = body.get('name', '').strip()
        if not name:
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Название обязательно'})}

        slug = body.get('slug') or slugify(name)
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f"""
            INSERT INTO {schema}.baths
                (slug, name, description, address, city, lat, lng, phone, website,
                 photos, features, bath_types, capacity_min, capacity_max, price_from, price_per_hour)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            RETURNING id, slug
        """, [
            slug, name,
            body.get('description', ''),
            body.get('address', ''),
            body.get('city', 'Москва'),
            body.get('lat'), body.get('lng'),
            body.get('phone', ''), body.get('website', ''),
            json.dumps(body.get('photos', []), ensure_ascii=False),
            json.dumps(body.get('features', []), ensure_ascii=False),
            json.dumps(body.get('bath_types', []), ensure_ascii=False),
            body.get('capacity_min', 1), body.get('capacity_max', 20),
            body.get('price_from', 0), body.get('price_per_hour', 0)
        ])
        row = cur.fetchone()
        conn.commit(); cur.close(); conn.close()
        return {'statusCode': 201, 'headers': headers, 'body': json.dumps({'id': row[0], 'slug': row[1]})}

    # PUT — обновить
    if method == 'PUT':
        body = json.loads(event.get('body') or '{}')
        slug = params.get('slug') or body.get('slug')
        if not slug:
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'slug обязателен'})}

        conn = get_conn()
        cur = conn.cursor()
        fields = []
        vals = []
        allowed = ['name','description','address','city','lat','lng','phone','website',
                   'capacity_min','capacity_max','price_from','price_per_hour','is_active']
        for f in allowed:
            if f in body:
                fields.append(f'{f} = %s')
                vals.append(body[f])
        for jsonf in ['photos','features','bath_types']:
            if jsonf in body:
                fields.append(f'{jsonf} = %s')
                vals.append(json.dumps(body[jsonf], ensure_ascii=False))

        if not fields:
            cur.close(); conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Нет полей для обновления'})}

        fields.append('updated_at = NOW()')
        vals.append(slug)
        cur.execute(f"UPDATE {schema}.baths SET {', '.join(fields)} WHERE slug = %s", vals)
        conn.commit(); cur.close(); conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'ok': True})}

    return {'statusCode': 405, 'headers': headers, 'body': json.dumps({'error': 'Method not allowed'})}