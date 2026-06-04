import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "next-themes";
import Icon from "@/components/ui/icon";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supportApi, FaqItem } from "@/lib/support-api";
import { openSupportWidget } from "@/lib/support-widget";

const THEME_STYLES = `
  [data-support-theme="dark"] {
    --bg-page: linear-gradient(160deg, #1a1410 0%, #1c2018 35%, #14201c 65%, #101818 100%);
    --c-cream: #EDE0CC;
    --c-terra: #C8834A;
    --c-sage:  #8FA89A;
    --c-text:  rgba(217,237,232,0.62);
    --c-muted: rgba(217,237,232,0.45);
    --card-bg: rgba(237,224,204,0.05);
    --card-border: rgba(237,224,204,0.1);
    --card-hover: rgba(237,224,204,0.09);
    --badge-bg: rgba(200,131,74,0.15);
    --badge-border: rgba(200,131,74,0.3);
    --input-bg: rgba(237,224,204,0.06);
    --divider: rgba(237,224,204,0.08);
  }
  [data-support-theme="light"] {
    --bg-page: linear-gradient(160deg, #fdf7f0 0%, #f4f8f5 35%, #eef6f4 65%, #eaf4f2 100%);
    --c-cream: #2d2318;
    --c-terra: #b56b2e;
    --c-sage:  #4a7a6a;
    --c-text:  rgba(35,40,38,0.7);
    --c-muted: rgba(35,40,38,0.5);
    --card-bg: rgba(255,255,255,0.8);
    --card-border: rgba(200,131,74,0.15);
    --card-hover: rgba(255,255,255,0.95);
    --badge-bg: rgba(181,107,46,0.12);
    --badge-border: rgba(181,107,46,0.25);
    --input-bg: rgba(255,255,255,0.85);
    --divider: rgba(45,35,24,0.08);
  }
`;

const cardStyle: React.CSSProperties = {
  background: "var(--card-bg)",
  border: "1px solid var(--card-border)",
  backdropFilter: "blur(16px)",
};

// Разделы помощи по ролям — открывают виджет на нужной вкладке FAQ
const SECTIONS: { icon: string; title: string; text: string; role: string }[] = [
  { icon: "Ticket", title: "Я гость", text: "Как найти баню, записаться на встречу и что взять с собой.", role: "guest" },
  { icon: "Users", title: "Я участник", text: "Управление записями, оплата, отмены и возвраты, уведомления.", role: "participant" },
  { icon: "Flame", title: "Я мастер", text: "Расписание, услуги, записи гостей и работа с профилем.", role: "master" },
  { icon: "CalendarDays", title: "Я организатор", text: "Создание событий, модерация, участники и рассылки.", role: "organizer" },
  { icon: "Building2", title: "Я управляющий", text: "Добавление и настройка бань, статистика и публикация.", role: "partner" },
];

// Полезные ссылки-разделы
const RESOURCES: { icon: string; title: string; text: string; to: string }[] = [
  { icon: "BookOpen", title: "О клубе и правилах", text: "Принципы, ценности и формат встреч СПАРКОМ.", to: "/about" },
  { icon: "Sparkles", title: "Возможности платформы", text: "Что умеет сервис для гостей, мастеров и организаторов.", to: "/features" },
  { icon: "FileText", title: "Документы", text: "Политика конфиденциальности и условия использования.", to: "/documents" },
  { icon: "GraduationCap", title: "Гайд для мастеров", text: "Как настроить расписание и принимать записи.", to: "/master-schedule-guide" },
];

function Badge({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <div
      className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider"
      style={{ background: "var(--badge-bg)", border: "1px solid var(--badge-border)", color: "var(--c-terra)" }}
    >
      <Icon name={icon as "Flame"} size={13} />
      {children}
    </div>
  );
}

