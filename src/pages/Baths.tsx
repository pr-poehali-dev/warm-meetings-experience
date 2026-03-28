import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { bathsApi, Bath, BathFilters } from "@/lib/baths-api";

const BATH_TYPES = ["Русская парная", "Финская сауна", "Хамам", "Инфракрасная", "Японская офуро"];
const FEATURES = ["Купель", "Бассейн", "Дровяная печь", "Финская печь", "Мангал", "Веники", "Парковка"];
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

function BathCard({ bath }: { bath: Bath }) {
  const placeholder = `https://placehold.co/600x400/e8dac0/8b7355?text=${encodeURIComponent(bath.name)}`;
  const firstPhoto = bath.photos?.[0];
  const cover = firstPhoto ? (typeof firstPhoto === "string" ? firstPhoto : firstPhoto.url) : placeholder;

  return (
    <Link to={`/baths/${bath.slug}`} className="group block bg-card rounded-2xl overflow-hidden border border-border hover:shadow-lg transition-all hover:-translate-y-0.5">
      <div className="relative h-48 overflow-hidden bg-muted">
        <img src={cover} alt={bath.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        {bath.price_from > 0 && (
          <div className="absolute bottom-3 right-3 bg-background/90 backdrop-blur-sm text-foreground text-sm font-semibold px-3 py-1 rounded-full">
            от {bath.price_from.toLocaleString("ru-RU")} ₽
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex flex-wrap gap-1 mb-2">
          {bath.bath_types.slice(0, 2).map((t) => (
            <span key={t} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{t}</span>
          ))}
        </div>
        <h3 className="font-semibold text-base mb-1 group-hover:text-primary transition-colors">{bath.name}</h3>
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
          <Icon name="MapPin" size={12} />
          <span className="truncate">{bath.address}</span>
        </div>
        {bath.rating > 0 && (
          <div className="flex items-center justify-between">
            <StarRating rating={bath.rating} />
            <span className="text-xs text-muted-foreground">{bath.reviews_count} отзывов</span>
          </div>
        )}
        {bath.features.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {bath.features.slice(0, 3).map((f) => (
              <span key={f} className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{f}</span>
            ))}
            {bath.features.length > 3 && (
              <span className="text-xs text-muted-foreground px-1">+{bath.features.length - 3}</span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}

export default function Baths() {
  const [baths, setBaths] = useState<Bath[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedFeature, setSelectedFeature] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
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
      if (selectedCity && b.city !== selectedCity) return false;
      return true;
    });
  }, [baths, search, selectedType, selectedFeature, selectedCity]);

  const hasFilters = search || selectedType || selectedFeature || selectedCity;

  const resetFilters = () => {
    setSearch("");
    setSelectedType("");
    setSelectedFeature("");
    setSelectedCity("");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="bg-muted/40 border-b border-border py-12 md:py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl md:text-5xl font-bold mb-3">Бани-партнёры</h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Проверенные бани и сауны, где проходят события СПАРКОМ. Выберите подходящую по типу, расположению и особенностям.
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search + filter toggle */}
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Icon name="Search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Поиск по названию, адресу..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <button
            onClick={() => setFiltersOpen((v) => !v)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
              filtersOpen || (selectedType || selectedFeature || selectedCity)
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-border hover:bg-muted"
            }`}
          >
            <Icon name="SlidersHorizontal" size={16} />
            Фильтры
            {(selectedType || selectedFeature || selectedCity) && (
              <span className="w-5 h-5 rounded-full bg-primary-foreground text-primary text-xs flex items-center justify-center font-bold">
                {[selectedType, selectedFeature, selectedCity].filter(Boolean).length}
              </span>
            )}
          </button>
        </div>

        {/* Filters panel */}
        {filtersOpen && (
          <div className="bg-muted/40 border border-border rounded-2xl p-5 mb-6 space-y-4">
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Тип бани</div>
              <div className="flex flex-wrap gap-2">
                {BATH_TYPES.map((t) => (
                  <button
                    key={t}
                    onClick={() => setSelectedType(selectedType === t ? "" : t)}
                    className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                      selectedType === t ? "bg-primary text-primary-foreground" : "bg-background border border-border hover:bg-muted"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Особенности</div>
              <div className="flex flex-wrap gap-2">
                {FEATURES.map((f) => (
                  <button
                    key={f}
                    onClick={() => setSelectedFeature(selectedFeature === f ? "" : f)}
                    className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                      selectedFeature === f ? "bg-primary text-primary-foreground" : "bg-background border border-border hover:bg-muted"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Город</div>
              <div className="flex flex-wrap gap-2">
                {CITIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setSelectedCity(selectedCity === c ? "" : c)}
                    className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                      selectedCity === c ? "bg-primary text-primary-foreground" : "bg-background border border-border hover:bg-muted"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            {hasFilters && (
              <button onClick={resetFilters} className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                <Icon name="X" size={14} />
                Сбросить все фильтры
              </button>
            )}
          </div>
        )}

        {/* Results */}
        {loading ? (
          <div className="text-center py-20">
            <Icon name="Loader2" size={32} className="animate-spin text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Загрузка бань...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Icon name="Bath" size={48} className="text-muted-foreground/30 mx-auto mb-4" fallback="Home" />
            <p className="text-muted-foreground text-lg mb-2">Бани не найдены</p>
            {hasFilters && (
              <button onClick={resetFilters} className="text-primary hover:underline text-sm">Сбросить фильтры</button>
            )}
          </div>
        ) : (
          <>
            <div className="text-sm text-muted-foreground mb-4">
              {filtered.length} {filtered.length === 1 ? "баня" : filtered.length < 5 ? "бани" : "бань"}
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((bath) => (
                <BathCard key={bath.id} bath={bath} />
              ))}
            </div>
          </>
        )}
      </div>

      <Footer />
    </div>
  );
}