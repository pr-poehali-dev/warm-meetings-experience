# Карта проекта Спарком

> Эта карта помогает быстро находить связи: **страница → API → бэкенд-функция → таблицы БД**.
> Машиночитаемая версия: [`project-map.json`](./project-map.json). Источники истины: `src/App.tsx`, `backend/func2url.json`, `db_migrations/`.

---

## ⚠️ Правила для Юры (ИИ-разработчика)

### 1. Перед задачей — свериться с картой
**Перед любым поиском в коде — сначала открыть `docs/project-map.json`.**

Алгоритм:
1. Прочитать `docs/project-map.json` — найти упомянутые в задаче страницы, API, бэкенд-функции, таблицы.
2. Только потом запускать `Grep` / `Glob` / `Task(Explore)` — точечно, по найденным файлам.

### 2. После задачи — обновить карту
**После любого изменения структуры проекта Юра обязан обновить карту.**

Что считается изменением структуры:
- Новая страница / роут в `src/App.tsx`
- Новый API-клиент в `src/lib/*-api.ts` или новый метод в существующем
- Новая backend-функция в `/backend/` или существенное изменение её ответственности
- Новая таблица в БД или значимое поле в существующей
- Новая значимая фича / диалог / компонент с собственной бизнес-логикой

Куда вносить правки:
- `docs/project-map.json` — соответствующая секция (`pages`, `apiClients`, `backendFunctions`, `dbTables`, `notableFields`, `notableComponents`)
- `docs/PROJECT_MAP.md` — соответствующая таблица/раздел
- `_meta.updated` в JSON — текущая дата + короткая пометка что изменилось

**Задача считается незавершённой, если карта не обновлена.**

---

## Быстрый поиск

