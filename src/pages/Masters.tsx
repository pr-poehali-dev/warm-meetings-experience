import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";
import Footer from "@/components/Footer";
import PageHero from "@/components/ui/PageHero";
import { mastersApi, Master, Specialization } from "@/lib/masters-api";

const CITIES = ["Москва", "Санкт-Петербург"];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <Icon
          key={s}
          name="Star"
          size={12}
          className={s <= Math.round(rating) ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"}
        />
      ))}
      <span className="text-xs text-muted-foreground ml-1">{rating.toFixed(1)}</span>
    </div>
  );
}

function MasterCard({ master, specializations }: { master: Master; specializations: Specialization[] }) {
  const placeholder = `https://placehold.co/400x400/e8dac0/8b7355?text=${encodeURIComponent(master.name[0])}`;
  const avatar = master.avatar || placeholder;

  const masterSpecs = specializations.filter((s) =>
    (master.specialization_ids || []).includes(s.id)
  );

  return (
    <Link
      to={`/masters/${master.slug}`}
      className="group block bg-card rounded-2xl overflow-hidden border border-border hover:shadow-lg transition-all hover:-translate-y-0.5"
    >
      <div className="relative h-52 overflow-hidden bg-muted">
        <img
          src={avatar}
          alt={master.name}
          className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
        />
        {master.is_verified && (
          <div className="absolute top-3 right-3 bg-primary text-primary-foreground text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
            <Icon name="BadgeCheck" size={12} />
            Проверен
          </div>
        )}
        {master.price_from > 0 && (
          <div className="absolute bottom-3 right-3 bg-background/90 backdrop-blur-sm text-foreground text-sm font-semibold px-3 py-1 rounded-full">
            от {master.price_from.toLocaleString("ru-RU")} ₽
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex flex-wrap gap-1 mb-2">
          {masterSpecs.slice(0, 2).map((s) => (
            <span key={s.id} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              {s.name}
            </span>
          ))}
        </div>
        <h3 className="font-semibold text-base mb-1 group-hover:text-primary transition-colors">
          {master.name}
        </h3>
        {master.tagline && (
          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{master.tagline}</p>
        )}
        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
          {master.experience_years > 0 && (
            <div className="flex items-center gap-1">
              <Icon name="Clock" size={12} />
              <span>{master.experience_years} {getYearWord(master.experience_years)} опыта</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Icon name="MapPin" size={12} />
            <span>{master.city}</span>
          </div>
        </div>
        {master.rating > 0 && (
          <div className="flex items-center justify-between">
            <StarRating rating={master.rating} />
            <span className="text-xs text-muted-foreground">{master.reviews_count} отзывов</span>
          </div>
        )}
      </div>
    </Link>
  );
}

function getYearWord(n: number) {
  if (n % 10 === 1 && n % 100 !== 11) return "год";
  if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return "года";
  return "лет";
}

export default function Masters() {
  const [masters, setMasters] = useState<Master[]>([]);
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedSpec, setSelectedSpec] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    Promise.all([mastersApi.getAll(), mastersApi.getSpecializations()])
      .then(([m, s]) => {
        setMasters(m);
        setSpecializations(s);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return masters.filter((m) => {
      if (
        search &&
        !m.name.toLowerCase().includes(search.toLowerCase()) &&
        !(m.bio || "").toLowerCase().includes(search.toLowerCase()) &&
        !(m.tagline || "").toLowerCase().includes(search.toLowerCase())
      )
        return false;
      if (selectedSpec) {
        const spec = specializations.find((s) => s.slug === selectedSpec);
        if (spec && !(m.specialization_ids || []).includes(spec.id)) return false;
      }
      if (selectedCity && m.city !== selectedCity) return false;
      return true;
    });
  }, [masters, search, selectedSpec, selectedCity, specializations]);

  const hasFilters = search || selectedSpec || selectedCity;

  const resetFilters = () => {
    setSearch("");
    setSelectedSpec("");
    setSelectedCity("");
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHero
        label="Сообщество"
        title="Мастера пара"
        subtitle="Опытные банные мастера и специалисты СПАРКОМ. Выберите по специализации, опыту и городу."
        minHeight="min-h-[280px] md:min-h-[320px]"
      />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Icon name="Search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Поиск по имени, описанию..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <button
            onClick={() => setFiltersOpen((v) => !v)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
              filtersOpen || selectedSpec || selectedCity
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-border hover:bg-muted"
            }`}
          >
            <Icon name="SlidersHorizontal" size={16} />
            Фильтры
            {(selectedSpec || selectedCity) && (
              <span className="w-5 h-5 rounded-full bg-primary-foreground text-primary text-xs flex items-center justify-center font-bold">
                {[selectedSpec, selectedCity].filter(Boolean).length}
              </span>
            )}
          </button>
        </div>

        {filtersOpen && (
          <div className="bg-card border border-border rounded-2xl p-5 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Специализация</label>
                <select
                  value={selectedSpec}
                  onChange={(e) => setSelectedSpec(e.target.value)}
                  className="w-full px-3 py-2.5 border border-border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Все специализации</option>
                  {specializations.map((s) => (
                    <option key={s.slug} value={s.slug}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Город</label>
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="w-full px-3 py-2.5 border border-border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Все города</option>
                  {CITIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
            {hasFilters && (
              <button
                onClick={resetFilters}
                className="mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                <Icon name="X" size={14} />
                Сбросить фильтры
              </button>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Icon name="Loader2" size={32} className="animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon name="Users" size={24} className="text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Мастера не найдены</h3>
            <p className="text-muted-foreground text-sm mb-4">
              {hasFilters ? "Попробуйте изменить фильтры" : "Мастера появятся здесь"}
            </p>
            {hasFilters && (
              <button onClick={resetFilters} className="text-sm text-primary hover:underline">
                Сбросить фильтры
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="text-sm text-muted-foreground mb-4">
              {filtered.length} {getMasterWord(filtered.length)}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filtered.map((m) => (
                <MasterCard key={m.id} master={m} specializations={specializations} />
              ))}
            </div>
          </>
        )}
      </div>

      <Footer />
    </div>
  );
}

function getMasterWord(n: number) {
  if (n % 10 === 1 && n % 100 !== 11) return "мастер";
  if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return "мастера";
  return "мастеров";
}