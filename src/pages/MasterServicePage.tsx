import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Icon from "@/components/ui/icon";
import { masterCalendarApi, MasterService } from "@/lib/master-calendar-api";
import { parseServiceDescription } from "@/lib/service-description";

const FORMAT_META: Record<string, { emoji: string; label: string }> = {
  on_site:       { emoji: "🏠", label: "На месте у мастера" },
  at_home:       { emoji: "🚗", label: "Выезд к гостю" },
  by_agreement:  { emoji: "🤝", label: "По согласованию" },
};

function fmtPrice(n: number) {
  return n.toLocaleString("ru-RU") + " ₽";
}

function fmtDuration(min: number) {
  if (min < 60) return `${min} мин`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} ч ${m} мин` : `${h} ч`;
}

function getVideoEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com") || u.hostname.includes("youtu.be")) {
      let vid = u.searchParams.get("v");
      if (!vid && u.hostname === "youtu.be") vid = u.pathname.slice(1);
      if (vid) return `https://www.youtube.com/embed/${vid}`;
    }
    if (u.hostname.includes("rutube.ru")) {
      const m = u.pathname.match(/video\/([a-f0-9]+)/i);
      if (m) return `https://rutube.ru/play/embed/${m[1]}`;
    }
    if (u.hostname.includes("vk.com") && u.pathname.includes("video")) {
      return url;
    }
  } catch {
    // ignore
  }
  return null;
}