- 🌐 **Сайт что-то отображает не так** → секция [Страницы](#страницы)
- 🔌 **Фронт не получает данные** → секция [API-клиенты фронта](#api-клиенты-фронта)
- ⚙️ **Бэк-логика / ошибка функции** → секция [Бэкенд-функции](#бэкенд-функции)
- 🗄️ **Меняем структуру БД** → секция [Таблицы БД](#таблицы-бд)

---

## Страницы

Все маршруты в `src/App.tsx`. `guard` — кто может зайти:
`public` — все; `auth` — залогиненные; `admin` — администраторы; `role:...` — определённые роли.

| Путь | Компонент | Файл | Guard | API |
|---|---|---|---|---|
| `/` | Index | `src/pages/Index.tsx` | public | `events-api` |
| `/events` | Events | `src/pages/Events.tsx` | public | `events-api` |
| `/events/past` | PastEvents | `src/pages/PastEvents.tsx` | public | `events-api` |
| `/events/:slug` | EventDetail | `src/pages/EventDetail.tsx` | public | `events-api`, `user-profile` |
| `/e/:code` | EventShortLink | `src/pages/EventShortLink.tsx` | public | `events-api` |
| `/g/:token` | GuestChat | `src/pages/GuestChat.tsx` | public | `guests-api` |
| `/login` | Login | `src/pages/Login.tsx` | public | `user-auth` |
| `/register` | Register | `src/pages/Register.tsx` | public | `user-auth` |
| `/forgot-password` | ForgotPassword | `src/pages/ForgotPassword.tsx` | public | `user-auth` |
| `/reset-password` | ResetPassword | `src/pages/ResetPassword.tsx` | public | `user-auth` |
| `/verify-email` | VerifyEmail | `src/pages/VerifyEmail.tsx` | public | `user-profile` |
| `/auth/vk/callback` | VkCallback | `src/pages/VkCallback.tsx` | public | `vk-auth-vk-auth` |
| `/auth/yandex/callback` | YandexCallback | `src/pages/YandexCallback.tsx` | public | `yandex-auth-yandex-auth` |
| `/account` | Account | `src/pages/Account.tsx` | **auth** | `user-profile`, `events-api` |
| `/admin` | Admin | `src/pages/Admin.tsx` | **admin** | `admin-users`, `events-api`, `masters-api`, `baths-api`, `blog-articles`, `support`, `audit-log`, `roles-api`, `notify-module` |
| `/workspace` | Workspace | `src/pages/Workspace.tsx` | **role:parmaster,organizer,partner** | `masters-api`, `organizer-cabinet`, `partner-cabinet`, `crm-api`, `guests-api` |
| `/invite` | InviteRegister | `src/pages/InviteRegister.tsx` | public | `organizer-cabinet` |
| `/invite-verify` | InviteVerify | `src/pages/InviteVerify.tsx` | public | `organizer-cabinet` |
| `/baths` | Baths | `src/pages/Baths.tsx` | public | `baths-api` |
| `/baths/:slug` | BathDetail | `src/pages/BathDetail.tsx` | public | `baths-api` |
| `/masters` | Masters | `src/pages/Masters.tsx` | public | `masters-api` |
| `/masters/:slug` | MasterDetail | `src/pages/MasterDetail.tsx` | public | `masters-api` |
| `/blog` | Blog | `src/pages/Blog.tsx` | public | `blog-articles` |
| `/blog/category/:slug` | BlogCategory | `src/pages/BlogCategory.tsx` | public | `blog-articles` |
| `/blog/:slug` | BlogArticle | `src/pages/BlogArticle.tsx` | public | `blog-articles` |
| `/principles` | Principles | `src/pages/Principles.tsx` | public | — |
| `/about` | About | `src/pages/About.tsx` | public | — |
| `/organizer` | Organizer | `src/pages/Organizer.tsx` | public | — |
| `/steam-master-guide` | SteamMasterGuide | `src/pages/SteamMasterGuide.tsx` | public | — |
| `/master-schedule-guide` | MasterScheduleGuide | `src/pages/MasterScheduleGuide.tsx` | public | — |
| `/documents` | Documents | `src/pages/Documents.tsx` | public | — |
| `/functional` | Functional | `src/pages/Functional.tsx` | public | — |
| `/features` | FunctionalDescription | `src/pages/FunctionalDescription.tsx` | public | — |
| `/account-demo` | AccountDemo | `src/pages/AccountDemo.tsx` | public | — |
| `/events-glass` | EventsGlassDemo | `src/pages/EventsGlassDemo.tsx` | public | — |
| `/index-glass` | IndexGlass | `src/pages/IndexGlass.tsx` | public | — |
| `/home-new` | IndexNew | `src/pages/IndexNew.tsx` | public | — |
| `/:slug` | LandingPage | `src/pages/LandingPage.tsx` | public (catch-all) | `landing-api` |
| `*` | NotFoundPage | `src/pages/NotFoundPage.tsx` | public | — |

> ⚠️ `/:slug` ловит ВСЕ нераспознанные адреса первого уровня — это персональные мини-сайты пользователей. Должен быть последним перед `*`.

---

## API-клиенты фронта

Каждый файл в `src/lib/*-api.ts` инкапсулирует HTTP-вызовы к одной (или паре) бэкенд-функций. URL берутся из `backend/func2url.json`.

| Файл | Что экспортирует | К какой backend-функции ходит |
|---|---|---|
| `src/lib/api.ts` | `eventsApi`, `signupsApi`, `questionsApi`, `authApi`, `uploadApi` | `events-api`, `auth`, `media-api` |
| `src/lib/masters-api.ts` | `mastersApi` | `masters-api` |
| `src/lib/master-calendar-api.ts` | `masterCalendarApi`, `masterBookingsApi`, `masterReviewsApi` | `masters-api` |
| `src/lib/baths-api.ts` | `bathsApi` | `baths-api` |
| `src/lib/landing-api.ts` | `landingApi` | `landing-api` |
| `src/lib/blog-api.ts` | `blogApi` | `blog-articles` |
| `src/lib/support-api.ts` | `supportApi`, `supportAdminApi` | `support` |
| `src/lib/user-api.ts` | `userAuthApi`, `userProfileApi` | `user-auth`, `user-profile` |
| `src/lib/organizer-api.ts` | `organizerApi`, `guestsApi` | `organizer-cabinet`, `guests-api` |
| `src/lib/partner-api.ts` | `partnerApi` | `partner-cabinet` |
| `src/lib/roles-api.ts` | `rolesApi` | `roles-api` |
| `src/lib/crm-api.ts` | `crmApi` | `crm-api` |
| `src/lib/audit-log.ts` | `auditLog` | `audit-log` |
| `src/lib/club-api.ts` | `clubApi` | `club-donations` |
| `src/lib/notify-api.ts` | `notifyApi` | `notify-module` |
| `src/lib/tg-publish-api.ts` | `tgPublishApi` | `telegram-bot` |
| `src/lib/ritual-api.ts` | `ritualApi` | `masters-api` |

---

## Бэкенд-функции

Каждая в отдельной папке `/backend/{name}/`, entrypoint — `index.py`, `def handler(event, context)`.
Таблицы — это все таблицы, к которым код функции обращается (READ или WRITE).

| Функция | Описание | Таблицы БД |
|---|---|---|
| `admin-users` | Управление пользователями в админке: список, профиль, блокировка, роли | `users`, `user_roles`, `roles`, `notification_log` |
| `audit-log` | Журнал изменений админки | `admin_audit_log` |
| `auth` | Авторизация в админ-панели по паролю | — |
| `baths-api` | Бани: список, детали, CRUD, фильтры | `baths` |
| `blog-articles` | Статьи блога: чтение, создание, редактирование, модерация | `blog_articles`, `users`, `user_sessions`, `user_roles`, `roles` |
| `club-donations` | Пожертвования клуба | `donations` |
| `crm-api` | Единая база клиентов бизнес-пользователей | `users`, `user_sessions`, `user_roles`, `roles`, `event_signups`, `master_bookings`, `ritual_bookings`, `crm_external_guests`, `crm_tags`, `crm_notes` |
| `crowdfund-freezer` | Автофиксация/отмена событий в складчину | `events`, `event_signups`, `refund_requests` |
| `events-api` | События и записи на них | `events`, `event_signups`, `event_questions`, `event_custom_types` |
| `guests-api` | Гости события и диалоги с ними | `event_signups`, `users`, `user_sessions`, `user_roles`, `roles`, `guest_messages` |
| `landing-api` | Персональные мини-сайты пользователей | `landing_pages`, `users`, `user_sessions`, `masters`, `master_services`, `reviews` |
| `masters-api` | Профиль мастера, календарь, записи, отзывы | `masters`, `specializations`, `master_baths`, `master_services`, `master_slots`, `master_schedule_templates`, `master_day_blocks`, `master_bookings`, `reviews`, `users`, `user_sessions`, `user_roles`, `roles` |
| `media-api` | Загрузка фото/видео (S3) | — |
| `notify-module` | Сценарии уведомлений и отправка | `notify_scenarios`, `notify_log`, `user_sessions`, `user_roles`, `roles`, `events`, `baths`, `event_signups`, `master_bookings`, `ritual_bookings` |
| `organizer-cabinet` | Кабинет организатора: дашборд, события (CRUD + `events.anonymous_count` — доп. брони без данных), участники, ко-организаторы, вопросы события | `events`, `event_signups`, `event_co_organizers`, `event_questions`, `baths`, `users`, `user_sessions`, `user_roles`, `roles` |
| `partner-cabinet` | Кабинет управляющего: бани, статистика, верификация | `baths`, `users`, `user_sessions`, `user_roles`, `roles` |
| `roles-api` | Роли пользователей: прогресс, бейджи, заявки | `roles`, `user_roles`, `role_requirements`, `role_applications`, `badges`, `role_verifications`, `users`, `user_sessions` |
| `support` | Поддержка: FAQ, тикеты, сообщения, админка | `support_tickets`, `support_messages`, `support_templates`, `support_faq`, `users`, `user_sessions` |
| `telegram-bot` | Telegram-бот: webhook + публикация контента | `tg_channels`, `tg_publications`, `users`, `user_sessions`, `events`, `masters`, `blog_articles` |
| `user-auth` | Регистрация, вход, сброс пароля, 2FA | `users`, `user_sessions`, `user_login_devices`, `audit_logs` |
| `user-profile` | Профиль, записи, кошелёк, рефералы, инбокс | `users`, `user_sessions`, `user_roles`, `roles`, `event_signups`, `user_favorites`, `user_wallet_transactions`, `user_referrals`, `user_inbox_messages`, `refund_requests` |
| `robokassa-robokassa` | Robokassa: формирование оплаты | — |
| `robokassa-robokassa-webhook` | Robokassa: вебхук об оплате | — |
| `vk-auth-vk-auth` | OAuth VK ID | `users`, `user_sessions` |
| `yandex-auth-yandex-auth` | OAuth Яндекс ID | `users`, `user_sessions` |

---

## Таблицы БД

Все таблицы PostgreSQL, упомянутые в коде бэкенда. Изменения структуры — только через `db_migrations/V{N}__{name}.sql`.

`admin_audit_log` · `audit_logs` · `baths` · `badges` · `blog_articles` · `crm_external_guests` · `crm_notes` · `crm_tags` · `donations` · `event_co_organizers` · `event_custom_types` · `event_questions` · `event_signups` · `events` · `guest_messages` · `landing_pages` · `master_baths` · `master_bookings` · `master_day_blocks` · `master_schedule_templates` · `master_services` · `master_slots` · `masters` · `notification_log` · `notify_log` · `notify_scenarios` · `refund_requests` · `reviews` · `ritual_bookings` · `role_applications` · `role_requirements` · `role_verifications` · `roles` · `specializations` · `support_faq` · `support_messages` · `support_templates` · `support_tickets` · `tg_channels` · `tg_publications` · `user_favorites` · `user_inbox_messages` · `user_login_devices` · `user_referrals` · `user_roles` · `user_sessions` · `user_wallet_transactions` · `users`

---

## Значимые поля и компоненты

Это «точечный» индекс важных полей и компонентов, чтобы ИИ не искал их по всему репозиторию.

### Поля таблиц
| Таблица | Поле | Описание |
|---|---|---|
| `events` | `anonymous_count` | int, default 0. Доп. брони без личных данных гостя. Учитывается в занятости (`занято = stats.total + anonymous_count`), но не отображается карточками. Управляется в `EventGuestsDialog` через −/+ и PUT `organizer-cabinet?resource=events { anonymous_count }`. |

### Компоненты
| Компонент | Файл | Используется | Назначение |
|---|---|---|---|
| `EventGuestsDialog` | `src/components/crm/EventGuestsDialog.tsx` | `src/components/workspace/WorkspaceContent.tsx` | Диалог гостей события в CRM: список записанных, поиск/фильтры, управление `anonymous_count` через −/+ с мгновенным сохранением. |

---

## Когда и как обновлять карту

**Правило: задача считается незавершённой, пока карта не обновлена.**

Обнови, если:
- Добавил/удалил **страницу** в `src/App.tsx`
- Добавил/удалил **API-клиент** в `src/lib/`
- Добавил/удалил **бэкенд-функцию** в `backend/` (или существенно изменил её ответственность)
- Добавил/удалил **таблицу** в БД или существенно изменил её использование
- Добавил **значимое поле** в важную таблицу (`events`, `users`, `masters`, `baths`, `event_signups` и т.п.) — внести в раздел «Значимые поля» + JSON `notableFields`
- Добавил **значимый компонент** с собственной бизнес-логикой — в раздел «Компоненты» + JSON `notableComponents`

Куда вносить:
1. `docs/project-map.json` — соответствующая секция
2. `docs/PROJECT_MAP.md` — соответствующая таблица
3. `_meta.updated` в JSON — текущая дата + короткая пометка

Источники истины (карта может слегка отставать — это нормально):

- Маршруты — `src/App.tsx`
- URL бэкенд-функций — `backend/func2url.json` (генерится автоматически при `sync_backend`)
- Структура БД — `db_migrations/` (последние миграции = актуальная схема) и `get_db_info` через инструмент