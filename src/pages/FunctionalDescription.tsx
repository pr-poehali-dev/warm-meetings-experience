import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Icon from "@/components/ui/icon";

interface Section {
  icon: string;
  title: string;
  color: string;
  bg: string;
  items: string[];
}

interface RoleCard {
  icon: string;
  title: string;
  subtitle: string;
  color: string;
  bg: string;
  border: string;
  sections: { label: string; items: string[] }[];
}

const PUBLIC_SECTIONS: Section[] = [
  {
    icon: "CalendarDays",
    title: "Афиша событий",
    color: "text-orange-600",
    bg: "bg-orange-50",
    items: [
      "Каталог предстоящих банных событий",
      "Фильтрация по типу, городу, доступности мест",
      "Переключение между списком и календарём",
      "Архив прошедших событий",
      "Быстрый переход по короткой ссылке /e/код",
    ],
  },
  {
    icon: "Home",
    title: "Каталог бань",
    color: "text-amber-600",
    bg: "bg-amber-50",
    items: [
      "Фильтрация по городам, типам парных, характеристикам",
      "Рейтинги и отзывы посетителей",
      "Детальная страница каждой бани с фото и описанием",
      "Информация об услугах, графике работы, ценах",
    ],
  },
  {
    icon: "Users",
    title: "Каталог мастеров",
    color: "text-teal-600",
    bg: "bg-teal-50",
    items: [
      "Поиск по специализациям и регионам",
      "Профиль мастера с портфолио и услугами",
      "Расписание доступности и форма бронирования",
      "Рейтинг и отзывы клиентов",
    ],
  },
  {
    icon: "BookOpen",
    title: "Блог",
    color: "text-violet-600",
    bg: "bg-violet-50",
    items: [
      "Статьи по категориям: ритуалы, здоровье, строительство, история",
      "Материалы от мастеров и организаторов платформы",
      "Гайд для начинающих парильщиков",
      "Руководство по работе с расписанием",
    ],
  },
];

