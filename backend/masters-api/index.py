import json
from shared import CORS_HEADERS, options_response, get_schema
from profile import handle_profile
from calendar_mod import handle_calendar
from bookings import handle_bookings_root, handle_reviews
from chat_mod import handle_chat
from inquiries import handle_inquiry_create


def handler(event, context):
    """API для работы с мастерами: профиль, календарь, записи, отзывы.
    Маршрутизация: ?resource=profile|calendar|bookings|reviews
    Если resource не указан — работает старая логика (профиль/список/me/slug/admin)."""
    if event.get('httpMethod') == 'OPTIONS':
        return options_response()

    headers = CORS_HEADERS
    method = event.get('httpMethod', 'GET')
    params = event.get('queryStringParameters') or {}
    schema = get_schema()
    resource = params.get('resource')

    try:
        if resource == 'calendar':
            return handle_calendar(event, method, params, schema, headers)
        if resource == 'bookings':
            return handle_bookings_root(event, method, params, schema, headers)
        if resource == 'reviews':
            return handle_reviews(event, method, params, schema, headers)
        if resource == 'chat':
            return handle_chat(event, method, params, schema, headers)
        if resource == 'inquiry':
            return handle_inquiry_create(event, method, params, schema, headers)
        # profile / без resource — старое поведение
        return handle_profile(event, method, params, schema, headers)
    except Exception as e:
        return {'statusCode': 500, 'headers': headers, 'body': json.dumps({'error': str(e)})}