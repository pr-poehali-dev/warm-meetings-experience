import { useState, useEffect, useCallback } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { format, addDays, startOfToday, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import Icon from "@/components/ui/icon";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { mastersApi, Master } from "@/lib/masters-api";
import { masterCalendarApi, masterBookingsApi, MasterService, MasterSlot, MasterReview } from "@/lib/master-calendar-api";

// ─── Утилиты ──────────────────────────────────────────────────────────────────

function StarRating({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <Icon
          key={s}
          name="Star"
          size={size}
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

function fmt(n: number) {
  return n.toLocaleString("ru-RU");
}

function fmtTime(iso: string) {
  return format(parseISO(iso), "HH:mm");
}

function fmtDuration(min: number) {
  if (min < 60) return `${min} мин`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} ч ${m} мин` : `${h} ч`;
}

// ─── Форма бронирования ────────────────────────────────────────────────────────

interface BookingModalProps {
  slot: MasterSlot;
  service: MasterService | null;
  masterName: string;
  onClose: () => void;
  onSuccess: () => void;
}

function BookingModal({ slot, service, masterName, onClose, onSuccess }: BookingModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    setLoading(true);
    setError("");
    try {
      await masterBookingsApi.publicBook({
        slot_id: slot.id!,
        client_name: name.trim(),
        client_phone: phone.trim(),
        client_email: email.trim() || undefined,
        comment: comment.trim() || undefined,
      });
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка при бронировании");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-background rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">Запись к мастеру</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted transition-colors">
            <Icon name="X" size={20} />
          </button>
        </div>

        <div className="bg-muted/60 rounded-xl p-4 mb-5 space-y-1.5 text-sm">
          <div className="font-semibold text-base">{masterName}</div>
          {service && <div className="text-muted-foreground">{service.name}</div>}
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-1.5 text-primary font-medium">
              <Icon name="Calendar" size={14} />
              {format(parseISO(slot.datetime_start), "d MMMM yyyy", { locale: ru })}
            </div>
            <div className="flex items-center gap-1.5 text-primary font-medium">
              <Icon name="Clock" size={14} />
              {fmtTime(slot.datetime_start)} — {fmtTime(slot.datetime_end)}
            </div>
          </div>
          {(slot.service_price || service?.price) && (
            <div className="text-lg font-bold text-primary mt-1">
              {fmt(slot.service_price || service!.price)} ₽
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-sm font-medium block mb-1">Ваше имя *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Иван Иванов"
              required
              className="w-full px-3 py-2.5 rounded-xl border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30 transition"
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Телефон *</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+7 (999) 000-00-00"
              required
              className="w-full px-3 py-2.5 rounded-xl border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30 transition"
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-3 py-2.5 rounded-xl border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30 transition"
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Комментарий</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Пожелания, вопросы..."
              rows={2}
              className="w-full px-3 py-2.5 rounded-xl border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30 transition resize-none"
            />
          </div>
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2">{error}</div>
          )}
          <button
            type="submit"
            disabled={loading || !name.trim() || !phone.trim()}
            className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold text-sm hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Icon name="Loader2" size={16} className="animate-spin" />
                Отправляем...
              </span>
            ) : (
              "Записаться"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Успех бронирования ────────────────────────────────────────────────────────

function BookingSuccess({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-background rounded-2xl shadow-xl p-8 text-center max-w-sm mx-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Icon name="Check" size={32} className="text-green-600" />
        </div>
        <h2 className="text-xl font-bold mb-2">Заявка принята!</h2>
        <p className="text-muted-foreground text-sm mb-5">
          Мастер свяжется с вами для подтверждения записи.
        </p>
        <button
          onClick={onClose}
          className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl font-semibold text-sm hover:bg-primary/90 transition"
        >
          Отлично
        </button>
      </div>
    </div>
  );
}

// ─── Блок услуг ───────────────────────────────────────────────────────────────

function ServicesBlock({
  services,
  selectedId,
  onSelect,
}: {
  services: MasterService[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
}) {
  if (!services.length) return null;
  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold mb-4">Услуги и цены</h2>
      <div className="space-y-3">
        {services.map((s) => (
          <div
            key={s.id}
            onClick={() => onSelect(selectedId === s.id ? null : s.id!)}
            className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
              selectedId === s.id
                ? "border-primary bg-primary/5"
                : "border-border hover:bg-muted/50"
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">{s.name}</div>
              {s.description && (
                <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{s.description}</div>
              )}
              <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Icon name="Clock" size={11} />
                  {fmtDuration(s.duration_minutes)}
                </span>
                {s.max_clients > 1 && (
                  <span className="flex items-center gap-1">
                    <Icon name="Users" size={11} />
                    до {s.max_clients} чел.
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 ml-4 flex-shrink-0">
              <div className="text-right">
                <div className="font-bold text-primary">{fmt(s.price)} ₽</div>
              </div>
              {selectedId === s.id && (
                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <Icon name="Check" size={12} className="text-primary-foreground" />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      {selectedId && (
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Нажмите на услугу ещё раз, чтобы показать все слоты
        </p>
      )}
    </div>
  );
}

// ─── Расписание ───────────────────────────────────────────────────────────────

const DAYS_COUNT = 14;

function ScheduleBlock({
  masterId,
  serviceId,
  services,
  onBookSlot,
}: {
  masterId: number;
  serviceId: number | null;
  services: MasterService[];
  onBookSlot: (slot: MasterSlot) => void;
}) {
  const today = startOfToday();
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [slots, setSlots] = useState<MasterSlot[]>([]);
  const [loading, setLoading] = useState(false);

  const days = Array.from({ length: DAYS_COUNT }, (_, i) => addDays(today, i));

  const loadSlots = useCallback(async () => {
    setLoading(true);
    try {
      const from = format(today, "yyyy-MM-dd");
      const data = await masterBookingsApi.getPublicSlots(
        masterId,
        from,
        serviceId ?? undefined
      );
      setSlots(data);
    } catch {
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }, [masterId, serviceId]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  const dayKey = (d: Date) => format(d, "yyyy-MM-dd");

  const slotsForDay = slots.filter(
    (s) => s.datetime_start.startsWith(dayKey(selectedDate)) && s.status === "available"
  );

  const hasSlots = (d: Date) =>
    slots.some((s) => s.datetime_start.startsWith(dayKey(d)) && s.status === "available");

  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold mb-4">Расписание</h2>

      {/* Список дат */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-0.5 px-0.5">
        {days.map((d) => {
          const isSelected = dayKey(d) === dayKey(selectedDate);
          const hasFree = hasSlots(d);
          return (
            <button
              key={dayKey(d)}
              onClick={() => setSelectedDate(d)}
              className={`flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : hasFree
                  ? "bg-muted hover:bg-muted/80 text-foreground"
                  : "bg-muted/40 text-muted-foreground"
              }`}
            >
              <span className="text-[10px] uppercase opacity-70">
                {format(d, "EEE", { locale: ru })}
              </span>
              <span className="text-base font-bold leading-tight">{format(d, "d")}</span>
              {hasFree && !isSelected && (
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-0.5" />
              )}
            </button>
          );
        })}
      </div>

      {/* Слоты выбранного дня */}
      <div className="mt-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <Icon name="Loader2" size={24} className="animate-spin text-muted-foreground" />
          </div>
        ) : slotsForDay.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <Icon name="CalendarX" size={32} className="mx-auto mb-2 opacity-30" />
            Нет свободных слотов
            <br />
            <span className="text-xs">Выберите другую дату или свяжитесь с мастером</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {slotsForDay.map((slot) => {
              const svc = services.find((s) => s.id === slot.service_id);
              const free = slot.max_clients - slot.booked_count;
              return (
                <button
                  key={slot.id}
                  onClick={() => onBookSlot(slot)}
                  className="flex flex-col items-start p-3 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all text-left group"
                >
                  <div className="font-semibold text-sm group-hover:text-primary transition-colors">
                    {fmtTime(slot.datetime_start)} — {fmtTime(slot.datetime_end)}
                  </div>
                  {svc && (
                    <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{svc.name}</div>
                  )}
                  <div className="flex items-center justify-between w-full mt-2">
                    {(slot.service_price || svc?.price) ? (
                      <span className="text-xs font-bold text-primary">
                        {fmt(slot.service_price || svc!.price)} ₽
                      </span>
                    ) : <span />}
                    {free > 0 && slot.max_clients > 1 && (
                      <span className="text-[10px] text-muted-foreground">
                        {free} мест
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Отзывы ───────────────────────────────────────────────────────────────────

function ReviewsBlock({ masterId, rating }: { masterId: number; rating: number; reviewsCount: number }) {
  const [reviews, setReviews] = useState<MasterReview[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formRating, setFormRating] = useState(5);
  const [formText, setFormText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoadingReviews(true);
    try {
      const data = await masterBookingsApi.getReviews(masterId);
      setReviews(data);
    } catch {
      setReviews([]);
    } finally {
      setLoadingReviews(false);
    }
  }, [masterId]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      await masterBookingsApi.createReview({
        master_id: masterId,
        client_name: formName.trim(),
        client_phone: formPhone.trim() || undefined,
        rating: formRating,
        text: formText.trim() || undefined,
      });
      setSubmitted(true);
      setShowForm(false);
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка при отправке");
    } finally {
      setSubmitting(false);
    }
  };

  const displayRating = reviews.length > 0
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : rating;

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Отзывы</h2>
        <div className="flex items-center gap-3">
          {reviews.length > 0 && (
            <div className="flex items-center gap-2">
              <StarRating rating={displayRating} />
              <span className="text-sm text-muted-foreground">({reviews.length})</span>
            </div>
          )}
          {!submitted && (
            <button
              onClick={() => setShowForm((v) => !v)}
              className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
            >
              <Icon name="PenLine" size={13} />
              {showForm ? "Отмена" : "Написать отзыв"}
            </button>
          )}
        </div>
      </div>

      {/* Форма отзыва */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-muted/50 rounded-xl p-4 mb-4 space-y-3">
          <div>
            <label className="text-xs font-medium block mb-1">Ваше имя *</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Иван"
              required
              className="w-full px-3 py-2 rounded-xl border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30 transition"
            />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1">Телефон (необязательно)</label>
            <input
              type="tel"
              value={formPhone}
              onChange={(e) => setFormPhone(e.target.value)}
              placeholder="+7 (999) 000-00-00"
              className="w-full px-3 py-2 rounded-xl border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30 transition"
            />
          </div>
          <div>
            <label className="text-xs font-medium block mb-2">Оценка *</label>
            <div className="flex gap-1">
              {[1,2,3,4,5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setFormRating(s)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Icon
                    name="Star"
                    size={24}
                    className={s <= formRating ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"}
                  />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium block mb-1">Отзыв</label>
            <textarea
              value={formText}
              onChange={(e) => setFormText(e.target.value)}
              placeholder="Расскажите о своих впечатлениях..."
              rows={3}
              className="w-full px-3 py-2 rounded-xl border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30 transition resize-none"
            />
          </div>
          {error && <div className="text-xs text-destructive">{error}</div>}
          <button
            type="submit"
            disabled={submitting || !formName.trim()}
            className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl font-semibold text-sm hover:bg-primary/90 transition disabled:opacity-50"
          >
            {submitting ? "Отправляем..." : "Оставить отзыв"}
          </button>
        </form>
      )}

      {submitted && (
        <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3 mb-4 flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
          <Icon name="CheckCircle" size={16} />
          Спасибо за ваш отзыв!
        </div>
      )}

      {loadingReviews ? (
        <div className="flex justify-center py-6">
          <Icon name="Loader2" size={24} className="animate-spin text-muted-foreground" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          <Icon name="MessageSquare" size={32} className="mx-auto mb-2 opacity-30" />
          Пока нет отзывов — будьте первым!
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="bg-muted/50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-bold text-primary">
                    {r.client_name[0].toUpperCase()}
                  </div>
                  <span className="font-medium text-sm">{r.client_name}</span>
                </div>
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map((s) => (
                    <Icon key={s} name="Star" size={12} className={s <= r.rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"} />
                  ))}
                </div>
              </div>
              {r.text && <p className="text-sm text-muted-foreground leading-relaxed">{r.text}</p>}
              <div className="text-xs text-muted-foreground mt-2">
                {format(parseISO(r.created_at), "d MMMM yyyy", { locale: ru })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Главная страница ─────────────────────────────────────────────────────────

export default function MasterDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [master, setMaster] = useState<Master | null>(null);
  const [services, setServices] = useState<MasterService[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activePhoto, setActivePhoto] = useState(0);
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [bookingSlot, setBookingSlot] = useState<MasterSlot | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  useEffect(() => {
    if (!slug) return;
    mastersApi
      .getBySlug(slug)
      .then((m) => {
        setMaster(m);
        return masterCalendarApi.getServices(m.id);
      })
      .then((svcs) => setServices(svcs.filter((s) => s.is_active)))
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

  const selectedService = services.find((s) => s.id === selectedServiceId) ?? null;

  const handleBookSuccess = () => {
    setBookingSlot(null);
    setBookingSuccess(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Фотогалерея */}
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

          {/* Основной контент */}
          <div className="flex-1 min-w-0">
            {/* Хлебные крошки */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <Link to="/masters" className="hover:text-foreground transition-colors">Мастера</Link>
              <Icon name="ChevronRight" size={14} />
              <span className="text-foreground">{master.name}</span>
            </div>

            {/* Специализации — теги */}
            {(master.specializations || []).length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {master.specializations!.map((s) => (
                  <span key={s.id} className="text-sm bg-primary/10 text-primary px-3 py-1 rounded-full">
                    {s.name}
                  </span>
                ))}
              </div>
            )}

            {/* Имя + бейдж */}
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl md:text-4xl font-bold">{master.name}</h1>
              {master.is_verified && (
                <div className="flex items-center gap-1 text-primary text-sm font-medium">
                  <Icon name="BadgeCheck" size={20} className="text-primary" />
                  Проверен
                </div>
              )}
            </div>

            {/* Мета-строка */}
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

            {/* Цитата */}
            {master.tagline && (
              <p className="text-lg text-muted-foreground italic mb-6 border-l-4 border-primary/30 pl-4">
                {master.tagline}
              </p>
            )}

            {/* Биография */}
            {master.bio && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold mb-3">О мастере</h2>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{master.bio}</p>
              </div>
            )}

            {/* Специализации — детально */}
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

            {/* Услуги и цены */}
            <ServicesBlock
              services={services}
              selectedId={selectedServiceId}
              onSelect={setSelectedServiceId}
            />

            {/* Расписание */}
            <ScheduleBlock
              masterId={master.id}
              serviceId={selectedServiceId}
              services={services}
              onBookSlot={setBookingSlot}
            />

            {/* Портфолио */}
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

            {/* Отзывы */}
            <ReviewsBlock masterId={master.id} rating={master.rating} reviewsCount={master.reviews_count} />

            {/* Бани */}
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

          {/* Правая колонка — контакты */}
          <div className="lg:w-[300px] flex-shrink-0">
            <div className="lg:sticky lg:top-24 space-y-4">
              <div className="bg-card border border-border rounded-2xl p-6">
                {master.price_from > 0 && (
                  <div className="mb-4">
                    <div className="text-3xl font-bold text-primary">
                      {fmt(master.price_from)} ₽
                    </div>
                    <div className="text-sm text-muted-foreground">от / за сеанс</div>
                  </div>
                )}

                {services.length > 0 && (
                  <button
                    onClick={() => {
                      document.querySelector("[data-section='schedule']")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="flex items-center justify-center gap-2 w-full bg-primary text-primary-foreground px-4 py-3 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors mb-3"
                  >
                    <Icon name="CalendarCheck" size={16} />
                    Записаться
                  </button>
                )}

                {master.phone && (
                  <a
                    href={`tel:${master.phone}`}
                    className="flex items-center gap-3 w-full bg-muted px-4 py-3 rounded-xl text-sm font-medium hover:bg-muted/80 transition-colors mb-3"
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

      {/* Модалка бронирования */}
      {bookingSlot && (
        <BookingModal
          slot={bookingSlot}
          service={selectedService}
          masterName={master.name}
          onClose={() => setBookingSlot(null)}
          onSuccess={handleBookSuccess}
        />
      )}

      {/* Успех */}
      {bookingSuccess && (
        <BookingSuccess onClose={() => setBookingSuccess(false)} />
      )}
    </div>
  );
}