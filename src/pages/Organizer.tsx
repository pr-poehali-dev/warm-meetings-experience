import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "next-themes";
import Icon from "@/components/ui/icon";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { OrganizerApplicationForm } from "./organizer/OrganizerInteractive";

const HERO_IMG = "https://cdn.poehali.dev/projects/b2cfdb9f-e5f2-4dd1-84cb-905733c4941c/files/9f246eac-a825-45e2-ade0-bb4f134c82d0.jpg";

const THEME_STYLES = `
  [data-org-theme="dark"] {
    --bg-page: linear-gradient(160deg, #1a1410 0%, #1c2018 35%, #14201c 65%, #101818 100%);
    --c-cream: #EDE0CC;
    --c-terra: #C8834A;
    --c-sage:  #8FA89A;
    --c-text:  rgba(217,237,232,0.6);
    --c-muted: rgba(217,237,232,0.45);
    --glass-bg: rgba(237,224,204,0.06);
    --glass-border: rgba(237,224,204,0.13);
    --hero-overlay: linear-gradient(to bottom, rgba(26,20,16,0.3) 0%, rgba(26,20,16,0.55) 50%, #1a1410 90%);
    --hero-img-opacity: 0.25;
    --card-bg: rgba(237,224,204,0.05);
    --card-border: rgba(237,224,204,0.1);
    --card-hover: rgba(237,224,204,0.09);
    --step-num-bg: rgba(200,131,74,0.18);
    --badge-bg: rgba(200,131,74,0.15);
    --badge-border: rgba(200,131,74,0.3);
    --soft-divider: rgba(237,224,204,0.08);
  }
  [data-org-theme="light"] {
    --bg-page: linear-gradient(160deg, #fdf7f0 0%, #f4f8f5 35%, #eef6f4 65%, #eaf4f2 100%);
    --c-cream: #2d2318;
    --c-terra: #b56b2e;
    --c-sage:  #4a7a6a;
    --c-text:  rgba(35,40,38,0.68);
    --c-muted: rgba(35,40,38,0.5);
    --glass-bg: rgba(255,255,255,0.7);
    --glass-border: rgba(200,131,74,0.15);
    --hero-overlay: linear-gradient(to bottom, rgba(253,247,240,0.15) 0%, rgba(253,247,240,0.5) 50%, #fdf7f0 90%);
    --hero-img-opacity: 0.18;
    --card-bg: rgba(255,255,255,0.8);
    --card-border: rgba(200,131,74,0.15);
    --card-hover: rgba(200,131,74,0.07);
    --step-num-bg: rgba(181,107,46,0.12);
    --badge-bg: rgba(181,107,46,0.12);
    --badge-border: rgba(181,107,46,0.25);
    --soft-divider: rgba(45,35,24,0.08);
  }
`;

const glassCard: React.CSSProperties = {
  background: "var(--card-bg)",
  border: "1px solid var(--card-border)",
  backdropFilter: "blur(16px)",
};

function SectionBadge({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <div
      className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider mb-4"
      style={{ background: "var(--badge-bg)", border: "1px solid var(--badge-border)", color: "var(--c-terra)" }}
    >
      <Icon name={icon as "Flame"} size={13} />
      {children}
    </div>
  );
}

