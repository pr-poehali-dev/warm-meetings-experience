import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "next-themes";
import Icon from "@/components/ui/icon";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { mastersApi, Master, Specialization } from "@/lib/masters-api";

const HERO_IMG = "https://cdn.poehali.dev/projects/b2cfdb9f-e5f2-4dd1-84cb-905733c4941c/files/72d028d8-3078-4526-a1a8-54f4ac23a26e.jpg";

const THEME_STYLES = `
  [data-masters-theme="dark"] {
    --bg-page: linear-gradient(160deg, #1a1410 0%, #1c2018 35%, #14201c 65%, #101818 100%);
    --c-cream: #EDE0CC;
    --c-terra: #C8834A;
    --c-sage:  #8FA89A;
    --c-text:  rgba(217,237,232,0.6);
    --c-muted: rgba(217,237,232,0.45);
    --glass-bg: rgba(237,224,204,0.06);
    --glass-border: rgba(237,224,204,0.13);
    --hero-overlay: linear-gradient(to bottom, rgba(26,20,16,0.3) 0%, rgba(26,20,16,0.55) 50%, #1a1410 90%);
    --hero-img-opacity: 0.22;
    --filter-active-bg: white;
    --filter-active-text: #0f0f0f;
    --filter-idle-bg: rgba(255,255,255,0.08);
    --filter-idle-text: rgba(255,255,255,0.65);
    --filter-idle-border: rgba(255,255,255,0.1);
    --card-bg: rgba(237,224,204,0.05);
    --card-border: rgba(237,224,204,0.1);
    --input-bg: rgba(255,255,255,0.06);
    --input-border: rgba(255,255,255,0.12);
    --input-text: rgba(217,237,232,0.8);
    --badge-bg: rgba(200,131,74,0.15);
    --badge-border: rgba(200,131,74,0.3);
  }
  [data-masters-theme="light"] {
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
    --input-bg: rgba(255,255,255,0.9);
    --input-border: rgba(45,35,24,0.15);
    --input-text: #2d2318;
    --badge-bg: rgba(181,107,46,0.12);
    --badge-border: rgba(181,107,46,0.25);
  }
`;

const glassCard: React.CSSProperties = {
  background: "var(--card-bg)",
  border: "1px solid var(--card-border)",
  backdropFilter: "blur(16px)",
};

function getYearWord(n: number) {
  if (n % 10 === 1 && n % 100 !== 11) return "год";
  if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return "года";
  return "лет";
}

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

