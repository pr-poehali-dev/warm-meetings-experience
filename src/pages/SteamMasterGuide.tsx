import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "next-themes";
import Icon from "@/components/ui/icon";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const HERO_IMG =
  "https://cdn.poehali.dev/projects/b2cfdb9f-e5f2-4dd1-84cb-905733c4941c/files/72d028d8-3078-4526-a1a8-54f4ac23a26e.jpg";

const THEME_STYLES = `
  [data-smg-theme="dark"] {
    --bg-page: linear-gradient(160deg, #1a1410 0%, #1c2018 35%, #14201c 65%, #101818 100%);
    --c-cream: #EDE0CC;
    --c-terra: #C8834A;
    --c-sage:  #8FA89A;
    --c-text:  rgba(217,237,232,0.65);
    --c-muted: rgba(217,237,232,0.45);
    --card-bg: rgba(237,224,204,0.05);
    --card-border: rgba(237,224,204,0.1);
    --hero-overlay: linear-gradient(to bottom, rgba(26,20,16,0.3) 0%, rgba(26,20,16,0.55) 50%, #1a1410 90%);
    --hero-img-opacity: 0.22;
    --step-num-bg: rgba(200,131,74,0.18);
    --badge-bg: rgba(200,131,74,0.15);
    --badge-border: rgba(200,131,74,0.3);
  }
  [data-smg-theme="light"] {
    --bg-page: linear-gradient(160deg, #fdf7f0 0%, #f4f8f5 35%, #eef6f4 65%, #eaf4f2 100%);
    --c-cream: #2d2318;
    --c-terra: #b56b2e;
    --c-sage:  #4a7a6a;
    --c-text:  rgba(35,40,38,0.7);
    --c-muted: rgba(35,40,38,0.5);
    --card-bg: rgba(255,255,255,0.8);
    --card-border: rgba(200,131,74,0.15);
    --hero-overlay: linear-gradient(to bottom, rgba(253,247,240,0.15) 0%, rgba(253,247,240,0.5) 50%, #fdf7f0 90%);
    --hero-img-opacity: 0.18;
    --step-num-bg: rgba(181,107,46,0.12);
    --badge-bg: rgba(181,107,46,0.12);
    --badge-border: rgba(181,107,46,0.25);
  }
`;

const glassCard: React.CSSProperties = {
  background: "var(--card-bg)",
  border: "1px solid var(--card-border)",
  backdropFilter: "blur(16px)",
};

const STEPS = [
  {
    num: "01",
    icon: "LogIn",
    title: "Войди в личный кабинет",
    desc: "Перейди на сайт и авторизуйся. Если у тебя ещё нет аккаунта — зарегистрируйся или свяжись с нами.",
    details: ["Нажми «Войти» в правом верхнем углу", "Введи email и пароль", "Забыл пароль — «Восстановить пароль»"],
  },
  {
    num: "02",
    icon: "CalendarPlus",
    title: "Создай событие",
    desc: "В разделе «Мои встречи» нажми «Создать встречу» и заполни карточку.",
    details: [
      "Название (например, «Банная встреча с парением»)",
      "Дата, время и продолжительность (2–4 часа)",
      "Описание: что будет, что брать с собой",
      "Стоимость и максимальное число участников",
    ],
  },
  {
    num: "03",
    icon: "MapPin",
    title: "Укажи место проведения",
    desc: "Выбери баню из каталога или добавь свою площадку.",
    details: ["Если своя баня — добавь адрес и фото", "Если нет — выбери из проверенного списка", "Укажи, как добраться"],
  },
  {
    num: "04",
    icon: "Repeat",
    title: "Настрой регулярность",
    desc: "Если проводишь события постоянно — настрой повторяющееся расписание.",
    details: ["Разовое или регулярное", "Для регулярных — дни недели и периодичность", "Система автоматически создаст карточки"],
  },
  {
    num: "05",
    icon: "Send",
    title: "Опубликуй расписание",
    desc: "После модерации событие появится в афише и станет доступно для записи.",
    details: ["Модерация занимает до 24 часов", "Уведомление в Telegram / email", "После одобрения — в общей ленте"],
  },
  {
    num: "06",
    icon: "Users",
    title: "Управляй записями",
    desc: "Отслеживай, кто записался, и веди список участников.",
    details: ["Видно количество записавшихся", "Контакты и статусы гостей", "Автонапоминания участникам"],
  },
];

const MANAGE = [
  { icon: "Pencil", title: "Редактирование", desc: "Меняй дату, время, описание и цену до начала. Участники получат уведомление." },
  { icon: "XCircle", title: "Отмена события", desc: "Минимум за 24 часа. Участникам автоматически вернётся оплата." },
  { icon: "Copy", title: "Дублирование", desc: "Создай новое событие на основе предыдущего — все настройки скопируются." },
  { icon: "BarChart3", title: "Аналитика", desc: "Просмотры, записи, средний чек, процент повторных гостей." },
];

const TIPS = [
  { icon: "Camera", title: "Добавляй фото", desc: "События с фото получают в 3 раза больше записей." },
  { icon: "Clock", title: "Публикуй заранее", desc: "Минимум за 5–7 дней до встречи." },
  { icon: "MessageCircle", title: "Понятные описания", desc: "Что входит в цену, что взять с собой, есть ли чай." },
  { icon: "RefreshCw", title: "Веди регулярно", desc: "Постоянная аудитория возвращается, когда видит стабильное расписание." },
];

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

