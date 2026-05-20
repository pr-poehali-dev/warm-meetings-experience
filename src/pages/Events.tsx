import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "next-themes";
import Icon from "@/components/ui/icon";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import EventCalendar from "@/components/events/EventCalendar";
import { EventItem, mapApiEvent, getTypeColors } from "@/data/events";
import { eventsApi } from "@/lib/api";
import { format, parseISO, isSameDay, startOfDay } from "date-fns";
import { ru } from "date-fns/locale";

const HERO_IMG = "https://cdn.poehali.dev/projects/b2cfdb9f-e5f2-4dd1-84cb-905733c4941c/files/9f246eac-a825-45e2-ade0-bb4f134c82d0.jpg";

const THEME_STYLES = `
  [data-events-theme="dark"] {
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
    --filter-active-bg: white;
    --filter-active-text: #0f0f0f;
    --filter-idle-bg: rgba(255,255,255,0.08);
    --filter-idle-text: rgba(255,255,255,0.65);
    --filter-idle-border: rgba(255,255,255,0.1);
    --card-bg: rgba(237,224,204,0.05);
    --card-border: rgba(237,224,204,0.1);
    --card-hover: rgba(237,224,204,0.09);
    --input-bg: rgba(255,255,255,0.06);
    --input-border: rgba(255,255,255,0.12);
    --input-text: rgba(217,237,232,0.8);
    --badge-bg: rgba(200,131,74,0.15);
    --badge-border: rgba(200,131,74,0.3);
    --toggle-bg: rgba(255,255,255,0.08);
    --toggle-active: white;
    --toggle-active-text: #0f0f0f;
    --toggle-idle-text: rgba(255,255,255,0.6);
  }
  [data-events-theme="light"] {
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
    --filter-active-bg: #2d2318;
    --filter-active-text: #fff;
    --filter-idle-bg: rgba(45,35,24,0.06);
    --filter-idle-text: rgba(45,35,24,0.65);
    --filter-idle-border: rgba(45,35,24,0.12);
    --card-bg: rgba(255,255,255,0.8);
    --card-border: rgba(200,131,74,0.15);
    --card-hover: rgba(200,131,74,0.07);
    --input-bg: rgba(255,255,255,0.9);
    --input-border: rgba(45,35,24,0.15);
    --input-text: #2d2318;
    --badge-bg: rgba(181,107,46,0.12);
    --badge-border: rgba(181,107,46,0.25);
    --toggle-bg: rgba(45,35,24,0.07);
    --toggle-active: #2d2318;
    --toggle-active-text: #fff;
    --toggle-idle-text: rgba(45,35,24,0.55);
  }
`;

const AVAILABILITY_OPTIONS = [
  { value: "all", label: "Все" },
  { value: "available", label: "Есть места" },
  { value: "few", label: "Мало мест" },
];

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

function spotsInfo(left: number, total: number) {
  if (left === 0) return { text: "Мест нет", color: "#ef4444", bg: "rgba(239,68,68,0.15)" };
  if (left <= 2) return { text: `Осталось ${left}`, color: "#fb923c", bg: "rgba(251,146,60,0.15)" };
  return { text: `${left} из ${total}`, color: "#10b981", bg: "rgba(16,185,129,0.15)" };
}

