import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "next-themes";
import { Card, CardContent } from "@/components/ui/card";
import Icon from "@/components/ui/icon";
import Footer from "@/components/Footer";
import Header from "@/components/Header";

const MSG_THEME_STYLES = `
  [data-msg-theme="dark"] {
    --msg-bg: linear-gradient(160deg, #1a1410 0%, #1c2018 35%, #14201c 65%, #101818 100%);
  }
  [data-msg-theme="light"] {
    --msg-bg: linear-gradient(160deg, #fdf7f0 0%, #f4f8f5 35%, #eef6f4 65%, #eaf4f2 100%);
  }
`;

const NAV_SECTIONS = [
  { id: "intro", label: "Введение" },
  { id: "quickstart", label: "Быстрый старт" },
  { id: "services", label: "Услуги" },
  { id: "templates", label: "Шаблоны" },
  { id: "calendar", label: "Календарь" },
  { id: "bookings", label: "Записи" },
  { id: "settings", label: "Настройки" },
  { id: "scenarios", label: "Сценарии" },
  { id: "faq", label: "FAQ" },
];

const BOOKING_STATUSES = [
  { color: "bg-yellow-400", label: "Ожидает", desc: "Новая заявка от гостя — нужно подтвердить или отклонить" },
  { color: "bg-green-500", label: "Подтверждена", desc: "Вы приняли запись, гость придёт" },
  { color: "bg-blue-500", label: "Завершена", desc: "Сеанс состоялся и закрыт" },
  { color: "bg-red-500", label: "Отменена", desc: "Запись отменена вами или гостем" },
  { color: "bg-zinc-400", label: "Неявка", desc: "Гость не пришёл, вы отметили это вручную" },
];

const SLOT_STATUSES = [
  { color: "bg-green-500", label: "Свободен", desc: "Гость может записаться" },
  { color: "bg-yellow-400", label: "Ожидает", desc: "Есть заявка, ждёт вашего подтверждения" },
  { color: "bg-red-500", label: "Занят", desc: "Все места заняты или заполнены" },
  { color: "bg-zinc-400", label: "Заблокирован", desc: "Вы закрыли этот период вручную" },
];

const SCENARIOS = [
  {
    num: "1",
    title: "Настройка расписания с нуля",
    steps: [
      "Нажмите «Быстрый старт» на странице Расписание",
      "Создайте 1–2 услуги прямо в Быстром старте (например, «Парение 60 мин»)",
      "Выберите рабочие дни и часы работы",
      "Укажите количество недель и нажмите «Сгенерировать окна»",
      "Готово — гости уже могут записываться",
    ],
  },
  {
    num: "2",
    title: "Несколько услуг в один день",
    steps: [
      "Перейдите во вкладку «Шаблоны» → создайте или откройте шаблон",
      "В строке нужного дня нажмите «+ Интервал»",
      "Заполните: например 10:00–14:00 «Парение», затем 16:00–20:00 «Массаж»",
      "Сохраните шаблон и примените на нужный период",
      "В календаре в этот день появятся два разных окна",
    ],
  },
  {
    num: "3",
    title: "Заблокировать конкретный слот",
    steps: [
      "Откройте вкладку «Расписание» (Календарь)",
      "Кликните по нужному окну",
      "В диалоге нажмите «Заблокировать слот»",
      "Слот станет серым — гости не смогут на него записаться",
      "Чтобы вернуть — кликните снова и нажмите «Разблокировать»",
    ],
  },
  {
    num: "4",
    title: "Добавить один слот вне расписания",
    steps: [
      "Перейдите во вкладку «Расписание» (Календарь)",
      "Нажмите кнопку «Новый слот» (или дважды кликните по пустому месту)",
      "Выберите дату, время начала и окончания",
      "Выберите услугу или укажите цену вручную",
      "Нажмите «Сохранить»",
    ],
  },
  {
    num: "5",
    title: "Уйти в отпуск / заблокировать дни",
    steps: [
      "Перейдите во вкладку «Расписание» (Календарь)",
      "Нажмите кнопку «Блокировка» в заголовке",
      "Выберите диапазон дат (например, 1–14 июля)",
      "Можно добавить причину — гост её не видит",
      "Все окна в этот период станут недоступны для записи",
    ],
  },
  {
    num: "6",
    title: "Записать гостя вручную",
    steps: [
      "Перейдите в раздел «Записи»",
      "Нажмите «+ Новая запись»",
      "Заполните имя, телефон, дату и время",
      "Выберите услугу — цена подставится автоматически",
      "Нажмите «Сохранить» — запись появится в списке со статусом «Подтверждена»",
    ],
  },
  {
    num: "7",
    title: "Изменить рабочие часы на следующий месяц",
    steps: [
      "Перейдите во вкладку «Шаблоны»",
      "Отредактируйте нужный шаблон (добавьте или измените часы)",
      "Нажмите «Применить» → укажите дату начала и количество недель",
      "Новые слоты создадутся, уже существующие не изменятся",
    ],
  },
];

