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
    icon: "Sparkles",
    title: "Добавь услуги",
    desc: "Открой «Быстрый старт» в разделе «Расписание» и добавь услуги, которые ты оказываешь — парение, массаж, индивидуальный сеанс и т.д.",
    details: [
      "Укажи название, длительность и цену",
      "Можно добавить несколько услуг",
      "Без услуг гости не смогут записаться",
    ],
  },
  {
    num: "02",
    icon: "Clock",
    title: "Настрой рабочие часы",
    desc: "Выбери дни недели и рабочие часы — система создаст окна доступности, в которые гости смогут записываться.",
    details: [
      "Выбери дни: Пн–Пт, выходные или любой набор",
      "Укажи начало и конец рабочего дня",
      "Задай паузу между сеансами (перерыв, уборка)",
      "Укажи, на сколько недель вперёд создать расписание",
    ],
  },
  {
    num: "03",
    icon: "Wand2",
    title: "Сгенерируй расписание",
    desc: "Нажми «Сгенерировать расписание» — система автоматически создаст окна доступности на выбранные дни и недели.",
    details: [
      "Окно доступности = весь рабочий день",
      "Гость выбирает услугу → система подбирает свободные интервалы",
      "После бронирования занятый кусок отделяется от остатка автоматически",
    ],
  },
  {
    num: "04",
    icon: "Copy",
    title: "Сохрани шаблон (опционально)",
    desc: "Сохрани текущие настройки как шаблон — в следующий раз применишь одним кликом без повторной настройки.",
    details: [
      "Кнопка «Сохранить как шаблон» рядом с генерацией",
      "Шаблоны доступны в разделе «Шаблоны расписания»",
      "Можно создать несколько шаблонов: будни, выходные, интенсив",
    ],
  },
  {
    num: "05",
    icon: "Settings",
    title: "Настрой часовой пояс и автоподтверждение",
    desc: "В блоке «Настройки» выбери свой часовой пояс и реши, нужно ли подтверждать каждую запись вручную.",
    details: [
      "Часовой пояс влияет на отображение времени у гостей",
      "Автоподтверждение — запись принимается сразу без ручного одобрения",
      "Без автоподтверждения каждую запись нужно принять в разделе «Записи»",
    ],
  },
  {
    num: "06",
    icon: "CalendarDays",
    title: "Управляй расписанием в календаре",
    desc: "В режиме «Календарь» видна сетка по неделям. Слоты можно перетаскивать, редактировать и удалять прямо из сетки.",
    details: [
      "Режим «Список» — все слоты и записи в виде ленты",
      "Режим «Календарь / сетка» — визуальный вид по дням",
      "Клик по слоту — детали и управление",
      "Буфер между сеансами отображается серым промежутком",
    ],
  },
];

const MANAGE = [
  { icon: "Pencil", title: "Редактировать слот", desc: "Кликни на слот в календаре — можно изменить время, услугу или максимальное число клиентов." },
  { icon: "Trash2", title: "Удалить слот", desc: "Удаляй свободные окна, которые уже не нужны. Занятые записями слоты защищены от случайного удаления." },
  { icon: "RefreshCw", title: "Применить шаблон", desc: "В «Быстром старте» выбери сохранённый шаблон и примени его к нужному периоду — окна создадутся автоматически." },
  { icon: "UserCheck", title: "Подтвердить запись", desc: "Если автоподтверждение выключено — принимай или отклоняй записи вручную в разделе «Записи клиентов»." },
];

const TIPS = [
  { icon: "CalendarRange", title: "Открывай расписание на 4–8 недель", desc: "Гости планируют заранее — чем дальше открыто расписание, тем больше записей." },
  { icon: "Zap", title: "Используй шаблоны", desc: "Создай шаблон под свой стандартный режим и применяй его каждый месяц в пару кликов." },
  { icon: "BellRing", title: "Включи автоподтверждение", desc: "Гость сразу получает подтверждение — меньше отказов и вопросов «а точно забронировалось?»." },
  { icon: "Timer", title: "Задай паузу между сеансами", desc: "15–30 минут на уборку и отдых помогут не выгореть и всегда встречать гостей в хорошей форме." },
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
            Расписание мастера
          </h1>
          <p className="text-base sm:text-lg max-w-2xl mx-auto leading-relaxed" style={{ color: "var(--c-text)" }}>
            Как настроить услуги, создать окна доступности и принимать записи от гостей — пошаговое руководство.
          </p>
        </div>
      </section>

      {/* Steps */}
      <section className="relative z-10 px-4 sm:px-6 max-w-5xl mx-auto py-20">
        <SectionHeading subtitle="От добавления услуги до первой принятой записи от гостя.">
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
        <SectionHeading subtitle="Что можно делать со слотами и записями в календаре.">
          Управление расписанием
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
        <SectionHeading subtitle="Как сделать расписание удобным для себя и гостей.">
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