import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { eventsApi } from "@/lib/api";
import { EventItem, mapApiEvent } from "@/data/events";
import { format, parseISO, startOfDay } from "date-fns";
import { ru } from "date-fns/locale";
import { TELEGRAM_URL, ORGANIZER_URL } from "@/lib/constants";

// ─── Палитра логотипа ───────────────────────────────────────────────────────
// Терракота: #C8834A  |  Шалфей: #8FA89A  |  Кремовый: #EDE0CC  |  Лёд: #D9EDE8
// Фон: #1a1410 → #14201c

// ─── Статичный контент ──────────────────────────────────────────────────────
const FORMATS = [
  { icon: "Flame", title: "Банные вечера", desc: "Пар, общение, расслабление — форматы для новичков и завсегдатаев бани." },
  { icon: "Users", title: "Знакомства", desc: "Встречи для тех, кто ищет тёплое общение и новые связи." },
  { icon: "Sparkles", title: "Практики", desc: "Дыхание, медитация, звук — практики для тела и духа в банном пространстве." },
  { icon: "Briefcase", title: "Нетворкинг", desc: "Деловые встречи предпринимателей в неформальной, расслабленной обстановке." },
];

const HOW = [
  { n: "01", icon: "CalendarDays", title: "Выберите встречу", desc: "Посмотрите афишу и выберите формат и дату." },
  { n: "02", icon: "MousePointerClick", title: "Запишитесь", desc: "Одно нажатие — и вы в списке. Без лишних форм." },
  { n: "03", icon: "Waves", title: "Приходите и отдыхайте", desc: "Баня, пар, люди. Всё остальное мы берём на себя." },
];

const RULES = [
  { icon: "Wine", neg: true, text: "Алкоголь запрещён" },
  { icon: "Shield", neg: false, text: "Уважение к пространству и людям" },
  { icon: "Clock", neg: false, text: "Приходите вовремя" },
  { icon: "Volume2", neg: true, text: "Без громкого шума и агрессии" },
  { icon: "UserCheck", neg: false, text: "Следуйте правилам организатора" },
  { icon: "HeartHandshake", neg: false, text: "Открытость к новым знакомствам" },
];

const FAQ = [
  { q: "Нужно ли уметь париться?", a: "Нет. Многие форматы не предполагают хлестание вениками — это просто тёплое пространство для общения." },
  { q: "Что взять с собой?", a: "Полотенце, купальник/плавки, смену белья. На месте обычно есть всё остальное." },
  { q: "Можно прийти одному?", a: "Да, большинство гостей приходят именно так. Это часть формата — познакомиться с новыми людьми." },
  { q: "Как отменить запись?", a: "Через личный кабинет или напрямую организатору. Условия указаны на странице события." },
  { q: "Есть ли возрастное ограничение?", a: "Мероприятия для взрослых 18+. На некоторые семейные встречи дети допускаются — это указано в описании." },
];

const REVIEWS = [
  { name: "Мария К.", text: "Была на женском детоксе — просто восторг. Тепло, уютно, и такие приятные люди вокруг!", avatar: "МК" },
  { name: "Алексей С.", text: "Бизнес-баня — формат, которого мне не хватало. Разговоры получаются иначе, чем в офисе.", avatar: "АС" },
  { name: "Елена В.", text: "Пришла одна, ушла с новыми знакомыми. Организация на высоте, всё продумано.", avatar: "ЕВ" },
];

// ─── Стили стекла ────────────────────────────────────────────────────────────
const glassCard: React.CSSProperties = {
  background: "rgba(237, 224, 204, 0.06)",
  border: "1px solid rgba(237, 224, 204, 0.13)",
  backdropFilter: "blur(20px)",
};

// ─── Вспомогательные компоненты ──────────────────────────────────────────────

