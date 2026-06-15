"""Слой стабильного клиента (canonical CRM client).

Решает проблему «плавающего» client_key: один реальный человек получает
постоянный id в crm_clients, к которому привязываются заметки, теги и история.
Любой контакт (user_id / телефон / email) ведёт к одному и тому же клиенту
через таблицу crm_client_identities.

Стабильный ключ имеет вид "cid:<id>".
"""


def norm_phone(p):
    """Последние 10 цифр телефона или None."""
    if not p:
        return None
    digits = ''.join(ch for ch in str(p) if ch.isdigit())
    if not digits:
        return None
    return digits[-10:]


def norm_email(e):
    """Email в нижнем регистре без пробелов или None."""
    if not e or not str(e).strip():
        return None
    return str(e).strip().lower()


def _esc(v):
    return str(v).replace("'", "''")


def identities_from_contact(user_id=None, phone=None, email=None):
    """Список (identity_type, identity_value) из набора контактов."""
    out = []
    if user_id:
        out.append(('user', str(int(user_id))))
    ph = norm_phone(phone)
    if ph:
        out.append(('phone', ph))
    em = norm_email(email)
    if em:
        out.append(('email', em))
    return out


def resolve_client_id(cur, schema, owner_id, *, user_id=None, phone=None,
                      email=None, telegram=None, vk=None, name=None,
                      create=True):
    """Находит существующего canonical-клиента по любой из идентичностей
    или создаёт нового. Возвращает client_id (int) либо None.

    Логика:
      1. Собираем идентичности (user/phone/email) из контактов.
      2. Ищем в crm_client_identities — если хоть одна совпала, берём клиента.
      3. Если совпала несколько разных клиентов — берём самого раннего
         (остальные кандидаты на merge, но автоматически не сливаем).
      4. Если не нашли и create=True — создаём нового клиента и его идентичности.
      5. Дозаписываем недостающие идентичности и обогащаем контакты.
    """
    idents = identities_from_contact(user_id, phone, email)
    if not idents and not (telegram or vk or name):
        return None

    found_ids = []
    if idents:
        conds = ' OR '.join(
            f"(identity_type = '{t}' AND identity_value = '{_esc(v)}')"
            for t, v in idents
        )
        cur.execute(f"""
            SELECT DISTINCT client_id FROM {schema}.crm_client_identities
            WHERE owner_id = {int(owner_id)} AND ({conds})
        """)
        found_ids = [r['client_id'] for r in cur.fetchall()]

    client_id = None
    if found_ids:
        # Самый ранний клиент (минимальный id), не помеченный как слитый
        ids_sql = ', '.join(str(int(i)) for i in found_ids)
        cur.execute(f"""
            SELECT id FROM {schema}.crm_clients
            WHERE id IN ({ids_sql}) AND merged_into IS NULL
            ORDER BY id ASC LIMIT 1
        """)
        row = cur.fetchone()
        if row:
            client_id = row['id']
        else:
            client_id = min(found_ids)

    if client_id is None:
        if not create:
            return None
        ph = norm_phone(phone)
        em = norm_email(email)
        cur.execute(f"""
            INSERT INTO {schema}.crm_clients
                (owner_id, name, phone, phone_norm, email, email_norm, telegram, vk, user_id)
            VALUES ({int(owner_id)},
                    '{_esc((name or '')[:255])}',
                    NULLIF('{_esc((phone or '')[:50])}',''),
                    {f"'{ph}'" if ph else 'NULL'},
                    NULLIF('{_esc((email or '')[:255])}',''),
                    {f"'{_esc(em)}'" if em else 'NULL'},
                    NULLIF('{_esc((telegram or '')[:100])}',''),
                    NULLIF('{_esc((vk or '')[:100])}',''),
                    {int(user_id) if user_id else 'NULL'})
            RETURNING id
        """)
        client_id = cur.fetchone()['id']

    # Дозаписываем идентичности (idempotent)
    for t, v in idents:
        cur.execute(f"""
            INSERT INTO {schema}.crm_client_identities
                (owner_id, client_id, identity_type, identity_value)
            VALUES ({int(owner_id)}, {int(client_id)}, '{t}', '{_esc(v)}')
            ON CONFLICT (owner_id, identity_type, identity_value) DO NOTHING
        """)

    # Обогащаем недостающие поля карточки
    _enrich(cur, schema, client_id, name=name, phone=phone, email=email,
            telegram=telegram, vk=vk, user_id=user_id)

    return client_id


def _enrich(cur, schema, client_id, *, name=None, phone=None, email=None,
            telegram=None, vk=None, user_id=None):
    sets = []
    if name:
        sets.append(f"name = CASE WHEN name = '' OR name IS NULL THEN '{_esc(name[:255])}' ELSE name END")
    if phone:
        ph = norm_phone(phone)
        sets.append(f"phone = COALESCE(phone, NULLIF('{_esc(phone[:50])}',''))")
        if ph:
            sets.append(f"phone_norm = COALESCE(phone_norm, '{ph}')")
    if email:
        em = norm_email(email)
        sets.append(f"email = COALESCE(email, NULLIF('{_esc(email[:255])}',''))")
        if em:
            sets.append(f"email_norm = COALESCE(email_norm, '{_esc(em)}')")
    if telegram:
        sets.append(f"telegram = COALESCE(telegram, NULLIF('{_esc(telegram[:100])}',''))")
    if vk:
        sets.append(f"vk = COALESCE(vk, NULLIF('{_esc(vk[:100])}',''))")
    if user_id:
        sets.append(f"user_id = COALESCE(user_id, {int(user_id)})")
    if not sets:
        return
    sets.append("updated_at = now()")
    cur.execute(f"UPDATE {schema}.crm_clients SET {', '.join(sets)} WHERE id = {int(client_id)}")


