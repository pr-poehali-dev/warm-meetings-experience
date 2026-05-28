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

interface Props {
  event: QuickEvent;
  anchor: { x: number; y: number };
  onClose: () => void;
  onCancelBooking: (bookingId: number) => void;
  onDeleteSlot: (slotId: number) => void;
  onDeleteBlock?: (blockId: number) => void;
}

const fmtRange = (s: Date, e: Date) =>
  `${s.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}\u00A0–\u00A0${e.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`;

const fmtDate = (d: Date) =>
  d.toLocaleDateString("ru-RU", { weekday: "long", day: "2-digit", month: "long" });

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

export default function QuickActionsPopover({ event, anchor, onClose, onCancelBooking, onDeleteSlot, onDeleteBlock }: Props) {
  const isMobile = useIsMobile();
  const booking = event.kind === "booking" ? (event.raw as MasterBooking | undefined) : undefined;

  const handleWrite = () => {
    if (!booking) return;
    const phone = (booking.client_phone || "").replace(/\D/g, "");
    if (phone) {
      // Telegram сначала по phone, fallback на tel:
      window.open(`tg://resolve?phone=${phone}`, "_blank");
      setTimeout(() => window.open(`tel:+${phone}`, "_self"), 600);
    } else {
      window.alert("У клиента не указан телефон");
    }
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
        <div className="font-semibold text-base">{event.title}</div>
        <div className="text-xs text-muted-foreground capitalize">{fmtDate(event.start)} · {fmtRange(event.start, event.end)}</div>
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

      <div className="flex flex-col gap-1.5">
        {event.kind === "booking" && booking?.client_phone && (
          <Button size="sm" variant="outline" className="justify-start gap-2" onClick={handleWrite}>
            <Icon name="MessageSquare" size={14} />
            Написать
          </Button>
        )}
        {!event.id.startsWith("blk-") && (
          <Button size="sm" variant="outline" className="justify-start gap-2" onClick={onClose}>
            <Icon name="Move" size={14} />
            Перенести <span className="text-xs text-muted-foreground ml-auto">перетащите блок</span>
          </Button>
        )}
        <Button size="sm" variant="destructive" className="justify-start gap-2" onClick={handleCancel}>
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
  const top = Math.min(window.innerHeight - 220, anchor.y);

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 w-[280px] bg-card border rounded-xl shadow-lg p-3"
        style={{ left, top }}
        onClick={(e) => e.stopPropagation()}
      >
        {content}
      </div>
    </>
  );
}