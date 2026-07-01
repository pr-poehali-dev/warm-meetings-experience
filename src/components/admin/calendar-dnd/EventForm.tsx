import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Icon from "@/components/ui/icon";
import { MasterService, MasterAddress } from "@/lib/master-calendar-api";

export type CreateMode = "booking" | "block" | "break" | "work";
// "block" и "break" семантически одинаковы — оба закрывают время от записи.
// На UI используем единую кнопку "Закрыть время" → mode="block".

export interface CreatePayload {
  client_name?: string;
  client_phone?: string;
  service_id?: number | null;
  comment?: string;
  // Переопределение времени (HH:MM), когда пользователь правит его в форме.
  time_start?: string;
  time_end?: string;
  // Адрес слота: number = конкретный адрес, null = явный выезд
  address_id?: number | null;
}

interface Props {
  start: Date;
  end: Date;
  // «Экранное время» — ISO-строки с offset зоны мастера (от календаря).
  startStr?: string | null;
  endStr?: string | null;
  allDay?: boolean;
  services: MasterService[];
  addresses?: MasterAddress[];
  onCancel: () => void;
  onCreate: (mode: CreateMode, payload: CreatePayload) => Promise<void> | void;
}

const WD = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];
const MM = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];

// Парсим «экранную» ISO-строку (YYYY-MM-DDTHH:mm:ss±hh:mm) ПОКОМПОНЕНТНО,
// без new Date — чтобы цифры были ровно те, что показывает календарь (зона
// мастера), независимо от часового пояса браузера.
const parseIso = (iso: string) => {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m;
  return { y: +y, mo: +mo, d: +d, h: +h, mi: +mi };
};

const wdName = (y: number, mo: number, d: number) =>
  WD[new Date(Date.UTC(y, mo - 1, d)).getUTCDay()];