const FAQ = [
  {
    q: "Можно ли работать с разными услугами в один день?",
    a: "Да. В редакторе шаблона у каждого дня есть кнопка «+ Интервал» — добавьте, например, утром «Парение» с 10:00 до 14:00 и вечером «Массаж» с 16:00 до 20:00. Каждый интервал — со своей услугой и временем.",
  },
  {
    q: "Чем отличается блокировка слота от блокировки дня?",
    a: "Блокировка слота закрывает только одно конкретное окно (один сеанс в 15:00), остальные слоты дня работают. Блокировка дня закрывает весь период целиком — удобно для отпуска или больничного.",
  },
  {
    q: "Можно ли принимать несколько гостей в один слот?",
    a: "Да. При создании услуги укажите «Максимум клиентов» больше 1. Все записавшиеся увидят только своё имя.",
  },
  {
    q: "Что делать, если гость просит перенести запись?",
    a: "Отмените текущую запись в разделе «Записи», затем создайте новый слот или попросите гостя записаться самостоятельно на удобное время.",
  },
  {
    q: "Что делать, если гость не пришёл?",
    a: "В разделе «Записи» найдите запись → нажмите «Неявка». Статус изменится, слот освободится в истории.",
  },
  {
    q: "Нужно ли подтверждать каждую запись вручную?",
    a: "Нет, если включено автоподтверждение в Настройках. Тогда все новые записи сразу получают статус «Подтверждена» без вашего участия.",
  },
  {
    q: "Как поделиться ссылкой на конкретную услугу?",
    a: "В разделе «Услуги» нажмите иконку ссылки на карточке нужной услуги — ссылка скопируется в буфер. Гость перейдёт сразу к форме записи на эту услугу.",
  },
  {
    q: "Можно ли удалить слот, на который уже записались?",
    a: "Нет. Сначала отмените все записи в этом слоте, затем слот можно удалить.",
  },
  {
    q: "Как посмотреть доход за месяц?",
    a: "Перейдите в раздел «Финансы» в боковом меню кабинета мастера.",
  },
  {
    q: "Шаблон и Быстрый старт — в чём разница?",
    a: "Быстрый старт — это одноразовая быстрая настройка для тех, кто только начинает. Шаблоны — более гибкий инструмент с разными услугами в разные дни. Если нужна тонкая настройка — используйте Шаблоны.",
  },
];

function SectionTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="text-xl font-bold text-foreground mb-5 pt-2 scroll-mt-24 flex items-center gap-2">
      {children}
    </h2>
  );
}

function StepBadge({ n }: { n: string | number }) {
  return (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex-shrink-0">
      {n}
    </span>
  );
}

function InfoBox({ icon, color, children }: { icon: string; color: string; children: React.ReactNode }) {
  return (
    <Card className={`border-${color}-200 bg-${color}-50 dark:bg-${color}-950/20 dark:border-${color}-900`}>
      <CardContent className="p-4 flex gap-3">
        <Icon name={icon as "Info"} size={16} className={`text-${color}-500 flex-shrink-0 mt-0.5`} />
        <div className={`text-sm text-${color}-800 dark:text-${color}-300`}>{children}</div>
      </CardContent>
    </Card>
  );
}

