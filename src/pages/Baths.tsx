import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "next-themes";
import Icon from "@/components/ui/icon";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { bathsApi, Bath } from "@/lib/baths-api";
import BathLoader from "@/components/BathLoader";

const HERO_IMG = "https://cdn.poehali.dev/projects/b2cfdb9f-e5f2-4dd1-84cb-905733c4941c/files/9f246eac-a825-45e2-ade0-bb4f134c82d0.jpg";

const THEME_STYLES = `
  [data-baths-theme="dark"] {
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
  }
  [data-baths-theme="light"] {
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
  }
`;

const BATH_TYPES = ["Русская парная", "Финская сауна", "Хамам", "Инфракрасная", "Японская офуро"];
const FEATURES = ["Купель", "Бассейн", "Дровяная печь", "Веники", "Мангал", "Парковка"];

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

function BathCard({ bath }: { bath: Bath }) {
  const [hovered, setHovered] = useState(false);
  const placeholder = `https://placehold.co/600x400/2d1f14/8b7355?text=${encodeURIComponent(bath.name)}`;
  const firstPhoto = bath.photos?.[0];
  const cover = firstPhoto ? (typeof firstPhoto === "string" ? firstPhoto : firstPhoto.url) : placeholder;

  return (
    <Link
      to={`/baths/${bath.slug}`}
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
          alt={bath.name}
          className="w-full h-full object-cover transition-transform duration-500"
          style={{ transform: hovered ? "scale(1.06)" : "scale(1)" }}
        />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)" }} />
        {bath.price_from > 0 && (
          <div
            className="absolute bottom-3 right-3 text-sm font-bold px-3 py-1 rounded-full"
            style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)", color: "#FF6B1A" }}
          >
            от {bath.price_from.toLocaleString("ru-RU")} ₽
          </div>
        )}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1">
          {bath.bath_types.slice(0, 2).map((t) => (
            <span
              key={t}
              className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ background: "rgba(200,131,74,0.75)", backdropFilter: "blur(4px)", color: "#fff" }}
            >
              {t}
            </span>
          ))}
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-bold text-base mb-1 transition-colors duration-200" style={{ color: "var(--c-cream)" }}>
          {bath.name}
        </h3>
        <div className="flex items-center gap-1 text-xs mb-3" style={{ color: "var(--c-muted)" }}>
          <Icon name="MapPin" size={12} />
          <span className="truncate">{bath.address}</span>
        </div>

        {bath.rating > 0 && (
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Icon
                  key={s}
                  name="Star"
                  size={12}
                  style={{ color: s <= Math.round(bath.rating) ? "#F59E0B" : "rgba(217,237,232,0.2)" }}
                />
              ))}
              <span className="text-xs ml-1 font-semibold" style={{ color: "var(--c-terra)" }}>{bath.rating.toFixed(1)}</span>
            </div>
            <span className="text-xs" style={{ color: "var(--c-muted)" }}>{bath.reviews_count} отзывов</span>
          </div>
        )}

        {bath.features.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {bath.features.slice(0, 3).map((f) => (
              <span
                key={f}
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: "rgba(143,168,154,0.15)", color: "var(--c-sage)" }}
              >
                {f}
              </span>
            ))}
            {bath.features.length > 3 && (
              <span className="text-xs px-1" style={{ color: "var(--c-muted)" }}>+{bath.features.length - 3}</span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}

export default function Baths() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted ? resolvedTheme === "dark" : true;

  const [baths, setBaths] = useState<Bath[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedFeature, setSelectedFeature] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    bathsApi.getAll().then(setBaths).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return baths.filter((b) => {
      if (search && !b.name.toLowerCase().includes(search.toLowerCase()) &&
          !b.description.toLowerCase().includes(search.toLowerCase()) &&
          !b.address.toLowerCase().includes(search.toLowerCase())) return false;
      if (selectedType && !b.bath_types.includes(selectedType)) return false;
      if (selectedFeature && !b.features.includes(selectedFeature)) return false;
      return true;
    });
  }, [baths, search, selectedType, selectedFeature]);

  const hasFilters = search || selectedType || selectedFeature;

  const resetFilters = () => {
    setSearch("");
    setSelectedType("");
    setSelectedFeature("");
  };

  return (
    <div
      data-baths-theme={isDark ? "dark" : "light"}
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
          <SectionBadge icon="Flame">Площадки СПАРКОМ</SectionBadge>

          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight mb-4"
            style={{
              background: "linear-gradient(135deg, var(--c-cream) 20%, #C8834A 60%, #8FA89A 90%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Наши бани
          </h1>

          <p className="text-base sm:text-lg max-w-xl mx-auto mb-8 leading-relaxed" style={{ color: "var(--c-text)" }}>
            Проверенные бани и сауны Москвы — пространства, где проходят события СПАРКОМ.
            Дровяные парные, хамамы, открытые купели.
          </p>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-8">
            {[
              { val: `${baths.length || "—"}`, label: "площадок" },
              { val: "4.8", label: "средний рейтинг" },
              { val: "8+", label: "районов Москвы" },
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

        {/* Search + filters */}
        <div className="flex gap-3 mb-5">
          <div className="relative flex-1">
            <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--c-muted)" } as React.CSSProperties} />
            <input
              type="text"
              placeholder="Поиск по названию, адресу..."
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
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={filtersOpen || (selectedType || selectedFeature)
              ? { background: "var(--filter-active-bg)", color: "var(--filter-active-text)" }
              : { background: "var(--filter-idle-bg)", color: "var(--filter-idle-text)", border: "1px solid var(--filter-idle-border)" }
            }
          >
            <Icon name="SlidersHorizontal" size={15} />
            Фильтры
            {(selectedType || selectedFeature) && (
              <span
                className="w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold"
                style={{ background: "var(--c-terra)", color: "#fff" }}
              >
                {[selectedType, selectedFeature].filter(Boolean).length}
              </span>
            )}
          </button>
          {hasFilters && (
            <button
              onClick={resetFilters}
              className="px-3 py-2.5 rounded-xl text-sm transition-all"
              style={{ color: "var(--c-terra)", background: "rgba(200,131,74,0.1)" }}
            >
              <Icon name="X" size={15} />
            </button>
          )}
        </div>

        {/* Filters panel */}
        {filtersOpen && (
          <div className="rounded-2xl p-5 mb-5 space-y-4" style={glassCard}>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--c-muted)" }}>Тип бани</div>
              <div className="flex flex-wrap gap-2">
                {BATH_TYPES.map((t) => (
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
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--c-muted)" }}>Особенности</div>
              <div className="flex flex-wrap gap-2">
                {FEATURES.map((f) => (
                  <button
                    key={f}
                    onClick={() => setSelectedFeature(selectedFeature === f ? "" : f)}
                    className="px-3 py-1.5 rounded-full text-sm transition-all"
                    style={selectedFeature === f
                      ? { background: "var(--filter-active-bg)", color: "var(--filter-active-text)" }
                      : { background: "var(--filter-idle-bg)", color: "var(--filter-idle-text)", border: "1px solid var(--filter-idle-border)" }
                    }
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {loading ? (
          <BathLoader fullscreen={false} label="Загрузка бань…" />
        ) : filtered.length === 0 ? (
          <div className="text-center py-20" style={{ color: "var(--c-muted)" }}>
            <Icon name="SearchX" size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-lg mb-2">Ничего не найдено</p>
            <button onClick={resetFilters} className="text-sm underline underline-offset-4" style={{ color: "var(--c-terra)" }}>Сбросить фильтры</button>
          </div>
        ) : (
          <>
            <div className="text-sm mb-5" style={{ color: "var(--c-muted)" }}>
              {filtered.length === baths.length ? `${baths.length} бань` : `${filtered.length} из ${baths.length}`}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((b) => <BathCard key={b.slug} bath={b} />)}
            </div>
          </>
        )}
      </section>

      <Footer />
    </div>
  );
}