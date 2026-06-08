import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { MasterBooking } from "@/lib/master-calendar-api";

type StatusAction = "confirm" | "complete" | "no_show" | "cancel";

interface Props {
  date: Date;
  bookings: MasterBooking[];
  timezone: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onChangeStatus: (bookingId: number, action: StatusAction) => void;
}

const STATUS_META: Record<string, { label: string; dot: string; cls: string }> = {
  pending:   { label: "Ждёт",        dot: "bg-amber-400",  cls: "bg-amber-50 text-amber-700 border-amber-200" },
  confirmed: { label: "Подтверждена", dot: "bg-green-500",  cls: "bg-green-50 text-green-700 border-green-200" },
  completed: { label: "Завершена",    dot: "bg-blue-500",   cls: "bg-blue-50 text-blue-700 border-blue-200" },
  canceled:  { label: "Отменена",     dot: "bg-red-400",    cls: "bg-red-50 text-red-600 border-red-200" },
  no_show:   { label: "Не пришёл",    dot: "bg-gray-400",   cls: "bg-gray-50 text-gray-500 border-gray-200" },
};

const fmtTime = (iso: string, tz: string) =>
  new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", timeZone: tz });

const fmtDayTitle = (d: Date, tz: string) =>
  d.toLocaleDateString("ru-RU", { weekday: "short", day: "numeric", month: "short", timeZone: tz });

export default function AgendaView({ date, bookings, timezone, onPrev, onNext, onToday, onChangeStatus }: Props) {
  const tz = timezone || "Europe/Moscow";
  const dayKey = useMemo(
    () => new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(date),
    [date, tz],
  );

  // Брони этого дня (по экранной зоне мастера), без отменённых сверху — но показываем все
  const dayBookings = useMemo(() => {
    return bookings
      .filter((b) => new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date(b.datetime_start)) === dayKey)
      .sort((a, b) => a.datetime_start.localeCompare(b.datetime_start));
  }, [bookings, dayKey, tz]);

  const active = dayBookings.filter((b) => b.status === "pending" || b.status === "confirmed");
  const revenue = active.reduce((s, b) => s + (b.price || 0), 0);
  const next = active.find((b) => new Date(b.datetime_start).getTime() >= Date.now());

  const contact = (phone: string | undefined, kind: "call" | "wa" | "tg") => {
    const p = (phone || "").replace(/\D/g, "");
    if (!p) return;
    if (kind === "call") window.open(`tel:+${p}`, "_self");
    if (kind === "wa") window.open(`https://wa.me/${p}`, "_blank");
    if (kind === "tg") window.open(`https://t.me/+${p}`, "_blank");
  };

  return (
    <div className="space-y-4">
      {/* Навигация по дням */}
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" className="px-2" onClick={onPrev}><Icon name="ChevronLeft" size={16} /></Button>
        <Button size="sm" variant="outline" className="px-3 capitalize font-semibold" onClick={onToday}>{fmtDayTitle(date, tz)}</Button>
        <Button size="sm" variant="outline" className="px-2" onClick={onNext}><Icon name="ChevronRight" size={16} /></Button>
      </div>

      {/* Сводка дня */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border bg-card p-3 text-center">
          <div className="text-2xl font-bold">{active.length}</div>
          <div className="text-[11px] text-muted-foreground">записей</div>
        </div>
        <div className="rounded-xl border bg-card p-3 text-center">
          <div className="text-2xl font-bold text-green-600 truncate">{Math.round(revenue).toLocaleString("ru-RU")}</div>
          <div className="text-[11px] text-muted-foreground">₽ за день</div>
        </div>
        <div className="rounded-xl border bg-card p-3 text-center">
          <div className="text-2xl font-bold text-amber-600">{dayBookings.filter((b) => b.status === "pending").length}</div>
          <div className="text-[11px] text-muted-foreground">ждут</div>
        </div>
      </div>

      {next && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 flex items-center gap-3">
          <Icon name="ArrowRight" size={16} className="text-primary shrink-0" />
          <div className="text-sm min-w-0">
            <span className="text-muted-foreground">Следующий: </span>
            <span className="font-semibold">{fmtTime(next.datetime_start, tz)}</span>
            {" · "}
            <span className="truncate">{next.client_name}</span>
          </div>
        </div>
      )}

      {/* Список записей */}
      {dayBookings.length === 0 ? (
        <div className="text-center py-12 text-sm text-muted-foreground">
          <Icon name="CalendarOff" size={32} className="mx-auto mb-2 opacity-30" />
          На этот день записей нет
        </div>
      ) : (
        <div className="space-y-2">
          {dayBookings.map((b) => {
            const meta = STATUS_META[b.status] || STATUS_META.pending;
            const isActive = b.status === "pending" || b.status === "confirmed";
            return (
              <div key={b.id} className={`rounded-xl border p-3 ${b.status === "canceled" || b.status === "no_show" ? "opacity-60" : ""}`}>
                <div className="flex items-start gap-3">
                  {/* Время */}
                  <div className="text-center shrink-0 w-14">
                    <div className="text-sm font-bold">{fmtTime(b.datetime_start, tz)}</div>
                    <div className="text-[11px] text-muted-foreground">{fmtTime(b.datetime_end, tz)}</div>
                  </div>
                  <div className="w-px self-stretch bg-border" />
                  {/* Инфо */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm truncate">{b.client_name}</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${meta.cls}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                        {meta.label}
                      </span>
                    </div>
                    {b.service_name && (
                      <div className="text-xs text-muted-foreground mt-0.5">{b.service_name}{b.price ? ` · ${b.price.toLocaleString("ru-RU")} ₽` : ""}</div>
                    )}
                    {b.comment && <div className="text-xs italic text-muted-foreground mt-0.5">«{b.comment}»</div>}

                    {/* Контакт */}
                    {b.client_phone && (
                      <div className="flex gap-1.5 mt-2">
                        <button onClick={() => contact(b.client_phone, "call")} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-xs hover:bg-muted transition-colors" title="Позвонить">
                          <Icon name="Phone" size={12} className="text-blue-600" />
                        </button>
                        <button onClick={() => contact(b.client_phone, "wa")} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-xs hover:bg-muted transition-colors" title="WhatsApp">
                          <Icon name="MessageCircle" size={12} className="text-green-600" />
                        </button>
                        <button onClick={() => contact(b.client_phone, "tg")} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-xs hover:bg-muted transition-colors" title="Telegram">
                          <Icon name="Send" size={12} className="text-sky-500" />
                        </button>
                      </div>
                    )}

                    {/* Статусы */}
                    {isActive && b.id && (
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        {b.status === "pending" && (
                          <button onClick={() => onChangeStatus(b.id!, "confirm")} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700 transition-colors">
                            <Icon name="Check" size={12} /> Подтвердить
                          </button>
                        )}
                        <button onClick={() => onChangeStatus(b.id!, "complete")} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs hover:bg-muted transition-colors">
                          <Icon name="CircleCheckBig" size={12} className="text-blue-600" /> Завершена
                        </button>
                        <button onClick={() => onChangeStatus(b.id!, "no_show")} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs hover:bg-muted transition-colors">
                          <Icon name="UserX" size={12} className="text-gray-500" /> Не пришёл
                        </button>
                        <button onClick={() => onChangeStatus(b.id!, "cancel")} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs text-red-600 hover:bg-red-50 transition-colors">
                          <Icon name="X" size={12} /> Отменить
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}