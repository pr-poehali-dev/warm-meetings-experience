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
  time_start: string;
  time_end: string;
}

export interface DayBlockPayload {
  whole_day: boolean;
  time_start: string;
  time_end: string;
  reason: string;
}

interface Props {
  dayStr: string;
  dayLabel: string;
  services: MasterService[];
  saving?: boolean;
  onClose: () => void;
  onCreateBooking: (p: DayBookingPayload) => void;
  onBlock: (p: DayBlockPayload) => void;
}

export default function DayActionDialog({
  dayLabel, services, saving, onClose, onCreateBooking, onBlock,
}: Props) {
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [serviceId, setServiceId] = useState<string>("");
  const [comment, setComment] = useState("");
  const [bStart, setBStart] = useState("10:00");
  const [bEnd, setBEnd] = useState("11:00");
  const [blockMode, setBlockMode] = useState(false);
  const [blStart, setBlStart] = useState("10:00");
  const [blEnd, setBlEnd] = useState("18:00");
  const [reason, setReason] = useState("");
  const [wholeDay, setWholeDay] = useState(false);

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
    if (!clientName.trim() || bEnd <= bStart) return;
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
    onBlock({ whole_day: wholeDay, time_start: blStart, time_end: blEnd, reason });
  };

  if (blockMode) {
    return (
      <Dialog open onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="sm:max-w-md max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Icon name="Lock" size={18} className="text-red-500" />
              Блокировка дня
            </DialogTitle>
            <DialogDescription className="text-xs capitalize">{dayLabel}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-1">
            {/* Весь день / Интервал */}
            <div className="inline-flex w-full border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => setWholeDay(false)}
                className={`flex-1 px-3 py-2 text-xs font-semibold border-r border-border transition-colors ${!wholeDay ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted/60"}`}
              >
                Интервал
              </button>
              <button
                onClick={() => setWholeDay(true)}
                className={`flex-1 px-3 py-2 text-xs font-semibold transition-colors ${wholeDay ? "bg-red-500 text-white" : "text-muted-foreground hover:bg-muted/60"}`}
              >
                Весь день
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
              placeholder="Причина (необязательно)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />

            <p className="text-[11px] text-muted-foreground">
              {wholeDay
                ? "День полностью закрыт для записи. Если есть активные записи — нужно будет подтвердить их отмену."
                : "Выбранный интервал будет недоступен для новых записей."}
            </p>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setBlockMode(false)}>
                ← Назад
              </Button>
              <Button
                variant="destructive"
                className="flex-1 gap-1.5"
                onClick={submitBlock}
                disabled={saving || (!wholeDay && blEnd <= blStart)}
              >
                {saving && <Icon name="Loader2" size={15} className="animate-spin" />}
                <Icon name="Lock" size={15} />
                Заблокировать
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon name="UserPlus" size={18} />
            Новая бронь
          </DialogTitle>
          <DialogDescription className="text-xs capitalize">{dayLabel}</DialogDescription>
        </DialogHeader>
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
              <SelectContent position="popper" sideOffset={4}>
                {services.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.name} · {s.duration_minutes} мин
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Input
            placeholder="Имя клиента"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
          />
          <Input
            placeholder="Телефон"
            value={clientPhone}
            onChange={(e) => setClientPhone(e.target.value)}
          />
          <Textarea
            placeholder="Комментарий (необязательно)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
          />

          <Button
            className="w-full gap-1.5"
            onClick={submitBooking}
            disabled={saving || !clientName.trim() || bEnd <= bStart}
          >
            {saving && <Icon name="Loader2" size={15} className="animate-spin" />}
            <Icon name="Check" size={15} />
            Создать бронь
          </Button>

          {/* Переход к блокировке */}
          <button
            onClick={() => setBlockMode(true)}
            className="w-full text-xs text-muted-foreground hover:text-red-600 transition-colors py-1.5 flex items-center justify-center gap-1.5 border border-dashed rounded-lg hover:border-red-300"
          >
            <Icon name="Lock" size={12} />
            Заблокировать этот день
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}