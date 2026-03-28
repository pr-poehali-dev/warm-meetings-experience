import { useState, useEffect } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import Icon from "@/components/ui/icon";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { bathsApi, Bath } from "@/lib/baths-api";

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <Icon key={s} name="Star" size={16}
          className={s <= Math.round(rating) ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"}
        />
      ))}
      <span className="text-sm text-muted-foreground ml-1">{rating.toFixed(1)}</span>
    </div>
  );
}

function YandexMap({ lat, lng, name }: { lat: number; lng: number; name: string }) {
  const url = `https://static-maps.yandex.ru/1.x/?lang=ru_RU&ll=${lng},${lat}&z=15&size=650,300&l=map&pt=${lng},${lat},pm2rdm`;
  const yandexUrl = `https://yandex.ru/maps/?ll=${lng},${lat}&z=16&text=${encodeURIComponent(name)}`;

  return (
    <a href={yandexUrl} target="_blank" rel="noopener noreferrer" className="block rounded-xl overflow-hidden border border-border hover:opacity-90 transition-opacity">
      <img src={url} alt={`Карта: ${name}`} className="w-full h-48 md:h-64 object-cover" />
      <div className="px-4 py-2.5 bg-muted/50 flex items-center gap-2 text-sm text-muted-foreground">
        <Icon name="ExternalLink" size={14} />
        Открыть в Яндекс Картах
      </div>
    </a>
  );
}

export default function BathDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [bath, setBath] = useState<Bath | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activePhoto, setActivePhoto] = useState(0);

  useEffect(() => {
    if (!slug) return;
    bathsApi.getBySlug(slug)
      .then(setBath)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  if (notFound) return <Navigate to="/baths" replace />;

  if (loading || !bath) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Icon name="Loader2" size={32} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  const placeholder = `https://placehold.co/800x500/e8dac0/8b7355?text=${encodeURIComponent(bath.name)}`;
  const photoUrls = bath.photos?.length
    ? bath.photos.map((p) => (typeof p === "string" ? p : p.url))
    : [placeholder];
  const videos = (bath.videos || []).filter((v) => v.type === "video_horizontal");
  const vertVideos = (bath.videos || []).filter((v) => v.type === "video_vertical");

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Gallery */}
      <div className="relative bg-muted">
        <img
          src={photoUrls[activePhoto]}
          alt={bath.name}
          className="w-full h-64 md:h-96 object-cover"
        />
        {photoUrls.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {photoUrls.map((_, i) => (
              <button
                key={i}
                onClick={() => setActivePhoto(i)}
                className={`w-2 h-2 rounded-full transition-all ${i === activePhoto ? "bg-white w-6" : "bg-white/50"}`}
              />
            ))}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent pointer-events-none" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="flex flex-col lg:flex-row gap-10">

          {/* Main */}
          <div className="flex-1 min-w-0">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <Link to="/baths" className="hover:text-foreground transition-colors">Бани</Link>
              <Icon name="ChevronRight" size={14} />
              <span className="text-foreground">{bath.name}</span>
            </div>

            {/* Types */}
            <div className="flex flex-wrap gap-2 mb-3">
              {bath.bath_types.map((t) => (
                <span key={t} className="text-sm bg-primary/10 text-primary px-3 py-1 rounded-full">{t}</span>
              ))}
            </div>

            <h1 className="text-3xl md:text-4xl font-bold mb-3">{bath.name}</h1>

            {/* Meta */}
            <div className="flex flex-wrap gap-4 mb-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Icon name="MapPin" size={15} />
                <span>{bath.address}{bath.city ? `, ${bath.city}` : ""}</span>
              </div>
              {bath.capacity_max > 0 && (
                <div className="flex items-center gap-1.5">
                  <Icon name="Users" size={15} />
                  <span>{bath.capacity_min}–{bath.capacity_max} человек</span>
                </div>
              )}
              {bath.rating > 0 && (
                <StarRating rating={bath.rating} />
              )}
            </div>

            {bath.description && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold mb-3">Описание</h2>
                <p className="text-muted-foreground leading-relaxed">{bath.description}</p>
              </div>
            )}

            {/* Features */}
            {bath.features.length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold mb-4">Особенности</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {bath.features.map((f) => (
                    <div key={f} className="flex items-center gap-2.5 p-3 bg-muted/50 rounded-xl">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <Icon name="Check" size={14} className="text-primary" />
                      </div>
                      <span className="text-sm font-medium">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Горизонтальные видео */}
            {videos.length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold mb-4">Видеообзор</h2>
                <div className="space-y-3">
                  {videos.map((v) => (
                    <video key={v.key} src={v.url} controls className="w-full rounded-xl aspect-video bg-black" />
                  ))}
                </div>
              </div>
            )}

            {/* Вертикальные видео */}
            {vertVideos.length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold mb-4">Shorts</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {vertVideos.map((v) => (
                    <video key={v.key} src={v.url} controls className="w-full rounded-xl aspect-[9/16] object-cover bg-black" />
                  ))}
                </div>
              </div>
            )}

            {/* Map */}
            {bath.lat && bath.lng && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold mb-4">Расположение</h2>
                <YandexMap lat={bath.lat} lng={bath.lng} name={bath.name} />
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:w-[320px] flex-shrink-0">
            <div className="lg:sticky lg:top-24 space-y-4">
              <div className="bg-card border border-border rounded-2xl p-6">
                {bath.price_from > 0 && (
                  <div className="mb-4">
                    <div className="text-3xl font-bold text-primary">
                      {bath.price_from.toLocaleString("ru-RU")} ₽
                    </div>
                    <div className="text-sm text-muted-foreground">от / за сеанс</div>
                    {bath.price_per_hour > 0 && (
                      <div className="text-sm text-muted-foreground mt-0.5">
                        {bath.price_per_hour.toLocaleString("ru-RU")} ₽/час
                      </div>
                    )}
                  </div>
                )}

                {bath.phone && (
                  <a href={`tel:${bath.phone}`}
                    className="flex items-center gap-3 w-full bg-primary text-primary-foreground px-4 py-3 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors mb-3">
                    <Icon name="Phone" size={16} />
                    {bath.phone}
                  </a>
                )}

                {bath.website && (
                  <a href={bath.website} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 w-full bg-muted px-4 py-3 rounded-xl text-sm font-medium hover:bg-muted/80 transition-colors mb-3">
                    <Icon name="Globe" size={16} />
                    Сайт бани
                  </a>
                )}

                <Link to="/events"
                  className="flex items-center justify-center gap-2 w-full border border-border px-4 py-3 rounded-xl text-sm font-medium hover:bg-muted transition-colors">
                  <Icon name="Calendar" size={16} />
                  События в этой бане
                </Link>
              </div>

              {bath.reviews_count > 0 && (
                <div className="bg-card border border-border rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">Рейтинг</span>
                    <span className="text-2xl font-bold">{bath.rating.toFixed(1)}</span>
                  </div>
                  <StarRating rating={bath.rating} />
                  <p className="text-xs text-muted-foreground mt-2">{bath.reviews_count} отзывов</p>
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