function SectionHeading({ children, subtitle }: { children: React.ReactNode; subtitle?: string }) {
  return (
    <div className="text-center mb-10">
      <h2 className="text-3xl sm:text-4xl font-extrabold leading-tight mb-3" style={{ color: "var(--c-cream)" }}>
        {children}
      </h2>
      {subtitle && (
        <p className="text-base max-w-2xl mx-auto" style={{ color: "var(--c-text)" }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

const STEPS = [
  {
    n: "01",
    icon: "FileSignature",
    title: "Подайте заявку",
    desc: "Заполните короткую форму внизу страницы — расскажите о себе и формате встреч. Мы свяжемся в течение 1-2 дней.",
    details: [
      "Достаточно имени, контакта и пары слов о вашей идее",
      "Можно прислать ссылки на прошлые мероприятия",
      "После одобрения вы получаете доступ в кабинет",
    ],
  },
  {
    n: "02",
    icon: "LayoutDashboard",
    title: "Войдите в кабинет",
    desc: "В разделе «Рабочее место» откроется панель организатора со всеми инструментами для проведения событий.",
    details: [
      "Дашборд с активными, прошедшими и черновиками",
      "Быстрые действия по каждому событию",
      "Бейдж новых вопросов от гостей",
    ],
  },
  {
    n: "03",
    icon: "Sparkles",
    title: "Создайте событие",
    desc: "Inline-редактор: всё на одной странице — название, обложка, программа, правила, цена, места.",
    details: [
      "Дата начала и окончания (поддержка многодневных)",
      "Загрузка обложки, выбор площадки",
      "Видимость: черновик, скрыто или публично",
    ],
  },
  {
    n: "04",
    icon: "ShieldCheck",
    title: "Модерация и публикация",
    desc: "Команда проверяет событие и публикует в общей афише. После одобрения можно делиться короткой ссылкой /e/код.",
    details: [
      "Обычно занимает несколько часов",
      "Можно сразу опубликовать в Telegram-канал",
      "Любые правки уходят на повторную проверку",
    ],
  },
  {
    n: "05",
    icon: "Users",
    title: "Принимайте гостей",
    desc: "Все записи приходят в CRM. Меняйте статусы, фиксируйте оплаты, общайтесь в личном чате или рассылками.",
    details: [
      "Статусы: новый, написал, подтвердил, оплатил, отказ, пришёл",
      "Виды оплат: наличные, карта, перевод, по клубу",
      "Личный чат с гостем и групповые рассылки",
    ],
  },
  {
    n: "06",
    icon: "PartyPopper",
    title: "Проведите встречу",
    desc: "После события — отчёт по гостям и доходу. Дублируйте событие для следующих дат одним нажатием.",
    details: [
      "Статистика: пришло, оплатило, сумма сборов",
      "Повторение события на новые даты",
      "Сбор согласий на использование фото",
    ],
  },
];

const TOOLS = [
  {
    icon: "LayoutDashboard",
    title: "Дашборд организатора",
    desc: "Все ваши события на одной странице с фильтрами по статусу и быстрыми действиями.",
    features: ["Активные, прошедшие, черновики", "Статистика по каждому событию", "Быстрый переход к гостям и редактированию"],
  },
  {
    icon: "FilePen",
    title: "Inline-редактор события",
    desc: "Редактируйте любое поле прямо на странице, без отдельных форм и модалок.",
    features: ["Обложка, описание, программа, правила", "Дата, время, продолжительность", "Дублирование и повторение по датам"],
  },
  {
    icon: "Tags",
    title: "Гибкое ценообразование",
    desc: "Три варианта: фиксированная цена, динамические ступени или складчина.",
    features: [
      "Волны цен: раннее, стандарт, у ворот — с датами",
      "Складчина: цель, клубный взнос, порог участников",
      "Фиксация цены за N часов до старта",
    ],
  },
  {
    icon: "Calculator",
    title: "Калькулятор события",
    desc: "Считайте прибыль ещё до публикации. Постоянные и переменные расходы, прогноз дохода.",
    features: ["Шаблоны расчётов (до 20)", "Рекомендации по цене", "Прогноз при разном числе гостей"],
  },
  {
    icon: "Users",
    title: "CRM гостей",
    desc: "Каждый гость — карточка со статусом, оплатой и заметками. Никаких таблиц в Excel.",
    features: [
      "Статусы: новый → написал → оплатил → пришёл",
      "Ручное добавление и импорт CSV",
      "Виды оплат и фиксация суммы",
    ],
  },
  {
    icon: "MessageSquare",
    title: "Чат с гостями",
    desc: "История переписки внутри сервиса плюс групповые рассылки участникам события.",
    features: ["Личный чат с каждым гостем", "Рассылка одной группе сразу", "Шаблоны напоминаний"],
  },
  {
    icon: "HelpCircle",
    title: "Вопросы гостей",
    desc: "Гости задают вопросы о событии — вы отвечаете одной кнопкой, ответ улетает в их канал.",
    features: ["Статусы: новый, прочитан, отвечен", "Inline-ответ из кабинета", "Бейдж новых вопросов на дашборде"],
  },
  {
    icon: "Send",
    title: "Telegram-публикации",
    desc: "Подключите свой канал и публикуйте событие в один клик. Можно отложенно.",
    features: ["Несколько каналов одновременно", "Отложенная публикация по расписанию", "Уведомления о новых записях в Telegram"],
  },
  {
    icon: "UserPlus",
    title: "Соорганизаторы",
    desc: "Приглашайте помощников на конкретное событие — у них будет доступ к гостям и редактированию.",
    features: ["Приглашение по email или ссылке", "Поиск по существующим пользователям", "Гибкое управление доступом"],
  },
  {
    icon: "Link2",
    title: "Короткие ссылки и витрина",
    desc: "У каждого события — красивый адрес /e/код для соцсетей и личная страница-визитка.",
    features: ["Короткая ссылка для шеринга", "Личная страница организатора", "Публикация статей в блоге"],
  },
];

const PRICING_TYPES = [
  {
    icon: "Coins",
    name: "Фиксированная",
    desc: "Одна цена для всех гостей. Просто и понятно.",
    when: "Подходит для регулярных встреч и небольших групп.",
  },
  {
    icon: "TrendingUp",
    name: "Динамические ступени",
    desc: "Раннее бронирование дешевле, потом стандарт, потом «у ворот».",
    when: "Стимулирует ранние записи и наполняет событие заранее.",
  },
  {
    icon: "HandCoins",
    name: "Складчина (crowdfund)",
    desc: "Делите целевую сумму на участников. Чем больше людей — тем дешевле каждому.",
    when: "Идеально для арендованной парной с фиксированной стоимостью.",
  },
];

const FAQ = [
  {
    q: "Сколько берёте с продаж?",
    a: "0%. Мы не берём комиссию с оплат гостей — деньги идут напрямую вам. Платформа окупается за счёт месячной подписки на активный тариф.",
  },
  {
    q: "Что нужно, чтобы начать?",
    a: "Подайте заявку на этой странице. После короткого знакомства мы открываем доступ к кабинету и сопровождаем при создании первого события.",
  },
  {
    q: "Можно протестировать бесплатно?",
    a: "Да. Тестовый тариф позволяет создать первое событие и попробовать все базовые инструменты без оплаты.",
  },
  {
    q: "Что такое «складчина»?",
    a: "Формат, когда есть общая сумма (например, аренда бани и услуги парильщика), которая делится на участников. Чем больше людей записывается, тем меньше платит каждый. В кабинете есть отдельный редактор с целевой суммой, порогом и фиксацией цены.",
  },
  {
    q: "Как принимать оплату?",
    a: "В CRM вы фиксируете способ: наличные, перевод, карта или «по клубу». Все суммы и статусы хранятся внутри карточки гостя.",
  },
  {
    q: "Гости видят мои контакты?",
    a: "Только если вы сами их указали в описании. По правилам безопасности контакты гостя видны только вам и соорганизаторам события.",
  },
];

export default function Organizer() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted ? resolvedTheme === "dark" : true;

  const formRef = useRef<HTMLDivElement>(null);
  const scrollToForm = () => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div
      data-org-theme={isDark ? "dark" : "light"}
      className="min-h-screen relative overflow-x-hidden transition-colors duration-500"
      style={{ background: "var(--bg-page)" }}
    >
      <style dangerouslySetInnerHTML={{ __html: THEME_STYLES }} />

      {/* Ambient orbs */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute top-[-15%] left-[-10%] w-[55vw] h-[55vw] rounded-full blur-[120px]" style={{ background: "radial-gradient(circle, rgba(200,131,74,0.08) 0%, transparent 70%)" }} />
        <div className="absolute bottom-[10%] right-[-10%] w-[45vw] h-[45vw] rounded-full blur-[100px]" style={{ background: "radial-gradient(circle, rgba(143,168,154,0.07) 0%, transparent 70%)" }} />
      </div>

      <Header transparent />

      {/* Hero */}
      <section className="relative overflow-hidden" style={{ minHeight: "70vh" }}>
        <div className="absolute inset-0">
          <img
            src={HERO_IMG}
            alt=""
            className="w-full h-full object-cover"
            style={{ opacity: "var(--hero-img-opacity)" as unknown as number }}
          />
          <div className="absolute inset-0" style={{ background: "var(--hero-overlay)" }} />
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 pt-32 pb-20 max-w-4xl mx-auto">
          <SectionBadge icon="Sparkles">Гайд для организатора</SectionBadge>

          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight mb-5"
            style={{
              background: "linear-gradient(135deg, var(--c-cream) 20%, #C8834A 60%, #8FA89A 90%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Проводите банные встречи как профи
          </h1>

          <p className="text-base sm:text-lg max-w-2xl mx-auto mb-8 leading-relaxed" style={{ color: "var(--c-text)" }}>
            Полный гид по платформе СПАРКОМ: от первой заявки до отчёта после
            встречи. Все инструменты, которые мы уже сделали для вас — без комиссий
            с продаж.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={scrollToForm}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all hover:scale-105"
              style={{ background: "linear-gradient(135deg, #C8834A, #b56b2e)", color: "#fff", boxShadow: "0 8px 24px rgba(200,131,74,0.35)" }}
            >
              <Icon name="Rocket" size={16} />
              Подать заявку
            </button>
            <a
              href="#steps"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all"
              style={{ ...glassCard, color: "var(--c-cream)" }}
            >
              <Icon name="BookOpen" size={16} />
              Читать гайд
            </a>
          </div>

          {/* Mini stats */}
          <div className="flex flex-wrap justify-center gap-8 mt-12">
            {[
              { val: "0%", label: "комиссии с продаж" },
              { val: "10+", label: "инструментов в кабинете" },
              { val: "6", label: "шагов от заявки до встречи" },
            ].map(({ val, label }) => (
              <div key={label} className="text-center">
                <div
                  className="text-2xl font-bold"
                  style={{ background: "linear-gradient(135deg,#C8834A,#8FA89A)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
                >
                  {val}
                </div>
                <div className="text-xs" style={{ color: "var(--c-muted)" }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Шаги */}
      <section id="steps" className="relative z-10 px-4 sm:px-6 max-w-5xl mx-auto py-20">
        <SectionHeading subtitle="Шесть шагов от идеи до встречи. Не нужно ничего настраивать — мы провели за руку каждого организатора.">
          Как это работает
        </SectionHeading>

        <div className="space-y-4">
          {STEPS.map((step) => (
            <div
              key={step.n}
              className="rounded-2xl p-5 sm:p-6 transition-all duration-300 hover:brightness-110"
              style={glassCard}
            >
              <div className="flex flex-col sm:flex-row gap-5">
                <div className="flex sm:flex-col items-center sm:items-start gap-3 sm:gap-2 shrink-0 sm:w-24">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center"
                    style={{ background: "var(--step-num-bg)" }}
                  >
                    <Icon name={step.icon as "Sparkles"} size={24} style={{ color: "var(--c-terra)" } as React.CSSProperties} />
                  </div>
                  <div className="text-3xl font-extrabold" style={{ color: "var(--c-terra)", opacity: 0.5 }}>{step.n}</div>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-2" style={{ color: "var(--c-cream)" }}>{step.title}</h3>
                  <p className="text-sm mb-3 leading-relaxed" style={{ color: "var(--c-text)" }}>{step.desc}</p>
                  <ul className="space-y-1.5">
                    {step.details.map((d) => (
                      <li key={d} className="flex items-start gap-2 text-xs" style={{ color: "var(--c-muted)" }}>
                        <Icon name="Check" size={13} className="mt-0.5 shrink-0" style={{ color: "var(--c-sage)" } as React.CSSProperties} />
                        <span>{d}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Инструменты в кабинете */}
      <section className="relative z-10 px-4 sm:px-6 max-w-6xl mx-auto py-20">
        <SectionHeading subtitle="Подробный обзор того, что вы найдёте в разделе «Рабочее место → Организатор».">
          Что внутри кабинета
        </SectionHeading>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {TOOLS.map((t) => (
            <div
              key={t.title}
              className="rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1"
              style={glassCard}
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center mb-3"
                style={{ background: "var(--step-num-bg)" }}
              >
                <Icon name={t.icon as "Sparkles"} size={20} style={{ color: "var(--c-terra)" } as React.CSSProperties} />
              </div>
              <h3 className="font-bold text-base mb-2" style={{ color: "var(--c-cream)" }}>{t.title}</h3>
              <p className="text-xs mb-3 leading-relaxed" style={{ color: "var(--c-text)" }}>{t.desc}</p>
              <ul className="space-y-1">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-1.5 text-xs" style={{ color: "var(--c-muted)" }}>
                    <Icon name="Dot" size={14} className="mt-0 shrink-0" style={{ color: "var(--c-sage)" } as React.CSSProperties} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Ценообразование */}
      <section className="relative z-10 px-4 sm:px-6 max-w-5xl mx-auto py-20">
        <SectionHeading subtitle="Три модели цен встроены прямо в редактор события — выбираете при создании.">
          Гибкое ценообразование
        </SectionHeading>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PRICING_TYPES.map((p) => (
            <div key={p.name} className="rounded-2xl p-6 text-center transition-all hover:-translate-y-1" style={glassCard}>
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: "var(--step-num-bg)" }}
              >
                <Icon name={p.icon as "Coins"} size={26} style={{ color: "var(--c-terra)" } as React.CSSProperties} />
              </div>
              <h3 className="font-bold text-base mb-2" style={{ color: "var(--c-cream)" }}>{p.name}</h3>
              <p className="text-sm mb-3 leading-relaxed" style={{ color: "var(--c-text)" }}>{p.desc}</p>
              <p className="text-xs italic" style={{ color: "var(--c-muted)" }}>{p.when}</p>
            </div>
          ))}
        </div>

        <div
          className="mt-6 rounded-2xl p-5 flex items-start gap-3"
          style={{ background: "rgba(143,168,154,0.08)", border: "1px solid rgba(143,168,154,0.2)" }}
        >
          <Icon name="Lightbulb" size={20} className="shrink-0 mt-0.5" style={{ color: "var(--c-sage)" } as React.CSSProperties} />
          <div className="text-sm" style={{ color: "var(--c-text)" }}>
            <strong style={{ color: "var(--c-cream)" }}>Калькулятор события</strong> в кабинете
            помогает заранее посчитать прибыль: задаёте постоянные и переменные расходы,
            а сервис предлагает рекомендуемую цену для разного числа гостей.
          </div>
        </div>
      </section>

      {/* Работа с гостями */}
      <section className="relative z-10 px-4 sm:px-6 max-w-5xl mx-auto py-20">
        <SectionHeading subtitle="Каждая запись попадает в CRM. Не теряете контакты, видите всю историю общения.">
          Работа с гостями
        </SectionHeading>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { icon: "ClipboardList", title: "Статусы по воронке", text: "Новый → написал → подтвердил → оплатил → пришёл. Меняете в один клик." },
            { icon: "Wallet", title: "Учёт оплат", text: "Наличные, перевод, карта или по клубу. Сумма и способ хранятся в карточке." },
            { icon: "MessageCircle", title: "Личный чат", text: "Вся переписка с каждым гостем внутри сервиса — без потерь в мессенджерах." },
            { icon: "Megaphone", title: "Групповые рассылки", text: "Напоминания и сообщения всем подтвердившим гостям одним действием." },
            { icon: "UserPlus2", title: "Ручное добавление", text: "Добавляете гостей из других каналов вручную или импортируете CSV." },
            { icon: "BarChart3", title: "Сводка по событию", text: "Сколько подтвердили, оплатили, пришли, общая сумма сборов." },
          ].map((b) => (
            <div key={b.title} className="rounded-2xl p-5 flex gap-4" style={glassCard}>
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "var(--step-num-bg)" }}
              >
                <Icon name={b.icon as "Users"} size={20} style={{ color: "var(--c-terra)" } as React.CSSProperties} />
              </div>
              <div>
                <h3 className="font-semibold text-base mb-1" style={{ color: "var(--c-cream)" }}>{b.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--c-text)" }}>{b.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Коммуникации */}
      <section className="relative z-10 px-4 sm:px-6 max-w-5xl mx-auto py-20">
        <SectionHeading subtitle="Telegram, email и встроенный чат — все каналы общения в одном месте.">
          Telegram и уведомления
        </SectionHeading>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl p-6" style={glassCard}>
            <Icon name="Send" size={26} className="mb-3" style={{ color: "#229ED9" } as React.CSSProperties} />
            <h3 className="font-bold text-base mb-2" style={{ color: "var(--c-cream)" }}>Публикация в каналы</h3>
            <p className="text-sm leading-relaxed mb-3" style={{ color: "var(--c-text)" }}>
              Подключаете свои Telegram-каналы и публикуете событие одной кнопкой.
              Поддерживается несколько каналов сразу.
            </p>
            <ul className="space-y-1.5">
              <li className="flex items-start gap-2 text-xs" style={{ color: "var(--c-muted)" }}>
                <Icon name="Check" size={12} className="mt-0.5 shrink-0" style={{ color: "var(--c-sage)" } as React.CSSProperties} />
                Отложенная публикация
              </li>
              <li className="flex items-start gap-2 text-xs" style={{ color: "var(--c-muted)" }}>
                <Icon name="Check" size={12} className="mt-0.5 shrink-0" style={{ color: "var(--c-sage)" } as React.CSSProperties} />
                Несколько каналов одновременно
              </li>
            </ul>
          </div>

          <div className="rounded-2xl p-6" style={glassCard}>
            <Icon name="Bell" size={26} className="mb-3" style={{ color: "var(--c-terra)" } as React.CSSProperties} />
            <h3 className="font-bold text-base mb-2" style={{ color: "var(--c-cream)" }}>Уведомления о записях</h3>
            <p className="text-sm leading-relaxed mb-3" style={{ color: "var(--c-text)" }}>
              Каждая новая запись или вопрос приходит туда, где вам удобно — в Telegram,
              на email или в кабинет.
            </p>
            <ul className="space-y-1.5">
              <li className="flex items-start gap-2 text-xs" style={{ color: "var(--c-muted)" }}>
                <Icon name="Check" size={12} className="mt-0.5 shrink-0" style={{ color: "var(--c-sage)" } as React.CSSProperties} />
                Telegram, email
              </li>
              <li className="flex items-start gap-2 text-xs" style={{ color: "var(--c-muted)" }}>
                <Icon name="Check" size={12} className="mt-0.5 shrink-0" style={{ color: "var(--c-sage)" } as React.CSSProperties} />
                Бейдж новых вопросов в кабинете
              </li>
            </ul>
          </div>

          <div className="rounded-2xl p-6" style={glassCard}>
            <Icon name="MessagesSquare" size={26} className="mb-3" style={{ color: "var(--c-sage)" } as React.CSSProperties} />
            <h3 className="font-bold text-base mb-2" style={{ color: "var(--c-cream)" }}>Вопросы гостей</h3>
            <p className="text-sm leading-relaxed mb-3" style={{ color: "var(--c-text)" }}>
              Гость задаёт вопрос со страницы события — вы отвечаете из кабинета, и
              ответ улетает ему по его каналу.
            </p>
            <ul className="space-y-1.5">
              <li className="flex items-start gap-2 text-xs" style={{ color: "var(--c-muted)" }}>
                <Icon name="Check" size={12} className="mt-0.5 shrink-0" style={{ color: "var(--c-sage)" } as React.CSSProperties} />
                Статусы: новый / прочитан / отвечен
              </li>
              <li className="flex items-start gap-2 text-xs" style={{ color: "var(--c-muted)" }}>
                <Icon name="Check" size={12} className="mt-0.5 shrink-0" style={{ color: "var(--c-sage)" } as React.CSSProperties} />
                История всех вопросов
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Тарифы */}
      <section className="relative z-10 px-4 sm:px-6 max-w-4xl mx-auto py-20">
        <SectionHeading subtitle="Никакой комиссии с продаж. Только месячная подписка на активный тариф.">
          Сколько это стоит
        </SectionHeading>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl p-6" style={glassCard}>
            <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--c-muted)" }}>Тестовый</div>
            <div className="text-3xl font-extrabold mb-1" style={{ color: "var(--c-cream)" }}>Бесплатно</div>
            <p className="text-sm mb-4" style={{ color: "var(--c-text)" }}>Чтобы попробовать платформу и провести первое событие.</p>
            <ul className="space-y-2">
              {["Первое событие в любом формате", "Базовая CRM гостей", "Дашборд и редактор", "Поддержка чата организаторов"].map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm" style={{ color: "var(--c-text)" }}>
                  <Icon name="Check" size={15} className="mt-0.5 shrink-0" style={{ color: "var(--c-sage)" } as React.CSSProperties} />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          <div
            className="rounded-2xl p-6 relative overflow-hidden"
            style={{
              ...glassCard,
              border: "1px solid rgba(200,131,74,0.4)",
              boxShadow: "0 8px 32px rgba(200,131,74,0.18)",
            }}
          >
            <div
              className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{ background: "var(--c-terra)", color: "#fff" }}
            >
              Рекомендуем
            </div>
            <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--c-terra)" }}>Активный</div>
            <div className="text-3xl font-extrabold mb-1" style={{ color: "var(--c-cream)" }}>
              2 000 ₽ <span className="text-sm font-normal" style={{ color: "var(--c-muted)" }}>/ месяц</span>
            </div>
            <p className="text-sm mb-4" style={{ color: "var(--c-text)" }}>Всё нужное, чтобы регулярно проводить события.</p>
            <ul className="space-y-2">
              {[
                "Неограниченное число событий",
                "Динамические цены и складчина",
                "Telegram-публикации с отложкой",
                "Соорганизаторы и команда",
                "Личная визитка и блог",
                "Приоритетная модерация",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm" style={{ color: "var(--c-text)" }}>
                  <Icon name="Check" size={15} className="mt-0.5 shrink-0" style={{ color: "var(--c-terra)" } as React.CSSProperties} />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="relative z-10 px-4 sm:px-6 max-w-3xl mx-auto py-20">
        <SectionHeading>Частые вопросы</SectionHeading>

        <div className="space-y-3">
          {FAQ.map((item, i) => (
            <div
              key={i}
              className="rounded-2xl overflow-hidden cursor-pointer transition-all duration-300"
              style={glassCard}
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
            >
              <div className="flex items-center justify-between px-5 py-4 gap-3">
                <span className="font-medium text-sm" style={{ color: "var(--c-cream)" }}>{item.q}</span>
                <Icon
                  name="ChevronDown"
                  size={16}
                  className={`flex-shrink-0 transition-transform duration-300 ${openFaq === i ? "rotate-180" : ""}`}
                  style={{ color: "var(--c-terra)" } as React.CSSProperties}
                />
              </div>
              {openFaq === i && (
                <div className="px-5 pb-5 text-sm leading-relaxed" style={{ color: "var(--c-text)", borderTop: "1px solid var(--soft-divider)" }}>
                  <div className="pt-3">{item.a}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA + быстрые ссылки */}
      <section className="relative z-10 px-4 sm:px-6 max-w-5xl mx-auto pb-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to="/events" className="group rounded-2xl p-5 flex items-center justify-between transition-all hover:brightness-110" style={glassCard}>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--c-terra)" }}>Афиша</div>
              <div className="font-bold text-base" style={{ color: "var(--c-cream)" }}>Посмотреть события</div>
            </div>
            <Icon name="CalendarDays" size={26} style={{ color: "var(--c-terra)" } as React.CSSProperties} />
          </Link>
          <Link to="/baths" className="group rounded-2xl p-5 flex items-center justify-between transition-all hover:brightness-110" style={glassCard}>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--c-sage)" }}>Площадки</div>
              <div className="font-bold text-base" style={{ color: "var(--c-cream)" }}>Бани и парные</div>
            </div>
            <Icon name="Flame" size={26} style={{ color: "var(--c-sage)" } as React.CSSProperties} />
          </Link>
          <Link to="/masters" className="group rounded-2xl p-5 flex items-center justify-between transition-all hover:brightness-110" style={glassCard}>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--c-terra)" }}>Мастера</div>
              <div className="font-bold text-base" style={{ color: "var(--c-cream)" }}>Парильщики и практики</div>
            </div>
            <Icon name="Users" size={26} style={{ color: "var(--c-terra)" } as React.CSSProperties} />
          </Link>
        </div>
      </section>

      {/* Форма заявки */}
      <div ref={formRef}>
        <OrganizerApplicationForm formRef={formRef} />
      </div>

      <Footer />
    </div>
  );
}
