import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MasterBooking, MasterSlot, DayBlock } from "@/lib/master-calendar-api";

export interface QuickEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  kind: "booking" | "block" | "break";
  raw?: MasterBooking | MasterSlot | DayBlock;
}

export type BookingStatusAction = "confirm" | "complete" | "no_show";

interface Props {
  event: QuickEvent;
  anchor: { x: number; y: number };
  timezone?: string;
  onClose: () => void;
  onCancelBooking: (bookingId: number) => void;
  onDeleteSlot: (slotId: number) => void;
  onDeleteBlock?: (blockId: number) => void;
  onChangeStatus?: (bookingId: number, action: BookingStatusAction) => void;
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
  pending:   { label: "Ждёт подтверждения", cls: "bg-amber-100 text-amber-700" },
  confirmed: { label: "Подтверждена",        cls: "bg-green-100 text-green-700" },
  completed: { label: "Завершена",           cls: "bg-blue-100 text-blue-700" },
  canceled:  { label: "Отменена",            cls: "bg-red-100 text-red-700" },
  no_show:   { label: "Не пришёл",           cls: "bg-gray-200 text-gray-600" },
};

// Форматируем в ЭКРАННОМ времени мастера (явный timeZone), а не браузера.
const fmtRange = (s: Date, e: Date, tz: string) =>
  `${s.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", timeZone: tz })}\u00A0–\u00A0${e.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", timeZone: tz })}`;

const fmtDate = (d: Date, tz: string) =>
  d.toLocaleDateString("ru-RU", { weekday: "long", day: "2-digit", month: "long", timeZone: tz });

function useIsMobile() {
  const [m, setM] = useState(false);
  useEffect(() => {
    const check = () => setM(window.matchMedia("(max-width: 640px)").matches);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return m;
}

export default function QuickActionsPopover({ event, anchor, timezone, onClose, onCancelBooking, onDeleteSlot, onDeleteBlock, onChangeStatus }: Props) {
  const isMobile = useIsMobile();
  const tz = timezone || "Europe/Moscow";
  const booking = event.kind === "booking" ? (event.raw as MasterBooking | undefined) : undefined;
  const phone = (booking?.client_phone || "").replace(/\D/g, "");
  const status = booking?.status;
  const isActive = status === "pending" || status === "confirmed";

  const call = () => phone && window.open(`tel:+${phone}`, "_self");
  const whatsapp = () => phone && window.open(`https://wa.me/${phone}`, "_blank");
  const telegram = () => phone && window.open(`https://t.me/+${phone}`, "_blank");

  const changeStatus = (action: BookingStatusAction) => {
    if (booking?.id && onChangeStatus) onChangeStatus(booking.id, action);
  };

  const handleCancel = () => {
    if (event.kind === "booking" && booking?.id) {
      onCancelBooking(booking.id);
      return;
    }
    // Выходной целого дня (master_day_blocks) — id вида "blk-{id}"
    if (event.id.startsWith("blk-")) {
      const bid = Number(event.id.slice(4));
      if (!Number.isNaN(bid) && onDeleteBlock) onDeleteBlock(bid);
      return;
    }
    // Слот (blocked / event = перерыв) — id вида "s-{id}"
    if (event.id.startsWith("s-")) {
      const sid = Number(event.id.slice(2));
      if (!Number.isNaN(sid)) onDeleteSlot(sid);
    }
  };

  const content = (
    <div className="space-y-3">
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-base">{event.title}</span>
          {booking && status && STATUS_META[status] && (
            <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_META[status].cls}`}>
              {STATUS_META[status].label}
            </span>
          )}
        </div>
        <div className="text-xs text-muted-foreground capitalize">{fmtDate(event.start, tz)} · {fmtRange(event.start, event.end, tz)}</div>
        {booking?.service_name && (
          <div className="text-xs text-muted-foreground mt-1">{booking.service_name}{booking.price ? ` · ${booking.price} ₽` : ""}</div>
        )}
        {booking?.client_phone && (
          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <Icon name="Phone" size={11} />
            {booking.client_phone}
          </div>
        )}
        {booking?.comment && (
          <div className="text-xs italic text-muted-foreground mt-1">«{booking.comment}»</div>
        )}
      </div>

      {/* Быстрый контакт с клиентом */}
      {event.kind === "booking" && phone && (
        <div className="flex gap-1.5">
          <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={call} title="Позвонить">
            <Icon name="Phone" size={14} className="text-blue-600" />
            <span className="hidden xs:inline">Звонок</span>
          </Button>
          <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={whatsapp} title="WhatsApp">
            <Icon name="MessageCircle" size={14} className="text-green-600" />
            WA
          </Button>
          <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={telegram} title="Telegram">
            <Icon name="Send" size={14} className="text-sky-500" />
            TG
          </Button>
        </div>
      )}

      {/* Смена статуса записи */}
      {event.kind === "booking" && isActive && onChangeStatus && (
        <div className="flex flex-col gap-1.5 border-t pt-2.5">
          {status === "pending" && (
            <Button size="sm" className="justify-start gap-2 bg-green-600 hover:bg-green-700 text-white" onClick={() => changeStatus("confirm")}>
              <Icon name="Check" size={14} />
              Подтвердить запись
            </Button>
          )}
          <div className="flex gap-1.5">
            <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={() => changeStatus("complete")}>
              <Icon name="CircleCheckBig" size={14} className="text-blue-600" />
              Завершена
            </Button>
            <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={() => changeStatus("no_show")}>
              <Icon name="UserX" size={14} className="text-gray-500" />
              Не пришёл
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5 border-t pt-2.5">
        {!event.id.startsWith("blk-") && (
          <Button size="sm" variant="ghost" className="justify-start gap-2 text-muted-foreground" onClick={onClose}>
            <Icon name="Move" size={14} />
            Перенести <span className="text-xs ml-auto">перетащите блок</span>
          </Button>
        )}
        <Button size="sm" variant="ghost" className="justify-start gap-2 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={handleCancel}>
          <Icon name="X" size={14} />
          {event.kind === "booking" ? "Отменить запись" : "Удалить"}
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open onOpenChange={(o) => !o && onClose()}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader className="text-left">
            <SheetTitle className="sr-only">Действия с записью</SheetTitle>
          </SheetHeader>
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop — поповер прибит к координатам
  const left = Math.max(8, Math.min(window.innerWidth - 280 - 8, anchor.x - 140));
  const top = Math.max(8, Math.min(window.innerHeight - 360, anchor.y));

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 w-[280px] max-h-[80vh] overflow-y-auto bg-card border rounded-xl shadow-lg p-3"
        style={{ left, top }}
        onClick={(e) => e.stopPropagation()}
      >
        {content}
      </div>
    </>
  );
}