def canonical_key(client_id):
    """Стабильный client_key вида cid:123."""
    return f"cid:{int(client_id)}"


def resolve_companion(cur, schema, owner_id, signup_id, index, *, name=None, phone=None):
    """Находит/создаёт canonical-клиента для спутника (доп. гостя из event_signups.guests).

    Если у спутника есть телефон — используем обычный резолвер (склейка по телефону).
    Если телефона нет — привязываем к стабильной идентичности companion:<signup_id>:<index>,
    чтобы повторное чтение не плодило дубликаты.
    Возвращает client_id или None.
    """
    ph = norm_phone(phone)
    if ph:
        return resolve_client_id(cur, schema, owner_id, phone=phone, name=name)

    if not (name and name.strip()):
        return None

    comp_value = f"{int(signup_id)}:{int(index)}"
    cur.execute(f"""
        SELECT client_id FROM {schema}.crm_client_identities
        WHERE owner_id = {int(owner_id)} AND identity_type = 'companion'
          AND identity_value = '{_esc(comp_value)}'
        LIMIT 1
    """)
    row = cur.fetchone()
    if row:
        return row['client_id']

    cur.execute(f"""
        INSERT INTO {schema}.crm_clients (owner_id, name)
        VALUES ({int(owner_id)}, '{_esc(name.strip()[:255])}')
        RETURNING id
    """)
    client_id = cur.fetchone()['id']
    cur.execute(f"""
        INSERT INTO {schema}.crm_client_identities (owner_id, client_id, identity_type, identity_value)
        VALUES ({int(owner_id)}, {int(client_id)}, 'companion', '{_esc(comp_value)}')
        ON CONFLICT (owner_id, identity_type, identity_value) DO NOTHING
    """)
    return client_id


def resolve_key_to_client_id(cur, schema, owner_id, key):
    """Превращает любой client_key (cid:/user:/phone:/email:/signup:/booking:/ext:)
    в canonical client_id. Если cid: — возвращает напрямую.
    Для legacy-ключей пытается найти/создать клиента по соответствующей идентичности.
    Возвращает client_id или None.
    """
    if not key:
        return None
    kind, _, val = str(key).partition(':')
    if kind == 'cid':
        return int(val) if val.isdigit() else None
    if kind == 'user':
        return resolve_client_id(cur, schema, owner_id, user_id=int(val)) if val.isdigit() else None
    if kind == 'phone':
        return resolve_client_id(cur, schema, owner_id, phone=val)
    if kind == 'email':
        return resolve_client_id(cur, schema, owner_id, email=val)
    if kind == 'ext':
        if not val.isdigit():
            return None
        cur.execute(f"SELECT name, phone, email, telegram, vk FROM {schema}.crm_external_guests WHERE id = {int(val)} AND owner_id = {int(owner_id)}")
        r = cur.fetchone()
        if not r:
            return None
        return resolve_client_id(cur, schema, owner_id, name=r['name'], phone=r['phone'],
                                 email=r['email'], telegram=r['telegram'], vk=r['vk'])
    if kind == 'companion':
        # ключ вида companion:<signup_id>:<index>
        cur.execute(f"""
            SELECT client_id FROM {schema}.crm_client_identities
            WHERE owner_id = {int(owner_id)} AND identity_type = 'companion'
              AND identity_value = '{_esc(val)}'
            LIMIT 1
        """)
        row = cur.fetchone()
        return row['client_id'] if row else None
    if kind == 'signup':
        if not val.isdigit():
            return None
        # Сначала — прямая signup-идентичность (гость без контактов)
        cur.execute(f"""
            SELECT client_id FROM {schema}.crm_client_identities
            WHERE owner_id = {int(owner_id)} AND identity_type = 'signup' AND identity_value = '{int(val)}'
            LIMIT 1
        """)
        direct = cur.fetchone()
        if direct:
            return direct['client_id']
        cur.execute(f"SELECT user_id, name, phone, email, telegram FROM {schema}.event_signups WHERE id = {int(val)}")
        r = cur.fetchone()
        if not r:
            return None
        return resolve_client_id(cur, schema, owner_id, user_id=r['user_id'], name=r['name'],
                                 phone=r['phone'], email=r['email'], telegram=r['telegram'])
    if kind == 'booking':
        if not val.isdigit():
            return None
        cur.execute(f"SELECT client_id AS uid, client_name, client_phone, client_email FROM {schema}.master_bookings WHERE id = {int(val)}")
        r = cur.fetchone()
        if not r:
            return None
        return resolve_client_id(cur, schema, owner_id, user_id=r['uid'], name=r['client_name'],
                                 phone=r['client_phone'], email=r['client_email'])
    return None