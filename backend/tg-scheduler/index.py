"""
Cron-функция: отправляет все запланированные публикации в Telegram,
время которых уже наступило. Вызывает flush_scheduled у telegram-bot.
Должна запускаться каждые 1-5 минут по расписанию.
"""
import json
import os
import urllib.request


TG_BOT_URL = "https://functions.poehali.dev/c54f8799-96a5-4519-a2c7-e1b2e5f9d8c1"


def handler(event: dict, context) -> dict:
    """Запускает отправку всех просроченных отложенных публикаций в Telegram."""
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

    headers_out = {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}

    payload = json.dumps({'action': 'flush_scheduled'}).encode('utf-8')
    req = urllib.request.Request(
        TG_BOT_URL,
        data=payload,
        headers={'Content-Type': 'application/json'},
        method='POST'
    )

    with urllib.request.urlopen(req, timeout=25) as resp:
        result = json.loads(resp.read().decode('utf-8'))

    print(f"[tg-scheduler] flushed={result.get('flushed', 0)} errors={result.get('errors', [])}")

    return {
        'statusCode': 200,
        'headers': headers_out,
        'body': json.dumps({'ok': True, 'result': result}),
    }