function EventCardGlass({ event }: { event: EventItem }) {
  const [hovered, setHovered] = useState(false);
  const placeholder = `https://placehold.co/600x400/2d1f14/8b7355?text=${encodeURIComponent(event.title)}`;
  const cover = event.image || placeholder;
  const spots = spotsInfo(event.spotsLeft, event.totalSpots);
  const dateObj = parseISO(event.date);
  const typeColors = getTypeColors(event.type);

  return (
    <Link
      to={`/events/${event.slug}`}
      className="group block rounded-2xl overflow-hidden transition-all duration-300"
      style={{
        ...glassCard,
        transform: hovered ? "translateY(-4px)" : "translateY(0)",
        boxShadow: hovered ? "0 20px 40px rgba(0,0,0,0.25)" : "none",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="relative h-52 overflow-hidden">
        <img
          src={cover}
          alt={event.title}
          className="w-full h-full object-cover transition-transform duration-500"
          style={{ transform: hovered ? "scale(1.06)" : "scale(1)" }}
        />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 60%)" }} />

        {/* Дата-плашка слева сверху */}
        <div
          className="absolute top-3 left-3 flex flex-col items-center justify-center px-2.5 py-1 rounded-xl min-w-[48px]"
          style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)" }}
        >
          <div className="text-[10px] uppercase font-semibold leading-none" style={{ color: "#C8834A" }}>
            {format(dateObj, "LLL", { locale: ru })}
          </div>
          <div className="text-lg font-extrabold leading-none mt-0.5" style={{ color: "#fff" }}>
            {format(dateObj, "d")}
          </div>
        </div>

        {/* Тип события справа сверху */}
        {event.type && (
          <div className="absolute top-3 right-3">
            <span
              className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full"
              style={{ background: "rgba(200,131,74,0.85)", backdropFilter: "blur(4px)", color: "#fff" }}
            >
              <Icon name={(event.typeIcon || "Sparkles") as "Sparkles"} size={11} />
              {event.type}
            </span>
          </div>
        )}

        {/* Цена слева снизу */}
        {event.priceLabel && (
          <div
            className="absolute bottom-3 left-3 text-sm font-bold px-3 py-1 rounded-full"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", color: "#FF6B1A" }}
          >
            {event.priceLabel}
          </div>
        )}

        {/* Время справа снизу */}
        {event.timeStart && (
          <div
            className="absolute bottom-3 right-3 inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full"
            style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)", color: "#fff" }}
          >
            <Icon name="Clock" size={11} />
            {event.timeStart}
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-bold text-base mb-2 line-clamp-2 leading-tight" style={{ color: "var(--c-cream)" }}>
          {event.title}
        </h3>

        {event.bathName && (
          <div className="flex items-center gap-1 text-xs mb-3" style={{ color: "var(--c-muted)" }}>
            <Icon name="MapPin" size={12} />
            <span className="truncate">{event.bathName}</span>
          </div>
        )}

        {event.description && (
          <p className="text-xs mb-3 line-clamp-2 leading-relaxed" style={{ color: "var(--c-text)" }}>
            {event.description}
          </p>
        )}

        <div className="flex items-center justify-between pt-3" style={{ borderTop: "1px solid var(--card-border)" }}>
          <span
            className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full"
            style={{ background: spots.bg, color: spots.color }}
          >
            <Icon name="Users" size={11} />
            {spots.text}
          </span>
          <span
            className="inline-flex items-center gap-1 text-xs font-semibold transition-transform"
            style={{ color: "var(--c-terra)", transform: hovered ? "translateX(2px)" : "translateX(0)" }}
          >
            Подробнее
            <Icon name="ArrowRight" size={12} />
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function Events() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted ? resolvedTheme === "dark" : true;

  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedBath, setSelectedBath] = useState("");
  const [selectedAvailability, setSelectedAvailability] = useState("all");
  const [calendarDate, setCalendarDate] = useState<Date | undefined>(undefined);
  const [view, setView] = useState<"list" | "calendar">("list");
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    eventsApi
      .getAll(true)
      .then((data) => setEvents(data.map(mapApiEvent)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const today = startOfDay(new Date());

  const upcomingEvents = useMemo(
    () => events.filter((e) => parseISO(e.date) >= today),
    [events, today],
  );

  const eventTypes = useMemo(
    () => [...new Set(upcomingEvents.map((e) => e.type).filter(Boolean))],
    [upcomingEvents],
  );
  const bathNames = useMemo(
    () => [...new Set(upcomingEvents.map((e) => e.bathName).filter(Boolean))],
    [upcomingEvents],
  );

  const filtered = useMemo(() => {
    return upcomingEvents
      .filter((e) => {
        if (search) {
          const q = search.toLowerCase();
          const inTitle = e.title.toLowerCase().includes(q);
          const inDesc = e.description?.toLowerCase().includes(q);
          const inBath = e.bathName?.toLowerCase().includes(q);
          if (!inTitle && !inDesc && !inBath) return false;
        }
        if (selectedType && e.type !== selectedType) return false;
        if (selectedBath && e.bathName !== selectedBath) return false;
        if (selectedAvailability === "available" && e.spotsLeft === 0) return false;
        if (selectedAvailability === "few" && (e.spotsLeft === 0 || e.spotsLeft > 3)) return false;
        if (calendarDate && !isSameDay(parseISO(e.date), calendarDate)) return false;
        return true;
      })
      .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
  }, [upcomingEvents, search, selectedType, selectedBath, selectedAvailability, calendarDate]);

  const hasActiveFilters = Boolean(search || selectedType || selectedBath || selectedAvailability !== "all" || calendarDate);

  const resetFilters = () => {
    setSearch("");
    setSelectedType("");
    setSelectedBath("");
    setSelectedAvailability("all");
    setCalendarDate(undefined);
  };

  return (
    <div
      data-events-theme={isDark ? "dark" : "light"}
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
      <section data-hero className="relative overflow-hidden" style={{ minHeight: "60vh" }}>
        <div className="absolute inset-0">
          <img
            src={HERO_IMG}
            alt=""
            className="w-full h-full object-cover"
            style={{ opacity: "var(--hero-img-opacity)" as unknown as number }}
          />
          <div className="absolute inset-0" style={{ background: "var(--hero-overlay)" }} />
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 pt-32 pb-16">
          <SectionBadge icon="CalendarDays">Афиша СПАРКОМ</SectionBadge>

          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight mb-4"
            style={{
              background: "linear-gradient(135deg, var(--c-cream) 20%, #C8834A 60%, #8FA89A 90%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            События
          </h1>

          <p className="text-base sm:text-lg max-w-xl mx-auto mb-8 leading-relaxed" style={{ color: "var(--c-text)" }}>
            Банные встречи, мастер-классы, парения и практики. Выбирайте формат
            и присоединяйтесь — одно нажатие, и вы в списке.
          </p>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-8">
            {[
              { val: `${upcomingEvents.length || "—"}`, label: "ближайших встреч" },
              { val: `${eventTypes.length || "—"}`, label: "форматов" },
              { val: `${bathNames.length || "—"}`, label: "площадок" },
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

      {/* Content */}
      <section className="relative z-10 px-4 sm:px-6 max-w-6xl mx-auto pb-20 pt-10">
        {/* Search + filters + view toggle */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--c-muted)" } as React.CSSProperties} />
            <input
              type="text"
              placeholder="Поиск по названию, бане, описанию..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all"
              style={{
                background: "var(--input-bg)",
                border: "1px solid var(--input-border)",
                color: "var(--input-text)",
              }}
            />
          </div>

          <button
            onClick={() => setFiltersOpen((v) => !v)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={filtersOpen || selectedType || selectedBath || selectedAvailability !== "all"
              ? { background: "var(--filter-active-bg)", color: "var(--filter-active-text)" }
              : { background: "var(--filter-idle-bg)", color: "var(--filter-idle-text)", border: "1px solid var(--filter-idle-border)" }
            }
          >
            <Icon name="SlidersHorizontal" size={15} />
            Фильтры
            {(selectedType || selectedBath || selectedAvailability !== "all") && (
              <span
                className="w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold"
                style={{ background: "var(--c-terra)", color: "#fff" }}
              >
                {[selectedType, selectedBath, selectedAvailability !== "all" ? "1" : ""].filter(Boolean).length}
              </span>
            )}
          </button>

          {/* View toggle */}
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--toggle-bg)" }}>
            <button
              onClick={() => setView("list")}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5"
              style={view === "list"
                ? { background: "var(--toggle-active)", color: "var(--toggle-active-text)" }
                : { color: "var(--toggle-idle-text)", background: "transparent" }
              }
            >
              <Icon name="LayoutGrid" size={14} />
              Список
            </button>
            <button
              onClick={() => setView("calendar")}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5"
              style={view === "calendar"
                ? { background: "var(--toggle-active)", color: "var(--toggle-active-text)" }
                : { color: "var(--toggle-idle-text)", background: "transparent" }
              }
            >
              <Icon name="CalendarDays" size={14} />
              Календарь
            </button>
          </div>

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="px-3 py-2.5 rounded-xl text-sm transition-all"
              style={{ color: "var(--c-terra)" }}
            >
              Сбросить
            </button>
          )}
        </div>

        {/* Filters panel */}
        {filtersOpen && (
          <div className="mb-6 p-5 rounded-2xl space-y-4" style={glassCard}>
            {eventTypes.length > 0 && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--c-muted)" }}>Формат</div>
                <div className="flex flex-wrap gap-2">
                  {eventTypes.map((t) => (
                    <button
                      key={t}
                      onClick={() => setSelectedType(selectedType === t ? "" : t)}
                      className="px-3 py-1.5 rounded-full text-sm transition-all"
                      style={selectedType === t
                        ? { background: "var(--filter-active-bg)", color: "var(--filter-active-text)" }
                        : { background: "var(--filter-idle-bg)", color: "var(--filter-idle-text)", border: "1px solid var(--filter-idle-border)" }
                      }
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {bathNames.length > 0 && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--c-muted)" }}>Площадка</div>
                <div className="flex flex-wrap gap-2">
                  {bathNames.map((b) => (
                    <button
                      key={b}
                      onClick={() => setSelectedBath(selectedBath === b ? "" : b)}
                      className="px-3 py-1.5 rounded-full text-sm transition-all"
                      style={selectedBath === b
                        ? { background: "var(--filter-active-bg)", color: "var(--filter-active-text)" }
                        : { background: "var(--filter-idle-bg)", color: "var(--filter-idle-text)", border: "1px solid var(--filter-idle-border)" }
                      }
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--c-muted)" }}>Места</div>
              <div className="flex flex-wrap gap-2">
                {AVAILABILITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setSelectedAvailability(opt.value)}
                    className="px-3 py-1.5 rounded-full text-sm transition-all"
                    style={selectedAvailability === opt.value
                      ? { background: "var(--filter-active-bg)", color: "var(--filter-active-text)" }
                      : { background: "var(--filter-idle-bg)", color: "var(--filter-idle-text)", border: "1px solid var(--filter-idle-border)" }
                    }
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {loading ? (
          <div className="flex items-center justify-center py-24" style={{ color: "var(--c-muted)" }}>
            <Icon name="Loader2" size={32} className="animate-spin mr-3" />
            Загрузка встреч...
          </div>
        ) : view === "calendar" ? (
          <div className="p-5 rounded-2xl" style={glassCard}>
            <EventCalendar
              events={upcomingEvents}
              selectedDate={calendarDate}
              onDateSelect={setCalendarDate}
              filterType={selectedType || "all"}
              filterBath={selectedBath || "all"}
              filterAvailability={selectedAvailability}
            />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20" style={{ color: "var(--c-muted)" }}>
            <Icon name="CalendarX" size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-lg mb-2">Встреч не найдено</p>
            <p className="text-sm mb-4">Попробуйте изменить фильтры или сбросить их</p>
            <button onClick={resetFilters} className="text-sm underline underline-offset-4" style={{ color: "var(--c-terra)" }}>
              Сбросить фильтры
            </button>
          </div>
        ) : (
          <>
            <div className="text-sm mb-5" style={{ color: "var(--c-muted)" }}>
              {filtered.length === upcomingEvents.length
                ? `${upcomingEvents.length} ближайших встреч`
                : `${filtered.length} из ${upcomingEvents.length}`}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((e) => <EventCardGlass key={e.slug} event={e} />)}
            </div>
          </>
        )}

        {/* Архив + CTA организатору */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            to="/events/past"
            className="group flex items-center justify-between p-5 rounded-2xl transition-all duration-300 hover:brightness-110"
            style={glassCard}
          >
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--c-terra)" }}>
                Архив
              </div>
              <div className="font-bold text-base" style={{ color: "var(--c-cream)" }}>
                Прошедшие встречи
              </div>
              <div className="text-xs mt-1" style={{ color: "var(--c-muted)" }}>
                Посмотрите, как проходили события раньше
              </div>
            </div>
            <Icon name="History" size={28} style={{ color: "var(--c-terra)" } as React.CSSProperties} />
          </Link>

          <Link
            to="/organizer"
            className="group flex items-center justify-between p-5 rounded-2xl transition-all duration-300 hover:brightness-110"
            style={glassCard}
          >
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--c-sage)" }}>
                Для организаторов
              </div>
              <div className="font-bold text-base" style={{ color: "var(--c-cream)" }}>
                Провести свою встречу
              </div>
              <div className="text-xs mt-1" style={{ color: "var(--c-muted)" }}>
                Создавайте события и собирайте свою аудиторию
              </div>
            </div>
            <Icon name="Sparkles" size={28} style={{ color: "var(--c-sage)" } as React.CSSProperties} />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