function SectionBadge({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <div
      className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider mb-4"
      style={{ background: "rgba(200,131,74,0.15)", border: "1px solid rgba(200,131,74,0.3)", color: "#C8834A" }}
    >
      <Icon name={icon as "Flame"} size={13} />
      {children}
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-3xl sm:text-4xl font-extrabold leading-tight mb-3" style={{ color: "#EDE0CC" }}>
      {children}
    </h2>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:brightness-110"
      style={glassCard}
      onClick={() => setOpen(!open)}
    >
      <div className="flex items-center justify-between px-5 py-4 gap-3">
        <span className="font-medium text-sm" style={{ color: "#EDE0CC" }}>{q}</span>
        <Icon
          name="ChevronDown"
          size={16}
          className={`flex-shrink-0 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
          style={{ color: "#C8834A" } as React.CSSProperties}
        />
      </div>
      {open && (
        <div className="px-5 pb-5 text-sm leading-relaxed" style={{ color: "rgba(217,237,232,0.6)", borderTop: "1px solid rgba(237,224,204,0.1)" }}>
          <div className="pt-3">{a}</div>
        </div>
      )}
    </div>
  );
}

// ─── Карточка события (Airbnb-стиль) ─────────────────────────────────────────
function AirbnbEventCard({ event }: { event: EventItem }) {
  const dateObj = parseISO(event.date);
  const dateStr = format(dateObj, "d MMMM, EEEE", { locale: ru });
  const sold = event.spotsLeft === 0;
  const few = !sold && event.spotsLeft > 0 && event.spotsLeft <= 3;
  const pct = event.totalSpots > 0 ? Math.round(((event.totalSpots - event.spotsLeft) / event.totalSpots) * 100) : 100;

  return (
    <Link to={`/events/${event.slug}`} className="group block">
      <div
        className="rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
        style={{ ...glassCard, boxShadow: "0 4px 24px rgba(0,0,0,0.25)" }}
      >
        {/* Image / placeholder */}
        <div className="relative h-48 overflow-hidden">
          {event.image ? (
            <img
              src={event.image}
              alt={event.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, rgba(200,131,74,0.2), rgba(143,168,154,0.2))" }}
            >
              <Icon name="Flame" size={48} style={{ color: "rgba(200,131,74,0.4)" } as React.CSSProperties} />
            </div>
          )}
          {/* Gradient overlay */}
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(20,16,12,0.7) 0%, transparent 50%)" }} />

          {/* Tags */}
          <div className="absolute top-3 left-3 flex gap-2 flex-wrap">
            <span
              className="text-xs px-2.5 py-1 rounded-full font-medium backdrop-blur-sm"
              style={{ background: "rgba(20,16,12,0.6)", color: "#EDE0CC", border: "1px solid rgba(237,224,204,0.2)" }}
            >
              <Icon name={event.typeIcon as "Star"} size={11} className="inline mr-1" />
              {event.type}
            </span>
          </div>
          <div className="absolute top-3 right-3">
            {sold && (
              <span className="text-xs px-2.5 py-1 rounded-full font-medium backdrop-blur-sm" style={{ background: "rgba(239,68,68,0.3)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.4)" }}>Мест нет</span>
            )}
            {few && (
              <span className="text-xs px-2.5 py-1 rounded-full font-medium backdrop-blur-sm animate-pulse" style={{ background: "rgba(200,131,74,0.3)", color: "#C8834A", border: "1px solid rgba(200,131,74,0.4)" }}>Мало мест</span>
            )}
          </div>

          {/* Date badge bottom */}
          <div className="absolute bottom-3 left-3">
            <span className="text-xs font-medium" style={{ color: "rgba(237,224,204,0.85)" }}>
              <Icon name="Calendar" size={12} className="inline mr-1" />
              {dateStr}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="p-4">
          <h3
            className="font-bold text-base leading-snug mb-1 group-hover:brightness-110 transition-all line-clamp-2"
            style={{ color: "#EDE0CC" }}
          >
            {event.title}
          </h3>

          {event.description && (
            <p className="text-xs line-clamp-2 mb-3" style={{ color: "rgba(217,237,232,0.5)" }}>
              {event.description}
            </p>
          )}

          <div className="flex items-center gap-3 text-xs mb-3" style={{ color: "rgba(217,237,232,0.45)" }}>
            <span className="flex items-center gap-1"><Icon name="Clock" size={11} />{event.timeStart}–{event.timeEnd}</span>
            {event.bathName && <span className="flex items-center gap-1 truncate"><Icon name="MapPin" size={11} />{event.bathName}</span>}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-2 pt-3" style={{ borderTop: "1px solid rgba(237,224,204,0.1)" }}>
            <span className="font-bold text-sm" style={{ color: "#C8834A" }}>{event.priceLabel}</span>
            <span
              className="text-xs px-3 py-1.5 rounded-full font-semibold transition-all"
              style={sold
                ? { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.25)" }
                : { background: "linear-gradient(90deg,#C8834A,#8FA89A)", color: "#fff", boxShadow: "0 0 12px rgba(200,131,74,0.25)" }
              }
            >
              {sold ? "Занято" : "Подробнее →"}
            </span>
          </div>

          {/* Spots bar */}
          <div className="mt-2.5 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.07)" }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, background: sold ? "#ef4444" : few ? "#C8834A" : "#8FA89A" }}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── Строчная карточка (list view) ───────────────────────────────────────────
function ListEventCard({ event }: { event: EventItem }) {
  const dateObj = parseISO(event.date);
  const dateStr = format(dateObj, "d MMM, EEE", { locale: ru });
  const sold = event.spotsLeft === 0;
  const few = !sold && event.spotsLeft > 0 && event.spotsLeft <= 3;

  return (
    <Link to={`/events/${event.slug}`} className="group block">
      <div
        className="flex gap-4 items-center rounded-2xl px-4 py-3.5 transition-all duration-300 hover:brightness-110"
        style={{ ...glassCard, boxShadow: "0 2px 12px rgba(0,0,0,0.2)" }}
      >
        {/* Date pill */}
        <div
          className="flex-shrink-0 w-14 text-center rounded-xl py-2"
          style={{ background: "rgba(200,131,74,0.15)", border: "1px solid rgba(200,131,74,0.25)" }}
        >
          <div className="text-lg font-bold leading-none" style={{ color: "#C8834A" }}>
            {format(dateObj, "d")}
          </div>
          <div className="text-xs uppercase tracking-wide mt-0.5" style={{ color: "rgba(200,131,74,0.65)" }}>
            {format(dateObj, "MMM", { locale: ru })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className="text-xs" style={{ color: "#8FA89A" }}>
              <Icon name={event.typeIcon as "Star"} size={11} className="inline mr-1" />
              {event.type}
            </span>
            {sold && <span className="text-xs" style={{ color: "#f87171" }}>• Мест нет</span>}
            {few && <span className="text-xs animate-pulse" style={{ color: "#C8834A" }}>• Мало мест</span>}
          </div>
          <h3 className="font-semibold text-sm truncate" style={{ color: "#EDE0CC" }}>{event.title}</h3>
          <div className="flex items-center gap-3 mt-0.5 text-xs" style={{ color: "rgba(217,237,232,0.4)" }}>
            <span>{dateStr} · {event.timeStart}</span>
            {event.bathName && <span className="truncate">{event.bathName}</span>}
          </div>
        </div>

        {/* Price + arrow */}
        <div className="flex-shrink-0 text-right">
          <div className="font-bold text-sm" style={{ color: "#C8834A" }}>{event.priceLabel}</div>
          <Icon name="ChevronRight" size={16} className="ml-auto mt-1" style={{ color: "rgba(237,224,204,0.3)" } as React.CSSProperties} />
        </div>
      </div>
    </Link>
  );
}

// ─── Главная страница ─────────────────────────────────────────────────────────
export default function IndexNew() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    eventsApi.getAll(true).then((data) => {
      const today = startOfDay(new Date());
      setEvents(data.map(mapApiEvent).filter((e) => parseISO(e.date) >= today));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const eventTypes = useMemo(() => ["all", ...Array.from(new Set(events.map((e) => e.type)))], [events]);

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (selectedType !== "all" && e.type !== selectedType) return false;
      if (search) {
        const q = search.toLowerCase();
        return e.title.toLowerCase().includes(q) || (e.bathName ?? "").toLowerCase().includes(q) || e.type.toLowerCase().includes(q);
      }
      return true;
    }).sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
  }, [events, selectedType, search]);

  return (
    <div
      className="min-h-screen relative overflow-x-hidden"
      style={{ background: "linear-gradient(160deg, #1a1410 0%, #1c2018 35%, #14201c 65%, #101818 100%)" }}
    >
      {/* Ambient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div className="absolute rounded-full blur-3xl" style={{ width: 700, height: 700, top: -200, left: -200, background: "radial-gradient(circle, rgba(200,131,74,0.1), transparent 70%)" }} />
        <div className="absolute rounded-full blur-3xl" style={{ width: 600, height: 600, top: 100, right: -150, background: "radial-gradient(circle, rgba(143,168,154,0.08), transparent 70%)" }} />
        <div className="absolute rounded-full blur-3xl" style={{ width: 500, height: 500, bottom: 0, left: "35%", background: "radial-gradient(circle, rgba(217,237,232,0.05), transparent 70%)" }} />
      </div>

      {/* ══ HEADER ═══════════════════════════════════════════════════════════ */}
      <header
        className="sticky top-0 z-50 px-4 py-3"
        style={{ background: "rgba(20,16,12,0.75)", backdropFilter: "blur(24px)", borderBottom: "1px solid rgba(237,224,204,0.08)" }}
      >
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <Link to="/" className="flex-shrink-0">
            <img
              src="https://cdn.poehali.dev/projects/b2cfdb9f-e5f2-4dd1-84cb-905733c4941c/bucket/fc7c6e03-06e9-49ae-b205-37526a96596b.png"
              alt="СПАРКОМ"
              className="h-8 w-auto object-contain"
            />
          </Link>

          {/* Search bar — Airbnb style */}
          <div
            className="flex-1 max-w-md mx-auto flex items-center gap-2 px-4 py-2 rounded-full transition-all"
            style={{ background: "rgba(237,224,204,0.08)", border: "1px solid rgba(237,224,204,0.15)" }}
          >
            <Icon name="Search" size={15} style={{ color: "rgba(237,224,204,0.4)", flexShrink: 0 } as React.CSSProperties} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск встреч, бань, форматов..."
              className="bg-transparent text-sm outline-none flex-1 min-w-0"
              style={{ color: "rgba(237,224,204,0.85)" }}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ color: "rgba(237,224,204,0.4)" }}>
                <Icon name="X" size={13} />
              </button>
            )}
          </div>

          <nav className="hidden md:flex items-center gap-5 text-sm flex-shrink-0">
            {[["Афиша", "/events"], ["Мастера", "/masters"], ["Бани", "/baths"], ["Блог", "/blog"]].map(([l, h]) => (
              <Link key={h} to={h} className="hover:text-white transition-colors" style={{ color: "rgba(237,224,204,0.55)" }}>{l}</Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-2 flex-shrink-0">
            <Link to="/login" className="text-sm px-4 py-1.5 rounded-full transition-all" style={{ color: "#EDE0CC", border: "1px solid rgba(237,224,204,0.18)", background: "rgba(237,224,204,0.05)" }}>Войти</Link>
            <Link to="/events" className="text-sm px-4 py-1.5 rounded-full font-semibold transition-all hover:brightness-110 text-white" style={{ background: "linear-gradient(90deg,#C8834A,#8FA89A)" }}>Все встречи</Link>
          </div>

          <button className="md:hidden flex-shrink-0 p-2" style={{ color: "#EDE0CC" }} onClick={() => setMenuOpen(!menuOpen)}>
            <Icon name={menuOpen ? "X" : "Menu"} size={20} />
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden mt-3 rounded-2xl p-4 space-y-3 max-w-6xl mx-auto" style={glassCard}>
            {[["Афиша", "/events"], ["Мастера", "/masters"], ["Бани", "/baths"], ["Блог", "/blog"], ["Войти", "/login"]].map(([l, h]) => (
              <Link key={h} to={h} className="block text-sm py-1.5 border-b" style={{ color: "#EDE0CC", borderColor: "rgba(237,224,204,0.08)" }} onClick={() => setMenuOpen(false)}>{l}</Link>
            ))}
          </div>
        )}
      </header>

      {/* ══ HERO ═════════════════════════════════════════════════════════════ */}
      <section className="relative z-10 overflow-hidden">
        <div className="relative min-h-[70vh] flex flex-col items-center justify-center text-center px-4 py-24">
          {/* Hero background image with overlay */}
          <img
            src="https://cdn.poehali.dev/projects/b2cfdb9f-e5f2-4dd1-84cb-905733c4941c/files/69533be6-e8cd-4137-89eb-a06d187922f4.jpg"
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            style={{ opacity: 0.18 }}
          />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 40%, #1a1410 100%)" }} />

          <div className="relative z-10 max-w-3xl mx-auto">
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm mb-8"
              style={{ background: "rgba(200,131,74,0.15)", border: "1px solid rgba(200,131,74,0.3)", color: "#C8834A" }}
            >
              <Icon name="Flame" size={14} />
              Банный агрегатор событий Москвы
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.05] tracking-tight mb-6">
              <span style={{ background: "linear-gradient(135deg, #EDE0CC 15%, #C8834A 50%, #8FA89A 85%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                В баню можно идти одному.
              </span>
            </h1>

            <p className="text-lg sm:text-xl max-w-xl mx-auto mb-10 leading-relaxed" style={{ color: "rgba(217,237,232,0.6)" }}>
              Если хочется нормальной бани, но не с кем — это не проблема. СПАРКОМ существует именно для таких ситуаций.
            </p>

            <div className="flex flex-wrap gap-3 justify-center mb-16">
              <a
                href={TELEGRAM_URL}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-7 py-3.5 rounded-full font-semibold text-white transition-all hover:brightness-110 hover:scale-105"
                style={{ background: "linear-gradient(90deg,#C8834A,#8FA89A)", boxShadow: "0 0 32px rgba(200,131,74,0.3)" }}
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/></svg>
                Расписание в Telegram
              </a>
              <Link
                to="/events"
                className="flex items-center gap-2 px-7 py-3.5 rounded-full font-semibold transition-all hover:brightness-110"
                style={{ background: "rgba(237,224,204,0.08)", border: "1px solid rgba(237,224,204,0.2)", color: "#EDE0CC" }}
              >
                <Icon name="CalendarDays" size={18} />
                Смотреть афишу
              </Link>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap justify-center gap-10">
              {[{ val: "50+", label: "встреч проведено" }, { val: "700+", label: "участников" }, { val: "12+", label: "форматов" }, { val: "8+", label: "площадок" }].map(({ val, label }) => (
                <div key={label} className="text-center">
                  <div className="text-3xl font-bold" style={{ background: "linear-gradient(135deg,#C8834A,#8FA89A)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{val}</div>
                  <div className="text-xs mt-0.5" style={{ color: "rgba(217,237,232,0.35)" }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ EVENTS (с поиском и фильтрами) ══════════════════════════════════ */}
      <section className="relative z-10 py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <SectionBadge icon="CalendarDays">Афиша</SectionBadge>
              <SectionHeading>Ближайшие встречи</SectionHeading>
            </div>
            <Link to="/events" className="flex items-center gap-1.5 text-sm font-medium transition-all hover:brightness-125 flex-shrink-0" style={{ color: "#C8834A" }}>
              Все встречи <Icon name="ArrowRight" size={15} />
            </Link>
          </div>

          {/* Controls bar */}
          <div
            className="flex flex-wrap gap-3 items-center mb-6 p-3 rounded-2xl"
            style={glassCard}
          >
            {/* Type pills */}
            <div className="flex flex-wrap gap-2 flex-1">
              {eventTypes.map((t) => (
                <button
                  key={t}
                  onClick={() => setSelectedType(t)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-all duration-200"
                  style={selectedType === t
                    ? { background: "linear-gradient(90deg,#C8834A,#8FA89A)", color: "#fff", boxShadow: "0 0 14px rgba(200,131,74,0.3)" }
                    : { background: "rgba(237,224,204,0.06)", border: "1px solid rgba(237,224,204,0.12)", color: "rgba(237,224,204,0.6)" }
                  }
                >
                  {t === "all" ? "Все форматы" : t}
                </button>
              ))}
            </div>

            {/* View toggle */}
            <div className="flex gap-1 rounded-xl p-1 flex-shrink-0" style={{ background: "rgba(237,224,204,0.06)" }}>
              <button
                onClick={() => setView("grid")}
                className="p-2 rounded-lg transition-all"
                style={view === "grid" ? { background: "rgba(200,131,74,0.2)", color: "#C8834A" } : { color: "rgba(237,224,204,0.35)" }}
              >
                <Icon name="LayoutGrid" size={16} />
              </button>
              <button
                onClick={() => setView("list")}
                className="p-2 rounded-lg transition-all"
                style={view === "list" ? { background: "rgba(200,131,74,0.2)", color: "#C8834A" } : { color: "rgba(237,224,204,0.35)" }}
              >
                <Icon name="List" size={16} />
              </button>
            </div>
          </div>

          {/* Results count */}
          {!loading && (
            <p className="text-xs mb-4" style={{ color: "rgba(217,237,232,0.35)" }}>
              {search || selectedType !== "all"
                ? `Найдено: ${filtered.length} ${filtered.length === 1 ? "встреча" : filtered.length < 5 ? "встречи" : "встреч"}`
                : `Предстоящих встреч: ${filtered.length}`}
            </p>
          )}

          {/* Cards */}
          {loading ? (
            <div className="flex items-center justify-center py-20" style={{ color: "rgba(217,237,232,0.4)" }}>
              <Icon name="Loader2" size={32} className="animate-spin mr-3" />
              Загрузка встреч...
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20" style={{ color: "rgba(217,237,232,0.35)" }}>
              <Icon name="CalendarX" size={48} className="mx-auto mb-4 opacity-30" />
              <p className="text-lg mb-2">Встреч не найдено</p>
              <button onClick={() => { setSearch(""); setSelectedType("all"); }} className="text-sm underline underline-offset-4" style={{ color: "#C8834A" }}>Сбросить фильтры</button>
            </div>
          ) : view === "grid" ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((e) => <AirbnbEventCard key={e.slug} event={e} />)}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((e) => <ListEventCard key={e.slug} event={e} />)}
            </div>
          )}
        </div>
      </section>

      {/* ══ FORMATS ══════════════════════════════════════════════════════════ */}
      <section className="relative z-10 py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <SectionBadge icon="LayoutGrid">Форматы</SectionBadge>
            <SectionHeading>Найди свой формат</SectionHeading>
            <p className="max-w-lg mx-auto text-sm" style={{ color: "rgba(217,237,232,0.45)" }}>
              От тихой медитации до делового нетворкинга — каждый найдёт своё пространство.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FORMATS.map((f) => (
              <div key={f.title} className="rounded-2xl p-6 transition-all duration-300 hover:scale-[1.02] hover:brightness-110" style={glassCard}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: "rgba(200,131,74,0.15)", border: "1px solid rgba(200,131,74,0.25)" }}>
                  <Icon name={f.icon as "Flame"} size={20} style={{ color: "#C8834A" } as React.CSSProperties} />
                </div>
                <h3 className="font-bold text-sm mb-2" style={{ color: "#EDE0CC" }}>{f.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: "rgba(217,237,232,0.45)" }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ WHO IS THIS FOR ══════════════════════════════════════════════════ */}
      <section className="relative z-10 py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <SectionBadge icon="Users">Для кого</SectionBadge>
            <SectionHeading>Этот формат подойдёт не всем — и в этом его смысл</SectionHeading>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            <div className="rounded-2xl p-7" style={glassCard}>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(143,168,154,0.2)", border: "1px solid rgba(143,168,154,0.3)" }}>
                  <Icon name="Check" size={18} style={{ color: "#8FA89A" } as React.CSSProperties} />
                </div>
                <h3 className="font-bold text-lg" style={{ color: "#EDE0CC" }}>Подходит, если вы:</h3>
              </div>
              <ul className="space-y-3">
                {["хотите пойти в баню, даже если идёте один", "цените спокойный, трезвый формат", "уважаете личные границы и общее пространство", "готовы следовать простым правилам"].map((t) => (
                  <li key={t} className="flex items-start gap-2.5 text-sm" style={{ color: "rgba(217,237,232,0.65)" }}>
                    <Icon name="Circle" size={6} className="flex-shrink-0 mt-1.5" style={{ color: "#8FA89A" } as React.CSSProperties} />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl p-7" style={glassCard}>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)" }}>
                  <Icon name="X" size={18} style={{ color: "#f87171" } as React.CSSProperties} />
                </div>
                <h3 className="font-bold text-lg" style={{ color: "#EDE0CC" }}>Не подойдёт, если вы:</h3>
              </div>
              <ul className="space-y-3">
                {["ищете тусовку или спонтанность", "хотите «как пойдёт» и без рамок", "планируете алкоголь", "не готовы быть частью группы"].map((t) => (
                  <li key={t} className="flex items-start gap-2.5 text-sm" style={{ color: "rgba(217,237,232,0.5)" }}>
                    <Icon name="Circle" size={6} className="flex-shrink-0 mt-1.5" style={{ color: "rgba(239,68,68,0.4)" } as React.CSSProperties} />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ══ HOW IT WORKS ═════════════════════════════════════════════════════ */}
      <section className="relative z-10 py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <SectionBadge icon="Route">Как работает</SectionBadge>
            <SectionHeading>Три шага до встречи</SectionHeading>
          </div>
          <div className="grid sm:grid-cols-3 gap-5">
            {HOW.map((h, i) => (
              <div key={h.n} className="relative">
                <div className="rounded-2xl p-7 h-full" style={glassCard}>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: "rgba(200,131,74,0.12)", border: "1px solid rgba(200,131,74,0.2)" }}>
                    <Icon name={h.icon as "CalendarDays"} size={22} style={{ color: "#C8834A" } as React.CSSProperties} />
                  </div>
                  <div className="text-5xl font-black mb-3" style={{ background: "linear-gradient(135deg,#C8834A,#8FA89A)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", opacity: 0.5 }}>{h.n}</div>
                  <h3 className="font-bold mb-2 text-sm" style={{ color: "#EDE0CC" }}>{h.title}</h3>
                  <p className="text-xs leading-relaxed" style={{ color: "rgba(217,237,232,0.45)" }}>{h.desc}</p>
                </div>
                {i < HOW.length - 1 && (
                  <div className="hidden sm:flex absolute top-7 -right-3 z-10 w-6 h-6 rounded-full items-center justify-center" style={{ background: "rgba(200,131,74,0.15)", border: "1px solid rgba(200,131,74,0.25)" }}>
                    <Icon name="ChevronRight" size={12} style={{ color: "#C8834A" } as React.CSSProperties} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ RULES ════════════════════════════════════════════════════════════ */}
      <section className="relative z-10 py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <SectionBadge icon="Shield">Правила</SectionBadge>
            <SectionHeading>Кодекс СПАРКОМ</SectionHeading>
            <p className="text-sm max-w-md mx-auto" style={{ color: "rgba(217,237,232,0.45)" }}>
              Простые правила, которые делают встречи комфортными для всех.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {RULES.map((r) => (
              <div key={r.text} className="flex items-center gap-3 rounded-xl px-4 py-3.5" style={glassCard}>
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={r.neg
                    ? { background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.2)" }
                    : { background: "rgba(143,168,154,0.15)", border: "1px solid rgba(143,168,154,0.25)" }
                  }
                >
                  <Icon name={r.icon as "Shield"} size={16} style={{ color: r.neg ? "#f87171" : "#8FA89A" } as React.CSSProperties} />
                </div>
                <span className="text-sm" style={{ color: "rgba(237,224,204,0.75)" }}>{r.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ REVIEWS ══════════════════════════════════════════════════════════ */}
      <section className="relative z-10 py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <SectionBadge icon="MessageCircle">Отзывы</SectionBadge>
            <SectionHeading>Что говорят гости</SectionHeading>
          </div>
          <div className="grid sm:grid-cols-3 gap-5">
            {REVIEWS.map((r) => (
              <div key={r.name} className="rounded-2xl p-6" style={glassCard}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 text-white" style={{ background: "linear-gradient(135deg,#C8834A,#8FA89A)" }}>
                    {r.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-sm" style={{ color: "#EDE0CC" }}>{r.name}</div>
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(i => <Icon key={i} name="Star" size={11} style={{ color: "#C8834A" } as React.CSSProperties} />)}
                    </div>
                  </div>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "rgba(217,237,232,0.55)" }}>«{r.text}»</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FAQ ══════════════════════════════════════════════════════════════ */}
      <section className="relative z-10 py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <SectionBadge icon="HelpCircle">Вопросы</SectionBadge>
            <SectionHeading>Часто спрашивают</SectionHeading>
          </div>
          <div className="space-y-3">
            {FAQ.map((f) => <FaqItem key={f.q} q={f.q} a={f.a} />)}
          </div>
        </div>
      </section>

      {/* ══ ORGANIZER CTA ════════════════════════════════════════════════════ */}
      <section className="relative z-10 py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div
            className="rounded-3xl p-10 sm:p-14 text-center relative overflow-hidden"
            style={{ ...glassCard, boxShadow: "0 8px 48px rgba(0,0,0,0.3)" }}
          >
            <div className="absolute inset-0 pointer-events-none rounded-3xl" style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(200,131,74,0.1), transparent 60%)" }} />
            <div className="relative z-10">
              <SectionBadge icon="Users">Для организаторов</SectionBadge>
              <h2 className="text-3xl sm:text-4xl font-extrabold mb-4" style={{ background: "linear-gradient(135deg,#EDE0CC,#C8834A)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Проведи свою встречу
              </h2>
              <p className="max-w-lg mx-auto mb-8 text-sm" style={{ color: "rgba(217,237,232,0.5)" }}>
                Стань организатором — создавай события и собирай свою аудиторию. Платформа берёт на себя запись, оплату и коммуникацию.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <a
                  href={ORGANIZER_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 px-8 py-3 rounded-full font-semibold text-white transition-all hover:brightness-110 hover:scale-105"
                  style={{ background: "linear-gradient(90deg,#C8834A,#8FA89A)", boxShadow: "0 0 32px rgba(200,131,74,0.25)" }}
                >
                  <Icon name="MessageCircle" size={18} />
                  Написать организатору
                </a>
                <Link
                  to="/organizer-cabinet"
                  className="flex items-center gap-2 px-8 py-3 rounded-full font-semibold transition-all hover:brightness-110"
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

      {/* ══ FOOTER ═══════════════════════════════════════════════════════════ */}
      <footer
        className="relative z-10 py-12 px-4"
        style={{ borderTop: "1px solid rgba(237,224,204,0.08)" }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row gap-10 justify-between mb-10">
            <div className="max-w-xs">
              <img
                src="https://cdn.poehali.dev/projects/b2cfdb9f-e5f2-4dd1-84cb-905733c4941c/bucket/fc7c6e03-06e9-49ae-b205-37526a96596b.png"
                alt="СПАРКОМ"
                className="h-8 w-auto object-contain mb-4"
              />
              <p className="text-sm leading-relaxed" style={{ color: "rgba(217,237,232,0.4)" }}>
                Банный агрегатор событий Москвы. Встречи у пара, огня и тепла. Без алкоголя, с уважением к каждому.
              </p>
              <div className="flex items-center gap-3 mt-5">
                <a
                  href={TELEGRAM_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:brightness-125"
                  style={{ background: "rgba(200,131,74,0.15)", border: "1px solid rgba(200,131,74,0.25)" }}
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="#C8834A"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/></svg>
                </a>
              </div>
            </div>

            <div className="flex flex-wrap gap-12">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "rgba(200,131,74,0.65)" }}>Проект</div>
                <div className="space-y-2.5">
                  {[["Афиша", "/events"], ["Мастера", "/masters"], ["Бани", "/baths"], ["Блог", "/blog"], ["О нас", "/about"]].map(([l, h]) => (
                    <Link key={h} to={h} className="block text-sm transition-colors hover:text-white" style={{ color: "rgba(217,237,232,0.4)" }}>{l}</Link>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "rgba(200,131,74,0.65)" }}>Участникам</div>
                <div className="space-y-2.5">
                  {[["Войти", "/login"], ["Регистрация", "/register"], ["Личный кабинет", "/account"], ["Принципы", "/principles"]].map(([l, h]) => (
                    <Link key={h} to={h} className="block text-sm transition-colors hover:text-white" style={{ color: "rgba(217,237,232,0.4)" }}>{l}</Link>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "rgba(200,131,74,0.65)" }}>Организаторам</div>
                <div className="space-y-2.5">
                  {[["Стать организатором", "/organizer"], ["Личный кабинет", "/organizer-cabinet"], ["Руководство мастера", "/steam-master-guide"]].map(([l, h]) => (
                    <Link key={h} to={h} className="block text-sm transition-colors hover:text-white" style={{ color: "rgba(217,237,232,0.4)" }}>{l}</Link>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div
            className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs"
            style={{ borderTop: "1px solid rgba(237,224,204,0.07)", color: "rgba(217,237,232,0.22)" }}
          >
            <span>© 2026 СПАРКОМ — Банный агрегатор событий</span>
            <div className="flex gap-5">
              <Link to="/documents?tab=privacy" className="hover:text-white transition-colors">Политика конфиденциальности</Link>
              <Link to="/documents?tab=terms" className="hover:text-white transition-colors">Условия использования</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
