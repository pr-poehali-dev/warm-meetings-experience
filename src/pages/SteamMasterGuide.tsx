import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import { Card } from "@/components/ui/card";
import Icon from "@/components/ui/icon";
import Footer from "@/components/Footer";

const SCHEDULE_STEPS = [
  {
    num: "01",
    icon: "LogIn",
    title: "Войди в личный кабинет",
    desc: "Перейди на сайт и авторизуйся. Если у тебя ещё нет аккаунта — зарегистрируйся или свяжись с нами.",
    details: [
      "Нажми «Войти» в правом верхнем углу",
      "Введи email и пароль, указанные при регистрации",
      "Если забыл пароль — нажми «Восстановить пароль»",
    ],
  },
  {
    num: "02",
    icon: "CalendarPlus",
    title: "Создай событие",
    desc: "В разделе «Мои встречи» нажми кнопку «Создать встречу» и заполни карточку.",
    details: [
      "Укажи название встречи (например, «Банная встреча с парением»)",
      "Выбери дату и время начала",
      "Укажи продолжительность (обычно 2–4 часа)",
      "Добавь описание: что будет, что брать с собой",
      "Установи стоимость участия и максимальное число участников",
    ],
  },
  {
    num: "03",
    icon: "MapPin",
    title: "Укажи место проведения",
    desc: "Выбери баню из списка партнёров или добавь свою площадку.",
    details: [
      "Если у тебя своя баня — добавь адрес и фото",
      "Если нет — выбери из списка партнёрских бань",
      "Укажи, как добраться (метро, парковка, ориентиры)",
    ],
  },
  {
    num: "04",
    icon: "Repeat",
    title: "Настрой регулярность",
    desc: "Если проводишь события постоянно — настрой повторяющееся расписание.",
    details: [
      "Выбери тип: разовое или регулярное",
      "Для регулярных — укажи дни недели и периодичность",
      "Система автоматически создаст карточки на будущие даты",
      "Каждое событие можно будет отредактировать отдельно",
    ],
  },
  {
    num: "05",
    icon: "Send",
    title: "Опубликуй расписание",
    desc: "После модерации событие появится в афише и станет доступно для записи.",
    details: [
      "Нажми «Опубликовать» — событие уйдёт на модерацию",
      "Модерация занимает до 24 часов",
      "После одобрения событие появится в ленте",
      "Ты получишь уведомление в Telegram / на email",
    ],
  },
  {
    num: "06",
    icon: "Users",
    title: "Управляй записями",
    desc: "Отслеживай, кто записался, и управляй списком участников.",
    details: [
      "В карточке события видно количество записавшихся",
      "Можно посмотреть список участников с контактами",
      "При необходимости — отменить запись участника",
      "Участники получают автоматические напоминания",
    ],
  },
];

const TIPS = [
  {
    icon: "Camera",
    title: "Добавляй фото",
    desc: "События с фотографиями получают в 3 раза больше записей. Добавь 2–3 качественных фото бани и процесса.",
  },
  {
    icon: "Clock",
    title: "Публикуй заранее",
    desc: "Размещай событие минимум за 5–7 дней. Это даёт время набрать участников и спланировать подготовку.",
  },
  {
    icon: "MessageCircle",
    title: "Пиши понятные описания",
    desc: "Укажи, что входит в стоимость, нужно ли брать полотенце, есть ли чай и закуски. Чем больше деталей — тем выше доверие.",
  },
  {
    icon: "RefreshCw",
    title: "Веди регулярно",
    desc: "Регулярные парамастера получают постоянную аудиторию. Участники возвращаются, когда видят стабильное расписание.",
  },
];

const MANAGE_ACTIONS = [
  { icon: "Pencil", title: "Редактирование", desc: "Изменить дату, время, описание или стоимость можно до начала события. Участники получат уведомление об изменениях." },
  { icon: "XCircle", title: "Отмена события", desc: "Если нужно отменить — сделай это минимум за 24 часа. Участникам автоматически вернётся оплата." },
  { icon: "Copy", title: "Дублирование", desc: "Быстро создай новое событие на основе предыдущего — все настройки скопируются." },
  { icon: "BarChart3", title: "Аналитика", desc: "Смотри статистику: просмотры, записи, средний чек, процент повторных участников." },
];

