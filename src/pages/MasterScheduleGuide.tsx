import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Icon from "@/components/ui/icon";
import Footer from "@/components/Footer";
import Header from "@/components/Header";

const NAV_SECTIONS = [
  { id: "intro", label: "Введение" },
  { id: "navigation", label: "Навигация" },
  { id: "services", label: "Шаг 1. Услуги" },
  { id: "templates", label: "Шаг 2. Шаблоны" },
  { id: "calendar", label: "Шаг 3. Календарь" },
  { id: "bookings", label: "Шаг 4. Записи" },
  { id: "settings", label: "Шаг 5. Настройки" },
  { id: "scenarios", label: "Сценарии" },
  { id: "faq", label: "FAQ" },
];

const SLOT_STATUSES = [
  { color: "bg-green-500", label: "Свободен", desc: "Места есть, клиент может записаться" },
  { color: "bg-yellow-400", label: "Ожидает", desc: "Есть заявка, ждёт вашего подтверждения" },
  { color: "bg-red-500", label: "Занят", desc: "Все места заняты, запись недоступна" },
  { color: "bg-zinc-400", label: "Заблокирован", desc: "Вы закрыли этот период (отпуск, болезнь)" },
];

const SCENARIOS = [
  {
    num: "1",
    title: "Настройка расписания впервые",
    steps: [
      "Создайте 1–2 услуги (вкладка «Услуги»): например, «Парение 60 мин»",
      "Перейдите во вкладку «Шаблоны» → создайте шаблон недели",
      "Укажите рабочие дни, часы работы, услугу по умолчанию",
      "Нажмите «Применить шаблон» → выберите 4 недели",
      "Готово — клиенты уже могут записываться",
    ],
  },
  {
    num: "2",
    title: "Несколько услуг в один день",
    steps: [
      "Откройте «Шаблоны» → отредактируйте нужный шаблон",
      "В строке нужного дня нажмите «+ Интервал»",
      "Заполните: например, 10:00–14:00 «Парение», затем 16:00–20:00 «Массаж»",
      "Сохраните шаблон и снова примените",
      "В календаре в этот день появятся два разных слота",
    ],
  },
  {
    num: "3",
    title: "Заблокировать один конкретный слот",
    steps: [
      "Откройте календарь → нажмите на нужный слот",
      "В окне деталей нажмите «Заблокировать слот»",
      "Слот станет серым, клиенты не смогут на него записаться",
      "Остальные слоты в этот день останутся доступными",
      "Чтобы вернуть — нажмите слот и кнопку «Разблокировать»",
    ],
  },
  {
    num: "4",
    title: "Добавить один слот вне расписания",
    steps: [
      "Перейдите во вкладку «Календарь»",
      "Нажмите кнопку «Добавить слот» в правом верхнем углу",
      "Выберите дату, время начала и окончания",
      "Выберите услугу и укажите цену",
      "Нажмите «Сохранить»",
    ],
  },
  {
    num: "5",
    title: "Уйти в отпуск / заблокировать дни",
    steps: [
      "Перейдите во вкладку «Календарь»",
      "Нажмите кнопку «Заблокировать день»",
      "Выберите диапазон дат (например, 10–20 августа)",
      "Укажите причину «Отпуск» (клиент не увидит)",
      "Все слоты в этот период станут недоступны для записи",
    ],
  },
  {
    num: "6",
    title: "Изменить рабочие часы на следующий месяц",
    steps: [
      "Перейдите во вкладку «Шаблоны»",
      "Отредактируйте нужный шаблон (например, добавьте утренние часы)",
      "Нажмите «Применить» → выберите дату начала и количество недель",
      "Новые слоты создадутся, уже существующие не изменятся",
    ],
  },
];

