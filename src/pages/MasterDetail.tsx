import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useParams, Link, Navigate } from "react-router-dom";
import { format, addDays, startOfToday, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import Icon from "@/components/ui/icon";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { mastersApi, Master } from "@/lib/masters-api";
import { masterCalendarApi, masterBookingsApi, MasterService, MasterReview } from "@/lib/master-calendar-api";
import { VideoGallery, VideoItem } from "@/components/video/VideoPlayer";
import { formatPhone, isPhoneComplete } from "@/hooks/usePhoneMask";
import PageShell from "@/components/ui/page-shell";
import MasterBookingFlow, { BookingOption } from "@/components/masters/MasterBookingFlow";
import MeetingLocationPicker, { MeetingLocation } from "@/components/masters/MeetingLocationPicker";
import AskMasterModal from "@/components/master/AskMasterModal";
import { parseServiceDescription } from "@/lib/service-description";
import { formatSlotTime } from "@/lib/masterTime";
import func2url from "../../backend/func2url.json";
import VkConnectBanner from "@/components/shared/VkConnectBanner";

const VIDEOS_API = func2url["media-api"];

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
  // Время мастера: единый канон, см. masterTime.ts
  return formatSlotTime(iso);
}

function fmtDuration(min: number) {
  if (min < 60) return `${min} мин`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} ч ${m} мин` : `${h} ч`;
}

// ─── Форма бронирования ────────────────────────────────────────────────────────

interface BookingModalProps {
  option: BookingOption;
  service: MasterService;
  masterName: string;
  onClose: () => void;
  onSuccess: (chatToken?: string, clientEmail?: string) => void;
}

function BookingModal({ option, service, masterName, onClose, onSuccess }: BookingModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [contraAccepted, setContraAccepted] = useState(false);
  const [meeting, setMeeting] = useState<MeetingLocation>({
    address: "",
    latitude: null,
    longitude: null,
  });

  const parsedDesc = parseServiceDescription(service.description);
  const hasContraindications = parsedDesc.contraindications.length > 0;
  const isAtHome = service.service_format === "at_home";
  const meetingFilled =
    meeting.latitude != null && meeting.longitude != null && !!meeting.address.trim();

  // КАНОН: option.start — это «стенное» время мастера. Отправляем строку без
  // offset — бэкенд (time_utils.parse_client_dt) трактует её как зону мастера.
  const toIsoLocal = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:00`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    if (hasContraindications && !contraAccepted) {
      setError("Подтвердите, что ознакомились с противопоказаниями");
      return;
    }
    if (isAtHome && !meetingFilled) {
      setError("Укажите место проведения встречи на карте");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = (await masterBookingsApi.publicBook({
        slot_id: option.slot.id!,
        service_id: service.id,
        desired_start: toIsoLocal(option.start),
        desired_end: toIsoLocal(option.end),
        client_name: name.trim(),
        client_phone: phone.trim(),
        client_email: email.trim() || undefined,
        comment: comment.trim() || undefined,
        contraindications_accepted: hasContraindications ? contraAccepted : undefined,
        contraindications_snapshot: hasContraindications
          ? parsedDesc.contraindications.join("; ")
          : undefined,
        meeting_address: isAtHome ? meeting.address.trim() : undefined,
        meeting_latitude: isAtHome && meeting.latitude != null ? meeting.latitude : undefined,
        meeting_longitude: isAtHome && meeting.longitude != null ? meeting.longitude : undefined,
      })) as { chat_token?: string };
      onSuccess(res?.chat_token, email.trim() || undefined);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка при бронировании");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative bg-background rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto p-5 sm:p-6"
        style={{
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 20px)',
        }}
      >
        {/* swipe-handle на мобильных */}
        <div className="sm:hidden flex justify-center -mt-2 mb-2">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">Запись к мастеру</h2>
          <button
            onClick={onClose}
            aria-label="Закрыть"
            className="w-10 h-10 -mr-2 inline-flex items-center justify-center rounded-xl hover:bg-muted transition-colors"
          >
            <Icon name="X" size={22} />
          </button>
        </div>

        <div className="bg-muted/60 rounded-xl p-4 mb-5 space-y-1.5 text-sm">
          <div className="font-semibold text-base">{masterName}</div>
          <div className="text-muted-foreground">{service.name}</div>
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-1.5 text-primary font-medium">
              <Icon name="Calendar" size={14} />
              {format(option.start, "d MMMM yyyy", { locale: ru })}
            </div>
            <div className="flex items-center gap-1.5 text-primary font-medium">
              <Icon name="Clock" size={14} />
              {format(option.start, "HH:mm")} — {format(option.end, "HH:mm")}
            </div>
          </div>
          {service.price > 0 && (
            <div className="text-lg font-bold text-primary mt-1">
              {fmt(service.price)} ₽
            </div>
          )}
          {!isAtHome && option.slot.slot_address && (
            <div className="flex items-start gap-1.5 mt-2 pt-2 border-t border-border/60">
              <Icon name="MapPin" size={14} className="text-rose-500 mt-0.5 shrink-0" />
              {option.slot.slot_latitude != null && option.slot.slot_longitude != null ? (
                <a
                  href={`https://yandex.ru/maps/?pt=${option.slot.slot_longitude},${option.slot.slot_latitude}&z=17&l=map`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  {option.slot.slot_address}
                </a>
              ) : (
                <span className="text-sm text-foreground">{option.slot.slot_address}</span>
              )}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-sm font-medium block mb-1.5">Ваше имя *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Иван Иванов"
              required
              autoComplete="name"
              inputMode="text"
              className="w-full px-4 py-3 min-h-[48px] rounded-xl border bg-background text-base outline-none focus:ring-2 focus:ring-primary/30 transition"
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5">Телефон *</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              placeholder="+7(___) ___-__-__"
              required
              autoComplete="tel"
              inputMode="tel"
              className="w-full px-4 py-3 min-h-[48px] rounded-xl border bg-background text-base outline-none focus:ring-2 focus:ring-primary/30 transition"
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              autoComplete="email"
              inputMode="email"
              className="w-full px-4 py-3 min-h-[48px] rounded-xl border bg-background text-base outline-none focus:ring-2 focus:ring-primary/30 transition"
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5">Комментарий</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Пожелания, вопросы..."
              rows={2}
              className="w-full px-4 py-3 rounded-xl border bg-background text-base outline-none focus:ring-2 focus:ring-primary/30 transition resize-none"
            />
          </div>
          {isAtHome && (
            <MeetingLocationPicker value={meeting} onChange={setMeeting} />
          )}
          {hasContraindications && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3">
              <div className="flex items-start gap-2 mb-2">
                <Icon name="AlertTriangle" size={16} className="text-amber-600 mt-0.5 shrink-0" />
                <div className="text-xs font-semibold text-foreground">
                  Противопоказания к процедуре
                </div>
              </div>
              <ul className="space-y-1 mb-3 pl-1">
                {parsedDesc.contraindications.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-foreground/80 leading-relaxed">
                    <Icon name="X" size={12} className="text-amber-600 mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <label className="flex items-start gap-3 cursor-pointer select-none -m-1 p-1 rounded-lg active:bg-amber-500/10 touch-manipulation">
                <input
                  type="checkbox"
                  checked={contraAccepted}
                  onChange={(e) => setContraAccepted(e.target.checked)}
                  className="mt-0.5 w-5 h-5 rounded border-amber-500/60 text-amber-600 focus:ring-amber-500/40 cursor-pointer shrink-0"
                />
                <span className="text-xs text-foreground/90 leading-snug">
                  Я ознакомлен(а) с противопоказаниями и подтверждаю, что они ко мне не относятся. Обязуюсь предупредить мастера о хронических заболеваниях.
                </span>
              </label>
            </div>
          )}
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2">{error}</div>
          )}
          <button
            type="submit"
            disabled={loading || !name.trim() || !isPhoneComplete(phone) || (hasContraindications && !contraAccepted) || (isAtHome && !meetingFilled)}
            className="w-full bg-primary text-primary-foreground min-h-[52px] py-3 rounded-xl font-semibold text-base hover:bg-primary/90 active:scale-[0.99] transition disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Icon name="Loader2" size={18} className="animate-spin" />
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

function BookingSuccess({ onClose, chatToken, clientEmail, vkId }: { onClose: () => void; chatToken?: string; clientEmail?: string; vkId?: string | null }) {
  const hasEmail = clientEmail && !clientEmail.endsWith(".vk.local") && !clientEmail.endsWith("@vk.local");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-background rounded-2xl shadow-xl p-8 text-center max-w-sm mx-4 w-full">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Icon name="Check" size={32} className="text-green-600" />
        </div>
        <h2 className="text-xl font-bold mb-2">Заявка принята!</h2>
        <p className="text-muted-foreground text-sm mb-5">
          Мастер свяжется с вами для подтверждения записи.
          {hasEmail && <> Подтверждение отправлено на {clientEmail}.</>}
        </p>
        <div className="text-left mb-4">
          <VkConnectBanner vkId={vkId} variant="inline" dismissKey="vk_banner_booking" onDismiss={() => {}} />
        </div>
        {chatToken && (
          <a
            href={`/m/${chatToken}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full mb-2 inline-flex items-center justify-center gap-2 border border-primary text-primary py-2.5 rounded-xl font-semibold text-sm hover:bg-primary/5 transition"
          >
            <Icon name="MessageCircle" size={16} />
            Написать мастеру
          </a>
        )}
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
  const { user } = useAuth();
  const { slug } = useParams<{ slug: string }>();
  const [master, setMaster] = useState<Master | null>(null);
  const [services, setServices] = useState<MasterService[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activePhoto, setActivePhoto] = useState(0);
  const [bookingState, setBookingState] = useState<{ option: BookingOption; service: MasterService } | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingChatToken, setBookingChatToken] = useState<string | undefined>(undefined);
  const [bookingClientEmail, setBookingClientEmail] = useState<string | undefined>(undefined);
  const [askOpen, setAskOpen] = useState(false);
  const [extVideos, setExtVideos] = useState<VideoItem[]>([]);
  const [selectedServiceForFlow, setSelectedServiceForFlow] = useState<number | null>(null);
  const [bookingVisible, setBookingVisible] = useState(false);
  const [bookingRefreshKey, setBookingRefreshKey] = useState(0);

  // Прячем плавающую кнопку «Записаться», когда виджет бронирования виден.
  useEffect(() => {
    const target = document.querySelector("[data-section='schedule']");
    if (!target) return;
    const io = new IntersectionObserver(
      ([entry]) => setBookingVisible(entry.isIntersecting),
      { threshold: 0.15 }
    );
    io.observe(target);
    return () => io.disconnect();
  }, [services.length]);

  useEffect(() => {
    if (!slug) return;
    mastersApi
      .getBySlug(slug)
      .then((m) => {
        setMaster(m);
        fetch(`${VIDEOS_API}/?videos=1&owner_type=master&owner_id=${m.id}`)
          .then((r) => r.json())
          .then((d) => setExtVideos(d.videos || []))
          .catch(() => {});
        return masterCalendarApi.getServices(m.id);
      })
      .then((svcs) => setServices(svcs.filter((s) => s.is_active)))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  if (notFound) return <Navigate to="/masters" replace />;

  if (loading || !master) {
    return (
      <PageShell className="flex items-center justify-center">
        <Icon name="Loader2" size={32} className="animate-spin text-muted-foreground" />
      </PageShell>
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

  const handleBookSuccess = (chatToken?: string, clientEmail?: string) => {
    setBookingState(null);
    setBookingChatToken(chatToken);
    setBookingClientEmail(clientEmail);
    setBookingSuccess(true);
    setBookingRefreshKey((k) => k + 1);
  };

  const scrollToBooking = () => {
    document.querySelector("[data-section='schedule']")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <PageShell>
      <Header transparent />

      {/* ── Хлебные крошки ──────────────────────────────────────────────── */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link to="/masters" className="hover:text-foreground transition-colors">Мастера</Link>
          <Icon name="ChevronRight" size={12} />
          <span className="text-foreground/80">{master.name}</span>
        </div>
      </div>

      {/* ── Основной layout ──────────────────────────────────────────────── */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="flex flex-col lg:flex-row gap-10">

          {/* Левая колонка 70% */}
          <div className="flex-1 min-w-0">

            {/* Цитата */}
            {master.tagline && (
              <p className="text-lg text-muted-foreground italic mb-6 border-l-4 border-primary/30 pl-4">
                {master.tagline}
              </p>
            )}

            {/* О мастере: фото-кружок + имя + город + биография */}
            <div className="mb-8">
              <div className="flex items-start gap-4 mb-4">
                {/* Фото в кружочке */}
                <div className="relative shrink-0">
                  <div
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden ring-2 ring-primary/20 shadow-md"
                  >
                    <img
                      src={master.avatar || photoUrls[0]}
                      alt={master.name}
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                  {master.is_verified && (
                    <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-background flex items-center justify-center shadow-sm">
                      <Icon name="BadgeCheck" size={20} className="text-primary" />
                    </div>
                  )}
                </div>

                {/* Имя + город в стиле главной */}
                <div className="min-w-0 flex-1 pt-1">
                  <h1
                    className="font-bold text-xl sm:text-2xl leading-tight mb-1"
                    style={{ color: "var(--c-cream)" }}
                  >
                    {master.name}
                  </h1>
                  <div
                    className="flex items-center gap-3 text-xs flex-wrap"
                    style={{ color: "var(--c-muted)" }}
                  >
                    <span className="flex items-center gap-1">
                      <Icon name="MapPin" size={11} />
                      {master.city}
                    </span>
                    {master.experience_years > 0 && (
                      <span className="flex items-center gap-1">
                        <Icon name="Award" size={11} style={{ color: "var(--c-terra)" } as React.CSSProperties} />
                        <span style={{ color: "var(--c-cream)" }}>{master.experience_years}</span>
                        {getYearWord(master.experience_years)} опыта
                      </span>
                    )}
                    {master.rating > 0 && (
                      <span className="flex items-center gap-1">
                        <Icon name="Star" size={11} style={{ color: "#F59E0B", fill: "#F59E0B" } as React.CSSProperties} />
                        <span className="font-semibold" style={{ color: "#F59E0B" }}>{master.rating.toFixed(1)}</span>
                        {master.reviews_count > 0 && <span>({master.reviews_count})</span>}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {master.bio && (
                <>
                  <h2 className="text-lg font-semibold mb-3">О мастере</h2>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{master.bio}</p>
                </>
              )}
            </div>

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

            {/* Запись на сеанс — виджет с датами */}
            {services.length > 0 && (
              <div className="mb-8" data-section="schedule" id="booking-flow-section">
                <MasterBookingFlow
                  masterId={master.id}
                  services={services}
                  preselectedServiceId={selectedServiceForFlow}
                  refreshKey={bookingRefreshKey}
                  onBookSlot={(option, service) => setBookingState({ option, service })}
                />
              </div>
            )}

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

            {/* Видео */}
            {extVideos.length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold mb-4">Видео</h2>
                <VideoGallery videos={extVideos} />
              </div>
            )}

            {/* Отзывы (на мобильных) */}
            <div className="lg:hidden">
              <ReviewsBlock masterId={master.id} rating={master.rating} reviewsCount={master.reviews_count} />
            </div>

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

          {/* Правая колонка 30% — контакты + отзывы */}
          <div className="lg:w-[300px] flex-shrink-0">
            <div className="lg:sticky lg:top-24 space-y-4">

              {/* Контакты */}
              <div className="bg-card border border-border rounded-2xl p-5 space-y-2">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-3">Связаться</p>
                <button
                  onClick={() => setAskOpen(true)}
                  className="flex items-center gap-3 w-full bg-primary/10 text-primary px-4 py-3 rounded-xl text-sm font-medium hover:bg-primary/15 transition-colors"
                >
                  <Icon name="MessageCircleQuestion" size={16} />
                  Задать вопрос мастеру
                </button>
                {master.phone && (
                  <a
                    href={`tel:${master.phone}`}
                    className="flex items-center gap-3 w-full bg-muted px-4 py-3 rounded-xl text-sm font-medium hover:bg-muted/80 transition-colors"
                  >
                    <Icon name="Phone" size={16} />
                    Позвонить
                  </a>
                )}
                {master.telegram && (
                  <a
                    href={`https://t.me/${master.telegram.replace("@", "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 w-full bg-muted px-4 py-3 rounded-xl text-sm font-medium hover:bg-muted/80 transition-colors"
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

              {/* Отзывы (десктоп) */}
              <div className="hidden lg:block">
                <ReviewsBlock masterId={master.id} rating={master.rating} reviewsCount={master.reviews_count} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />

      {/* Плавающая кнопка «Записаться» на мобильных — прячется, когда виджет уже виден */}
      {services.length > 0 && !bookingVisible && !bookingState && (
        <div
          className="lg:hidden fixed left-0 right-0 flex justify-center z-40 pointer-events-none px-4 transition-opacity"
          style={{ bottom: 'max(env(safe-area-inset-bottom, 16px), 16px)' }}
        >
          <button
            onClick={scrollToBooking}
            className="pointer-events-auto flex items-center gap-2 bg-primary text-primary-foreground px-8 min-h-[52px] py-3.5 rounded-2xl text-base font-semibold shadow-lg shadow-primary/30 hover:bg-primary/90 transition-all active:scale-95 touch-manipulation"
          >
            <Icon name="CalendarCheck" size={20} />
            Записаться
          </button>
        </div>
      )}

      {/* Модалка бронирования */}
      {bookingState && (
        <BookingModal
          option={bookingState.option}
          service={bookingState.service}
          masterName={master.name}
          onClose={() => setBookingState(null)}
          onSuccess={handleBookSuccess}
        />
      )}

      {/* Успех */}
      {bookingSuccess && (
        <BookingSuccess
          onClose={() => setBookingSuccess(false)}
          chatToken={bookingChatToken}
          clientEmail={bookingClientEmail}
          vkId={user?.vk_id}
        />
      )}

      {/* Вопрос мастеру */}
      <AskMasterModal
        open={askOpen}
        masterId={master.id}
        masterName={master.name}
        onClose={() => setAskOpen(false)}
      />
    </PageShell>
  );
}