export default function SteamMasterGuide() {
  return (
    <div className="min-h-screen bg-background">
      <Header transparent />

      <section className="relative min-h-[50vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-foreground via-foreground/95 to-foreground/85" />
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center py-28">
          <div className="inline-flex items-center gap-2 bg-white/10 text-white/80 text-sm px-4 py-1.5 rounded-full mb-6">
            <Icon name="BookOpen" size={16} />
            Инструкция для парамастера
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            Как работать с&nbsp;расписанием
          </h1>
          <p className="text-xl md:text-2xl text-white/80 font-light max-w-2xl mx-auto leading-relaxed">
            Пошаговое руководство по созданию, публикации и управлению встречами на платформе СПАРКОМ
          </p>
        </div>
      </section>

      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-semibold mb-4 text-center">
            Пошаговая инструкция
          </h2>
          <p className="text-center text-muted-foreground mb-16 text-lg">
            От входа в кабинет до первого проведённого события
          </p>

          <div className="max-w-3xl mx-auto space-y-6">
            {SCHEDULE_STEPS.map((step, i) => (
              <StepCard key={i} step={step} />
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-semibold mb-4 text-center">
            Управление событиями
          </h2>
          <p className="text-center text-muted-foreground mb-16 text-lg">
            Что можно делать с опубликованным событием
          </p>

          <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {MANAGE_ACTIONS.map((action, i) => (
              <Card
                key={i}
                className="p-8 bg-card border-0 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mb-5">
                  <Icon name={action.icon} className="text-accent" size={24} />
                </div>
                <h3 className="text-lg font-semibold mb-2">{action.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {action.desc}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-semibold mb-4 text-center">
            Советы для парамастера
          </h2>
          <p className="text-center text-muted-foreground mb-16 text-lg">
            Как получить больше записей и довольных участников
          </p>

          <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {TIPS.map((tip, i) => (
              <Card
                key={i}
                className="p-8 bg-card border-0 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center mb-5">
                  <Icon
                    name={tip.icon}
                    className="text-green-600"
                    size={24}
                  />
                </div>
                <h3 className="text-lg font-semibold mb-2">{tip.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {tip.desc}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-semibold mb-4">
              Остались вопросы?
            </h2>
            <p className="text-muted-foreground mb-8 text-lg">
              Мы всегда на связи и готовы помочь с настройкой расписания
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="rounded-full px-8"
                asChild
              >
                <a href="mailto:club@sparcom.ru">
                  <Icon name="Mail" size={18} className="mr-2" />
                  Написать на почту
                </a>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="rounded-full px-8"
                asChild
              >
                <Link to="/organizer">
                  <Icon name="ArrowLeft" size={18} className="mr-2" />
                  Вернуться на страницу организатора
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function StepCard({
  step,
}: {
  step: (typeof SCHEDULE_STEPS)[number];
}) {
  const [open, setOpen] = useState(false);

  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      <button
        className="w-full p-6 md:p-8 text-left flex items-start gap-5"
        onClick={() => setOpen(!open)}
      >
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center">
            <Icon name={step.icon} className="text-accent" size={22} />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-xs font-bold text-muted-foreground/50 uppercase tracking-wider">
              Шаг {step.num}
            </span>
          </div>
          <h3 className="text-lg font-semibold mb-1">{step.title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {step.desc}
          </p>
        </div>
        <Icon
          name={open ? "ChevronUp" : "ChevronDown"}
          size={20}
          className="text-muted-foreground flex-shrink-0 mt-1"
        />
      </button>
      {open && (
        <div className="px-6 md:px-8 pb-6 md:pb-8 ml-[4.25rem]">
          <ul className="space-y-3">
            {step.details.map((detail, j) => (
              <li key={j} className="flex items-start gap-3 text-sm">
                <Icon
                  name="Check"
                  size={16}
                  className="text-green-600 flex-shrink-0 mt-0.5"
                />
                <span className="text-muted-foreground leading-relaxed">
                  {detail}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}