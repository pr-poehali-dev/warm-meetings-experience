import { useState, useMemo } from "react";
import Icon from "@/components/ui/icon";
import { Link } from "react-router-dom";
import { parseISO } from "date-fns";

const MOCK_EVENTS = [
  {
    slug: "banya-meditaciya-aprel",
    title: "Баня с паром и медитацией",
    short_description: "Глубокое расслабление через пар, дыхание и тишину. Ограниченная группа.",
    event_date: "2026-05-03",
    start_time: "11:00",
    end_time: "15:00",
    event_type: "медитация",
    event_type_icon: "Wind",
    bath_name: "Сокольники Spa",
    bath_address: "ул. Сокольнический вал, 1",
    price_label: "3 500 ₽",
    total_spots: 12,
    spots_left: 4,
    image_url: "",
    featured: true,
    color: "from-violet-500 to-purple-700",
    glow: "shadow-violet-500/30",
  },
  {
    slug: "muzh-biznes-banya-may",
    title: "Мужская бизнес-баня",
    short_description: "Нетворкинг, пар и восстановление. Встречи предпринимателей в неформальной обстановке.",
    event_date: "2026-05-10",
    start_time: "18:00",
    end_time: "22:00",
    event_type: "нетворкинг",
    event_type_icon: "Briefcase",
    bath_name: "Боярские бани",
    bath_address: "Боярский пер., 6",
    price_label: "5 000 ₽",
    total_spots: 20,
    spots_left: 11,
    image_url: "",
    featured: false,
    color: "from-amber-500 to-orange-600",
    glow: "shadow-amber-500/30",
  },
  {
    slug: "zhenskiy-detoks-may",
    title: "Женский детокс-вечер",
    short_description: "Вечер заботы, хамам, ароматерапия и живая музыка. Только для женщин.",
    event_date: "2026-05-17",
    start_time: "19:00",
    end_time: "23:00",
    event_type: "детокс",
    event_type_icon: "Sparkles",
    bath_name: "Сандуны",
    bath_address: "Неглинная ул., 14",
    price_label: "4 200 ₽",
    total_spots: 15,
    spots_left: 2,
    image_url: "",
    featured: false,
    color: "from-rose-400 to-pink-600",
    glow: "shadow-rose-500/30",
  },
  {
    slug: "par-zvuk-lyubov",
    title: "Пар. Звук. Любовь",
    short_description: "Банная вечеринка со звуковыми практиками, живой музыкой и котлом с травами.",
    event_date: "2026-05-24",
    start_time: "20:00",
    end_time: "01:00",
    event_type: "вечеринка",
    event_type_icon: "Music",
    bath_name: "Ржевские бани",
    bath_address: "Ржевский пер., 8",
    price_label: "6 000 ₽",
    total_spots: 30,
    spots_left: 18,
    image_url: "",
    featured: true,
    color: "from-cyan-400 to-blue-600",
    glow: "shadow-cyan-400/30",
  },
  {
    slug: "astrobanya-iyun",
    title: "АстроБаня: Тепло для тела и души",
    short_description: "Астрологическая баня — гороскоп встречи, пар по знаку зодиака, разбор натальной карты.",
    event_date: "2026-06-07",
    start_time: "16:00",
    end_time: "21:00",
    event_type: "знакомство",
    event_type_icon: "Star",
    bath_name: "Термы Москвы",
    bath_address: "Новослободская ул., 3",
    price_label: "3 800 ₽",
    total_spots: 10,
    spots_left: 7,
    image_url: "",
    featured: false,
    color: "from-indigo-400 to-violet-600",
    glow: "shadow-indigo-400/30",
  },
  {
    slug: "zimnyaya-proruby",
    title: "Зимняя баня + прорубь",
    short_description: "Контрастное закаливание, горячий пар, ледяная купель и горячий сбитень.",
    event_date: "2026-06-14",
    start_time: "09:00",
    end_time: "13:00",
    event_type: "закаливание",
    event_type_icon: "Snowflake",
    bath_name: "Сокольники Spa",
    bath_address: "ул. Сокольнический вал, 1",
    price_label: "2 900 ₽",
    total_spots: 8,
    spots_left: 0,
    image_url: "",
    featured: false,
    color: "from-sky-400 to-teal-600",
    glow: "shadow-sky-400/30",
  },
];

