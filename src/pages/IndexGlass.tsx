import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { eventsApi } from "@/lib/api";
import { EventItem, mapApiEvent } from "@/data/events";

// ─── Палитра из логотипа ────────────────────────────────────────────────────
// Терракота: #C8834A  |  Шалфей: #8FA89A  |  Кремовый: #EDE0CC  |  Лёд: #D9EDE8

const MONTHS: Record<string, string> = {
  "01": "янв", "02": "фев", "03": "мар", "04": "апр",
  "05": "май", "06": "июн", "07": "июл", "08": "авг",
  "09": "сен", "10": "окт", "11": "ноя", "12": "дек",
};

function fmtDate(d: string) {
  const [, m, day] = d.split("-");
  return { day, month: MONTHS[m] ?? "" };
}

// ─── Моковые данные для секций ──────────────────────────────────────────────
const FORMATS = [
  { icon: "Flame", title: "Банные вечера", desc: "Пар, общение, расслабление — форматы для новичков и завсегдатаев бани." },
  { icon: "Users", title: "Знакомства", desc: "Встречи для тех, кто ищет тёплое общение и новые связи." },
  { icon: "Sparkles", title: "Практики", desc: "Дыхание, медитация, звук — практики для тела и духа в банном пространстве." },
  { icon: "Briefcase", title: "Нетворкинг", desc: "Деловые встречи предпринимателей в неформальной, расслабленной обстановке." },
];

const HOW = [
  { n: "01", title: "Выберите встречу", desc: "Изучите афишу, выберите формат и дату." },
  { n: "02", title: "Запишитесь", desc: "Одно нажатие — и вы в списке. Без лишних форм." },
  { n: "03", title: "Приходите", desc: "Баня, пар, люди — всё остальное мы берём на себя." },
];

const REVIEWS = [
  { name: "Мария К.", text: "Была на женском детоксе — просто восторг. Тепло, уютно, и такие приятные люди вокруг!", avatar: "МК" },
  { name: "Алексей С.", text: "Бизнес-баня — формат, которого мне не хватало. Разговоры получаются иначе, чем в офисе.", avatar: "АС" },
  { name: "Елена В.", text: "Пришла одна, ушла с новыми знакомыми. Организация на высоте, всё продумано.", avatar: "ЕВ" },
];

const FAQ = [
  { q: "Нужно ли уметь париться?", a: "Нет. Многие форматы не предполагают хлестание вениками — это просто тёплое пространство для общения." },
  { q: "Что взять с собой?", a: "Полотенце, купальник/плавки, смену белья. На месте обычно есть всё остальное." },
  { q: "Можно прийти одному?", a: "Да, большинство гостей приходят именно так. Это часть формата — познакомиться с новыми людьми." },
  { q: "Как отменить запись?", a: "Через личный кабинет или напрямую организатору. Условия указаны на странице события." },
];

// ─── Glassmorphism helpers ───────────────────────────────────────────────────
const glass = {
  card: {
    background: "rgba(237, 224, 204, 0.07)",
    border: "1px solid rgba(237, 224, 204, 0.15)",
    backdropFilter: "blur(20px)",
  } as React.CSSProperties,
  cardHover: {
    background: "rgba(237, 224, 204, 0.11)",
  } as React.CSSProperties,
};

// ─── Компоненты ─────────────────────────────────────────────────────────────

function GlassCard({
  children, className = "", style = {},
}: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`rounded-2xl transition-all duration-300 ${className}`}
      style={{ ...glass.card, ...style }}
    >
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium mb-4"
      style={{ background: "rgba(200,131,74,0.18)", border: "1px solid rgba(200,131,74,0.35)", color: "#C8834A" }}
    >
      {children}
    </div>
  );
}

function SectionTitle({ children, light }: { children: React.ReactNode; light?: boolean }) {
  return (
    <h2
      className="text-3xl sm:text-4xl font-extrabold leading-tight mb-3"
      style={{ color: light ? "#EDE0CC" : "#D9EDE8" }}
    >
      {children}
    </h2>
  );
}