const ROLES: RoleCard[] = [
  {
    icon: "User",
    title: "Обычный участник",
    subtitle: "После регистрации",
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
    sections: [
      {
        label: "Мои события",
        items: [
          "Запись на банные события и мероприятия",
          "Отмена записи",
          "История посещённых событий",
          "Статусы регистраций",
        ],
      },
      {
        label: "Личный кабинет",
        items: [
          "Редактирование профиля: имя, email, телефон, Telegram",
          "Привязка аккаунтов VK и Яндекс",
          "Управление паролем и двухфакторной аутентификацией (2FA)",
          "Настройка уведомлений",
          "Экспорт личных данных",
          "Избранное: сохранение событий и мастеров",
          "Реферальная программа",
          "Кошелёк и бонусы",
        ],
      },
    ],
  },
  {
    icon: "Flame",
    title: "Мастер бани",
    subtitle: "Роль: parmaster",
    color: "text-orange-700",
    bg: "bg-orange-50",
    border: "border-orange-200",
    sections: [
      {
        label: "Профиль мастера",
        items: [
          "Создание и редактирование публичного профиля",
          "Загрузка фотографий и портфолио",
          "Указание специализаций и услуг с ценами",
          "Настройка зон обслуживания",
        ],
      },
      {
        label: "Расписание и записи",
        items: [
          "Управление календарём доступности",
          "Просмотр всех бронирований от клиентов",
          "Статусы и контакты клиентов",
          "Финансовая статистика и история платежей",
        ],
      },
      {
        label: "Продвижение",
        items: [
          "Личная визитка — собственный мини-сайт с блоками",
          "Публикация предложений в Telegram-каналы",
          "Рассылки клиентам и подписчикам",
          "Публикация статей в блоге платформы",
        ],
      },
    ],
  },
  {
    icon: "CalendarCheck",
    title: "Организатор событий",
    subtitle: "Роль: organizer",
    color: "text-green-700",
    bg: "bg-green-50",
    border: "border-green-200",
    sections: [
      {
        label: "Управление событиями",
        items: [
          "Создание событий: название, описание, дата, место, программа",
          "Ценообразование, пакеты участия, дополнения",
          "Публикация и управление видимостью",
          "Редактирование и отмена событий",
        ],
      },
      {
        label: "Участники",
        items: [
          "Список зарегистрированных участников",
          "Статусы оплаты и посещения",
          "Ответы на вопросы от участников",
          "Рассылка уведомлений по участникам",
          "Добавление участников вручную",
        ],
      },
      {
        label: "Аналитика и продвижение",
        items: [
          "Дашборд: статистика, доход, посещаемость",
          "Калькулятор дохода по событию",
          "Личная визитка — мини-сайт организатора",
          "Публикация в Telegram-каналы",
          "Промокоды и скидки для участников",
        ],
      },
    ],
  },
  {
    icon: "Building2",
    title: "Управляющий банями",
    subtitle: "Роль: partner",
    color: "text-cyan-700",
    bg: "bg-cyan-50",
    border: "border-cyan-200",
    sections: [
      {
        label: "Управление объектами",
        items: [
          "Добавление и редактирование карточек бань",
          "Загрузка фотографий, описание парных и услуг",
          "Указание адреса, графика работы, цен",
          "Запрос верификации бани администратором",
        ],
      },
      {
        label: "Аналитика",
        items: [
          "Дашборд по посещаемости и доходам",
          "Статистика по каждому объекту",
        ],
      },
    ],
  },
  {
    icon: "ShieldCheck",
    title: "Администратор",
    subtitle: "Роль: admin",
    color: "text-slate-700",
    bg: "bg-slate-50",
    border: "border-slate-200",
    sections: [
      {
        label: "Управление контентом",
        items: [
          "Все события: создание, редактирование, дублирование, удаление",
          "Модерация и одобрение событий организаторов",
          "Каталог бань и мастеров",
          "Управление блогом и статьями",
          "Видеоматериалы платформы",
        ],
      },
      {
        label: "Финансы и скидки",
        items: [
          "Промокоды: создание, ограничения, сроки действия",
          "Пакеты услуг и дополнения к событиям",
          "Ценовые множители и расчётные коэффициенты",
        ],
      },
      {
        label: "Пользователи и роли",
        items: [
          "Управление учётными записями пользователей",
          "Назначение и отзыв ролей",
          "Рассмотрение заявок на получение роли",
          "Управление тикетами поддержки",
        ],
      },
      {
        label: "Система",
        items: [
          "Глобальные настройки платформы",
          "Праздники и нерабочие дни",
          "Зоны обслуживания мастеров",
          "Записи и бронирования",
          "Командная палитра быстрых действий",
        ],
      },
    ],
  },
];

const AUTH_FEATURES = [
  { icon: "Mail", label: "Email + пароль" },
  { icon: "MessageCircle", label: "Через ВКонтакте" },
  { icon: "Search", label: "Через Яндекс" },
  { icon: "Shield", label: "2FA (Google Authenticator)" },
  { icon: "Link", label: "Приглашения по ссылке" },
];