const TYPES = ["все", "медитация", "нетворкинг", "детокс", "вечеринка", "знакомство", "закаливание"];

const MONTHS: Record<string, string> = {
  "01": "янв", "02": "фев", "03": "мар", "04": "апр",
  "05": "май", "06": "июн", "07": "июл", "08": "авг",
  "09": "сен", "10": "окт", "11": "ноя", "12": "дек",
};

function formatDate(dateStr: string) {
  const [, m, d] = dateStr.split("-");
  return { day: d, month: MONTHS[m] };
}

function SpotsBar({ total, left }: { total: number; left: number }) {
  const pct = total > 0 ? Math.round(((total - left) / total) * 100) : 100;
  const color = left === 0 ? "bg-red-400" : left <= 3 ? "bg-amber-400" : "bg-emerald-400";
  return (
    <div className="mt-3">
      <div className="flex justify-between text-xs mb-1" style={{ color: "rgba(255,255,255,0.6)" }}>
        <span>{left === 0 ? "Мест нет" : `Осталось ${left} из ${total}`}</span>
        <span>{pct}% занято</span>
      </div>
      <div className="h-1 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }}>
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%`, transition: "width 0.6s ease" }} />
      </div>
    </div>
  );
}

function GlassEventCard({ event, featured }: { event: typeof MOCK_EVENTS[0]; featured?: boolean }) {
  const { day, month } = formatDate(event.event_date);
  const sold = event.spots_left === 0;
  const few = !sold && event.spots_left <= 3;

  return (
    <div
      className={`relative group rounded-2xl overflow-hidden transition-all duration-500 hover:-translate-y-1 hover:scale-[1.01] ${featured ? "sm:col-span-2" : ""}`}
      style={{
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.12)",
        backdropFilter: "blur(16px)",
        boxShadow: `0 8px 40px rgba(0,0,0,0.3)`,
      }}
    >
      {/* Gradient accent top */}
      <div className={`h-1 w-full bg-gradient-to-r ${event.color}`} />

      <div className={`p-5 ${featured ? "sm:flex sm:gap-6" : ""}`}>
        {/* Date badge */}
        <div className={`flex-shrink-0 ${featured ? "sm:w-20" : ""}`}>
          <div
            className={`inline-flex flex-col items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br ${event.color} ${event.glow} shadow-lg mb-3 sm:mb-0`}
          >
            <span className="text-white font-bold text-xl leading-none">{day}</span>
            <span className="text-white/80 text-xs uppercase tracking-wider">{month}</span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          {/* Tags row */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span
              className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.8)" }}
            >
              <Icon name={event.event_type_icon as "Star"} size={11} />
              {event.event_type}
            </span>
            {sold && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-500/20 text-red-300 border border-red-500/30">
                Мест нет
              </span>
            )}
            {few && !sold && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                Мало мест
              </span>
            )}
            {event.featured && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-violet-500/20 text-violet-300 border border-violet-500/30">
                ⭐ Топ
              </span>
            )}
          </div>

          {/* Title */}
          <h3
            className={`font-bold leading-tight mb-1 ${featured ? "text-xl" : "text-base"}`}
            style={{ color: "rgba(255,255,255,0.95)" }}
          >
            {event.title}
          </h3>

          {/* Description (featured only) */}
          {featured && (
            <p className="text-sm mb-3 line-clamp-2" style={{ color: "rgba(255,255,255,0.6)" }}>
              {event.short_description}
            </p>
          )}

          {/* Meta */}
          <div className="flex flex-wrap gap-3 text-xs mb-3" style={{ color: "rgba(255,255,255,0.55)" }}>
            <span className="flex items-center gap-1">
              <Icon name="Clock" size={12} />
              {event.start_time}–{event.end_time}
            </span>
            <span className="flex items-center gap-1">
              <Icon name="MapPin" size={12} />
              {event.bath_name}
            </span>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3">
            <span className="font-bold text-lg" style={{ color: "rgba(255,255,255,0.95)" }}>
              {event.price_label}
            </span>
            <Link
              to={`/events/${event.slug}`}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-200 ${
                sold
                  ? "opacity-40 cursor-not-allowed pointer-events-none bg-white/10 text-white/50"
                  : `bg-gradient-to-r ${event.color} text-white shadow-lg hover:shadow-xl hover:brightness-110`
              }`}
            >
              {sold ? "Занято" : "Записаться"}
            </Link>
          </div>

          <SpotsBar total={event.total_spots} left={event.spots_left} />
        </div>
      </div>

      {/* Hover glow overlay */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-500 rounded-2xl"
        style={{ background: `radial-gradient(circle at 50% 0%, rgba(255,255,255,0.04), transparent 70%)` }}
      />
    </div>
  );
}