export default function MasterServicePage() {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  const navigate = useNavigate();
  const [service, setService] = useState<MasterService | null>(null);
  const [loading, setLoading] = useState(true);
  const [photoIdx, setPhotoIdx] = useState(0);

  useEffect(() => {
    if (!id) return;
    masterCalendarApi.getServiceDetail(Number(id))
      .then((s) => setService(s))
      .catch(() => setService(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <Icon name="Loader" size={32} className="animate-spin" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-gray-500">
          <Icon name="SearchX" size={48} className="opacity-30" />
          <p className="text-lg">Услуга не найдена</p>
          <Link to={`/masters/${slug}`} className="text-primary underline text-sm">
            Вернуться к мастеру
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const parsed = parseServiceDescription(service.description);
  const fmt = service.service_format ? FORMAT_META[service.service_format] : null;
  const photos: string[] = Array.isArray(service.photos) ? service.photos : [];
  const embedUrl = service.video_url ? getVideoEmbedUrl(service.video_url) : null;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
        {/* Хлебные крошки */}
        <nav className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Link to="/masters" className="hover:text-gray-600">Мастера</Link>
          <Icon name="ChevronRight" size={14} />
          <Link to={`/masters/${slug}`} className="hover:text-gray-600">
            {service.master_name || slug}
          </Link>
          <Icon name="ChevronRight" size={14} />
          <span className="text-gray-700 truncate">{service.name}</span>
        </nav>

        {/* Фото-галерея */}
        {photos.length > 0 && (
          <div className="mb-6">
            <div className="relative rounded-2xl overflow-hidden bg-gray-200 aspect-[16/9]">
              <img
                src={photos[photoIdx]}
                alt={service.name}
                className="w-full h-full object-cover"
              />
              {photos.length > 1 && (
                <>
                  <button
                    onClick={() => setPhotoIdx((i) => (i - 1 + photos.length) % photos.length)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-2 transition"
                  >
                    <Icon name="ChevronLeft" size={20} />
                  </button>
                  <button
                    onClick={() => setPhotoIdx((i) => (i + 1) % photos.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-2 transition"
                  >
                    <Icon name="ChevronRight" size={20} />
                  </button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {photos.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setPhotoIdx(i)}
                        className={`w-2 h-2 rounded-full transition ${i === photoIdx ? "bg-white" : "bg-white/50"}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
            {photos.length > 1 && (
              <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
                {photos.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => setPhotoIdx(i)}
                    className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition ${i === photoIdx ? "border-primary" : "border-transparent"}`}
                  >
                    <img src={p} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Заголовок и мета */}
        <div className="bg-white rounded-2xl p-6 mb-4 shadow-sm">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              {fmt && (
                <span className="text-sm text-gray-400 flex items-center gap-1 mb-1">
                  <span>{fmt.emoji}</span> {fmt.label}
                </span>
              )}
              <h1 className="text-2xl font-bold text-gray-900">{service.name}</h1>
            </div>
            <div className="text-right shrink-0">
              <div className="text-2xl font-bold text-gray-900">{fmtPrice(service.price)}</div>
              <div className="text-sm text-gray-400">{fmtDuration(service.duration_minutes)}</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 text-sm text-gray-600">
            <span className="flex items-center gap-1.5 bg-gray-100 rounded-full px-3 py-1">
              <Icon name="Clock" size={14} className="text-gray-400" />
              {fmtDuration(service.duration_minutes)}
            </span>
            <span className="flex items-center gap-1.5 bg-gray-100 rounded-full px-3 py-1">
              <Icon name="Users" size={14} className="text-gray-400" />
              до {service.max_clients} чел.
            </span>
            {fmt && (
              <span className="flex items-center gap-1.5 bg-gray-100 rounded-full px-3 py-1">
                {fmt.emoji} {fmt.label}
              </span>
            )}
          </div>
        </div>

        {/* Развёрнутое описание */}
        {service.rich_description && (
          <div className="bg-white rounded-2xl p-6 mb-4 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Об услуге</h2>
            <div className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm">
              {service.rich_description}
            </div>
          </div>
        )}

        {/* Структурированные блоки из description */}
        {(parsed.included.length > 0 || parsed.bring.length > 0 || parsed.contraindications.length > 0) && (
          <div className="bg-white rounded-2xl p-6 mb-4 shadow-sm space-y-4">
            {parsed.included.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                  <Icon name="CheckCircle2" size={16} className="text-green-500" /> Что входит
                </h3>
                <ul className="space-y-1">
                  {parsed.included.map((item, i) => (
                    <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                      <Icon name="Check" size={14} className="text-green-500 mt-0.5 shrink-0" /> {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {parsed.bring.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                  <Icon name="ShoppingBag" size={16} className="text-blue-500" /> Взять с собой
                </h3>
                <ul className="space-y-1">
                  {parsed.bring.map((item, i) => (
                    <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                      <Icon name="Dot" size={14} className="text-blue-400 mt-0.5 shrink-0" /> {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {parsed.contraindications.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                  <Icon name="AlertTriangle" size={16} className="text-amber-500" /> Противопоказания
                </h3>
                <ul className="space-y-1">
                  {parsed.contraindications.map((item, i) => (
                    <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                      <Icon name="Minus" size={14} className="text-amber-400 mt-0.5 shrink-0" /> {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Видео */}
        {service.video_url && (
          <div className="bg-white rounded-2xl p-6 mb-4 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Видео</h2>
            {embedUrl ? (
              <div className="rounded-xl overflow-hidden aspect-video">
                <iframe
                  src={embedUrl}
                  className="w-full h-full"
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
              </div>
            ) : (
              <a
                href={service.video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-primary hover:underline text-sm"
              >
                <Icon name="Play" size={16} /> Смотреть видео
              </a>
            )}
          </div>
        )}

        {/* Кнопка записаться */}
        <div className="sticky bottom-4">
          <button
            onClick={() => navigate(`/masters/${slug}?service=${service.id}`)}
            className="w-full bg-primary text-white rounded-2xl py-4 text-lg font-semibold shadow-lg hover:bg-primary/90 transition flex items-center justify-center gap-2"
          >
            <Icon name="CalendarCheck" size={22} />
            Записаться — {fmtPrice(service.price)}
          </button>
        </div>
      </main>

      <Footer />
    </div>
  );
}