export default function MasterScheduleGuide() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted ? resolvedTheme === "dark" : true;

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div
      data-msg-theme={isDark ? "dark" : "light"}
      className="min-h-screen relative overflow-x-hidden transition-colors duration-500"
      style={{ background: "var(--msg-bg)" }}
    >
      <style dangerouslySetInnerHTML={{ __html: MSG_THEME_STYLES }} />

      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div
          className="absolute top-[-15%] left-[-10%] w-[55vw] h-[55vw] rounded-full blur-[120px]"
          style={{ background: "radial-gradient(circle, rgba(200,131,74,0.08) 0%, transparent 70%)" }}
        />
        <div
          className="absolute bottom-[10%] right-[-10%] w-[45vw] h-[45vw] rounded-full blur-[100px]"
          style={{ background: "radial-gradient(circle, rgba(143,168,154,0.07) 0%, transparent 70%)" }}
        />
      </div>

      <div className="relative z-10">
        <Header transparent />

        <div className="max-w-5xl mx-auto px-4 pt-28 pb-16 flex gap-8">

          {/* Сайдбар навигации */}
          <aside className="hidden lg:block w-48 flex-shrink-0">
            <div className="sticky top-24 space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-3">
                Содержание
              </p>
              {NAV_SECTIONS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => scrollTo(s.id)}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors leading-snug"
                >
                  {s.label}
                </button>
              ))}
              <div className="pt-4 px-3">
                <Link
                  to="/workspace"
                  className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                >
                  <Icon name="CalendarDays" size={13} />
                  Открыть кабинет
                </Link>
              </div>
            </div>
          </aside>

          {/* Основной контент */}
          <main className="flex-1 min-w-0 space-y-14">

            {/* Введение */}
            <div id="intro">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                <Link to="/workspace" className="hover:text-foreground">Рабочий кабинет</Link>
                <Icon name="ChevronRight" size={14} />
                <span>Инструкция для мастера</span>
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-4">Кабинет мастера — полное руководство</h1>
              <p className="text-muted-foreground leading-relaxed max-w-2xl mb-6">
                Здесь собрано всё, что нужно для работы с расписанием, услугами и записями гостей.
                Логика простая: вы создаёте <strong>услуги</strong>, настраиваете <strong>рабочие окна</strong> в календаре,
                гости записываются сами — вы только подтверждаете.
              </p>

              {/* Структура кабинета */}
              <Card>
                <CardContent className="p-5">
                  <p className="text-sm font-semibold mb-4">Разделы кабинета мастера</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { icon: "CalendarDays", label: "Расписание", desc: "Окна доступности — когда вы принимаете гостей. Здесь управляете слотами, блокировками и шаблонами." },
                      { icon: "ClipboardCheck", label: "Записи", desc: "Журнал всех заявок: ожидают подтверждения, подтверждены, завершены, отменены." },
                      { icon: "Sparkles", label: "Услуги", desc: "Что предлагаете гостям: название, длительность, цена, формат (на месте / выезд)." },
                      { icon: "Copy", label: "Шаблоны", desc: "Типовое расписание недели — создайте один раз и применяйте на любое число недель." },
                      { icon: "SlidersHorizontal", label: "Настройки", desc: "Часовой пояс, перерыв между записями, автоподтверждение новых заявок." },
                      { icon: "UserCircle", label: "Профиль", desc: "Публичная страница мастера — фото, описание, ссылка на социальные сети." },
                    ].map((t) => (
                      <div key={t.label} className="flex gap-3 bg-muted/40 rounded-xl p-3">
                        <Icon name={t.icon as "CalendarDays"} size={18} className="text-primary flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">{t.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{t.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Быстрый старт */}
            <section id="quickstart">
              <SectionTitle id="quickstart">
                <Icon name="Zap" size={20} className="text-amber-500" />
                Быстрый старт
              </SectionTitle>
              <p className="text-sm text-muted-foreground mb-4">
                Если вы только начинаете — используйте «Быстрый старт». Это мастер настройки, который
                создаёт всё необходимое за несколько шагов без погружения в детали.
              </p>
              <Card className="mb-4">
                <CardContent className="p-5">
                  <p className="text-sm font-medium mb-3">Как запустить:</p>
                  <ol className="space-y-2">
                    {[
                      "Перейдите в раздел «Расписание»",
                      "Нажмите кнопку «⚡ Быстрый старт» справа вверху",
                      "Откроется панель с тремя блоками: Услуги, Рабочие часы, Настройки",
                    ].map((step, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm">
                        <StepBadge n={i + 1} />
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>

              <div className="grid sm:grid-cols-3 gap-3 mb-4">
                {[
                  { icon: "Sparkles", title: "Блок 1: Услуги", desc: "Создайте услуги прямо здесь — кнопка «+ Добавить услугу» открывает полный диалог с форматом, описанием и ценой." },
                  { icon: "Clock", title: "Блок 2: Рабочие часы", desc: "Выберите дни недели, время начала и окончания, количество недель вперёд. Одним нажатием генерируется расписание." },
                  { icon: "SlidersHorizontal", title: "Блок 3: Настройки", desc: "Часовой пояс, перерыв между записями и автоподтверждение — базовые параметры без лишних деталей." },
                ].map((b) => (
                  <Card key={b.title}>
                    <CardContent className="p-4">
                      <Icon name={b.icon as "Sparkles"} size={16} className="text-primary mb-2" />
                      <p className="text-sm font-medium mb-1">{b.title}</p>
                      <p className="text-xs text-muted-foreground leading-snug">{b.desc}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <InfoBox icon="Info" color="blue">
                <strong>После Быстрого старта</strong> у вас будут услуги и окна доступности в календаре.
                Для тонкой настройки (разные услуги в разные дни, несколько интервалов) используйте вкладку «Шаблоны».
              </InfoBox>
            </section>

            {/* Услуги */}
            <section id="services">
              <SectionTitle id="services">
                <Icon name="Sparkles" size={20} className="text-primary" />
                Услуги
              </SectionTitle>
              <p className="text-sm text-muted-foreground mb-4">
                Услуга — это то, на что записывается гость. Без услуги окна доступности всё равно работают,
                но гость не будет видеть что именно его ждёт. Создайте хотя бы одну.
              </p>

              <Card className="mb-4">
                <CardContent className="p-5 space-y-4">
                  <p className="text-sm font-semibold">Поля при создании услуги:</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          {["Поле", "Описание", "Пример"].map((c) => (
                            <th key={c} className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide py-2 pr-4">{c}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {[
                          ["Название", "Как видит гость при записи", "Русское парение 60 мин"],
                          ["Формат", "На месте / Выезд к гостю / По согласованию", "На месте у мастера"],
                          ["Краткое описание", "Что входит в услугу", "Парилка, массаж веником, чай"],
                          ["Что входит", "Список пунктов (каждый с новой строки)", "Парилка, веник, травяной чай"],
                          ["Что взять с собой", "Что гостю нужно иметь при себе", "Смена белья, тапочки"],
                          ["Противопоказания", "Важно для безопасности гостей", "Беременность, гипертония"],
                          ["Длительность (мин)", "Сколько длится один сеанс", "60"],
                          ["Цена (₽)", "Стоимость за один сеанс", "3 500"],
                          ["Макс. участников", "Сколько гостей одновременно", "2"],
                          ["Активна", "Видна ли услуга гостям при записи", "Включено"],
                        ].map(([field, desc, ex]) => (
                          <tr key={field} className="hover:bg-muted/30">
                            <td className="py-2.5 pr-4 font-medium whitespace-nowrap">{field}</td>
                            <td className="py-2.5 pr-4 text-muted-foreground text-xs leading-snug">{desc}</td>
                            <td className="py-2.5 text-muted-foreground text-xs">{ex}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <Card className="mb-4">
                <CardContent className="p-5">
                  <p className="text-sm font-semibold mb-3">Действия с услугой в списке:</p>
                  <div className="space-y-2">
                    {[
                      { icon: "Pencil", label: "Редактировать", desc: "Изменить любые параметры услуги" },
                      { icon: "EyeOff", label: "Скрыть / Показать", desc: "Скрытая услуга не видна гостям при записи, но существующие слоты с ней сохраняются" },
                      { icon: "Link", label: "Скопировать ссылку", desc: "Прямая ссылка на запись на эту конкретную услугу — удобно отправить гостю" },
                      { icon: "Trash2", label: "Удалить", desc: "Удаляет услугу безвозвратно. Нельзя удалить, если есть активные записи" },
                      { icon: "Send", label: "Опубликовать в Telegram", desc: "Отправить карточку услуги в ваш Telegram-канал или группу" },
                    ].map((a) => (
                      <div key={a.label} className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                          <Icon name={a.icon as "Pencil"} size={14} className="text-muted-foreground" />
                        </div>
                        <div>
                          <span className="text-sm font-medium">{a.label}</span>
                          <span className="text-sm text-muted-foreground"> — {a.desc}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <InfoBox icon="AlertCircle" color="amber">
                <strong>Формат «Выезд к гостю»</strong> — при выборе этого формата гость указывает адрес на карте при записи.
                Вы можете заранее сохранить адрес отправления (откуда выезжаете) в настройках.
              </InfoBox>
            </section>

            {/* Шаблоны */}
            <section id="templates">
              <SectionTitle id="templates">
                <Icon name="Copy" size={20} className="text-primary" />
                Шаблоны расписания
              </SectionTitle>
              <p className="text-sm text-muted-foreground mb-4">
                Шаблон — это описание вашей типичной рабочей недели. Создаёте один раз,
                применяете на любое количество недель — система сама создаёт все окна.
              </p>

              <Card className="mb-4">
                <CardContent className="p-5">
                  <p className="text-sm font-medium mb-3">Как создать шаблон:</p>
                  <ol className="space-y-2">
                    {[
                      "Перейдите во вкладку «Шаблоны»",
                      "Нажмите «Создать шаблон» — введите название (например, «Основной» или «Летнее расписание»)",
                      "Для каждого рабочего дня нажмите «+ Интервал»",
                      "Укажите время начала и окончания, выберите услугу, максимум гостей",
                      "При необходимости добавьте несколько интервалов в один день",
                      "Сохраните шаблон",
                    ].map((step, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm">
                        <StepBadge n={i + 1} />
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>

              <Card className="mb-4">
                <CardContent className="p-5">
                  <p className="text-sm font-medium mb-3">Как применить шаблон:</p>
                  <ol className="space-y-2">
                    {[
                      "Найдите нужный шаблон в списке",
                      "Нажмите «Применить шаблон»",
                      "Укажите дату начала и количество недель",
                      "Подтвердите — система создаст все окна доступности",
                      "Результат: «Создано X слотов» (уже существующие пропускаются)",
                    ].map((step, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm">
                        <StepBadge n={i + 1} />
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>

              <div className="grid sm:grid-cols-2 gap-3">
                <InfoBox icon="Info" color="blue">
                  <strong>Несколько шаблонов.</strong> Можно создать разные шаблоны для разных периодов —
                  «Летнее», «Зимнее», «Праздничное». Применяйте нужный под конкретный месяц.
                </InfoBox>
                <InfoBox icon="AlertCircle" color="amber">
                  <strong>Повторное применение</strong> не удаляет уже созданные слоты — оно только добавляет новые.
                  Перед применением не нужно чистить календарь.
                </InfoBox>
              </div>
            </section>

            {/* Календарь */}
            <section id="calendar">
              <SectionTitle id="calendar">
                <Icon name="CalendarDays" size={20} className="text-primary" />
                Календарь
              </SectionTitle>
              <p className="text-sm text-muted-foreground mb-4">
                Здесь вы видите все окна доступности, записи гостей и блокировки в виде сетки по дням и часам.
                Навигируйте по неделям, кликайте на слоты, перетаскивайте их.
              </p>

              {/* Статусы слотов */}
              <Card className="mb-4">
                <CardContent className="p-5">
                  <p className="text-sm font-semibold mb-3">Цвета окон в календаре:</p>
                  <div className="space-y-2">
                    {SLOT_STATUSES.map((s) => (
                      <div key={s.label} className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full flex-shrink-0 ${s.color}`} />
                        <span className="text-sm font-medium w-28">{s.label}</span>
                        <span className="text-sm text-muted-foreground">{s.desc}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="mb-4">
                <CardContent className="p-5 space-y-4">
                  <p className="text-sm font-semibold">Что можно делать с окном:</p>
                  <div className="space-y-3">
                    {[
                      { icon: "MousePointerClick", title: "Клик по окну", desc: "Открывает детали: список гостей, статус, кнопки управления" },
                      { icon: "GripVertical", title: "Перетащить окно", desc: "Переместить на другое время или день (только если нет подтверждённых записей)" },
                      { icon: "Expand", title: "Растянуть окно", desc: "Изменить длительность — потяните за нижний край" },
                      { icon: "Plus", title: "Двойной клик по пустому месту", desc: "Быстро создать новое окно на выбранное время" },
                      { icon: "Lock", title: "Заблокировать", desc: "Закрыть окно от записи — в деталях слота кнопка «Заблокировать»" },
                      { icon: "Trash2", title: "Удалить", desc: "Убрать окно из расписания (только если нет записей)" },
                    ].map((a) => (
                      <div key={a.title} className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Icon name={a.icon as "Plus"} size={14} className="text-muted-foreground" />
                        </div>
                        <div>
                          <span className="text-sm font-medium">{a.title}</span>
                          <span className="text-sm text-muted-foreground"> — {a.desc}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="mb-4">
                <CardContent className="p-5">
                  <p className="text-sm font-semibold mb-3">Кнопки в заголовке календаря:</p>
                  <div className="space-y-2">
                    {[
                      { label: "Новый слот", desc: "Создать окно доступности вручную — дата, время, услуга, максимум гостей" },
                      { label: "Блокировка", desc: "Заблокировать диапазон дней (отпуск, болезнь, личные дела)" },
                      { label: "Применить шаблон", desc: "Применить существующий шаблон на выбранный период" },
                      { label: "Сегодня", desc: "Вернуться к текущей неделе" },
                    ].map((b) => (
                      <div key={b.label} className="flex items-start gap-3 text-sm">
                        <span className="font-medium bg-muted px-2 py-0.5 rounded text-xs whitespace-nowrap">{b.label}</span>
                        <span className="text-muted-foreground">{b.desc}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <InfoBox icon="Info" color="blue">
                <strong>Процент заполненности</strong> под датой показывает, сколько окон в этот день занято.
                0% — все свободны, 100% — все окна заняты или заблокированы.
              </InfoBox>
            </section>

            {/* Записи */}
            <section id="bookings">
              <SectionTitle id="bookings">
                <Icon name="ClipboardCheck" size={20} className="text-primary" />
                Записи
              </SectionTitle>
              <p className="text-sm text-muted-foreground mb-4">
                Раздел «Записи» — это журнал всех заявок от гостей. Здесь подтверждаете, отменяете,
                завершаете и создаёте записи вручную.
              </p>

              {/* Статусы записей */}
              <Card className="mb-4">
                <CardContent className="p-5">
                  <p className="text-sm font-semibold mb-3">Статусы записи:</p>
                  <div className="space-y-2">
                    {BOOKING_STATUSES.map((s) => (
                      <div key={s.label} className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full flex-shrink-0 ${s.color}`} />
                        <span className="text-sm font-medium w-28">{s.label}</span>
                        <span className="text-sm text-muted-foreground">{s.desc}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="mb-4">
                <CardContent className="p-5 space-y-4">
                  <p className="text-sm font-semibold">Действия с записью:</p>
                  <div className="space-y-2">
                    {[
                      { icon: "CheckCircle", label: "Подтвердить", desc: "Принять заявку — гость получит уведомление" },
                      { icon: "XCircle", label: "Отменить", desc: "Отклонить с указанием причины — она отправится гостю" },
                      { icon: "CheckCheck", label: "Завершить", desc: "Отметить, что сеанс состоялся" },
                      { icon: "UserX", label: "Неявка", desc: "Гость не пришёл — запись закрывается, слот освобождается" },
                    ].map((a) => (
                      <div key={a.label} className="flex items-start gap-3 text-sm">
                        <Icon name={a.icon as "CheckCircle"} size={16} className="text-muted-foreground flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="font-medium">{a.label}</span>
                          <span className="text-muted-foreground"> — {a.desc}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="mb-4">
                <CardContent className="p-5">
                  <p className="text-sm font-semibold mb-3">Создание записи вручную:</p>
                  <p className="text-sm text-muted-foreground mb-3">
                    Нажмите «+ Новая запись» — откроется форма. Полезно, если гость звонит или пишет напрямую.
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          {["Поле", "Обязательное", "Примечание"].map((c) => (
                            <th key={c} className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide py-2 pr-4">{c}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {[
                          ["Имя гостя", "Да", "Как к нему обращаться"],
                          ["Телефон", "Да", "Для связи"],
                          ["Email", "Нет", "Опционально"],
                          ["Дата", "Да", "Формат ГГГГ-ММ-ДД"],
                          ["Время начала", "Да", "HH:MM"],
                          ["Время окончания", "Да", "HH:MM или рассчитается по услуге"],
                          ["Услуга", "Нет", "При выборе — цена подставляется автоматически"],
                          ["Цена", "Нет", "Можно переопределить цену услуги"],
                          ["Примечание", "Нет", "Внутренний комментарий"],
                        ].map(([field, req, note]) => (
                          <tr key={field} className="hover:bg-muted/30">
                            <td className="py-2.5 pr-4 font-medium text-xs">{field}</td>
                            <td className="py-2.5 pr-4 text-xs">
                              <span className={`px-1.5 py-0.5 rounded text-xs ${req === "Да" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : "bg-muted text-muted-foreground"}`}>{req}</span>
                            </td>
                            <td className="py-2.5 text-xs text-muted-foreground">{note}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <InfoBox icon="Info" color="blue">
                <strong>Фильтр по статусу</strong> в верхней части списка — быстро найти все ожидающие подтверждения,
                завершённые за период или отменённые записи.
              </InfoBox>
            </section>

            {/* Настройки */}
            <section id="settings">
              <SectionTitle id="settings">
                <Icon name="SlidersHorizontal" size={20} className="text-primary" />
                Настройки
              </SectionTitle>
              <p className="text-sm text-muted-foreground mb-4">
                Раздел настроек влияет на то, как работает вся система записи. Задайте правильные параметры один раз.
              </p>

              <Card className="mb-4">
                <CardContent className="p-5 space-y-4">
                  {[
                    {
                      icon: "Globe",
                      title: "Часовой пояс",
                      desc: "Все времена в календаре будут отображаться в вашем поясе. Если гости из другого региона — они увидят время в своём. Выберите пояс из списка (от Калининграда до Камчатки).",
                    },
                    {
                      icon: "Timer",
                      title: "Перерыв между записями",
                      desc: "Дополнительное время после каждого сеанса. Например, 15 минут на уборку и подготовку. Система автоматически блокирует этот интервал между слотами.",
                    },
                    {
                      icon: "Zap",
                      title: "Автоподтверждение",
                      desc: "Если включено — новые заявки от гостей сразу получают статус «Подтверждена» без вашего участия. Если выключено — каждую нужно подтверждать вручную в разделе «Записи».",
                    },
                    {
                      icon: "MapPin",
                      title: "Мои адреса",
                      desc: "Сохранённые адреса для услуг формата «Выезд к гостю». Укажите откуда выезжаете — система учтёт это при создании услуги.",
                    },
                  ].map((s) => (
                    <div key={s.title} className="flex gap-3">
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        <Icon name={s.icon as "Globe"} size={15} className="text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{s.title}</p>
                        <p className="text-sm text-muted-foreground leading-snug mt-0.5">{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </section>

            {/* Сценарии */}
            <section id="scenarios">
              <SectionTitle id="scenarios">
                <Icon name="BookMarked" size={20} className="text-primary" />
                Типовые сценарии
              </SectionTitle>
              <p className="text-sm text-muted-foreground mb-5">
                Пошаговые инструкции для самых частых ситуаций.
              </p>
              <div className="space-y-4">
                {SCENARIOS.map((s) => (
                  <Card key={s.num}>
                    <CardContent className="p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <StepBadge n={s.num} />
                        <p className="font-semibold text-sm">{s.title}</p>
                      </div>
                      <ol className="space-y-1.5">
                        {s.steps.map((step, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <span className="font-medium text-foreground/60 text-xs mt-0.5 w-4 flex-shrink-0">{i + 1}.</span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {/* FAQ */}
            <section id="faq">
              <SectionTitle id="faq">
                <Icon name="HelpCircle" size={20} className="text-primary" />
                Частые вопросы
              </SectionTitle>
              <div className="space-y-2">
                {FAQ.map((item, i) => (
                  <Card
                    key={i}
                    className="cursor-pointer transition-colors hover:bg-muted/30"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-medium">{item.q}</p>
                        <Icon
                          name={openFaq === i ? "ChevronUp" : "ChevronDown"}
                          size={16}
                          className="text-muted-foreground flex-shrink-0 mt-0.5"
                        />
                      </div>
                      {openFaq === i && (
                        <p className="text-sm text-muted-foreground mt-3 leading-relaxed border-t pt-3">
                          {item.a}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="mt-8 p-5 rounded-2xl border border-border bg-muted/30 text-center">
                <Icon name="MessageCircle" size={24} className="text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-medium mb-1">Не нашли ответ?</p>
                <p className="text-xs text-muted-foreground mb-3">Напишите нам — поможем разобраться</p>
                <a
                  href="https://poehali.dev/help"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
                >
                  <Icon name="ExternalLink" size={12} />
                  Написать в поддержку
                </a>
              </div>
            </section>

          </main>
        </div>
        <Footer />
      </div>
    </div>
  );
}