export default function EventsGlassDemo() {
  const [activeType, setActiveType] = useState("все");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return MOCK_EVENTS.filter((e) => {
      if (activeType !== "все" && e.event_type !== activeType) return false;
      if (search && !e.title.toLowerCase().includes(search.toLowerCase()) && !e.bath_name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [activeType, search]);

  const stats = {
    total: MOCK_EVENTS.length,
    available: MOCK_EVENTS.filter((e) => e.spots_left > 0).length,
    baths: [...new Set(MOCK_EVENTS.map((e) => e.bath_name))].length,
  };

  return (
    <div
      className="min-h-screen relative"
      style={{
        background: "linear-gradient(135deg, #0f0c29 0%, #1a1040 30%, #24243e 60%, #0d1b2a 100%)",
      }}
    >
      {/* Ambient orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute rounded-full blur-3xl opacity-20"
          style={{
            width: 600, height: 600,
            top: -100, left: -200,
            background: "radial-gradient(circle, #7c3aed, transparent)",
          }}
        />
        <div
          className="absolute rounded-full blur-3xl opacity-15"
          style={{
            width: 500, height: 500,
            top: 200, right: -150,
            background: "radial-gradient(circle, #06b6d4, transparent)",
          }}
        />
        <div
          className="absolute rounded-full blur-3xl opacity-10"
          style={{
            width: 400, height: 400,
            bottom: 100, left: "40%",
            background: "radial-gradient(circle, #f59e0b, transparent)",
          }}
        />
      </div>

      {/* Header */}
      <header
        className="sticky top-0 z-50 px-4 py-3"
        style={{
          background: "rgba(15, 12, 41, 0.7)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #7c3aed, #06b6d4)" }}
            >
              <Icon name="Flame" size={16} className="text-white" />
            </div>
            <span className="font-bold text-white text-lg tracking-tight">СПАРКОМ</span>
          </div>

          {/* Search */}
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full flex-1 max-w-xs"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
          >
            <Icon name="Search" size={14} className="text-white/40 flex-shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск встреч..."
              className="bg-transparent text-sm outline-none flex-1 min-w-0"
              style={{ color: "rgba(255,255,255,0.8)" }}
            />
          </div>

          <nav className="hidden md:flex items-center gap-4 text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
            <a href="#" className="hover:text-white transition-colors">О нас</a>
            <a href="#" className="hover:text-white transition-colors">Блог</a>
            <button
              className="px-4 py-1.5 rounded-full text-sm font-medium text-white transition-all hover:brightness-110"
              style={{ background: "linear-gradient(90deg, #7c3aed, #06b6d4)" }}
            >
              Войти
            </button>
          </nav>
        </div>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm mb-6"
            style={{
              background: "rgba(124,58,237,0.2)",
              border: "1px solid rgba(124,58,237,0.4)",
              color: "#a78bfa",
            }}
          >
            <Icon name="Sparkles" size={13} />
            Банный агрегатор событий
          </div>

          <h1
            className="text-4xl sm:text-6xl font-extrabold tracking-tight mb-4 leading-tight"
            style={{
              background: "linear-gradient(135deg, #fff 20%, #a78bfa 60%, #67e8f9 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Найди свою баню
          </h1>

          <p className="text-lg max-w-xl mx-auto" style={{ color: "rgba(255,255,255,0.55)" }}>
            Встречи, практики и вечеринки в лучших банях Москвы.
            <br />
            Выбирай — записывайся — наслаждайся.
          </p>

          {/* Stats */}
          <div className="flex justify-center gap-8 mt-8">
            {[
              { val: stats.total, label: "событий" },
              { val: stats.available, label: "с местами" },
              { val: stats.baths, label: "площадки" },
            ].map(({ val, label }) => (
              <div key={label} className="text-center">
                <div
                  className="text-3xl font-bold"
                  style={{
                    background: "linear-gradient(135deg, #a78bfa, #67e8f9)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  {val}
                </div>
                <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Filter pills */}
        <div className="flex flex-wrap gap-2 mb-8 justify-center">
          {TYPES.map((t) => {
            const active = activeType === t;
            return (
              <button
                key={t}
                onClick={() => setActiveType(t)}
                className="px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-all duration-200"
                style={
                  active
                    ? {
                        background: "linear-gradient(90deg, #7c3aed, #06b6d4)",
                        color: "#fff",
                        boxShadow: "0 0 20px rgba(124,58,237,0.5)",
                      }
                    : {
                        background: "rgba(255,255,255,0.07)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        color: "rgba(255,255,255,0.6)",
                      }
                }
              >
                {t}
              </button>
            );
          })}
        </div>

        {/* Cards grid */}
        {filtered.length > 0 ? (
          <div className="grid sm:grid-cols-2 gap-5">
            {filtered.map((ev, i) => (
              <GlassEventCard key={ev.slug} event={ev} featured={i === 0 && ev.featured} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20" style={{ color: "rgba(255,255,255,0.4)" }}>
            <Icon name="SearchX" size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-lg">Ничего не найдено</p>
            <button
              onClick={() => { setActiveType("все"); setSearch(""); }}
              className="mt-4 text-sm underline underline-offset-4"
              style={{ color: "#a78bfa" }}
            >
              Сбросить фильтры
            </button>
          </div>
        )}

        {/* CTA */}
        <div
          className="mt-16 rounded-2xl p-8 text-center"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
            backdropFilter: "blur(12px)",
          }}
        >
          <div
            className="text-2xl font-bold mb-2"
            style={{
              background: "linear-gradient(135deg, #fff, #a78bfa)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Проведи своё событие
          </div>
          <p className="mb-6 text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
            Стань организатором — создавай встречи и собирай свою аудиторию
          </p>
          <button
            className="px-8 py-3 rounded-full font-semibold text-white transition-all hover:brightness-110 hover:scale-105"
            style={{ background: "linear-gradient(90deg, #7c3aed, #06b6d4)", boxShadow: "0 0 30px rgba(124,58,237,0.4)" }}
          >
            <Icon name="CalendarPlus" size={16} className="inline mr-2" />
            Создать событие
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer
        className="relative z-10 mt-12 py-8 text-center text-sm"
        style={{
          borderTop: "1px solid rgba(255,255,255,0.07)",
          color: "rgba(255,255,255,0.3)",
        }}
      >
        © 2026 СПАРКОМ — Банный агрегатор
      </footer>
    </div>
  );
}
