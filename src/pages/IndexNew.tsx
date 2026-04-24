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

// ─── Утилиты ─────────────────────────────────────────────────────────────────
function spotsInfo(left: number, total: number) {
  if (left === 0) return { text: "Мест нет", cls: "text-red-400" };
  if (left <= 2) return { text: `Осталось ${left}`, cls: "text-orange-400" };
  return { text: `${left} из ${total}`, cls: "text-emerald-400" };
}

function SpotsBar({ left, total }: { left: number; total: number }) {
  const pct = total > 0 ? Math.round(((total - left) / total) * 100) : 100;
  const color = left === 0 ? "bg-red-400" : left <= 2 ? "bg-orange-400" : "bg-emerald-400";
  return (
    <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.12)" }}>
      <div className={`h-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ─── Netflix grid-карточка ────────────────────────────────────────────────────
function NetflixGridCard({ event }: { event: EventItem }) {
  const [hovered, setHovered] = useState(false);
  const dateObj = parseISO(event.date);
  const dateStr = format(dateObj, "d MMM, EEE", { locale: ru });
  const sp = spotsInfo(event.spotsLeft, event.totalSpots);
  const sold = event.spotsLeft === 0;

  return (
    <Link
      to={`/events/${event.slug}`}
      className="group relative block rounded-2xl overflow-hidden cursor-pointer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image */}
      <div className="relative h-52 sm:h-56">
        {event.image ? (
          <img
            src={event.image}
            alt={event.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full" style={{ background: "linear-gradient(135deg,rgba(200,131,74,0.35),rgba(143,168,154,0.2))" }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

        {/* Badges top */}
        {event.featured && (
          <div className="absolute top-3 left-3 bg-yellow-400 text-black text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">ТОП</div>
        )}
        <div className="absolute top-3 right-3">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(200,131,74,0.85)", color: "#fff" }}>{event.type}</span>
        </div>

        {/* Bottom info */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="flex items-center justify-between text-xs mb-1" style={{ color: "rgba(255,255,255,0.55)" }}>
            <span>{dateStr}, {event.timeStart}</span>
            <span className={`font-semibold ${sp.cls}`}>{sp.text}</span>
          </div>
          <p className="font-semibold text-sm leading-snug mb-1 line-clamp-2 text-white">{event.title}</p>
          <div className="flex items-center justify-between">
            <span className="text-white/50 text-xs flex items-center gap-1">
              <Icon name="MapPin" size={11} />{event.bathName ?? "—"}
            </span>
            <span className="font-bold text-sm" style={{ color: "#C8834A" }}>{event.priceLabel}</span>
          </div>
        </div>
      </div>

      {/* Hover-оверлей */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center gap-3 transition-opacity duration-200 rounded-2xl"
        style={{ background: "rgba(0,0,0,0.7)", opacity: hovered ? 1 : 0 }}
      >
        <span className="text-white font-bold rounded-full px-6 py-2 text-sm" style={{ background: sold ? "rgba(255,255,255,0.15)" : "linear-gradient(90deg,#C8834A,#8FA89A)" }}>
          {sold ? "Мест нет" : "Подробнее →"}
        </span>
        {event.priceLabel && !sold && (
          <span className="font-bold text-lg" style={{ color: "#C8834A" }}>{event.priceLabel}</span>
        )}
      </div>

      {/* Spots bar */}
      <div className="px-0 pt-0">
        <SpotsBar left={event.spotsLeft} total={event.totalSpots} />
      </div>
    </Link>
  );
}

// ─── Netflix list-карточка ────────────────────────────────────────────────────
function NetflixListCard({ event }: { event: EventItem }) {
  const [hovered, setHovered] = useState(false);
  const dateObj = parseISO(event.date);
  const dateStr = format(dateObj, "d MMMM, EEEE", { locale: ru });
  const sp = spotsInfo(event.spotsLeft, event.totalSpots);
  const sold = event.spotsLeft === 0;

  return (
    <Link
      to={`/events/${event.slug}`}
      className="group block"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="flex gap-4 rounded-2xl overflow-hidden transition-all duration-300"
        style={{
          background: hovered ? "rgba(237,224,204,0.09)" : "rgba(237,224,204,0.05)",
          border: "1px solid rgba(237,224,204,0.1)",
          transform: hovered ? "translateX(4px)" : "translateX(0)",
          boxShadow: hovered ? "0 8px 32px rgba(0,0,0,0.4)" : "none",
        }}
      >
        {/* Thumb */}
        <div className="relative flex-shrink-0 w-32 sm:w-40 h-24 sm:h-28 overflow-hidden">
          {event.image ? (
            <img src={event.image} alt={event.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
          ) : (
            <div className="w-full h-full" style={{ background: "linear-gradient(135deg,rgba(200,131,74,0.3),rgba(143,168,154,0.15))" }} />
          )}
          {event.featured && (
            <div className="absolute top-2 left-2 bg-yellow-400 text-black text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase">ТОП</div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 py-3 pr-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(200,131,74,0.2)", color: "#C8834A" }}>{event.type}</span>
              <span className={`text-xs font-medium ${sp.cls}`}>{sp.text}</span>
            </div>
            <h3 className="font-semibold text-sm leading-snug line-clamp-2 text-white mb-1">{event.title}</h3>
            <div className="flex flex-wrap gap-x-3 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
              <span className="flex items-center gap-1"><Icon name="Calendar" size={11} />{dateStr}</span>
              <span className="flex items-center gap-1"><Icon name="Clock" size={11} />{event.timeStart}</span>
              {event.bathName && <span className="flex items-center gap-1"><Icon name="MapPin" size={11} />{event.bathName}</span>}
            </div>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="font-bold text-sm" style={{ color: "#C8834A" }}>{event.priceLabel}</span>
            <span
              className="text-xs font-semibold px-3 py-1 rounded-full transition-all duration-200"
              style={hovered && !sold
                ? { background: "linear-gradient(90deg,#C8834A,#8FA89A)", color: "#fff" }
                : { background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.4)" }
              }
            >
              {sold ? "Занято" : "Подробнее →"}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}





// ─── Главная страница ─────────────────────────────────────────────────────────
export default function IndexNew() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
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
    return events
      .filter((e) => selectedType === "all" || e.type === selectedType)
      .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
  }, [events, selectedType]);

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
        <div className="max-w-6xl mx-auto flex items-center gap-6">
          <Link to="/" className="flex-shrink-0">
            <img
              src="https://cdn.poehali.dev/projects/b2cfdb9f-e5f2-4dd1-84cb-905733c4941c/bucket/fc7c6e03-06e9-49ae-b205-37526a96596b.png"
              alt="СПАРКОМ"
              className="h-8 w-auto object-contain"
            />
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm flex-1">
            {[["Афиша", "/events"], ["Мастера", "/masters"], ["Бани", "/baths"], ["Блог", "/blog"]].map(([l, h]) => (
              <Link key={h} to={h} className="hover:text-white transition-colors" style={{ color: "rgba(237,224,204,0.55)" }}>{l}</Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-2 flex-shrink-0">
            <Link to="/login" className="text-sm px-4 py-1.5 rounded-full transition-all hover:brightness-110" style={{ color: "#EDE0CC", border: "1px solid rgba(237,224,204,0.18)", background: "rgba(237,224,204,0.05)" }}>Войти</Link>
          </div>

          <button className="md:hidden flex-shrink-0 p-2 ml-auto" style={{ color: "#EDE0CC" }} onClick={() => setMenuOpen(!menuOpen)}>
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

      {/* ══ HERO + EVENTS — единый экран ════════════════════════════════════ */}
      <section className="relative z-10 overflow-hidden" style={{ minHeight: "100vh" }}>
        {/* Фоновое фото на весь экран */}
        <div className="absolute inset-0">
          <img
            src="https://cdn.poehali.dev/projects/b2cfdb9f-e5f2-4dd1-84cb-905733c4941c/files/69533be6-e8cd-4137-89eb-a06d187922f4.jpg"
            alt=""
            className="w-full h-full object-cover"
            style={{ opacity: 0.22 }}
          />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(26,20,16,0.2) 0%, rgba(26,20,16,0.5) 45%, #1a1410 80%)" }} />
        </div>

        {/* Текст Hero — верхняя половина */}
        <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 pt-16 pb-10">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm mb-6"
            style={{ background: "rgba(200,131,74,0.15)", border: "1px solid rgba(200,131,74,0.3)", color: "#C8834A" }}
          >
            <Icon name="Flame" size={14} />
            Банный агрегатор событий Москвы
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.08] tracking-tight mb-4">
            <span style={{ background: "linear-gradient(135deg, #EDE0CC 15%, #C8834A 55%, #8FA89A 90%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              В баню можно идти одному.
            </span>
          </h1>

          <p className="text-base sm:text-lg max-w-lg mx-auto mb-7 leading-relaxed" style={{ color: "rgba(217,237,232,0.58)" }}>
            Организованные банные встречи — спокойно, трезво, с уважением к каждому.
          </p>

          <div className="flex flex-wrap gap-3 justify-center mb-6">
            <a
              href={TELEGRAM_URL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-white text-sm transition-all hover:brightness-110 hover:scale-105"
              style={{ background: "linear-gradient(90deg,#C8834A,#8FA89A)", boxShadow: "0 0 28px rgba(200,131,74,0.3)" }}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/></svg>
              Расписание в Telegram
            </a>
          </div>

          {/* Stats mini */}
          <div className="flex flex-wrap justify-center gap-7">
            {[{ val: "50+", label: "встреч" }, { val: "700+", label: "участников" }, { val: "12+", label: "форматов" }, { val: "8+", label: "площадок" }].map(({ val, label }) => (
              <div key={label} className="text-center">
                <div className="text-2xl font-bold" style={{ background: "linear-gradient(135deg,#C8834A,#8FA89A)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{val}</div>
                <div className="text-xs" style={{ color: "rgba(217,237,232,0.3)" }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Карточки начинаются на нижней половине первого экрана ─────────── */}
        <div className="relative z-10 px-4 sm:px-6">
          {/* Фильтры + view toggle */}
          <div className="flex items-center gap-3 mb-5 flex-wrap">
            <div className="flex items-center gap-2 overflow-x-auto flex-1" style={{ scrollbarWidth: "none" }}>
              {eventTypes.map((t) => (
                <button
                  key={t}
                  onClick={() => setSelectedType(t)}
                  className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200"
                  style={selectedType === t
                    ? { background: "white", color: "#0f0f0f", fontWeight: 700 }
                    : { background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.1)" }
                  }
                >
                  {t === "all" ? "Все" : t}
                </button>
              ))}
            </div>

            {/* View toggle — точь-в-точь как events-demo */}
            <div className="flex-shrink-0 flex gap-1 rounded-xl p-1" style={{ background: "rgba(255,255,255,0.08)" }}>
              <button
                onClick={() => setView("grid")}
                className="p-2 rounded-lg transition-all duration-200"
                style={view === "grid"
                  ? { background: "rgba(200,131,74,0.3)", color: "#C8834A" }
                  : { color: "rgba(255,255,255,0.35)" }
                }
              >
                <Icon name="LayoutGrid" size={16} />
              </button>
              <button
                onClick={() => setView("list")}
                className="p-2 rounded-lg transition-all duration-200"
                style={view === "list"
                  ? { background: "rgba(200,131,74,0.3)", color: "#C8834A" }
                  : { color: "rgba(255,255,255,0.35)" }
                }
              >
                <Icon name="List" size={16} />
              </button>
            </div>
          </div>

          {/* Карточки */}
          {loading ? (
            <div className="flex items-center justify-center py-24" style={{ color: "rgba(217,237,232,0.4)" }}>
              <Icon name="Loader2" size={32} className="animate-spin mr-3" />
              Загрузка встреч...
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20" style={{ color: "rgba(217,237,232,0.35)" }}>
              <Icon name="CalendarX" size={48} className="mx-auto mb-4 opacity-30" />
              <p className="text-lg mb-2">Встреч не найдено</p>
              <button onClick={() => setSelectedType("all")} className="text-sm underline underline-offset-4" style={{ color: "#C8834A" }}>Сбросить</button>
            </div>
          ) : view === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((e) => <NetflixGridCard key={e.slug} event={e} />)}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((e) => <NetflixListCard key={e.slug} event={e} />)}
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