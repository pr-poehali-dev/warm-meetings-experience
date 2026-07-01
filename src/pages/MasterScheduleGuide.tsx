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
  { color: "bg-blue-500", label: "Рабочее окно", desc: "Открыто для записи — гость может занять" },
  { color: "bg-yellow-400", label: "Бронь ждёт", desc: "Есть заявка, ждёт вашего подтверждения" },
  { color: "bg-green-500", label: "Бронь принята", desc: "Запись подтверждена, гость придёт" },
  { color: "bg-red-500", label: "Занято", desc: "Все места в окне заполнены" },
  { color: "bg-zinc-400", label: "Закрыто", desc: "Перерыв, выходной или заблокированный период" },
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
  {
    num: "8",
    title: "Быстро провести приём по списку на день",
    steps: [
      "Откройте вкладку «Расписание» и переключитесь в режим «Список»",
      "Выберите нужный день стрелками или кнопкой «Сегодня»",
      "Сверху видно: число записей, доход за день и сколько ждут подтверждения",
      "По каждой записи — кнопки связи (Звонок, WhatsApp, Telegram) и смены статуса",
      "Отмечайте «Завершена» или «Не пришёл» прямо из списка",
    ],
  },
  {
    num: "9",
    title: "Перезаписать расписание новым шаблоном",
    steps: [
      "Во вкладке «Шаблоны» откройте нужный шаблон и нажмите «Применить»",
      "Укажите дату начала, число недель и включите режим перезаписи",
      "Сначала посмотрите предпросмотр — сколько окон создастся и где пересечения",
      "Если в периоде есть активные записи — система предупредит перед заменой",
      "Подтвердите — старые окна заменятся, при необходимости брони отменятся",
    ],
  },
  {
    num: "10",
    title: "Вернуть случайно удалённые записи",
    steps: [
      "Откройте вкладку «Расписание»",
      "Нажмите «Корзина» — там лежат удалённые записи и резервные копии",
      "Найдите нужную запись или копию расписания",
      "Нажмите «Восстановить» — данные вернутся в календарь",
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
  {
    q: "Какие режимы просмотра календаря есть?",
    a: "Четыре: «День» — один день по часам, «Неделя» — вся неделя сразу (основной режим), «Месяц» — обзор загрузки по дням, «Список» — лента записей дня с кнопками связи и сменой статуса. Выбранный режим запоминается до следующего входа.",
  },
  {
    q: "Как перенести запись на другое время?",
    a: "Прямо в календаре зажмите событие и перетащите на новое время или день — внизу появится полоса подтверждения со старым и новым временем. Нажмите «Подтвердить». Либо откройте меню записи и выберите «Перенести».",
  },
  {
    q: "Что значат цветные полосы на окнах?",
    a: "Это адреса приёма — каждому адресу задан свой цвет, и окно подсвечивается им, чтобы вы видели, где принимаете. Окно без полосы — это выезд к гостю, адрес гость указывает сам при записи. Настроить адреса и цвета можно в блоке «Адреса приёма» над календарём.",
  },
  {
    q: "Применил шаблон повторно — старые окна не пропадут?",
    a: "В обычном режиме нет: дни с уже существующими окнами пропускаются, добавляются только недостающие. Если нужно именно заменить расписание — включите режим перезаписи, тогда старые окна заменятся новыми (с предупреждением, если есть активные записи).",
  },
  {
    q: "Можно ли восстановить удалённое расписание?",
    a: "Да. На странице «Расписание» есть «Корзина» — туда попадают удалённые записи и резервные копии перед очисткой. Найдите нужное и нажмите «Восстановить».",
  },
  {
    q: "Почему гость видит другое время, чем я?",
    a: "Все времена показываются в вашем часовом поясе (задаётся в Настройках, отображается справа над календарём). Гостю из другого региона система автоматически пересчитывает время в его пояс — путаницы не будет.",
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

              <Card className="mb-4">
                <CardContent className="p-5">
                  <p className="text-sm font-semibold mb-3">Что происходит при применении:</p>
                  <div className="space-y-3">
                    {[
                      { icon: "Eye", title: "Предпросмотр", desc: "Перед созданием видно, сколько окон появится, сколько дней пропустится из-за выходных и где есть пересечения" },
                      { icon: "SkipForward", title: "Обычный режим", desc: "Дни, где уже есть окна, пропускаются — ничего не ломается. В результате: «Создано X окон»" },
                      { icon: "AlertTriangle", title: "С перезаписью", desc: "Если включить перезапись, старые окна в периоде заменяются новыми. Если там есть активные записи — система предупредит и попросит подтверждение (брони будут отменены)" },
                      { icon: "CalendarX", title: "Выходные учитываются", desc: "Заблокированные дни (отпуск, выходные) шаблон пропускает автоматически" },
                    ].map((a) => (
                      <div key={a.title} className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Icon name={a.icon as "Eye"} size={14} className="text-muted-foreground" />
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

              <div className="grid sm:grid-cols-2 gap-3">
                <InfoBox icon="Info" color="blue">
                  <strong>Несколько шаблонов.</strong> Можно создать разные шаблоны для разных периодов —
                  «Летнее», «Зимнее», «Праздничное». Применяйте нужный под конкретный месяц.
                </InfoBox>
                <InfoBox icon="AlertCircle" color="amber">
                  <strong>Повторное применение</strong> в обычном режиме не удаляет уже созданные окна —
                  только добавляет недостающие. Чистить календарь заранее не нужно.
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
                Календарь — это сетка вашего рабочего времени по дням и часам (с 07:00 до 23:00). Здесь
                вы видите рабочие окна, записи гостей и закрытое время. Всё управление — прямо мышкой:
                кликнули, перетащили, растянули. Ниже разобраны все режимы, кнопки и действия с примерами.
              </p>

              {/* Режимы просмотра */}
              <Card className="mb-4">
                <CardContent className="p-5">
                  <p className="text-sm font-semibold mb-3">Режимы просмотра — переключаются вверху календаря:</p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {[
                      { icon: "Calendar", label: "День", desc: "Один день по часам. Удобно, когда день плотно расписан." },
                      { icon: "CalendarRange", label: "Неделя", desc: "Вся неделя (пн–вс) сразу. Основной режим для планирования." },
                      { icon: "CalendarDays", label: "Месяц", desc: "Обзор месяца целиком — видно загрузку по дням." },
                      { icon: "List", label: "Список", desc: "Лента записей выбранного дня: время, гость, услуга, цена, кнопки связи." },
                    ].map((v) => (
                      <div key={v.label} className="flex gap-3 bg-muted/40 rounded-xl p-3">
                        <Icon name={v.icon as "Calendar"} size={16} className="text-primary flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">{v.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{v.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3 leading-snug">
                    Выбранный режим запоминается — при следующем входе календарь откроется в нём же.
                    Кнопки <strong>← →</strong> листают периоды, <strong>«Сегодня»</strong> возвращает к текущему дню.
                  </p>
                </CardContent>
              </Card>

              {/* Три типа события */}
              <Card className="mb-4">
                <CardContent className="p-5">
                  <p className="text-sm font-semibold mb-1">Создание: выделите время мышкой</p>
                  <p className="text-sm text-muted-foreground mb-3">
                    Зажмите и протяните по свободному месту (в пределах одного дня) — откроется выбор
                    «Что создать?» с тремя вариантами:
                  </p>
                  <div className="space-y-3">
                    {[
                      { color: "bg-blue-500", title: "Рабочее время", desc: "Открывает окно для записи гостей. Создаётся сразу. Пример: выделили пн 10:00–14:00 → гости могут записаться на это время." },
                      { color: "bg-green-500", title: "Бронь", desc: "Запись конкретного гостя. Откроется форма: имя, телефон, услуга, комментарий. Пример: гость позвонил — заносите его на ср 16:00." },
                      { color: "bg-zinc-400", title: "Закрыть время", desc: "Перерыв, обед, личное время — на этот интервал записаться нельзя. Создаётся сразу. Пример: закрыли 13:00–14:00 на обед." },
                    ].map((t) => (
                      <div key={t.title} className="flex items-start gap-3">
                        <div className={`w-3 h-3 rounded-full flex-shrink-0 mt-1.5 ${t.color}`} />
                        <div>
                          <span className="text-sm font-medium">{t.title}</span>
                          <span className="text-sm text-muted-foreground"> — {t.desc}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3 leading-snug">
                    Время «прилипает» к шагу в 15 минут — удобно попадать в ровные интервалы.
                  </p>
                </CardContent>
              </Card>

              {/* Кнопка + в заголовке дня */}
              <Card className="mb-4">
                <CardContent className="p-5">
                  <p className="text-sm font-semibold mb-1">Кнопка «+запись» под датой дня</p>
                  <p className="text-sm text-muted-foreground mb-3">
                    В шапке каждого дня есть кнопка добавления. Она открывает окно с двумя вкладками:
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Icon name="UserPlus" size={16} className="text-green-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Новая бронь</p>
                        <p className="text-sm text-muted-foreground leading-snug">
                          Время начала и конца (по умолчанию 10:00–11:00), услуга (подставит длительность и цену),
                          имя гостя, телефон, комментарий.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Icon name="Lock" size={16} className="text-rose-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Блокировка дня</p>
                        <p className="text-sm text-muted-foreground leading-snug">
                          Два варианта: <strong>«Интервал»</strong> — закрыть часть дня (например, 14:00–18:00),
                          или <strong>«Весь день»</strong> — закрыть полностью. Можно указать причину (гость её не видит).
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Действия со слотом */}
              <Card className="mb-4">
                <CardContent className="p-5 space-y-4">
                  <p className="text-sm font-semibold">Действия с событием на календаре:</p>
                  <div className="space-y-3">
                    {[
                      { icon: "MousePointerClick", title: "Клик по событию", desc: "Открывает меню действий: детали, статус, кнопки связи и управления" },
                      { icon: "Move", title: "Перетащить", desc: "Зажмите и перенесите на другое время или день. Внизу появится полоса подтверждения со старым и новым временем — «Подтвердить» или «Отмена»" },
                      { icon: "Expand", title: "Растянуть", desc: "Потяните за нижний край, чтобы изменить длительность. Тоже с подтверждением" },
                      { icon: "Trash2", title: "Удалить / Отменить", desc: "Для рабочего окна — «Удалить», для брони — «Отменить запись»" },
                    ].map((a) => (
                      <div key={a.title} className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Icon name={a.icon as "Move"} size={14} className="text-muted-foreground" />
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

              {/* Меню действий по записи */}
              <Card className="mb-4">
                <CardContent className="p-5">
                  <p className="text-sm font-semibold mb-1">Меню записи (по клику на бронь)</p>
                  <p className="text-sm text-muted-foreground mb-3">
                    Открывает карточку гостя со всем необходимым в один экран:
                  </p>
                  <div className="grid sm:grid-cols-2 gap-2.5">
                    {[
                      { icon: "Phone", text: "Быстрая связь: Звонок, WhatsApp, Telegram" },
                      { icon: "CheckCircle", text: "«Подтвердить запись» — если гость ждёт подтверждения" },
                      { icon: "Flag", text: "«Завершена» — отметить, что сеанс прошёл" },
                      { icon: "UserX", text: "«Не пришёл» — отметить неявку, время освободится" },
                      { icon: "Move", text: "«Перенести» — перетащить бронь на новое время" },
                      { icon: "MapPin", text: "Адрес встречи и ссылка на Яндекс.Карты (если задан)" },
                    ].map((r) => (
                      <div key={r.text} className="flex items-start gap-2.5 bg-muted/40 rounded-lg p-2.5">
                        <Icon name={r.icon as "Phone"} size={14} className="text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-xs text-muted-foreground leading-snug">{r.text}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Статусы слотов */}
              <Card className="mb-4">
                <CardContent className="p-5">
                  <p className="text-sm font-semibold mb-3">Цвета событий в календаре:</p>
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

              {/* Адреса приёма */}
              <Card className="mb-4">
                <CardContent className="p-5">
                  <p className="text-sm font-semibold mb-1">Адреса приёма и выезд</p>
                  <p className="text-sm text-muted-foreground mb-3">
                    Над календарём есть блок «Адреса приёма». Каждому адресу присваивается свой цвет —
                    рабочие окна помечаются цветной полосой, и вы сразу видите, где принимаете.
                  </p>
                  <ul className="space-y-1.5">
                    {[
                      "Цветная полоса на окне = конкретный адрес приёма",
                      "Окно без полосы = выезд к гостю (адрес гость указывает сам при записи)",
                      "Можно задать «адрес дня» — все окна этого дня по одному адресу",
                      "Один из адресов помечается как «основной»",
                    ].map((t) => (
                      <li key={t} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Icon name="Check" size={14} className="text-green-500 flex-shrink-0 mt-0.5" />
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Нагрузка дня */}
              <div className="grid sm:grid-cols-2 gap-3 mb-4">
                <InfoBox icon="BarChart3" color="blue">
                  <strong>Полоса нагрузки под датой</strong> показывает загрузку дня в процентах: 0% — всё
                  свободно, 100% — всё занято или закрыто. У выходного дня вместо полосы — значок замка.
                </InfoBox>
                <InfoBox icon="Globe" color="blue">
                  <strong>Часовой пояс</strong> показан справа вверху. Все времена — в вашем поясе; гость из
                  другого региона увидит время в своём. Задаётся в разделе «Настройки».
                </InfoBox>
              </div>

              <InfoBox icon="AlertCircle" color="amber">
                <strong>Что нельзя удалить или перетащить.</strong> Рабочее окно с подтверждённой бронью не
                получится просто удалить или перенести — сначала отмените или перенесите саму запись гостя.
                Это защищает от случайной потери записей.
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
                      icon: "Bell",
                      title: "Уведомление о новой записи",
                      desc: "Приходит вам, когда гость записался. Так вы не пропустите новую заявку.",
                    },
                    {
                      icon: "Clock",
                      title: "Напоминание за 24 часа",
                      desc: "Автоматическое напоминание о предстоящем сеансе — приходит за сутки. Помогает снизить неявки. Можно включить или выключить.",
                    },
                    {
                      icon: "XCircle",
                      title: "Уведомление об отмене",
                      desc: "Сообщает, если гость отменил запись, чтобы вы вовремя освободили время.",
                    },
                    {
                      icon: "MapPin",
                      title: "Мои адреса",
                      desc: "Сохранённые адреса приёма и точки выезда. Каждому можно задать название и цвет — он подсветит окна в календаре. Один адрес отмечается основным.",
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