// «YYYY-MM-DD» предыдущего дня, считаем через UTC-полночь (без сдвигов зоны).
const prevDayIso = (dateStr: string) => {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const t = new Date(Date.UTC(y, mo - 1, d) - 86_400_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
};

// «вт, 09 июня в 11:00» из ISO-строки
const fmtIso = (iso: string) => {
  const p = parseIso(iso);
  if (!p) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${wdName(p.y, p.mo, p.d)}, ${pad(p.d)} ${MM[p.mo - 1]} в ${pad(p.h)}:${pad(p.mi)}`;
};

// «вт, 09 июня» из ISO-строки (для режима «весь день»)
const fmtIsoDay = (iso: string) => {
  const p = parseIso(iso);
  if (!p) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${wdName(p.y, p.mo, p.d)}, ${pad(p.d)} ${MM[p.mo - 1]}`;
};

export default function EventForm({ start, end, startStr, endStr, allDay, services, addresses = [], onCancel, onCreate }: Props) {
  const [step, setStep] = useState<"choose" | "form" | "address">(allDay ? "form" : "choose");
  const [mode, setMode] = useState<CreateMode>(allDay ? "block" : "booking");

  // Поля формы
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [serviceId, setServiceId] = useState<string>("");
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  // Выбранный адрес для рабочего времени: undefined = не выбрано, null = выезд, number = id адреса
  const [selectedAddress, setSelectedAddress] = useState<number | null | undefined>(undefined);

  // Редактируемое время (HH:MM) — извлекаем из «экранной» ISO-строки.
  const initTime = (iso?: string | null) => (iso ? iso.slice(11, 16) : "09:00");
  const [timeStart, setTimeStart] = useState(initTime(startStr));
  const [timeEnd, setTimeEnd] = useState(initTime(endStr));

  useEffect(() => {
    setStep(allDay ? "form" : "choose");
    setMode(allDay ? "block" : "booking");
    setClientName("");
    setClientPhone("");
    setServiceId("");
    setComment("");
    setSelectedAddress(undefined);
    setTimeStart(initTime(startStr));
    setTimeEnd(initTime(endStr));
  }, [start, end, allDay, startStr, endStr]);

  const pick = (m: CreateMode) => {
    if (m === "block") {
      onCreate(m, {});
      return;
    }
    if (m === "work") {
      // Если адресов нет — создаём сразу без выбора
      if (addresses.length === 0) {
        onCreate(m, {});
        return;
      }
      // Иначе показываем шаг выбора адреса
      setMode(m);
      setStep("address");
      return;
    }
    setMode(m);
    setStep("form");
  };

  const confirmAddress = () => {
    // selectedAddress: undefined → не выбрано (не должно быть), null → выезд, number → адрес
    onCreate("work", { address_id: selectedAddress ?? null });
  };

  const submit = async () => {
    setSaving(true);
    try {
      await onCreate(mode, {
        client_name: clientName,
        client_phone: clientPhone,
        service_id: serviceId ? Number(serviceId) : null,
        comment,
        time_start: timeStart,
        time_end: timeEnd,
      });
    } finally {
      setSaving(false);
    }
  };

  // При выборе услуги пересчитываем время окончания: конец = начало + длительность.
  const handleServiceChange = (val: string) => {
    setServiceId(val);
    const svc = services.find((s) => String(s.id) === val);
    if (svc?.duration_minutes && timeStart) {
      const [h, m] = timeStart.split(":").map(Number);
      const total = h * 60 + m + svc.duration_minutes;
      const eh = Math.floor((total % 1440) / 60);
      const em = total % 60;
      setTimeEnd(`${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`);
    }
  };

  // При изменении времени начала сдвигаем конец, сохраняя длительность услуги.
  const handleStartChange = (val: string) => {
    setTimeStart(val);
    const svc = services.find((s) => String(s.id) === serviceId);
    if (svc?.duration_minutes && val) {
      const [h, m] = val.split(":").map(Number);
      const total = h * 60 + m + svc.duration_minutes;
      const eh = Math.floor((total % 1440) / 60);
      const em = total % 60;
      setTimeEnd(`${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`);
    }
  };

  const title =
    step === "choose" ? "Что создать?" :
    step === "address" ? "Рабочее время" :
    mode === "booking" ? "Новая бронь" :
    mode === "block" ? "Заблокировать время" :
    mode === "work" ? "Рабочее время" :
    "Перерыв";

  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon name={mode === "booking" ? "Calendar" : mode === "block" ? "Lock" : mode === "work" ? "Clock" : "Coffee"} size={18} />
            {title}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {allDay ? (
              <>
                Весь день · {startStr ? fmtIsoDay(startStr) : ""}
                {endStr && prevDayIso(endStr.slice(0, 10)) > (startStr || "").slice(0, 10) && (
                  <> → {fmtIsoDay(`${prevDayIso(endStr.slice(0, 10))}T00:00`)}</>
                )}
              </>
            ) : (
              <>{startStr ? fmtIso(startStr) : ""}{endStr ? <> → {fmtIso(endStr)}</> : null}</>
            )}
          </DialogDescription>
        </DialogHeader>

        {step === "choose" ? (
          <div className="grid grid-cols-1 gap-2 mt-2">
            <button
              onClick={() => pick("work")}
              className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left"
            >
              <div className="w-3 h-3 rounded-full" style={{ background: "#2196F3" }} />
              <div className="flex-1">
                <div className="font-semibold text-sm">Рабочее время</div>
                <div className="text-xs text-muted-foreground">
                  Открыть время для записи клиентов
                  {addresses.length > 0 && " · укажите адрес"}
                </div>
              </div>
              <Icon name={addresses.length > 0 ? "ChevronRight" : "Plus"} size={14} className="text-muted-foreground" />
            </button>
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
                <div className="font-semibold text-sm">Закрыть время</div>
                <div className="text-xs text-muted-foreground">Перерыв, обед, личное время — запись недоступна</div>
              </div>
              <Icon name="Lock" size={14} className="text-muted-foreground" />
            </button>
          </div>
        ) : step === "address" ? (
          <div className="space-y-3 mt-2">
            <p className="text-xs text-muted-foreground">Где будет приём? Гость увидит адрес на странице записи.</p>
            <div className="grid grid-cols-1 gap-2">
              {addresses.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setSelectedAddress(a.id)}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                    selectedAddress === a.id
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ background: a.color || "#94a3b8" }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{a.label || a.address_text}</div>
                    {a.label && <div className="text-xs text-muted-foreground truncate">{a.address_text}</div>}
                  </div>
                  {selectedAddress === a.id && <Icon name="Check" size={14} className="text-primary flex-shrink-0" />}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setSelectedAddress(null)}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                  selectedAddress === null
                    ? "border-primary bg-primary/5"
                    : "hover:bg-muted/50"
                }`}
              >
                <Icon name="Car" size={14} className="text-blue-400 flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-medium text-sm">Выезд к клиенту</div>
                  <div className="text-xs text-muted-foreground">Клиент укажет свой адрес при записи</div>
                </div>
                {selectedAddress === null && <Icon name="Check" size={14} className="text-primary flex-shrink-0" />}
              </button>
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => setStep("choose")} className="flex-1">
                Назад
              </Button>
              <Button
                size="sm"
                className="flex-1"
                disabled={selectedAddress === undefined || saving}
                onClick={confirmAddress}
              >
                {saving ? "Создание…" : "Создать"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2 mt-2">
            {mode === "booking" && (
              <>
                {!allDay && (
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <label className="text-[11px] text-muted-foreground mb-1 block">Начало</label>
                      <Input type="time" value={timeStart} onChange={(e) => handleStartChange(e.target.value)} className="h-9" />
                    </div>
                    <span className="text-muted-foreground mt-5">–</span>
                    <div className="flex-1">
                      <label className="text-[11px] text-muted-foreground mb-1 block">Конец</label>
                      <Input type="time" value={timeEnd} onChange={(e) => setTimeEnd(e.target.value)} className="h-9" />
                    </div>
                  </div>
                )}
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
                  <Select value={serviceId} onValueChange={handleServiceChange}>
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
            {mode === "work" && (
              <p className="text-xs text-muted-foreground">
                В этот интервал клиенты смогут записываться на ваши услуги.
              </p>
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