export default function SteamMasterGuide() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted ? resolvedTheme === "dark" : true;

  return (
    <div
      data-smg-theme={isDark ? "dark" : "light"}
      className="min-h-screen relative overflow-x-hidden transition-colors duration-500"
      style={{ background: "var(--bg-page)" }}
    >
      <style dangerouslySetInnerHTML={{ __html: THEME_STYLES }} />

      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute top-[-15%] left-[-10%] w-[55vw] h-[55vw] rounded-full blur-[120px]" style={{ background: "radial-gradient(circle, rgba(200,131,74,0.08) 0%, transparent 70%)" }} />
        <div className="absolute bottom-[10%] right-[-10%] w-[45vw] h-[45vw] rounded-full blur-[100px]" style={{ background: "radial-gradient(circle, rgba(143,168,154,0.07) 0%, transparent 70%)" }} />
      </div>

      <Header transparent />

      {/* Hero */}
      <section className="relative overflow-hidden" style={{ minHeight: "60vh" }}>
        <div className="absolute inset-0">
          <img src={HERO_IMG} alt="" className="w-full h-full object-cover" style={{ opacity: "var(--hero-img-opacity)" as unknown as number }} />
          <div className="absolute inset-0" style={{ background: "var(--hero-overlay)" }} />
        </div>
        <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 pt-32 pb-16 max-w-4xl mx-auto">
          <SectionBadge icon="Sparkles">Инструкция для парамастера</SectionBadge>
          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight mb-5"
            style={{
              background: "linear-gradient(135deg, var(--c-cream) 20%, #C8834A 60%, #8FA89A 90%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Как работать с расписанием
          </h1>
          <p className="text-base sm:text-lg max-w-2xl mx-auto leading-relaxed" style={{ color: "var(--c-text)" }}>
            Пошаговое руководство по созданию, публикации и управлению встречами
            на платформе СПАРКОМ.
          </p>
        </div>
      </section>

      {/* Steps */}
      <section className="relative z-10 px-4 sm:px-6 max-w-5xl mx-auto py-20">
        <SectionHeading subtitle="От входа в кабинет до первого проведённого события.">
          Пошаговая инструкция
        </SectionHeading>

        <div className="space-y-4">
          {STEPS.map((s) => (
            <div key={s.num} className="rounded-2xl p-5 sm:p-6 transition-all duration-300 hover:brightness-110" style={glassCard}>
              <div className="flex flex-col sm:flex-row gap-5">
                <div className="flex sm:flex-col items-center sm:items-start gap-3 sm:gap-2 shrink-0 sm:w-24">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "var(--step-num-bg)" }}>
                    <Icon name={s.icon as "LogIn"} size={24} style={{ color: "var(--c-terra)" } as React.CSSProperties} />
                  </div>
                  <div className="text-3xl font-extrabold" style={{ color: "var(--c-terra)", opacity: 0.5 }}>{s.num}</div>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-2" style={{ color: "var(--c-cream)" }}>{s.title}</h3>
                  <p className="text-sm mb-3 leading-relaxed" style={{ color: "var(--c-text)" }}>{s.desc}</p>
                  <ul className="space-y-1.5">
                    {s.details.map((d) => (
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

      {/* Manage */}
      <section className="relative z-10 px-4 sm:px-6 max-w-5xl mx-auto py-20">
        <SectionHeading subtitle="Что можно делать с опубликованным событием.">
          Управление событиями
        </SectionHeading>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {MANAGE.map((m) => (
            <div key={m.title} className="rounded-2xl p-5 flex gap-4" style={glassCard}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--step-num-bg)" }}>
                <Icon name={m.icon as "Pencil"} size={20} style={{ color: "var(--c-terra)" } as React.CSSProperties} />
              </div>
              <div>
                <h3 className="font-semibold text-base mb-1" style={{ color: "var(--c-cream)" }}>{m.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--c-text)" }}>{m.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Tips */}
      <section className="relative z-10 px-4 sm:px-6 max-w-5xl mx-auto py-20">
        <SectionHeading subtitle="Как получить больше записей и довольных участников.">
          Советы для парамастера
        </SectionHeading>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {TIPS.map((t) => (
            <div key={t.title} className="rounded-2xl p-5 flex gap-4" style={glassCard}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(143,168,154,0.15)" }}>
                <Icon name={t.icon as "Camera"} size={20} style={{ color: "var(--c-sage)" } as React.CSSProperties} />
              </div>
              <div>
                <h3 className="font-semibold text-base mb-1" style={{ color: "var(--c-cream)" }}>{t.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--c-text)" }}>{t.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 px-4 sm:px-6 max-w-4xl mx-auto pb-20">
        <div
          className="rounded-2xl p-8 sm:p-10 text-center relative overflow-hidden"
          style={{ ...glassCard, border: "1px solid rgba(200,131,74,0.35)", boxShadow: "0 8px 32px rgba(200,131,74,0.18)" }}
        >
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-3" style={{ color: "var(--c-cream)" }}>
            Остались вопросы?
          </h2>
          <p className="text-sm max-w-lg mx-auto mb-6 leading-relaxed" style={{ color: "var(--c-text)" }}>
            Мы всегда на связи и готовы помочь с настройкой расписания.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="mailto:club@sparcom.ru"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all hover:scale-105"
              style={{ background: "linear-gradient(135deg, #C8834A, #b56b2e)", color: "#fff", boxShadow: "0 8px 24px rgba(200,131,74,0.35)" }}
            >
              <Icon name="Mail" size={16} />
              Написать на почту
            </a>
            <Link
              to="/master-schedule-guide"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all"
              style={{ ...glassCard, color: "var(--c-cream)" }}
            >
              <Icon name="BookOpen" size={16} />
              Гайд по расписанию мастера
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
