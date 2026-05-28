import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Icon from "@/components/ui/icon";
import { MasterService } from "@/lib/master-calendar-api";

export type CreateMode = "booking" | "block" | "break";

export interface CreatePayload {
  client_name?: string;
  client_phone?: string;
  service_id?: number | null;
  comment?: string;
}

interface Props {
  start: Date;
  end: Date;
  allDay?: boolean;
  services: MasterService[];
  onCancel: () => void;
  onCreate: (mode: CreateMode, payload: CreatePayload) => Promise<void> | void;
}

const fmt = (d: Date) =>
  d.toLocaleString("ru-RU", { weekday: "short", day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" });

const fmtDay = (d: Date) =>
  d.toLocaleDateString("ru-RU", { weekday: "short", day: "2-digit", month: "long" });

export default function EventForm({ start, end, allDay, services, onCancel, onCreate }: Props) {
  const [step, setStep] = useState<"choose" | "form">(allDay ? "form" : "choose");
  const [mode, setMode] = useState<CreateMode>(allDay ? "block" : "booking");

  // Поля формы
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [serviceId, setServiceId] = useState<string>("");
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setStep(allDay ? "form" : "choose");
    setMode(allDay ? "block" : "booking");
    setClientName("");
    setClientPhone("");
    setServiceId("");
    setComment("");
  }, [start, end, allDay]);

  const pick = (m: CreateMode) => {
    setMode(m);
    setStep("form");
  };

  const submit = async () => {
    setSaving(true);
    try {
      await onCreate(mode, {
        client_name: clientName,
        client_phone: clientPhone,
        service_id: serviceId ? Number(serviceId) : null,
        comment,
      });
    } finally {
      setSaving(false);
    }
  };

  const title =
    step === "choose" ? "Что создать?" :
    mode === "booking" ? "Новая бронь" :
    mode === "block" ? "Заблокировать время" :
    "Перерыв";

  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon name={mode === "booking" ? "Calendar" : mode === "block" ? "Lock" : "Coffee"} size={18} />
            {title}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {allDay ? (
              <>
                Весь день · {fmtDay(start)}
                {end.getTime() - start.getTime() > 24 * 60 * 60_000 && (
                  <> → {fmtDay(new Date(end.getTime() - 24 * 60 * 60_000))}</>
                )}
              </>
            ) : (
              <>{fmt(start)} → {fmt(end)}</>
            )}
          </DialogDescription>
        </DialogHeader>

        {step === "choose" ? (
          <div className="grid grid-cols-1 gap-2 mt-2">
            <button
              onClick={() => pick("booking")}
              className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left"
            >
              <div className="w-3 h-3 rounded-full" style={{ background: "#4CAF50" }} />
              <div className="flex-1">
                <div className="font-semibold text-sm">Бронь</div>
                <div className="text-xs text-muted-foreground">Запись клиента на сеанс</div>
              </div>
              <Icon name="ChevronRight" size={16} className="text-muted-foreground" />
            </button>
            <button
              onClick={() => pick("block")}
              className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left"
            >
              <div className="w-3 h-3 rounded-full" style={{ background: "#9E9E9E" }} />
              <div className="flex-1">
                <div className="font-semibold text-sm">Заблокировать</div>
                <div className="text-xs text-muted-foreground">Закрыть время от записи</div>
              </div>
              <Icon name="ChevronRight" size={16} className="text-muted-foreground" />
            </button>
            <button
              onClick={() => pick("break")}
              className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left"
            >
              <div className="w-3 h-3 rounded-full" style={{ background: "#FFC107" }} />
              <div className="flex-1">
                <div className="font-semibold text-sm">Перерыв</div>
                <div className="text-xs text-muted-foreground">Обед, пауза, личное время</div>
              </div>
              <Icon name="ChevronRight" size={16} className="text-muted-foreground" />
            </button>
          </div>
        ) : (
          <div className="space-y-2 mt-2">
            {mode === "booking" && (
              <>
                <Input
                  placeholder="Имя клиента"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  autoFocus
                />
                <Input
                  placeholder="Телефон"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                />
                {services.length > 0 && (
                  <Select value={serviceId} onValueChange={setServiceId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Процедура (длительность подставится)" />
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
                <Textarea
                  placeholder="Комментарий (необязательно)"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={2}
                />
              </>
            )}
            {(mode === "block" || mode === "break") && (
              <Input
                placeholder={mode === "block" ? "Причина (необязательно)" : "Название (необязательно)"}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                autoFocus
              />
            )}

            <div className="flex gap-2 pt-2">
              <Button onClick={submit} disabled={saving} className="flex-1">
                {saving ? <Icon name="Loader2" size={14} className="animate-spin" /> : "Создать"}
              </Button>
              <Button variant="ghost" onClick={() => setStep("choose")} disabled={saving}>Назад</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}