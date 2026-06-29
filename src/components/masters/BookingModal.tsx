import { useState } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import Icon from "@/components/ui/icon";
import { masterBookingsApi, MasterService } from "@/lib/master-calendar-api";
import { parseServiceDescription } from "@/lib/service-description";
import MeetingLocationPicker, { MeetingLocation } from "@/components/masters/MeetingLocationPicker";
import { formatPhone, isPhoneComplete } from "@/hooks/usePhoneMask";
import VkConnectBanner from "@/components/shared/VkConnectBanner";
import type { BookingOption } from "@/components/masters/MasterBookingFlow";

function fmt(n: number) {
  return n.toLocaleString("ru-RU");
}

interface BookingModalProps {
  option: BookingOption;
  service: MasterService;
  masterName: string;
  onClose: () => void;
  onSuccess: (chatToken?: string, clientEmail?: string) => void;
}

export function BookingModal({ option, service, masterName, onClose, onSuccess }: BookingModalProps) {
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
        style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 20px)" }}
      >
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
            <div className="text-lg font-bold text-primary mt-1">{fmt(service.price)} ₽</div>
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
          {isAtHome && <MeetingLocationPicker value={meeting} onChange={setMeeting} />}
          {hasContraindications && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3">
              <div className="flex items-start gap-2 mb-2">
                <Icon name="AlertTriangle" size={16} className="text-amber-600 mt-0.5 shrink-0" />
                <div className="text-xs font-semibold text-foreground">Противопоказания к процедуре</div>
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

export function BookingSuccess({ onClose, chatToken, clientEmail, vkId }: { onClose: () => void; chatToken?: string; clientEmail?: string; vkId?: string | null }) {
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

export default BookingModal;
