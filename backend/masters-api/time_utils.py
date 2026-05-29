"""ЕДИНЫЙ КАНОН РАБОТЫ СО ВРЕМЕНЕМ В МОДУЛЕ БРОНИРОВАНИЯ МАСТЕРА (backend).

Правила (зеркало src/lib/masterTime.ts на фронте):
1. Всё время мастера живёт в его таймзоне (master_calendar_settings.timezone).
2. На фронт отдаём ISO-строку с ЯВНЫМ offset зоны мастера ("...+03:00").
3. Принимая время от фронта:
   - если в строке есть offset/Z — уважаем его;
   - если offset НЕТ — трактуем как время МАСТЕРА (НЕ UTC!). Это и был баг.

Здесь только этот модуль — никаких копий парсинга в bookings.py/calendar_mod.py.
"""

from datetime import datetime, timezone, timedelta

try:
    from zoneinfo import ZoneInfo
except ImportError:  # py<3.9 fallback (на проде 3.11 — есть)
    ZoneInfo = None

DEFAULT_MASTER_TZ = 'Europe/Moscow'


def get_tz(tz_name):
    """Возвращает tzinfo по IANA-имени. При ошибке — Москва (UTC+3 фиксированный)."""
    name = tz_name or DEFAULT_MASTER_TZ
    if ZoneInfo is not None:
        try:
            return ZoneInfo(name)
        except Exception:
            pass
    # Fallback: фиксированный +03:00
    return timezone(timedelta(hours=3))


def parse_client_dt(value, master_tz_name):
    """Парсит ISO-строку времени, пришедшую от фронта, в aware datetime.

    Если offset отсутствует — время трактуется как ЗОНА МАСТЕРА (ключевой фикс).
    Возвращает aware datetime или поднимает ValueError.
    """
    s = str(value).replace('Z', '+00:00')
    dt = datetime.fromisoformat(s)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=get_tz(master_tz_name))
    return dt


def to_master_iso(value, master_tz_name):
    """Сериализует datetime/строку из БД в ISO-строку с offset зоны мастера.

    Используется при отдаче слотов и броней на фронт, чтобы offset зависел от
    зоны МАСТЕРА, а не от зоны сервера БД.
    """
    if value is None:
        return None
    if isinstance(value, str):
        # Строка из БД может быть с offset или без — нормализуем.
        try:
            dt = datetime.fromisoformat(value.replace('Z', '+00:00'))
        except ValueError:
            return value
    else:
        dt = value
    tz = get_tz(master_tz_name)
    if dt.tzinfo is None:
        # naive из БД считаем UTC (timestamptz сериализуется в UTC при naive)
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(tz).isoformat()


def wall_to_master_iso(naive_dt, master_tz_name):
    """ISO-строка с offset зоны мастера из naive «стенного» времени.

    Используется для шаблонов: datetime.combine(date, time) — это время, которое
    мастер видит на экране (его зона), а НЕ UTC.
    """
    tz = get_tz(master_tz_name)
    return naive_dt.replace(tzinfo=tz).isoformat()


def localize_rows(rows, tz_name, fields=('datetime_start', 'datetime_end')):
    """Прогоняет список словарей, конвертируя поля времени в ISO зоны мастера.

    Меняет строки на месте и возвращает их же (удобно для json.dumps).
    """
    tz_name = tz_name or DEFAULT_MASTER_TZ
    for row in rows:
        for f in fields:
            if f in row and row[f] is not None:
                row[f] = to_master_iso(row[f], tz_name)
    return rows


def fetch_master_tz(cur, schema, master_id):
    """Возвращает IANA-имя таймзоны мастера из настроек (или дефолт)."""
    cur.execute(f"""
        SELECT COALESCE(timezone, '{DEFAULT_MASTER_TZ}') AS tz
        FROM {schema}.master_calendar_settings
        WHERE master_id = {int(master_id)}
    """)
    row = cur.fetchone()
    if row:
        # RealDictCursor → dict; обычный курсор → tuple
        return row['tz'] if isinstance(row, dict) else row[0]
    return DEFAULT_MASTER_TZ