"""
Бизнес-логика автофиксации/отмены событий «в складчину».
Запускается по расписанию (cron).
Алгоритм:
1) Находим события pricing_mode='crowdfund', cf_status='collecting' с уже наступившим freeze_at.
2) Если participants >= cf_min_participants → фиксируем цену, ставим cf_status='confirmed',
   рассчитываем доплату/переплату каждому signup, создаём уведомления.
3) Иначе → cf_status='cancelled', создаём refund_requests для всех записавшихся.
"""
import json
import os
from datetime import datetime, timedelta
import math
import psycopg2
from psycopg2.extras import RealDictCursor


def get_schema() -> str:
    return os.environ.get('DB_SCHEMA', 't_p99966623_warm_meetings_experi')


def get_conn():
    dsn = os.environ.get('DATABASE_URL')
    return psycopg2.connect(dsn, cursor_factory=RealDictCursor)


def _round_up_50(n: float) -> int:
    return int(math.ceil(n / 50.0) * 50)


def _calc_freeze_at(event_date, start_time, freeze_hours: int) -> datetime | None:
    try:
        if not event_date or not start_time:
            return None
        ed = str(event_date)
        st = str(start_time)[:8]
        dt = datetime.fromisoformat(f"{ed}T{st}")
        return dt - timedelta(hours=int(freeze_hours or 48))
    except Exception:
        return None


def process_event(cur, schema: str, ev: dict) -> dict:
    eid = ev['id']
    target = int(ev.get('cf_target_amount') or 0)
    extra = int(ev.get('cf_extra_costs') or 0)
    commission = float(ev.get('cf_commission_percent') or 0)
    cf_min = int(ev.get('cf_min_participants') or 0)
    total_to_collect = target + extra

    # Сколько активных записавшихся
    cur.execute(
        f"SELECT id, user_id, name, email, phone, club_fee_paid, joined_after_freeze "
        f"FROM {schema}.event_signups "
        f"WHERE event_id = {eid} AND COALESCE(status,'') NOT IN ('cancelled','отменено')"
    )
    signups = [dict(r) for r in cur.fetchall()]
    # В складчине участвуют только те, кто записался до стоп-сбора
    in_pool = [s for s in signups if not s.get('joined_after_freeze')]
    count_in_pool = len(in_pool)

    if cf_min and count_in_pool < cf_min:
        # ОТМЕНА
        cur.execute(
            f"UPDATE {schema}.events SET cf_status = 'cancelled', "
            f"cf_cancelled_at = NOW(), cf_cancel_reason = 'min_threshold_not_reached', "
            f"is_visible = false "
            f"WHERE id = {eid}"
        )
        created_refunds = 0
        for s in signups:
            amount = int(s.get('club_fee_paid') or 0)
            if amount <= 0:
                continue
            # Не дублируем
            cur.execute(
                f"SELECT id FROM {schema}.refund_requests "
                f"WHERE signup_id = {int(s['id'])} AND status = 'pending'"
            )
            if cur.fetchone():
                continue
            cur.execute(
                f"INSERT INTO {schema}.refund_requests "
                f"(user_id, signup_id, event_id, amount, status, reason) "
                f"VALUES ("
                f"{int(s['user_id']) if s.get('user_id') else 'NULL'}, "
                f"{int(s['id'])}, {eid}, {amount}, 'pending', 'event_cancelled')"
            )
            cur.execute(
                f"UPDATE {schema}.event_signups SET status = 'refund_pending' WHERE id = {int(s['id'])}"
            )
            created_refunds += 1
        return {
            'event_id': eid,
            'action': 'cancelled',
            'count_in_pool': count_in_pool,
            'refunds_created': created_refunds,
        }

    # ФИКСАЦИЯ ЦЕНЫ
    final_price = round((total_to_collect / count_in_pool) * (1 + commission / 100.0)) if count_in_pool else 0
    cur.execute(
        f"UPDATE {schema}.events SET cf_status = 'confirmed', "
        f"cf_final_price = {int(final_price)}, cf_frozen_at = NOW() "
        f"WHERE id = {eid}"
    )

    updated = 0
    for s in in_pool:
        paid = int(s.get('club_fee_paid') or 0)
        if final_price >= paid:
            topup = int(final_price - paid)
            cur.execute(
                f"UPDATE {schema}.event_signups SET final_price_due = {int(final_price)}, "
                f"topup_amount = {topup} WHERE id = {int(s['id'])}"
            )
        else:
            # переплата → запишем как бонус, обнулим долг
            overpay = int(paid - final_price)
            cur.execute(
                f"UPDATE {schema}.event_signups SET final_price_due = {int(final_price)}, "
                f"topup_amount = 0, cf_overpayment_bonus = {overpay} "
                f"WHERE id = {int(s['id'])}"
            )
            if s.get('user_id'):
                uid = int(s['user_id'])
                cur.execute(
                    f"UPDATE {schema}.users SET bonus_balance = COALESCE(bonus_balance,0) + {overpay} "
                    f"WHERE id = {uid}"
                )
                cur.execute(
                    f"INSERT INTO {schema}.wallet_transactions "
                    f"(user_id, type, amount, description, ref_type, ref_id) "
                    f"VALUES ({uid}, 'bonus_credit', {overpay}, "
                    f"'Возврат переплаты по событию #{eid}', 'event_signup', {int(s['id'])})"
                )
        updated += 1

    return {
        'event_id': eid,
        'action': 'confirmed',
        'final_price': final_price,
        'count_in_pool': count_in_pool,
        'updated': updated,
    }


def handler(event: dict, context) -> dict:
    """Фоновая фиксация цен и отмена событий «в складчину». Запускается cron'ом."""
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
            'body': ''
        }

    headers = {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}
    schema = get_schema()
    conn = get_conn()
    cur = conn.cursor()

    try:
        cur.execute(
            f"SELECT id, event_date, start_time, cf_freeze_hours, cf_target_amount, "
            f"cf_extra_costs, cf_commission_percent, cf_min_participants, cf_max_participants "
            f"FROM {schema}.events "
            f"WHERE pricing_mode = 'crowdfund' AND COALESCE(cf_status,'collecting') = 'collecting' "
            f"AND event_date >= CURRENT_DATE - INTERVAL '2 days'"
        )
        events = [dict(r) for r in cur.fetchall()]

        results = []
        now = datetime.now()
        for ev in events:
            freeze_at = _calc_freeze_at(ev.get('event_date'), ev.get('start_time'), ev.get('cf_freeze_hours') or 48)
            if not freeze_at or now < freeze_at:
                continue
            try:
                res = process_event(cur, schema, ev)
                results.append(res)
            except Exception as e:
                results.append({'event_id': ev['id'], 'action': 'error', 'error': str(e)[:300]})

        conn.commit()
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({'ok': True, 'processed': len(results), 'results': results}, default=str),
        }
    except Exception as e:
        conn.rollback()
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': str(e)[:500]}),
        }
    finally:
        cur.close()
        conn.close()