const FAQ = [
  {
    q: "Можно ли работать с разными услугами в один день?",
    a: "Да. В редакторе шаблона у каждого дня есть кнопка «+ Интервал» — можно добавить, например, утром «Парение» с 10:00 до 14:00 и вечером «Массаж» с 16:00 до 20:00. Каждый интервал — со своей услугой, временем и количеством мест.",
  },
  {
    q: "Чем отличается «Заблокировать слот» от «Заблокировать день»?",
    a: "Блокировка слота закрывает только конкретное время на запись (например, один сеанс массажа в 15:00) — остальные слоты в день работают как обычно. Блокировка дня закрывает целый день целиком (отпуск, болезнь). Слоты в заблокированном дне остаются видимыми, но запись на них невозможна.",
  },
  {
    q: "Можно ли принимать несколько клиентов в один слот?",
    a: "Да. При создании услуги или слота укажите «Максимум клиентов» больше 1. Все записавшиеся увидят друг друга только по имени.",
  },
  {
    q: "Что делать, если клиент просит перенести запись?",
    a: "Отмените текущую запись (кнопка «Отменить» в разделе «Записи»), затем создайте новый слот или попросите клиента записаться самостоятельно на удобное время.",
  },
  {
    q: "Что делать, если не хочу работать по шаблону?",
    a: "Просто создавайте слоты вручную в разделе «Календарь». Шаблон — это удобный инструмент, не обязанность.",
  },
  {
    q: "Как посмотреть доход за месяц?",
    a: "Перейдите в раздел «Финансы» в боковой панели кабинета мастера.",
  },
  {
    q: "Можно ли удалить слот, на который уже записались?",
    a: "Нет. Сначала нужно отменить все записи в этот слот, затем слот можно удалить.",
  },
  {
    q: "Клиент не пришёл — что делать?",
    a: "Во вкладке «Записи» нажмите «Завершить» → выберите «Клиент не пришёл». Статус записи изменится на «Неявка».",
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

function TableHeader({ cols }: { cols: string[] }) {
  return (
    <thead>
      <tr className="border-b border-border">
        {cols.map((c) => (
          <th key={c} className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide py-2 pr-4">
            {c}
          </th>
        ))}
      </tr>
    </thead>
  );
}

export default function MasterScheduleGuide() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="max-w-5xl mx-auto px-4 py-10 flex gap-8">
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
                to="/workspace?tab=master&view=schedule"
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                <Icon name="CalendarDays" size={13} />
                Открыть расписание
              </Link>
            </div>
          </div>
        </aside>

        {/* Основной контент */}
        <main className="flex-1 min-w-0 space-y-12">

          {/* Заголовок */}
          <div id="intro">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
              <Link to="/workspace" className="hover:text-foreground">Рабочий кабинет</Link>
              <Icon name="ChevronRight" size={14} />
              <span>Инструкция по расписанию</span>
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-4">
              Расписание мастера
            </h1>
            <p className="text-muted-foreground leading-relaxed max-w-2xl">
              Эта инструкция поможет настроить рабочее расписание в личном кабинете.
              Система построена по принципу <strong>«настроил один раз — работает постоянно»</strong>:
              вы создаёте шаблон типовой недели, система автоматически генерирует слоты для записи клиентов.
            </p>
          </div>

          {/* Навигация */}
          <section id="navigation">
            <SectionTitle id="navigation">
              <Icon name="Map" size={20} className="text-primary" />
              Где находится раздел
            </SectionTitle>
            <Card>
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <Icon name="Navigation" size={16} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    Рабочий кабинет → боковое меню «Мастер-услуги» → пункт{" "}
                    <strong className="text-foreground">Расписание</strong>
                  </p>
                </div>
                <div className="border-t pt-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Вкладки внутри раздела</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { icon: "CalendarDays", label: "Календарь", desc: "Просмотр и управление слотами" },
                      { icon: "Sparkles", label: "Услуги", desc: "Создание и редактирование услуг" },
                      { icon: "Copy", label: "Шаблоны", desc: "Настройка типовой недели" },
                      { icon: "Settings", label: "Настройки", desc: "Автоматизация и уведомления" },
                    ].map((t) => (
                      <div key={t.label} className="bg-muted/40 rounded-lg p-3 text-center">
                        <Icon name={t.icon} size={18} className="text-primary mx-auto mb-1.5" />
                        <p className="text-sm font-medium">{t.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{t.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Раздел <strong>«Записи»</strong> — отдельный пункт меню ниже (не вкладка). Там хранится журнал клиентских заявок.
                </p>
              </CardContent>
            </Card>
          </section>

          {/* Шаг 1. Услуги */}
          <section id="services">
            <SectionTitle id="services">
              <Icon name="Sparkles" size={20} className="text-primary" />
              Шаг 1. Создайте услуги
            </SectionTitle>
            <p className="text-sm text-muted-foreground mb-4">
              Услуги — это то, что видит клиент при записи. Это необязательный, но удобный шаг:
              клиент сразу понимает, что его ждёт, а вам не нужно указывать цену в каждом слоте вручную.
            </p>

            <Card className="mb-4">
              <CardContent className="p-5">
                <p className="text-sm font-medium mb-3">Как создать услугу:</p>
                <ol className="space-y-2">
                  {[
                    "Перейдите на вкладку «Услуги»",
                    "Нажмите кнопку «+ Добавить услугу»",
                    "Заполните поля (см. таблицу ниже)",
                    "Нажмите «Сохранить»",
                  ].map((step, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm">
                      <StepBadge n={i + 1} />
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>

            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <TableHeader cols={["Поле", "Что заполнять", "Пример"]} />
                <tbody className="divide-y divide-border">
                  {[
                    ["Название", "Как будет видеть клиент", "Русское парение с веником"],
                    ["Описание", "Что входит, особенности", "60 мин в парилке, массаж веником, чай"],
                    ["Длительность", "В минутах", "60"],
                    ["Цена", "За один сеанс на одного клиента", "3 000 ₽"],
                    ["Максимум клиентов", "Сколько человек одновременно", "2"],
                  ].map(([field, what, ex]) => (
                    <tr key={field} className="hover:bg-muted/30">
                      <td className="py-2.5 pr-4 font-medium">{field}</td>
                      <td className="py-2.5 pr-4 text-muted-foreground">{what}</td>
                      <td className="py-2.5 text-muted-foreground">{ex}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Card className="mt-4 border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900">
              <CardContent className="p-4 flex gap-3">
                <Icon name="Info" size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  <strong>Без услуг тоже можно.</strong> При создании слота укажите цену вручную. Клиент увидит время и стоимость без названия услуги.
                  Создайте хотя бы одну услугу, если хотите, чтобы клиент понимал, на что именно записывается.
                </p>
              </CardContent>
            </Card>
          </section>

          {/* Шаг 2. Шаблоны */}
          <section id="templates">
            <SectionTitle id="templates">
              <Icon name="Copy" size={20} className="text-primary" />
              Шаг 2. Настройте шаблон недели
            </SectionTitle>
            <p className="text-sm text-muted-foreground mb-4">
              Шаблон — это ваша типовая рабочая неделя. Вы задаёте, в какие дни и часы работаете,
              система запоминает это и автоматически создаёт слоты на нужное количество недель вперёд.
            </p>

            <Card className="mb-4">
              <CardContent className="p-5">
                <p className="text-sm font-medium mb-3">Как настроить:</p>
                <ol className="space-y-2">
                  {[
                    "Перейдите на вкладку «Шаблоны»",
                    "Нажмите «Создать шаблон» или откройте существующий",
                    "Для каждого дня недели настройте параметры (см. таблицу ниже)",
                    "Нажмите «Применить шаблон» → укажите дату начала и количество недель",
                  ].map((step, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm">
                      <StepBadge n={i + 1} />
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>

            <div className="overflow-x-auto rounded-xl border border-border mb-4">
              <table className="w-full text-sm">
                <TableHeader cols={["Настройка дня", "Как задать"]} />
                <tbody className="divide-y divide-border">
                  {[
                    ["Выходной день", "Кнопка «Сделать выходным» — слоты в этот день не создадутся"],
                    ["Рабочие часы", "Укажите время начала и конца интервала (например, 12:00 – 22:00)"],
                    ["Услуга", "Выберите услугу для интервала из списка — она подставится в слоты"],
                    ["Макс. клиентов", "Сколько человек принимаете одновременно в этом интервале"],
                    ["+ Интервал", "Кнопка добавляет ещё один временной промежуток в тот же день (с другой услугой)"],
                    ["Корзина", "Удаляет конкретный интервал из дня"],
                  ].map(([field, desc]) => (
                    <tr key={field} className="hover:bg-muted/30">
                      <td className="py-2.5 pr-4 font-medium">{field}</td>
                      <td className="py-2.5 text-muted-foreground">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-sm font-medium mb-3">Пример настройки недели (с несколькими услугами в день):</p>
            <div className="overflow-x-auto rounded-xl border border-border mb-4">
              <table className="w-full text-sm">
                <TableHeader cols={["День", "Статус", "Часы работы", "Услуга"]} />
                <tbody className="divide-y divide-border">
                  {[
                    { day: "Пн", off: true, intervals: [] as { hours: string; service: string }[] },
                    { day: "Вт", off: false, intervals: [{ hours: "12:00 – 22:00", service: "Парение веником" }] },
                    { day: "Ср", off: false, intervals: [{ hours: "12:00 – 22:00", service: "Парение веником" }] },
                    {
                      day: "Чт",
                      off: false,
                      intervals: [
                        { hours: "10:00 – 14:00", service: "Парение веником" },
                        { hours: "16:00 – 20:00", service: "Массаж" },
                      ],
                    },
                    { day: "Пт", off: false, intervals: [{ hours: "14:00 – 23:00", service: "Парение веником" }] },
                    {
                      day: "Сб",
                      off: false,
                      intervals: [
                        { hours: "10:00 – 14:00", service: "Парение веником" },
                        { hours: "15:00 – 23:00", service: "Парение с компанией" },
                      ],
                    },
                    { day: "Вс", off: false, intervals: [{ hours: "10:00 – 20:00", service: "Консультация" }] },
                  ].map((row) => (
                    <tr key={row.day} className={`hover:bg-muted/30 ${row.off ? "opacity-50" : ""}`}>
                      <td className="py-2.5 pr-4 font-medium align-top">{row.day}</td>
                      <td className="py-2.5 pr-4 align-top">
                        {row.off ? (
                          <Badge variant="secondary" className="text-xs">Выходной</Badge>
                        ) : (
                          <span className="text-green-600 text-xs font-medium">
                            Рабочий{row.intervals.length > 1 ? ` · ${row.intervals.length} инт.` : ""}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 pr-4 text-muted-foreground align-top">
                        {row.off ? "—" : row.intervals.map((i, k) => <div key={k}>{i.hours}</div>)}
                      </td>
                      <td className="py-2.5 text-muted-foreground align-top">
                        {row.off ? "—" : row.intervals.map((i, k) => <div key={k}>{i.service}</div>)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Card className="border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-900 mb-3">
              <CardContent className="p-4 flex gap-3">
                <Icon name="Layers" size={16} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-emerald-800 dark:text-emerald-300 space-y-1">
                  <p><strong>Несколько услуг в один день.</strong> У каждого дня есть кнопка <strong>«+ Интервал»</strong> — можно добавить столько временных промежутков, сколько нужно.</p>
                  <p className="text-xs">Например: утром 10:00–14:00 «Парение веником», вечером 16:00–20:00 «Массаж». Каждый интервал — со своей услугой, временем и количеством мест.</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900">
              <CardContent className="p-4 flex gap-3">
                <Icon name="AlertTriangle" size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  <strong>Важно:</strong> шаблон можно применять многократно. Уже созданные слоты при повторном применении <strong>не изменятся</strong> — создадутся только новые, на незаполненные периоды.
                </p>
              </CardContent>
            </Card>
          </section>

          {/* Шаг 3. Календарь */}
          <section id="calendar">
            <SectionTitle id="calendar">
              <Icon name="CalendarDays" size={20} className="text-primary" />
              Шаг 3. Работа в календаре
            </SectionTitle>
            <p className="text-sm text-muted-foreground mb-5">
              Вкладка «Календарь» показывает слоты текущей недели. Здесь можно добавлять, редактировать,
              удалять слоты вручную, а также блокировать периоды.
            </p>

            <Card className="mb-5 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-900">
              <CardContent className="p-4 flex gap-3">
                <Icon name="Clock" size={16} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-emerald-800 dark:text-emerald-300">
                  <strong>Сетка часов настраивается сама.</strong> Если в одном дне у вас слоты с 7 утра, а в другом с 10 — все дни покажут общий диапазон, чтобы слоты были выровнены и сравнимы.
                </p>
              </CardContent>
            </Card>

            {/* Статусы слотов */}
            <p className="text-sm font-medium mb-3">Цвета слотов:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6">
              {SLOT_STATUSES.map((s) => (
                <div key={s.label} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
                  <span className={`w-3 h-3 rounded-full flex-shrink-0 ${s.color}`} />
                  <div>
                    <span className="text-sm font-medium">{s.label}</span>
                    <p className="text-xs text-muted-foreground">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Создание слота */}
            <div className="space-y-4">
              <h3 className="text-base font-semibold">Создание слота вручную</h3>
              <p className="text-sm text-muted-foreground">
                Нужно, если хотите добавить время вне шаблона — например, дополнительный сеанс в выходной.
              </p>
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <TableHeader cols={["Поле", "Описание"]} />
                  <tbody className="divide-y divide-border">
                    {[
                      ["Дата", "Выберите день в календаре"],
                      ["Время начала", "Например, 19:00"],
                      ["Время окончания", "Например, 20:30 — если длительность нестандартная"],
                      ["Услуга", "Выберите из списка или оставьте пустым"],
                      ["Цена", "Если услуга не выбрана — укажите вручную"],
                      ["Максимум клиентов", "Сколько человек может записаться одновременно"],
                    ].map(([field, desc]) => (
                      <tr key={field} className="hover:bg-muted/30">
                        <td className="py-2.5 pr-4 font-medium">{field}</td>
                        <td className="py-2.5 text-muted-foreground">{desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h3 className="text-base font-semibold pt-2">Редактирование и удаление</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>· Нажмите на слот → откроется окно с деталями и кнопками действий.</p>
                <p>· Можно изменить время, услугу, цену, количество мест.</p>
                <p>· <strong className="text-foreground">Нельзя уменьшить</strong> максимум клиентов, если в слоте уже есть подтверждённые записи.</p>
                <p>· <strong className="text-foreground">Нельзя удалить</strong> слот, если на него есть заявки — сначала обработайте записи.</p>
              </div>

              <h3 className="text-base font-semibold pt-2">Блокировка отдельного слота</h3>
              <p className="text-sm text-muted-foreground">
                Если нужно закрыть один конкретный слот (например, разовая накладка), а остальное время в этот день оставить рабочим.
              </p>
              <Card>
                <CardContent className="p-5">
                  <ol className="space-y-2">
                    {[
                      "Нажмите на нужный слот в календаре — откроется окно деталей",
                      "Нажмите кнопку «Заблокировать слот»",
                      "Слот станет серым, клиенты не смогут на него записаться",
                      "Чтобы вернуть — снова нажмите слот и выберите «Разблокировать»",
                    ].map((step, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm">
                        <StepBadge n={i + 1} />
                        <span className="text-muted-foreground">{step}</span>
                      </li>
                    ))}
                  </ol>
                  <p className="text-xs text-muted-foreground mt-3">
                    Соседние слоты в этот же день (с другими услугами или временем) останутся доступными для записи.
                  </p>
                </CardContent>
              </Card>

              <h3 className="text-base font-semibold pt-2">Блокировка целого дня (отпуск, болезнь)</h3>
              <Card>
                <CardContent className="p-5">
                  <ol className="space-y-2">
                    {[
                      "Нажмите кнопку «Заблокировать день» в правом верхнем углу календаря",
                      "Выберите одну дату или диапазон (например, с 5 по 12 июня)",
                      "Укажите причину (опционально — клиенты её не увидят)",
                      "Нажмите «Сохранить» — день закрывается для записи целиком",
                    ].map((step, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm">
                        <StepBadge n={i + 1} />
                        <span className="text-muted-foreground">{step}</span>
                      </li>
                    ))}
                  </ol>
                  <p className="text-xs text-muted-foreground mt-3">
                    Если на эти дни уже были записи — вам нужно будет их отменить вручную в разделе «Записи».
                  </p>
                </CardContent>
              </Card>

              <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900">
                <CardContent className="p-4 flex gap-3">
                  <Icon name="Info" size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                    <p><strong>Чем отличается?</strong></p>
                    <p>· <strong>Слот</strong> — точечная блокировка одного интервала (одна услуга/время).</p>
                    <p>· <strong>День</strong> — выходной целиком (все интервалы недоступны).</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Шаг 4. Записи */}
          <section id="bookings">
            <SectionTitle id="bookings">
              <Icon name="ClipboardCheck" size={20} className="text-primary" />
              Шаг 4. Управление записями клиентов
            </SectionTitle>
            <p className="text-sm text-muted-foreground mb-4">
              Раздел «Записи» — это журнал всех заявок на ваши слоты. Он доступен как отдельный пункт в боковом меню.
            </p>

            {/* Жизненный цикл */}
            <p className="text-sm font-medium mb-3">Статусы записи:</p>
            <div className="flex flex-wrap items-center gap-2 mb-6 p-4 bg-muted/30 rounded-xl text-sm">
              {["Новая", "→", "Ожидает", "→", "Подтверждена", "→", "Завершена"].map((item, i) => (
                <span key={i} className={item === "→" ? "text-muted-foreground" : "font-medium"}>
                  {item}
                </span>
              ))}
              <span className="text-muted-foreground ml-2">или</span>
              <span className="font-medium ml-2">Отменена</span>
              <span className="text-muted-foreground">·</span>
              <span className="font-medium">Неявка</span>
            </div>

            <div className="space-y-4">
              {[
                {
                  title: "Новая заявка — что делать",
                  steps: [
                    "Зайдите в раздел «Записи» — новые заявки будут выделены",
                    "Просмотрите информацию о клиенте и времени",
                    "Нажмите «Подтвердить» или «Отказать»",
                    "Клиент получит уведомление о вашем решении",
                  ],
                },
                {
                  title: "После проведённого сеанса",
                  steps: [
                    "Найдите запись в журнале (фильтр по дате)",
                    "Нажмите кнопку «Завершить»",
                    "Клиенту придёт предложение оставить отзыв",
                  ],
                },
                {
                  title: "Отмена записи с вашей стороны",
                  steps: [
                    "Найдите запись → нажмите «Отменить»",
                    "Укажите причину (клиент её увидит)",
                    "Место в слоте освободится, клиент получит уведомление",
                  ],
                },
              ].map((block) => (
                <Card key={block.title}>
                  <CardContent className="p-5">
                    <p className="text-sm font-semibold mb-3">{block.title}</p>
                    <ol className="space-y-2">
                      {block.steps.map((step, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm">
                          <StepBadge n={i + 1} />
                          <span className="text-muted-foreground">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-4 p-4 bg-muted/30 rounded-xl text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Фильтры в разделе «Записи»:</p>
              <p>По статусу: «Ожидают», «Подтверждены», «Завершены», «Все» · По дате: сегодня, завтра, выбранный период · По имени клиента</p>
            </div>
          </section>

          {/* Шаг 5. Настройки */}
          <section id="settings">
            <SectionTitle id="settings">
              <Icon name="Settings" size={20} className="text-primary" />
              Шаг 5. Настройки и автоматизация
            </SectionTitle>

            <div className="space-y-4">
              <Card>
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start gap-3">
                    <Icon name="Zap" size={18} className="text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold">Автоподтверждение записей</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Включите переключатель «Автоматически подтверждать новые записи» — все заявки будут сразу получать статус «Подтверждена»
                        без ручной обработки.
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Удобно, если всегда готовы принять запись. Выключите, если нужно сначала согласовать детали с клиентом.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <TableHeader cols={["Параметр", "Что делает"]} />
                  <tbody className="divide-y divide-border">
                    {[
                      ["Длительность слота по умолчанию", "Стандартное время одного слота (мин). Используется при применении шаблона."],
                      ["Пауза между слотами", "Буферное время между сеансами (мин). Слоты не будут создаваться вплотную."],
                      ["Максимум клиентов в день", "Общий лимит записей на один день."],
                      ["Уведомления о новых записях", "Telegram, Email — куда приходят уведомления о заявках."],
                      ["Напоминание за день", "Автоматическое напоминание клиенту и вам за 24 часа до сеанса."],
                      ["Часовой пояс", "Убедитесь, что выбран верный пояс (Москва, UTC+3). Влияет на отображение времени."],
                    ].map(([param, desc]) => (
                      <tr key={param} className="hover:bg-muted/30">
                        <td className="py-2.5 pr-4 font-medium">{param}</td>
                        <td className="py-2.5 text-muted-foreground">{desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Card className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900">
                <CardContent className="p-4 flex gap-3">
                  <Icon name="MessageCircle" size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-green-800 dark:text-green-300">
                    <strong>Совет:</strong> подключите Telegram-уведомления в разделе «Уведомления» бокового меню —
                    заявки будут приходить мгновенно, и вы сможете быстро реагировать.
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Сценарии */}
          <section id="scenarios">
            <SectionTitle id="scenarios">
              <Icon name="BookOpen" size={20} className="text-primary" />
              Типичные сценарии
            </SectionTitle>
            <div className="space-y-4">
              {SCENARIOS.map((s) => (
                <Card key={s.num}>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-bold">
                        {s.num}
                      </span>
                      <p className="font-semibold">{s.title}</p>
                    </div>
                    <ol className="space-y-2">
                      {s.steps.map((step, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm">
                          <StepBadge n={i + 1} />
                          <span className="text-muted-foreground">{step}</span>
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
                  className="cursor-pointer"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <p className="text-sm font-medium">{item.q}</p>
                      <Icon
                        name={openFaq === i ? "ChevronUp" : "ChevronDown"}
                        size={16}
                        className="text-muted-foreground flex-shrink-0 mt-0.5"
                      />
                    </div>
                    {openFaq === i && (
                      <p className="text-sm text-muted-foreground mt-3 pt-3 border-t border-border">
                        {item.a}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Итоговая таблица */}
          <section>
            <SectionTitle id="summary">
              <Icon name="CheckSquare" size={20} className="text-primary" />
              Быстрый справочник
            </SectionTitle>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <TableHeader cols={["Что сделать", "Инструмент", "Вкладка"]} />
                <tbody className="divide-y divide-border">
                  {[
                    ["Создать услугу", "Кнопка «+ Добавить услугу»", "Услуги"],
                    ["Настроить типовую неделю", "Таблица дней → кнопка «Применить»", "Шаблоны"],
                    ["Добавить слот вручную", "Кнопка «Добавить слот»", "Календарь"],
                    ["Заблокировать день", "Кнопка «Заблокировать день»", "Календарь"],
                    ["Подтвердить запись", "Кнопка «Подтвердить» в карточке", "Записи"],
                    ["Включить автоматизацию", "Переключатель «Автоподтверждение»", "Настройки"],
                  ].map(([action, tool, tab]) => (
                    <tr key={action} className="hover:bg-muted/30">
                      <td className="py-2.5 pr-4 font-medium">{action}</td>
                      <td className="py-2.5 pr-4 text-muted-foreground">{tool}</td>
                      <td className="py-2.5">
                        <Badge variant="secondary" className="text-xs">{tab}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Link to="/workspace?tab=master&view=schedule">
                <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
                  <Icon name="CalendarDays" size={16} />
                  Открыть расписание
                </button>
              </Link>
              <Link to="/steam-master-guide">
                <button className="inline-flex items-center gap-2 px-5 py-2.5 border border-border rounded-lg text-sm font-medium hover:bg-muted/40 transition-colors">
                  <Icon name="BookOpen" size={16} />
                  Гайд для мастера
                </button>
              </Link>
            </div>
          </section>

        </main>
      </div>

      <Footer />
    </div>
  );
}