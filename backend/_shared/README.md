# Общий модуль shared.py

## Зачем

Cloud Functions деплоятся изолированно — каждая функция в своей папке.
Импорт между функциями невозможен. Поэтому общий код хранится здесь как
**эталон** и копируется в каждую функцию.

## Эталон

`backend/_shared/shared.py` — единственный источник правды.

## Как менять

1. Редактируешь `backend/_shared/shared.py`
2. Копируешь содержимое во все `backend/*/shared.py`
3. Запускаешь `sync_backend` — деплоятся все изменённые функции

## Какие функции используют shared.py

Полная версия (с auth + telegram):
- admin-users, auth, baths-api, blog-articles, events-api,
- master-bookings, master-calendar, masters-api, notify-module,
- organizer-cabinet, organizer-request, partner-cabinet, roles-api,
- telegram-bot, user-auth, user-profile, vk-notify

Минимальная версия (только DB + CORS):
- upload-media

## Что внутри

| Раздел | Функции |
|---|---|
| DB | get_conn, get_schema, get_cursor |
| CORS | CORS_HEADERS, options_response, respond, ok, err |
| Auth | get_user_from_token, has_role, verify_admin_token |
| Slugify | slugify (с транслитерацией кириллицы) |
| Telegram | tg_send, tg_notify_admin |

## Правила

- НЕ добавляй сюда бизнес-логику — только инфраструктуру
- НЕ ломай обратную совместимость сигнатур — это сломает все 17 функций
- При добавлении функции — обнови README и скопируй во все папки