function MasterCard({ master, specializations }: { master: Master; specializations: Specialization[] }) {
  const [hovered, setHovered] = useState(false);
  const placeholder = `https://placehold.co/200x200/2d1f14/8b7355?text=${encodeURIComponent(master.name[0])}`;
  const firstPhoto = master.photos?.[0];
  const firstPhotoUrl = firstPhoto ? (typeof firstPhoto === "string" ? firstPhoto : firstPhoto.url) : null;
  const avatar = firstPhotoUrl || master.avatar || placeholder;
  const masterSpecs = specializations.filter((s) => (master.specialization_ids || []).includes(s.id));

  return (
    <Link
      to={`/masters/${master.slug}`}
      className="group block rounded-2xl p-4 transition-all duration-300"
      style={{
        ...glassCard,
        transform: hovered ? "translateY(-3px)" : "translateY(0)",
        boxShadow: hovered ? "0 12px 32px rgba(0,0,0,0.18)" : "0 2px 8px rgba(0,0,0,0.06)",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex gap-4">
        {/* Аватар */}
        <div className="relative shrink-0">
          <div className="w-16 h-16 rounded-full overflow-hidden ring-2" style={{ ringColor: "var(--card-border)" }}>
            <img
              src={avatar}
              alt={master.name}
              className="w-full h-full object-cover object-top transition-transform duration-500"
              style={{ transform: hovered ? "scale(1.08)" : "scale(1)" }}
            />
          </div>
          {master.is_verified && (
            <div
              className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: "var(--c-terra)", border: "2px solid var(--card-bg)" }}
              title="Проверен"
            >
              <Icon name="Check" size={10} style={{ color: "#fff" } as React.CSSProperties} />
            </div>
          )}
        </div>

        {/* Основной контент */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-0.5">
            <h3 className="font-bold text-base leading-tight truncate" style={{ color: "var(--c-cream)" }}>{master.name}</h3>
            {master.price_from > 0 && (
              <span className="text-sm font-bold shrink-0" style={{ color: "var(--c-terra)" }}>
                от {master.price_from.toLocaleString("ru-RU")} ₽
              </span>
            )}
          </div>

          {/* Специализации */}
          {masterSpecs.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {masterSpecs.slice(0, 3).map((s) => (
                <span key={s.id} className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(143,168,154,0.15)", color: "var(--c-sage)" }}>
                  {s.name}
                </span>
              ))}
              {masterSpecs.length > 3 && (
                <span className="text-xs px-1" style={{ color: "var(--c-muted)" }}>+{masterSpecs.length - 3}</span>
              )}
            </div>
          )}

          {master.tagline && (
            <p className="text-xs mb-2 line-clamp-1 italic" style={{ color: "var(--c-text)" }}>«{master.tagline}»</p>
          )}

          {/* Метрики */}
          <div className="flex items-center gap-3 text-xs flex-wrap" style={{ color: "var(--c-muted)" }}>
            {master.rating > 0 && (
              <span className="flex items-center gap-1">
                <Icon name="Star" size={11} style={{ color: "#F59E0B", fill: "#F59E0B" } as React.CSSProperties} />
                <span className="font-semibold" style={{ color: "#F59E0B" }}>{master.rating.toFixed(1)}</span>
              </span>
            )}
            {master.experience_years > 0 && (
              <span className="flex items-center gap-1">
                <Icon name="Award" size={11} style={{ color: "var(--c-terra)" } as React.CSSProperties} />
                <span style={{ color: "var(--c-cream)" }}>{master.experience_years}</span>
                {getYearWord(master.experience_years)}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Icon name="MapPin" size={11} />
              <span className="truncate max-w-[120px]">{master.city}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Нижняя строка */}
      <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: "1px solid var(--card-border)" }}>
        <div className="flex items-center gap-2 text-xs" style={{ color: "var(--c-muted)" }}>
          <Icon name="MessageSquare" size={11} />
          <span>{master.reviews_count || 0} отзывов</span>
          {master.baths && master.baths.length > 0 && (
            <>
              <span>·</span>
              <Icon name="Building2" size={11} style={{ color: "var(--c-sage)" } as React.CSSProperties} />
              <span className="truncate max-w-[100px]">{master.baths[0].name}{master.baths.length > 1 ? ` +${master.baths.length - 1}` : ""}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {master.telegram && (
            <span className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "rgba(34,158,217,0.15)", color: "#229ED9" }}>
              <Icon name="Send" size={11} />
            </span>
          )}
          {master.instagram && (
            <span className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "rgba(225,48,108,0.15)", color: "#E1306C" }}>
              <Icon name="Instagram" size={11} />
            </span>
          )}
          {master.phone && (
            <span className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "rgba(143,168,154,0.15)", color: "var(--c-sage)" }}>
              <Icon name="Phone" size={11} />
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function MasterListCard({ master, specializations }: { master: Master; specializations: Specialization[] }) {
  const [hovered, setHovered] = useState(false);
  const placeholder = `https://placehold.co/200x200/2d1f14/8b7355?text=${encodeURIComponent(master.name[0])}`;
  const avatar = master.avatar || placeholder;
  const masterSpecs = specializations.filter((s) => (master.specialization_ids || []).includes(s.id));

  return (
    <Link
      to={`/masters/${master.slug}`}
      className="group flex gap-4 rounded-2xl overflow-hidden p-3 transition-all duration-300"
      style={{
        ...glassCard,
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        boxShadow: hovered ? "0 12px 30px rgba(0,0,0,0.2)" : "none",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden flex-shrink-0">
        <img
          src={avatar}
          alt={master.name}
          className="w-full h-full object-cover object-top transition-transform duration-500"
          style={{ transform: hovered ? "scale(1.06)" : "scale(1)" }}
        />
        {master.is_verified && (
          <div
            className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full flex items-center justify-center"
            style={{ background: "rgba(200,131,74,0.9)", color: "#fff" }}
            title="Проверен"
          >
            <Icon name="BadgeCheck" size={11} />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-base leading-tight truncate" style={{ color: "var(--c-cream)" }}>{master.name}</h3>
          {master.rating > 0 && (
            <div className="flex items-center gap-1 shrink-0 px-2 py-0.5 rounded-full" style={{ background: "rgba(245,158,11,0.15)" }}>
              <Icon name="Star" size={11} style={{ color: "#F59E0B", fill: "#F59E0B" } as React.CSSProperties} />
              <span className="text-xs font-bold" style={{ color: "#F59E0B" }}>{master.rating.toFixed(1)}</span>
            </div>
          )}
        </div>

        {master.tagline && (
          <p className="text-sm mt-0.5 line-clamp-1 italic" style={{ color: "var(--c-text)" }}>«{master.tagline}»</p>
        )}

        <div className="flex items-center gap-3 text-xs mt-2 flex-wrap" style={{ color: "var(--c-muted)" }}>
          {master.experience_years > 0 && (
            <span className="flex items-center gap-1">
              <Icon name="Award" size={11} style={{ color: "var(--c-terra)" } as React.CSSProperties} />
              <span style={{ color: "var(--c-cream)" }}>{master.experience_years}</span> {getYearWord(master.experience_years)} опыта
            </span>
          )}
          <span className="flex items-center gap-1"><Icon name="MapPin" size={11} />{master.city}</span>
          <span className="flex items-center gap-1"><Icon name="MessageSquare" size={11} />{master.reviews_count || 0} отзывов</span>
        </div>

        {masterSpecs.length > 0 && (
          <div className="hidden sm:flex flex-wrap gap-1 mt-2">
            {masterSpecs.slice(0, 3).map((s) => (
              <span key={s.id} className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(143,168,154,0.15)", color: "var(--c-sage)" }}>{s.name}</span>
            ))}
            {masterSpecs.length > 3 && (
              <span className="text-xs px-1" style={{ color: "var(--c-muted)" }}>+{masterSpecs.length - 3}</span>
            )}
          </div>
        )}
      </div>

      {master.price_from > 0 && (
        <div className="flex flex-col items-end justify-center flex-shrink-0 pl-2">
          <span className="text-xs" style={{ color: "var(--c-muted)" }}>от</span>
          <span className="text-base font-bold" style={{ color: "#FF6B1A" }}>{master.price_from.toLocaleString("ru-RU")} ₽</span>
        </div>
      )}
    </Link>
  );
}

export default function Masters() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted ? resolvedTheme === "dark" : true;

  const [masters, setMasters] = useState<Master[]>([]);
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedSpec, setSelectedSpec] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [view, setView] = useState<"grid" | "list">("grid");

  useEffect(() => {
    Promise.all([mastersApi.getAll(), mastersApi.getSpecializations()])
      .then(([m, s]) => { setMasters(m); setSpecializations(s); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return masters.filter((m) => {
      if (search &&
        !m.name.toLowerCase().includes(search.toLowerCase()) &&
        !(m.bio || "").toLowerCase().includes(search.toLowerCase()) &&
        !(m.tagline || "").toLowerCase().includes(search.toLowerCase())) return false;
      if (selectedSpec) {
        const spec = specializations.find((s) => s.slug === selectedSpec);
        if (spec && !(m.specialization_ids || []).includes(spec.id)) return false;
      }
      return true;
    });
  }, [masters, search, selectedSpec, specializations]);

  const hasFilters = search || selectedSpec;
  const resetFilters = () => { setSearch(""); setSelectedSpec(""); };

  return (
    <div
      data-masters-theme={isDark ? "dark" : "light"}
      className="min-h-screen relative overflow-x-hidden transition-colors duration-500"
      style={{ background: "var(--bg-page)" }}
    >
      <style dangerouslySetInnerHTML={{ __html: THEME_STYLES }} />

      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute top-[-15%] right-[-10%] w-[55vw] h-[55vw] rounded-full blur-[120px]" style={{ background: "radial-gradient(circle, rgba(200,131,74,0.08) 0%, transparent 70%)" }} />
        <div className="absolute bottom-[10%] left-[-10%] w-[45vw] h-[45vw] rounded-full blur-[100px]" style={{ background: "radial-gradient(circle, rgba(143,168,154,0.07) 0%, transparent 70%)" }} />
      </div>

      <Header transparent />

      {/* Hero */}
      <section data-hero className="relative overflow-hidden" style={{ minHeight: "60vh" }}>
        <div className="absolute inset-0">
          <img src={HERO_IMG} alt="" className="w-full h-full object-cover" style={{ opacity: "var(--hero-img-opacity)" as unknown as number }} />
          <div className="absolute inset-0" style={{ background: "var(--hero-overlay)" }} />
        </div>
        <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 pt-32 pb-16">
          <SectionBadge icon="Users">Сообщество СПАРКОМ</SectionBadge>
          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight mb-4"
            style={{ background: "linear-gradient(135deg, var(--c-cream) 20%, #C8834A 60%, #8FA89A 90%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
          >
            Мастера пара
          </h1>
          <p className="text-base sm:text-lg max-w-xl mx-auto mb-8 leading-relaxed" style={{ color: "var(--c-text)" }}>
            Опытные банщики, парильщики и специалисты. Каждый прошёл проверку и разделяет ценности СПАРКОМ.
          </p>
          <div className="flex flex-wrap justify-center gap-8">
            {[
              { val: `${masters.length || "—"}`, label: "мастеров" },
              { val: "4.9", label: "средний рейтинг" },
              { val: `${specializations.length || "5"}+`, label: "специализаций" },
            ].map(({ val, label }) => (
              <div key={label} className="text-center">
                <div className="text-2xl font-bold" style={{ background: "linear-gradient(135deg,#C8834A,#8FA89A)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{val}</div>
                <div className="text-xs" style={{ color: "var(--c-muted)" }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="relative z-10 px-4 sm:px-6 max-w-6xl mx-auto pb-20 pt-10">
        {/* Search + filters */}
        <div className="flex gap-3 mb-5">
          <div className="relative flex-1">
            <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--c-muted)" } as React.CSSProperties} />
            <input
              type="text"
              placeholder="Поиск по имени, описанию..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--input-text)" }}
            />
          </div>
          {specializations.length > 0 && (
            <button
              onClick={() => setFiltersOpen((v) => !v)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={filtersOpen || selectedSpec
                ? { background: "var(--filter-active-bg)", color: "var(--filter-active-text)" }
                : { background: "var(--filter-idle-bg)", color: "var(--filter-idle-text)", border: "1px solid var(--filter-idle-border)" }
              }
            >
              <Icon name="SlidersHorizontal" size={15} />
              Фильтры
              {selectedSpec && (
                <span className="w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold" style={{ background: "var(--c-terra)", color: "#fff" }}>1</span>
              )}
            </button>
          )}
          {hasFilters && (
            <button onClick={resetFilters} className="px-3 py-2.5 rounded-xl text-sm transition-all" style={{ color: "var(--c-terra)", background: "rgba(200,131,74,0.1)" }}>
              <Icon name="X" size={15} />
            </button>
          )}
        </div>

        {filtersOpen && specializations.length > 0 && (
          <div className="rounded-2xl p-5 mb-5" style={glassCard}>
            <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--c-muted)" }}>Специализация</div>
            <div className="flex flex-wrap gap-2">
              {specializations.map((s) => (
                <button
                  key={s.slug}
                  onClick={() => setSelectedSpec(selectedSpec === s.slug ? "" : s.slug)}
                  className="px-3 py-1.5 rounded-full text-sm transition-all"
                  style={selectedSpec === s.slug
                    ? { background: "var(--filter-active-bg)", color: "var(--filter-active-text)" }
                    : { background: "var(--filter-idle-bg)", color: "var(--filter-idle-text)", border: "1px solid var(--filter-idle-border)" }
                  }
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24" style={{ color: "var(--c-muted)" }}>
            <Icon name="Loader2" size={32} className="animate-spin mr-3" />
            Загрузка мастеров...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20" style={{ color: "var(--c-muted)" }}>
            <Icon name="SearchX" size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-lg mb-2">Никого не найдено</p>
            <button onClick={resetFilters} className="text-sm underline underline-offset-4" style={{ color: "var(--c-terra)" }}>Сбросить фильтры</button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-5">
              <div className="text-sm" style={{ color: "var(--c-muted)" }}>
                {filtered.length === masters.length ? `${masters.length} мастеров` : `${filtered.length} из ${masters.length}`}
              </div>
              <div className="flex gap-1 rounded-xl p-1" style={{ background: "var(--filter-idle-bg)" }}>
                <button
                  onClick={() => setView("grid")}
                  className="p-2 rounded-lg transition-all duration-200"
                  title="Плитка"
                  style={view === "grid"
                    ? { background: "rgba(200,131,74,0.3)", color: "#C8834A" }
                    : { color: "var(--c-muted)" }}
                >
                  <Icon name="LayoutGrid" size={16} />
                </button>
                <button
                  onClick={() => setView("list")}
                  className="p-2 rounded-lg transition-all duration-200"
                  title="Список"
                  style={view === "list"
                    ? { background: "rgba(200,131,74,0.3)", color: "#C8834A" }
                    : { color: "var(--c-muted)" }}
                >
                  <Icon name="List" size={16} />
                </button>
              </div>
            </div>
            {view === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filtered.map((m) => <MasterCard key={m.slug} master={m} specializations={specializations} />)}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {filtered.map((m) => <MasterListCard key={m.slug} master={m} specializations={specializations} />)}
              </div>
            )}
          </>
        )}
      </section>

      <Footer />
    </div>
  );
}