import { useState, useEffect } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import Icon from "@/components/ui/icon";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { mastersApi, Master } from "@/lib/masters-api";

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <Icon
          key={s}
          name="Star"
          size={16}
          className={s <= Math.round(rating) ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"}
        />
      ))}
      <span className="text-sm text-muted-foreground ml-1">{rating.toFixed(1)}</span>
    </div>
  );
}

function getYearWord(n: number) {
  if (n % 10 === 1 && n % 100 !== 11) return "год";
  if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return "года";
  return "лет";
}

export default function MasterDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [master, setMaster] = useState<Master | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activePhoto, setActivePhoto] = useState(0);

  useEffect(() => {
    if (!slug) return;
    mastersApi
      .getBySlug(slug)
      .then(setMaster)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  if (notFound) return <Navigate to="/masters" replace />;

  if (loading || !master) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Icon name="Loader2" size={32} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  const placeholder = `https://placehold.co/600x600/e8dac0/8b7355?text=${encodeURIComponent(master.name[0])}`;
  const photoUrls =
    master.photos?.length
      ? master.photos.map((p) => (typeof p === "string" ? p : p.url))
      : master.avatar
      ? [master.avatar]
      : [placeholder];

  const portfolio = master.portfolio || [];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="relative bg-muted">
        <img
          src={photoUrls[activePhoto]}
          alt={master.name}
          className="w-full h-64 md:h-80 object-cover object-top"
        />
        {photoUrls.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {photoUrls.map((_, i) => (
              <button
                key={i}
                onClick={() => setActivePhoto(i)}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === activePhoto ? "bg-white w-6" : "bg-white/50"
                }`}
              />
            ))}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent pointer-events-none" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="flex flex-col lg:flex-row gap-10">

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <Link to="/masters" className="hover:text-foreground transition-colors">Мастера</Link>
              <Icon name="ChevronRight" size={14} />
              <span className="text-foreground">{master.name}</span>
            </div>

            {(master.specializations || []).length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {master.specializations!.map((s) => (
                  <span key={s.id} className="text-sm bg-primary/10 text-primary px-3 py-1 rounded-full">
                    {s.name}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl md:text-4xl font-bold">{master.name}</h1>
              {master.is_verified && (
                <div className="flex items-center gap-1 text-primary text-sm font-medium">
                  <Icon name="BadgeCheck" size={20} className="text-primary" />
                  Проверен
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-4 mb-6 text-sm text-muted-foreground">
              {master.experience_years > 0 && (
                <div className="flex items-center gap-1.5">
                  <Icon name="Clock" size={15} />
                  <span>{master.experience_years} {getYearWord(master.experience_years)} опыта</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <Icon name="MapPin" size={15} />
                <span>{master.city}</span>
              </div>
              {master.rating > 0 && <StarRating rating={master.rating} />}
            </div>

            {master.tagline && (
              <p className="text-lg text-muted-foreground italic mb-6 border-l-4 border-primary/30 pl-4">
                {master.tagline}
              </p>
            )}

            {master.bio && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold mb-3">О мастере</h2>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{master.bio}</p>
              </div>
            )}

            {(master.specializations || []).length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold mb-4">Специализации</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {master.specializations!.map((s) => (
                    <div key={s.id} className="flex items-start gap-3 p-4 bg-muted/50 rounded-xl">
                      <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Icon name="Flame" size={16} className="text-primary" />
                      </div>
                      <div>
                        <div className="font-medium text-sm">{s.name}</div>
                        {s.description && (
                          <div className="text-xs text-muted-foreground mt-0.5">{s.description}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {portfolio.length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold mb-4">Портфолио</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {portfolio.map((p, i) => (
                    <div key={i} className="rounded-xl overflow-hidden aspect-square bg-muted">
                      <img
                        src={p.url}
                        alt={p.caption || `Портфолио ${i + 1}`}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(master.baths || []).length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold mb-4">Работает в банях</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {master.baths!.map((bath) => {
                    const bathPhoto =
                      bath.photos?.[0]
                        ? typeof bath.photos[0] === "string"
                          ? bath.photos[0]
                          : (bath.photos[0] as { url: string }).url
                        : `https://placehold.co/300x200/e8dac0/8b7355?text=${encodeURIComponent(bath.name)}`;
                    return (
                      <Link
                        key={bath.id}
                        to={`/baths/${bath.slug}`}
                        className="group flex gap-3 p-3 border border-border rounded-xl hover:bg-muted/50 transition-colors"
                      >
                        <img
                          src={bathPhoto}
                          alt={bath.name}
                          className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="font-medium text-sm group-hover:text-primary transition-colors truncate">
                            {bath.name}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Icon name="MapPin" size={11} />
                            <span className="truncate">{bath.address}</span>
                          </div>
                          {bath.schedule && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Icon name="Calendar" size={11} />
                              <span>{bath.schedule}</span>
                            </div>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="lg:w-[300px] flex-shrink-0">
            <div className="lg:sticky lg:top-24 space-y-4">
              <div className="bg-card border border-border rounded-2xl p-6">
                {master.price_from > 0 && (
                  <div className="mb-4">
                    <div className="text-3xl font-bold text-primary">
                      {master.price_from.toLocaleString("ru-RU")} ₽
                    </div>
                    <div className="text-sm text-muted-foreground">от / за сеанс</div>
                  </div>
                )}

                {master.phone && (
                  <a
                    href={`tel:${master.phone}`}
                    className="flex items-center gap-3 w-full bg-primary text-primary-foreground px-4 py-3 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors mb-3"
                  >
                    <Icon name="Phone" size={16} />
                    {master.phone}
                  </a>
                )}

                {master.telegram && (
                  <a
                    href={`https://t.me/${master.telegram.replace("@", "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 w-full bg-muted px-4 py-3 rounded-xl text-sm font-medium hover:bg-muted/80 transition-colors mb-3"
                  >
                    <Icon name="Send" size={16} />
                    Telegram
                  </a>
                )}

                {master.instagram && (
                  <a
                    href={`https://instagram.com/${master.instagram.replace("@", "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 w-full bg-muted px-4 py-3 rounded-xl text-sm font-medium hover:bg-muted/80 transition-colors"
                  >
                    <Icon name="Instagram" size={16} />
                    Instagram
                  </a>
                )}
              </div>

              {master.reviews_count > 0 && (
                <div className="bg-card border border-border rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">Рейтинг</span>
                    <span className="text-2xl font-bold text-primary">{master.rating.toFixed(1)}</span>
                  </div>
                  <StarRating rating={master.rating} />
                  <p className="text-xs text-muted-foreground mt-2">
                    На основе {master.reviews_count} отзывов
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
