import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { EventItem } from "@/data/events";
import { TELEGRAM_URL } from "@/lib/constants";
import EventCalendar from "@/components/events/EventCalendar";
import { NetflixGridCard, NetflixListCard } from "./IndexShared";

interface Props {
  events: EventItem[];
  filtered: EventItem[];
  loading: boolean;
  selectedType: string;
  setSelectedType: (t: string) => void;
  view: "grid" | "list" | "calendar";
  setView: (v: "grid" | "list" | "calendar") => void;
  eventTypes: string[];
  calendarDate: Date | undefined;
  setCalendarDate: (d: Date | undefined) => void;
}

export default function IndexHeroSection({
  events,
  filtered,
  loading,
  selectedType,
  setSelectedType,
  view,
  setView,
  eventTypes,
  calendarDate,
  setCalendarDate,
}: Props) {
  return (
    <section data-hero className="relative z-10 overflow-hidden" style={{ minHeight: "100vh" }}>
      <div className="absolute inset-0">
        <img
          src="https://cdn.poehali.dev/projects/b2cfdb9f-e5f2-4dd1-84cb-905733c4941c/files/69533be6-e8cd-4137-89eb-a06d187922f4.jpg"
          alt=""
          className="w-full h-full object-cover transition-opacity duration-500"
          style={{ opacity: "var(--hero-img-opacity)" as unknown as number }}
        />
        <div className="absolute inset-0 transition-all duration-500" style={{ background: "var(--hero-overlay1)" }} />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 pt-24 pb-10">
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm mb-6"
          style={{ background: "rgba(200,131,74,0.15)", border: "1px solid rgba(200,131,74,0.3)", color: "var(--c-terra)" }}
        >
          <Icon name="Flame" size={14} />
          Банный агрегатор событий Москвы
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.08] tracking-tight mb-4">
          <span style={{ background: "linear-gradient(135deg, var(--hero-text-from) 15%, #C8834A 55%, #8FA89A 90%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            В баню можно идти одному.
          </span>
        </h1>

        <p className="text-base sm:text-lg max-w-lg mx-auto mb-7 leading-relaxed" style={{ color: "var(--c-text)" }}>
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

        <div className="flex flex-wrap justify-center gap-7">
          {[{ val: "50+", label: "встреч" }, { val: "700+", label: "участников" }, { val: "12+", label: "форматов" }, { val: "8+", label: "площадок" }].map(({ val, label }) => (
            <div key={label} className="text-center">
              <div className="text-2xl font-bold" style={{ background: "linear-gradient(135deg,#C8834A,#8FA89A)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{val}</div>
              <div className="text-xs" style={{ color: "var(--c-stat-muted)" }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-10 sm:px-6 max-w-6xl mx-auto px-[21px] py-[29px]">
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <div className="flex items-center gap-2 overflow-x-auto flex-1" style={{ scrollbarWidth: "none" }}>
            {eventTypes.map((t) => (
              <button
                key={t}
                onClick={() => setSelectedType(t)}
                className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200"
                style={selectedType === t
                  ? { background: "var(--filter-active-bg)", color: "var(--filter-active-text)", fontWeight: 700 }
                  : { background: "var(--filter-idle-bg)", color: "var(--filter-idle-text)", border: "1px solid var(--filter-idle-border)" }
                }
              >
                {t === "all" ? "Все" : t}
              </button>
            ))}
          </div>

          <div className="flex-shrink-0 flex gap-1 rounded-xl p-1" style={{ background: "var(--toggle-bg)" }}>
            <button
              onClick={() => setView("grid")}
              className="p-2 rounded-lg transition-all duration-200"
              style={view === "grid"
                ? { background: "rgba(200,131,74,0.3)", color: "#C8834A" }
                : { color: "var(--toggle-idle)" }
              }
            >
              <Icon name="LayoutGrid" size={16} />
            </button>
            <button
              onClick={() => setView("list")}
              className="p-2 rounded-lg transition-all duration-200"
              style={view === "list"
                ? { background: "rgba(200,131,74,0.3)", color: "#C8834A" }
                : { color: "var(--toggle-idle)" }
              }
            >
              <Icon name="List" size={16} />
            </button>
            <button
              onClick={() => setView("calendar")}
              className="p-2 rounded-lg transition-all duration-200"
              style={view === "calendar"
                ? { background: "rgba(200,131,74,0.3)", color: "#C8834A" }
                : { color: "var(--toggle-idle)" }
              }
            >
              <Icon name="CalendarDays" size={16} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24" style={{ color: "var(--loading-text)" }}>
            <Icon name="Loader2" size={32} className="animate-spin mr-3" />
            Загрузка встреч...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20" style={{ color: "var(--empty-text)" }}>
            <Icon name="CalendarX" size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-lg mb-2">Встреч не найдено</p>
            <button onClick={() => setSelectedType("all")} className="text-sm underline underline-offset-4" style={{ color: "var(--c-terra)" }}>Сбросить</button>
          </div>
        ) : view === "calendar" ? (
          <EventCalendar
            events={events}
            selectedDate={calendarDate}
            onDateSelect={setCalendarDate}
            filterType={selectedType}
            themed
          />
        ) : view === "grid" ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.slice(0, 6).map((e) => <NetflixGridCard key={e.slug} event={e} />)}
            </div>
            {filtered.length > 6 && (
              <div className="flex justify-center mt-8">
                <Link
                  to="/events"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold text-white transition-all hover:brightness-110 hover:scale-105"
                  style={{ background: "linear-gradient(90deg,#C8834A,#8FA89A)", boxShadow: "0 0 28px rgba(200,131,74,0.3)" }}
                >
                  Посмотреть все события
                  <Icon name="ArrowRight" size={16} />
                </Link>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="space-y-3">
              {filtered.slice(0, 6).map((e) => <NetflixListCard key={e.slug} event={e} />)}
            </div>
            {filtered.length > 6 && (
              <div className="flex justify-center mt-8">
                <Link
                  to="/events"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold text-white transition-all hover:brightness-110 hover:scale-105"
                  style={{ background: "linear-gradient(90deg,#C8834A,#8FA89A)", boxShadow: "0 0 28px rgba(200,131,74,0.3)" }}
                >
                  Посмотреть все события
                  <Icon name="ArrowRight" size={16} />
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