// ─── EventCard ───────────────────────────────────────────────────────────────
function GlassEventCard({ event }: { event: EventItem }) {
  const { day, month } = fmtDate(event.date);
  const sold = event.spotsLeft === 0;
  const few = !sold && event.spotsLeft > 0 && event.spotsLeft <= 3;
  const pct = event.totalSpots > 0 ? Math.round(((event.totalSpots - event.spotsLeft) / event.totalSpots) * 100) : 100;

  return (
    <div
      className="group rounded-2xl overflow-hidden transition-all duration-400 hover:-translate-y-1"
      style={{ ...glass.card, boxShadow: "0 4px 32px rgba(0,0,0,0.25)" }}
    >
      {/* Top accent */}
      <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #C8834A, #8FA89A)" }} />

      <div className="p-5">
        <div className="flex gap-4">
          {/* Date */}
          <div
            className="flex-shrink-0 flex flex-col items-center justify-center w-14 h-14 rounded-xl"
            style={{ background: "rgba(200,131,74,0.2)", border: "1px solid rgba(200,131,74,0.35)" }}
          >
            <span className="text-xl font-bold leading-none" style={{ color: "#C8834A" }}>{day}</span>
            <span className="text-xs uppercase tracking-wide mt-0.5" style={{ color: "rgba(200,131,74,0.7)" }}>{month}</span>
          </div>

          <div className="flex-1 min-w-0">
            {/* Tags */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              <span
                className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                style={{ background: "rgba(143,168,154,0.2)", color: "#8FA89A", border: "1px solid rgba(143,168,154,0.3)" }}
              >
                <Icon name={event.typeIcon as "Star"} size={11} />
                {event.type}
              </span>
              {sold && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(200,80,80,0.2)", color: "#f87171", border: "1px solid rgba(200,80,80,0.3)" }}>Мест нет</span>}
              {few && <span className="text-xs px-2 py-0.5 rounded-full animate-pulse" style={{ background: "rgba(200,131,74,0.2)", color: "#C8834A", border: "1px solid rgba(200,131,74,0.35)" }}>Мало мест</span>}
            </div>

            <h3 className="font-bold text-sm leading-snug mb-1" style={{ color: "#EDE0CC" }}>{event.title}</h3>

            <div className="flex gap-3 text-xs" style={{ color: "rgba(217,237,232,0.5)" }}>
              <span className="flex items-center gap-1"><Icon name="Clock" size={11} />{event.timeStart}</span>
              <span className="flex items-center gap-1 truncate"><Icon name="MapPin" size={11} />{event.bathName}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 flex items-center justify-between gap-2" style={{ borderTop: "1px solid rgba(237,224,204,0.1)" }}>
          <span className="font-bold" style={{ color: "#EDE0CC" }}>{event.priceLabel}</span>
          <Link
            to={`/events/${event.slug}`}
            className="px-4 py-1.5 rounded-full text-xs font-semibold transition-all hover:brightness-110 hover:scale-105"
            style={sold
              ? { background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.3)", pointerEvents: "none" }
              : { background: "linear-gradient(90deg, #C8834A, #8FA89A)", color: "#fff", boxShadow: "0 0 16px rgba(200,131,74,0.3)" }
            }
          >
            {sold ? "Занято" : "Записаться"}
          </Link>
        </div>

        {/* Spots bar */}
        <div className="mt-2.5">
          <div className="h-1 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, background: sold ? "#f87171" : few ? "#C8834A" : "#8FA89A" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── FAQ Item ────────────────────────────────────────────────────────────────
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="rounded-xl overflow-hidden cursor-pointer transition-all duration-300"
      style={{ ...glass.card, boxShadow: "0 2px 16px rgba(0,0,0,0.2)" }}
      onClick={() => setOpen(!open)}
    >
      <div className="flex items-center justify-between p-4 gap-3">
        <span className="font-medium text-sm" style={{ color: "#EDE0CC" }}>{q}</span>
        <Icon
          name="ChevronDown"
          size={16}
          className={`flex-shrink-0 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
          style={{ color: "#C8834A" } as React.CSSProperties}
        />
      </div>
      {open && (
        <div className="px-4 pb-4 text-sm" style={{ color: "rgba(217,237,232,0.65)", borderTop: "1px solid rgba(237,224,204,0.1)" }}>
          <div className="pt-3">{a}</div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function IndexGlass() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    eventsApi.getAll(true).then((data) => {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      setEvents(data.map(mapApiEvent).filter((e) => new Date(e.date) >= today).slice(0, 6));
    }).catch(() => {});
  }, []);

  return (
    <div
      className="min-h-screen relative overflow-x-hidden"
      style={{ background: "linear-gradient(160deg, #1a1410 0%, #1c2018 35%, #14201c 65%, #101818 100%)" }}
    >
      {/* ── Ambient orbs ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div className="absolute rounded-full blur-3xl" style={{ width: 700, height: 700, top: -200, left: -200, background: "radial-gradient(circle, rgba(200,131,74,0.12), transparent 70%)" }} />
        <div className="absolute rounded-full blur-3xl" style={{ width: 600, height: 600, top: 100, right: -150, background: "radial-gradient(circle, rgba(143,168,154,0.1), transparent 70%)" }} />
        <div className="absolute rounded-full blur-3xl" style={{ width: 500, height: 500, bottom: -100, left: "35%", background: "radial-gradient(circle, rgba(217,237,232,0.06), transparent 70%)" }} />
      </div>

      {/* ══════════════════════════════ HEADER ══════════════════════════════ */}
      <header
        className="sticky top-0 z-50 px-4 py-3"
        style={{ background: "rgba(20,16,12,0.7)", backdropFilter: "blur(24px)", borderBottom: "1px solid rgba(237,224,204,0.08)" }}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 flex-shrink-0">
            <img
              src="https://cdn.poehali.dev/projects/b2cfdb9f-e5f2-4dd1-84cb-905733c4941c/bucket/fc7c6e03-06e9-49ae-b205-37526a96596b.png"
              alt="СПАРКОМ"
              className="h-8 w-auto object-contain"
            />
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm" style={{ color: "rgba(217,237,232,0.6)" }}>
            {[["Афиша", "/events"], ["Мастера", "/masters"], ["Бани", "/baths"], ["Блог", "/blog"]].map(([label, href]) => (
              <Link key={href} to={href} className="hover:text-white transition-colors" style={{ color: "rgba(237,224,204,0.6)" }}>{label}</Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <Link
              to="/login"
              className="px-4 py-1.5 rounded-full text-sm transition-all"
              style={{ color: "#EDE0CC", border: "1px solid rgba(237,224,204,0.2)", background: "rgba(237,224,204,0.06)" }}
            >
              Войти
            </Link>
            <Link
              to="/events"
              className="px-4 py-1.5 rounded-full text-sm font-semibold transition-all hover:brightness-110"
              style={{ background: "linear-gradient(90deg, #C8834A, #8FA89A)", color: "#fff" }}
            >
              Все встречи
            </Link>
          </div>

          <button className="md:hidden p-2 rounded-lg" style={{ color: "#EDE0CC" }} onClick={() => setMenuOpen(!menuOpen)}>
            <Icon name={menuOpen ? "X" : "Menu"} size={20} />
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden mt-3 rounded-xl p-4 space-y-3" style={{ ...glass.card }}>
            {[["Афиша", "/events"], ["Мастера", "/masters"], ["Бани", "/baths"], ["Блог", "/blog"], ["Войти", "/login"]].map(([label, href]) => (
              <Link key={href} to={href} className="block text-sm py-1" style={{ color: "#EDE0CC" }} onClick={() => setMenuOpen(false)}>{label}</Link>
            ))}
          </div>
        )}
      </header>

      {/* ══════════════════════════════ HERO ══════════════════════════════ */}
      <section ref={heroRef} className="relative z-10 min-h-[90vh] flex flex-col items-center justify-center text-center px-4 pt-12 pb-20">
        {/* Badge */}
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm mb-8"
          style={{ background: "rgba(200,131,74,0.15)", border: "1px solid rgba(200,131,74,0.3)", color: "#C8834A" }}
        >
          <Icon name="Flame" size={14} />
          Банный агрегатор событий Москвы
        </div>

        {/* Heading */}
        <h1 className="text-5xl sm:text-7xl font-extrabold leading-[1.05] mb-6 max-w-3xl tracking-tight">
          <span style={{
            background: "linear-gradient(135deg, #EDE0CC 10%, #C8834A 45%, #8FA89A 80%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            Встречи у огня
          </span>
          <br />
          <span style={{ color: "rgba(217,237,232,0.55)", fontSize: "0.55em", fontWeight: 400, display: "block", marginTop: "0.3em" }}>
            Баня. Пар. Люди. Тепло.
          </span>
        </h1>

        <p className="text-lg max-w-xl mx-auto mb-10" style={{ color: "rgba(217,237,232,0.55)" }}>
          Находите банные мероприятия, записывайтесь в один клик и открывайте новый формат живого общения.
        </p>

        {/* CTAs */}
        <div className="flex flex-wrap gap-3 justify-center mb-16">
          <Link
            to="/events"
            className="flex items-center gap-2 px-7 py-3 rounded-full font-semibold text-white transition-all hover:brightness-110 hover:scale-105"
            style={{ background: "linear-gradient(90deg, #C8834A, #8FA89A)", boxShadow: "0 0 32px rgba(200,131,74,0.35)" }}
          >
            <Icon name="CalendarDays" size={18} />
            Смотреть афишу
          </Link>
          <Link
            to="/organizer"
            className="flex items-center gap-2 px-7 py-3 rounded-full font-semibold transition-all hover:brightness-110"
            style={{ background: "rgba(237,224,204,0.08)", border: "1px solid rgba(237,224,204,0.2)", color: "#EDE0CC" }}
          >
            <Icon name="CalendarPlus" size={18} />
            Провести встречу
          </Link>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap justify-center gap-8">
          {[
            { val: "50+", label: "встреч проведено" },
            { val: "700+", label: "участников" },
            { val: "12+", label: "форматов" },
            { val: "8+", label: "площадок" },
          ].map(({ val, label }) => (
            <div key={label} className="text-center">
              <div
                className="text-3xl font-bold"
                style={{ background: "linear-gradient(135deg, #C8834A, #8FA89A)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
              >{val}</div>
              <div className="text-xs mt-0.5" style={{ color: "rgba(217,237,232,0.4)" }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 animate-bounce" style={{ color: "rgba(237,224,204,0.25)" }}>
          <Icon name="ChevronDown" size={20} />
        </div>
      </section>

      {/* ══════════════════════════════ FORMATS ══════════════════════════════ */}
      <section className="relative z-10 py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <SectionLabel><Icon name="LayoutGrid" size={13} /> Форматы</SectionLabel>
            <SectionTitle>Найди свой формат</SectionTitle>
            <p className="max-w-lg mx-auto text-sm" style={{ color: "rgba(217,237,232,0.5)" }}>
              От тихой медитации до делового нетворкинга — каждый найдёт своё пространство.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FORMATS.map((f) => (
              <GlassCard key={f.title} className="p-6 group hover:scale-[1.02] cursor-default" style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.2)" }}>
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: "rgba(200,131,74,0.15)", border: "1px solid rgba(200,131,74,0.25)" }}
                >
                  <Icon name={f.icon as "Flame"} size={22} style={{ color: "#C8834A" } as React.CSSProperties} />
                </div>
                <h3 className="font-bold mb-2 text-sm" style={{ color: "#EDE0CC" }}>{f.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: "rgba(217,237,232,0.5)" }}>{f.desc}</p>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════ EVENTS ══════════════════════════════ */}
      <section className="relative z-10 py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
            <div>
              <SectionLabel><Icon name="CalendarDays" size={13} /> Афиша</SectionLabel>
              <SectionTitle>Ближайшие встречи</SectionTitle>
            </div>
            <Link
              to="/events"
              className="flex items-center gap-1.5 text-sm font-medium transition-all hover:brightness-125"
              style={{ color: "#C8834A" }}
            >
              Все встречи <Icon name="ArrowRight" size={15} />
            </Link>
          </div>

          {events.length === 0 ? (
            <div className="text-center py-16" style={{ color: "rgba(217,237,232,0.35)" }}>
              <Icon name="CalendarX" size={40} className="mx-auto mb-3 opacity-40" />
              <p>Скоро появятся новые встречи</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {events.map((e) => <GlassEventCard key={e.slug} event={e} />)}
            </div>
          )}
        </div>
      </section>

      {/* ══════════════════════════════ HOW IT WORKS ══════════════════════════════ */}
      <section className="relative z-10 py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <SectionLabel><Icon name="Route" size={13} /> Как это работает</SectionLabel>
            <SectionTitle>Три шага до встречи</SectionTitle>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            {HOW.map((h, i) => (
              <div key={h.n} className="relative">
                <GlassCard className="p-6 h-full" style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.2)" }}>
                  <div
                    className="text-4xl font-black mb-4"
                    style={{ background: "linear-gradient(135deg, #C8834A, #8FA89A)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", opacity: 0.6 }}
                  >{h.n}</div>
                  <h3 className="font-bold mb-2" style={{ color: "#EDE0CC" }}>{h.title}</h3>
                  <p className="text-sm" style={{ color: "rgba(217,237,232,0.5)" }}>{h.desc}</p>
                </GlassCard>
                {i < HOW.length - 1 && (
                  <div className="hidden sm:flex absolute top-8 -right-3 z-10 w-6 h-6 rounded-full items-center justify-center" style={{ background: "rgba(200,131,74,0.2)", border: "1px solid rgba(200,131,74,0.3)" }}>
                    <Icon name="ChevronRight" size={12} style={{ color: "#C8834A" } as React.CSSProperties} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════ REVIEWS ══════════════════════════════ */}
      <section className="relative z-10 py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <SectionLabel><Icon name="MessageCircle" size={13} /> Отзывы</SectionLabel>
            <SectionTitle>Что говорят гости</SectionTitle>
          </div>

          <div className="grid sm:grid-cols-3 gap-5">
            {REVIEWS.map((r) => (
              <GlassCard key={r.name} className="p-6" style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.2)" }}>
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{ background: "linear-gradient(135deg, #C8834A, #8FA89A)", color: "#fff" }}
                  >
                    {r.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-sm" style={{ color: "#EDE0CC" }}>{r.name}</div>
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(i => <Icon key={i} name="Star" size={11} style={{ color: "#C8834A" } as React.CSSProperties} />)}
                    </div>
                  </div>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "rgba(217,237,232,0.6)" }}>«{r.text}»</p>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════ FAQ ══════════════════════════════ */}
      <section className="relative z-10 py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <SectionLabel><Icon name="HelpCircle" size={13} /> Вопросы</SectionLabel>
            <SectionTitle>Часто спрашивают</SectionTitle>
          </div>
          <div className="space-y-3">
            {FAQ.map((f) => <FaqItem key={f.q} q={f.q} a={f.a} />)}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════ ORGANIZER CTA ══════════════════════════════ */}
      <section className="relative z-10 py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div
            className="rounded-3xl p-10 sm:p-14 text-center relative overflow-hidden"
            style={{ ...glass.card, boxShadow: "0 8px 48px rgba(0,0,0,0.3)" }}
          >
            {/* Decorative glow */}
            <div className="absolute inset-0 pointer-events-none rounded-3xl" style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(200,131,74,0.12), transparent 60%)" }} />

            <div className="relative z-10">
              <div
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm mb-6"
                style={{ background: "rgba(143,168,154,0.15)", border: "1px solid rgba(143,168,154,0.3)", color: "#8FA89A" }}
              >
                <Icon name="Users" size={13} />
                Для организаторов
              </div>
              <h2
                className="text-3xl sm:text-4xl font-extrabold mb-4"
                style={{ background: "linear-gradient(135deg, #EDE0CC, #C8834A)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
              >
                Проведи свою встречу
              </h2>
              <p className="max-w-lg mx-auto mb-8 text-sm" style={{ color: "rgba(217,237,232,0.55)" }}>
                Создай событие, привлеки аудиторию и получи надёжную площадку для развития своего проекта.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Link
                  to="/organizer"
                  className="px-8 py-3 rounded-full font-semibold text-white transition-all hover:brightness-110 hover:scale-105 flex items-center gap-2"
                  style={{ background: "linear-gradient(90deg, #C8834A, #8FA89A)", boxShadow: "0 0 32px rgba(200,131,74,0.3)" }}
                >
                  <Icon name="CalendarPlus" size={18} />
                  Создать событие
                </Link>
                <Link
                  to="/organizer-cabinet"
                  className="px-8 py-3 rounded-full font-semibold transition-all hover:brightness-110 flex items-center gap-2"
                  style={{ background: "rgba(237,224,204,0.08)", border: "1px solid rgba(237,224,204,0.2)", color: "#EDE0CC" }}
                >
                  <Icon name="LayoutDashboard" size={18} />
                  Личный кабинет
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════ FOOTER ══════════════════════════════ */}
      <footer
        className="relative z-10 py-10 px-4"
        style={{ borderTop: "1px solid rgba(237,224,204,0.08)" }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row gap-8 justify-between mb-8">
            <div>
              <img
                src="https://cdn.poehali.dev/projects/b2cfdb9f-e5f2-4dd1-84cb-905733c4941c/bucket/fc7c6e03-06e9-49ae-b205-37526a96596b.png"
                alt="СПАРКОМ"
                className="h-7 w-auto object-contain mb-3"
              />
              <p className="text-sm max-w-xs" style={{ color: "rgba(217,237,232,0.4)" }}>
                Банный агрегатор событий. Встречи у пара, огня и тепла.
              </p>
            </div>
            <div className="flex flex-wrap gap-12">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "rgba(200,131,74,0.7)" }}>Проект</div>
                <div className="space-y-2">
                  {[["Афиша", "/events"], ["Мастера", "/masters"], ["Бани", "/baths"], ["Блог", "/blog"]].map(([l, h]) => (
                    <Link key={h} to={h} className="block text-sm hover:text-white transition-colors" style={{ color: "rgba(217,237,232,0.45)" }}>{l}</Link>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "rgba(200,131,74,0.7)" }}>Участникам</div>
                <div className="space-y-2">
                  {[["Войти", "/login"], ["Регистрация", "/register"], ["Личный кабинет", "/account"], ["О нас", "/about"]].map(([l, h]) => (
                    <Link key={h} to={h} className="block text-sm hover:text-white transition-colors" style={{ color: "rgba(217,237,232,0.45)" }}>{l}</Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div
            className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs"
            style={{ borderTop: "1px solid rgba(237,224,204,0.07)", color: "rgba(217,237,232,0.25)" }}
          >
            <span>© 2026 СПАРКОМ — Банный агрегатор событий</span>
            <div className="flex gap-4">
              <Link to="/documents?tab=privacy" className="hover:text-white transition-colors">Политика конфиденциальности</Link>
              <Link to="/documents?tab=terms" className="hover:text-white transition-colors">Условия использования</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