export default function Support() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted ? resolvedTheme === "dark" : true;

  const [faq, setFaq] = useState<FaqItem[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    supportApi.fetchFaq().then(setFaq).catch(() => {});
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return faq
      .filter((f) => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q))
      .slice(0, 6);
  }, [faq, query]);

  const popular = useMemo(() => faq.slice(0, 6), [faq]);

  return (
    <div
      data-support-theme={isDark ? "dark" : "light"}
      className="min-h-screen relative overflow-x-hidden transition-colors duration-500"
      style={{ background: "var(--bg-page)" }}
    >
      <style dangerouslySetInnerHTML={{ __html: THEME_STYLES }} />

      {/* Ambient orbs */}
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

      <Header transparent />

      {/* Hero + поиск */}
      <section className="relative z-10 px-4 pt-32 pb-12 max-w-3xl mx-auto text-center">
        <div className="flex justify-center mb-4">
          <Badge icon="LifeBuoy">Центр поддержки</Badge>
        </div>
        <h1
          className="text-4xl sm:text-5xl font-extrabold leading-tight tracking-tight mb-4"
          style={{
            background: "linear-gradient(135deg, var(--c-cream) 20%, #C8834A 60%, #8FA89A 90%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Чем можем помочь?
        </h1>
        <p className="text-base sm:text-lg max-w-xl mx-auto mb-8 leading-relaxed" style={{ color: "var(--c-text)" }}>
          Ответы на частые вопросы, гайды и быстрая связь с банной службой поддержки.
        </p>

        {/* Поиск */}
        <div className="relative max-w-xl mx-auto">
          <div className="flex items-center gap-2 px-4 h-14 rounded-2xl" style={{ ...cardStyle }}>
            <Icon name="Search" size={20} style={{ color: "var(--c-muted)" }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск по вопросам…"
              className="flex-1 bg-transparent outline-none text-base"
              style={{ color: "var(--c-cream)" }}
            />
            {query && (
              <button onClick={() => setQuery("")} aria-label="Очистить">
                <Icon name="X" size={18} style={{ color: "var(--c-muted)" }} />
              </button>
            )}
          </div>

          {results.length > 0 && (
            <div
              className="absolute left-0 right-0 mt-2 rounded-2xl overflow-hidden text-left z-20"
              style={{ ...cardStyle }}
            >
              {results.map((r, i) => (
                <details key={r.id} className="group" style={{ borderTop: i ? "1px solid var(--divider)" : "none" }}>
                  <summary
                    className="cursor-pointer px-4 py-3 text-sm font-medium flex items-center justify-between gap-2"
                    style={{ color: "var(--c-cream)" }}
                  >
                    {r.question}
                    <Icon name="ChevronDown" size={16} className="group-open:rotate-180 transition-transform flex-shrink-0" style={{ color: "var(--c-muted)" }} />
                  </summary>
                  <p className="px-4 pb-3 text-sm leading-relaxed" style={{ color: "var(--c-text)" }}>
                    {r.answer}
                  </p>
                </details>
              ))}
            </div>
          )}
          {query.trim().length >= 2 && results.length === 0 && (
            <div className="absolute left-0 right-0 mt-2 rounded-2xl px-4 py-3 text-sm text-left z-20" style={{ ...cardStyle, color: "var(--c-text)" }}>
              Ничего не нашли. Попробуйте{" "}
              <button onClick={() => openSupportWidget({ tab: "form" })} className="underline font-medium" style={{ color: "var(--c-terra)" }}>
                написать в поддержку
              </button>
              .
            </div>
          )}
        </div>
      </section>

      {/* Разделы по ролям */}
      <section className="relative z-10 px-4 pb-4 max-w-5xl mx-auto">
        <h2 className="text-xl font-bold mb-5 text-center" style={{ color: "var(--c-cream)" }}>
          Выберите свою роль
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SECTIONS.map((s) => (
            <button
              key={s.role}
              onClick={() => openSupportWidget({ tab: "faq", role: s.role })}
              className="text-left rounded-2xl p-5 transition-all hover:-translate-y-0.5 group"
              style={cardStyle}
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center mb-3"
                style={{ background: "var(--badge-bg)", color: "var(--c-terra)" }}
              >
                <Icon name={s.icon as "Flame"} size={20} />
              </div>
              <div className="font-semibold mb-1 flex items-center gap-1.5" style={{ color: "var(--c-cream)" }}>
                {s.title}
                <Icon name="ArrowRight" size={15} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" style={{ color: "var(--c-terra)" }} />
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "var(--c-text)" }}>
                {s.text}
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* Частые вопросы */}
      {popular.length > 0 && (
        <section className="relative z-10 px-4 py-12 max-w-3xl mx-auto">
          <h2 className="text-xl font-bold mb-5 text-center" style={{ color: "var(--c-cream)" }}>
            Частые вопросы
          </h2>
          <div className="rounded-2xl overflow-hidden" style={cardStyle}>
            {popular.map((f, i) => (
              <details key={f.id} className="group" style={{ borderTop: i ? "1px solid var(--divider)" : "none" }}>
                <summary
                  className="cursor-pointer px-5 py-4 text-sm font-medium flex items-center justify-between gap-3"
                  style={{ color: "var(--c-cream)" }}
                >
                  {f.question}
                  <Icon name="Plus" size={16} className="group-open:rotate-45 transition-transform flex-shrink-0" style={{ color: "var(--c-terra)" }} />
                </summary>
                <p className="px-5 pb-4 text-sm leading-relaxed" style={{ color: "var(--c-text)" }}>
                  {f.answer}
                </p>
              </details>
            ))}
          </div>
        </section>
      )}

      {/* Полезные разделы */}
      <section className="relative z-10 px-4 pb-12 max-w-5xl mx-auto">
        <h2 className="text-xl font-bold mb-5 text-center" style={{ color: "var(--c-cream)" }}>
          Полезные материалы
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {RESOURCES.map((r) => (
            <Link
              key={r.to}
              to={r.to}
              className="flex items-start gap-4 rounded-2xl p-5 transition-all hover:-translate-y-0.5 group"
              style={cardStyle}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "var(--badge-bg)", color: "var(--c-sage)" }}
              >
                <Icon name={r.icon as "Flame"} size={18} />
              </div>
              <div>
                <div className="font-semibold mb-0.5" style={{ color: "var(--c-cream)" }}>{r.title}</div>
                <p className="text-sm leading-relaxed" style={{ color: "var(--c-text)" }}>{r.text}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA — связь */}
      <section className="relative z-10 px-4 pb-20 max-w-3xl mx-auto">
        <div className="rounded-3xl p-8 sm:p-10 text-center" style={cardStyle}>
          <div className="text-4xl mb-3">🪵</div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--c-cream)" }}>
            Не нашли ответ?
          </h2>
          <p className="text-sm sm:text-base max-w-md mx-auto mb-6" style={{ color: "var(--c-text)" }}>
            Напишите нам — банная служба поддержки поможет разобраться с любым вопросом.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => openSupportWidget({ tab: "form" })}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all hover:scale-105"
              style={{ background: "linear-gradient(135deg, #C8834A, #b56b2e)", color: "#fff", boxShadow: "0 8px 24px rgba(200,131,74,0.35)" }}
            >
              <Icon name="Send" size={16} />
              Написать в поддержку
            </button>
            <Link
              to="/account?tab=support"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all hover:scale-105"
              style={{ background: "var(--input-bg)", border: "1px solid var(--card-border)", color: "var(--c-cream)" }}
            >
              <Icon name="Inbox" size={16} />
              Мои обращения
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