export default function FunctionalDescription() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-10 max-w-5xl">

        {/* Заголовок */}
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3" style={{ fontFamily: "Playfair Display, serif" }}>
            Функционал платформы СПАРКОМ
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl">
            Полное описание возможностей для всех типов пользователей — от гостя сайта до администратора платформы.
          </p>
        </div>

        {/* Блок 1: Публичный функционал */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
              <Icon name="Globe" size={16} className="text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">Для всех посетителей — без регистрации</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {PUBLIC_SECTIONS.map((sec) => (
              <div key={sec.title} className="bg-card border border-border rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-9 h-9 rounded-xl ${sec.bg} flex items-center justify-center`}>
                    <Icon name={sec.icon} size={18} className={sec.color} />
                  </div>
                  <h3 className="font-semibold text-foreground">{sec.title}</h3>
                </div>
                <ul className="space-y-2">
                  {sec.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-border flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Блок 2: Авторизация */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
              <Icon name="LogIn" size={16} className="text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">Авторизация и вход</h2>
          </div>
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex flex-wrap gap-3">
              {AUTH_FEATURES.map((f) => (
                <div key={f.label} className="flex items-center gap-2 px-4 py-2.5 bg-muted rounded-xl text-sm text-foreground">
                  <Icon name={f.icon} size={15} className="text-primary" />
                  {f.label}
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Поддерживается восстановление пароля по email, подтверждение адреса электронной почты, регистрация по персональному приглашению.
            </p>
          </div>
        </section>

        {/* Блок 3: Роли пользователей */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
              <Icon name="Users" size={16} className="text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">Возможности по ролям</h2>
          </div>
          <div className="space-y-5">
            {ROLES.map((role) => (
              <div key={role.title} className={`bg-card border ${role.border} rounded-2xl overflow-hidden`}>
                <div className={`${role.bg} px-5 py-4 flex items-center gap-3`}>
                  <div className="w-10 h-10 rounded-xl bg-white/70 flex items-center justify-center">
                    <Icon name={role.icon} size={20} className={role.color} />
                  </div>
                  <div>
                    <h3 className={`font-semibold ${role.color}`}>{role.title}</h3>
                    <p className="text-xs text-muted-foreground">{role.subtitle}</p>
                  </div>
                </div>
                <div className="px-5 py-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {role.sections.map((section) => (
                      <div key={section.label}>
                        <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                          {section.label}
                        </div>
                        <ul className="space-y-1.5">
                          {section.items.map((item) => (
                            <li key={item} className="flex items-start gap-2 text-sm text-foreground">
                              <Icon name="Check" size={13} className={`mt-0.5 flex-shrink-0 ${role.color}`} />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Блок 4: Рабочий кабинет */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
              <Icon name="Briefcase" size={16} className="text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">Рабочий кабинет — общие инструменты</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Доступно всем пользователям с коммерческими ролями (мастер, организатор, управляющий).
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                icon: "Send",
                title: "Telegram-каналы",
                color: "text-sky-600",
                bg: "bg-sky-50",
                desc: "Привязка собственных Telegram-каналов и публикация событий, услуг, анонсов прямо из личного кабинета.",
              },
              {
                icon: "Layout",
                title: "Личная визитка",
                color: "text-indigo-600",
                bg: "bg-indigo-50",
                desc: "Конструктор персональной страницы — собственный мини-сайт на домене sparcom.ru/ваш-slug с блоками, фото и контактами.",
              },
              {
                icon: "Megaphone",
                title: "Рассылки",
                color: "text-rose-600",
                bg: "bg-rose-50",
                desc: "Маркетинговые рассылки подписчикам и участникам событий с сегментацией аудитории.",
              },
              {
                icon: "PenLine",
                title: "Блог",
                color: "text-emerald-600",
                bg: "bg-emerald-50",
                desc: "Создание и публикация авторских статей в общем блоге платформы — для привлечения аудитории и экспертности.",
              },
            ].map((item) => (
              <div key={item.title} className="bg-card border border-border rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-9 h-9 rounded-xl ${item.bg} flex items-center justify-center`}>
                    <Icon name={item.icon} size={18} className={item.color} />
                  </div>
                  <h3 className="font-semibold text-foreground">{item.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Блок 5: Поддержка */}
        <section className="mb-6">
          <div className="bg-card border border-border rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Icon name="HeadphonesIcon" size={22} className="text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">Поддержка пользователей</h3>
              <p className="text-sm text-muted-foreground">
                На сайте доступен виджет обратной связи. Авторизованные пользователи могут создавать тикеты и отслеживать их статус. Администраторы обрабатывают обращения в панели управления.
              </p>
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
