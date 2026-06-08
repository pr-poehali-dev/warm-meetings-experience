import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Icon from "@/components/ui/icon";
import { MasterService } from "@/lib/master-calendar-api";

export interface DayBookingPayload {
  client_name: string;
  client_phone: string;
  service_id: number | null;
  comment: string;
  time_start: string; // HH:MM
  time_end: string;   // HH:MM
}

export interface DayBlockPayload {
  whole_day: boolean;
  time_start: string; // HH:MM (если не whole_day)
  time_end: string;   // HH:MM
  reason: string;
}

interface Props {
  dayStr: string; // YYYY-MM-DD в зоне мастера
  dayLabel: string; // человекочитаемая дата
  services: MasterService[];
  saving?: boolean;
  onClose: () => void;
  onCreateBooking: (p: DayBookingPayload) => void;
  onBlock: (p: DayBlockPayload) => void;
}

export default function DayActionDialog({
  dayStr, dayLabel, services, saving, onClose, onCreateBooking, onBlock,
}: Props) {
  const [tab, setTab] = useState<"booking" | "block">("booking");

  // Бронь
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [serviceId, setServiceId] = useState<string>("");
  const [comment, setComment] = useState("");
  const [bStart, setBStart] = useState("10:00");
  const [bEnd, setBEnd] = useState("11:00");

  // Блокировка
  const [wholeDay, setWholeDay] = useState(true);
  const [blStart, setBlStart] = useState("10:00");
  const [blEnd, setBlEnd] = useState("18:00");
  const [reason, setReason] = useState("");

  // При выборе услуги — автоподстановка конца брони по длительности
  useEffect(() => {
    if (!serviceId) return;
    const svc = services.find((s) => String(s.id) === serviceId);
    if (svc?.duration_minutes) {
      const [h, m] = bStart.split(":").map(Number);
      const total = h * 60 + m + svc.duration_minutes;
      const eh = Math.floor((total % 1440) / 60);
      const em = total % 60;
      setBEnd(`${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceId, bStart]);

  const submitBooking = () => {
    if (!clientName.trim()) return;
    if (bEnd <= bStart) return;
    onCreateBooking({
      client_name: clientName.trim(),
      client_phone: clientPhone.trim(),
      service_id: serviceId ? Number(serviceId) : null,
      comment: comment.trim(),
      time_start: bStart,
      time_end: bEnd,
    });
  };

  const submitBlock = () => {
    if (!wholeDay && blEnd <= blStart) return;
    onBlock({
      whole_day: wholeDay,
      time_start: blStart,
      time_end: blEnd,
      reason: reason.trim(),
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon name="CalendarPlus" size={18} />
            Действия на день
          </DialogTitle>
          <DialogDescription className="text-xs capitalize">{dayLabel}</DialogDescription>
        </DialogHeader>

        {/* Переключатель режима */}
        <div className="inline-flex w-full border border-border rounded-lg overflow-hidden">
          <button
            onClick={() => setTab("booking")}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-semibold transition-colors ${tab === "booking" ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted/60"}`}
          >
            <Icon name="UserPlus" size={14} />
            Бронь
          </button>
          <button
            onClick={() => setTab("block")}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-semibold border-l border-border transition-colors ${tab === "block" ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted/60"}`}
          >
            <Icon name="Lock" size={14} />
            Блокировка
          </button>
        </div>

        {tab === "booking" ? (
          <div className="space-y-2.5 mt-1">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="text-[11px] text-muted-foreground mb-1 block">Начало</label>
                <Input type="time" value={bStart} onChange={(e) => setBStart(e.target.value)} className="h-9" />
              </div>
              <span className="text-muted-foreground mt-5">–</span>
              <div className="flex-1">
                <label className="text-[11px] text-muted-foreground mb-1 block">Конец</label>
                <Input type="time" value={bEnd} onChange={(e) => setBEnd(e.target.value)} className="h-9" />
              </div>
            </div>
            {services.length > 0 && (
              <Select value={serviceId} onValueChange={setServiceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Услуга (длительность подставится)" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name} · {s.duration_minutes} мин
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Input placeholder="Имя клиента" value={clientName} onChange={(e) => setClientName(e.target.value)} />
            <Input placeholder="Телефон" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} />
            <Textarea placeholder="Комментарий (необязательно)" value={comment} onChange={(e) => setComment(e.target.value)} rows={2} />
            <Button className="w-full gap-1.5" onClick={submitBooking} disabled={saving || !clientName.trim() || bEnd <= bStart}>
              {saving && <Icon name="Loader2" size={15} className="animate-spin" />}
              <Icon name="Check" size={15} />
              Создать бронь
            </Button>
          </div>
        ) : (
          <div className="space-y-3 mt-1">
            {/* Весь день / интервал */}
            <div className="inline-flex w-full border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => setWholeDay(true)}
                className={`flex-1 px-3 py-1.5 text-xs font-semibold transition-colors ${wholeDay ? "bg-red-500 text-white" : "text-muted-foreground hover:bg-muted/60"}`}
              >
                Весь день
              </button>
              <button
                onClick={() => setWholeDay(false)}
                className={`flex-1 px-3 py-1.5 text-xs font-semibold border-l border-border transition-colors ${!wholeDay ? "bg-red-500 text-white" : "text-muted-foreground hover:bg-muted/60"}`}
              >
                Интервал
              </button>
            </div>

            {!wholeDay && (
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label className="text-[11px] text-muted-foreground mb-1 block">С</label>
                  <Input type="time" value={blStart} onChange={(e) => setBlStart(e.target.value)} className="h-9" />
                </div>
                <span className="text-muted-foreground mt-5">–</span>
                <div className="flex-1">
                  <label className="text-[11px] text-muted-foreground mb-1 block">До</label>
                  <Input type="time" value={blEnd} onChange={(e) => setBlEnd(e.target.value)} className="h-9" />
                </div>
              </div>
            )}

            <Input
              placeholder={wholeDay ? "Причина выходного (необязательно)" : "Причина (необязательно)"}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />

            <p className="text-[11px] text-muted-foreground">
              {wholeDay
                ? "Весь день будет закрыт для записи. Существующие записи нужно отменить отдельно."
                : "Выбранный интервал будет недоступен для записи."}
            </p>

            <Button variant="destructive" className="w-full gap-1.5" onClick={submitBlock} disabled={saving || (!wholeDay && blEnd <= blStart)}>
              {saving && <Icon name="Loader2" size={15} className="animate-spin" />}
              <Icon name="Lock" size={15} />
              {wholeDay ? "Заблокировать весь день" : "Заблокировать интервал"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
