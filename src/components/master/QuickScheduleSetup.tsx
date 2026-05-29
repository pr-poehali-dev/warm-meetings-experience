import { useEffect, useState, useCallback } from "react";
import { addDays, format, startOfWeek } from "date-fns";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  masterCalendarApi,
  MasterService,
} from "@/lib/master-calendar-api";

interface QuickScheduleSetupProps {
  masterId: number;
  onNavigateToServices?: () => void;
}

const WEEK_DAYS = [
  { idx: 1, label: "Пн" },
  { idx: 2, label: "Вт" },
  { idx: 3, label: "Ср" },
  { idx: 4, label: "Чт" },
  { idx: 5, label: "Пт" },
  { idx: 6, label: "Сб" },
  { idx: 0, label: "Вс" },
];

function fmt(n: number) {
  return n.toLocaleString("ru-RU");
}

function fmtDuration(min: number) {
  if (min < 60) return `${min} мин`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} ч ${m} мин` : `${h} ч`;
}

export default function QuickScheduleSetup({ masterId, onNavigateToServices }: QuickScheduleSetupProps) {
  // Услуги
  const [services, setServices] = useState<MasterService[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);

  // Шаблон расписания
  const [selectedDays, setSelectedDays] = useState<Set<number>>(new Set([1, 2, 3, 4, 5]));
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("19:00");
  const [weeks, setWeeks] = useState(4);
  const [bufferMinutes, setBufferMinutes] = useState(0);
  const [savingBuffer, setSavingBuffer] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Превью существующих слотов
  const [existingCount, setExistingCount] = useState<number | null>(null);

  const loadServices = useCallback(async () => {
    setLoadingServices(true);
    try {
      const svcs = await masterCalendarApi.getServices(masterId);
      setServices(svcs);
    } catch {
      toast.error("Не удалось загрузить услуги");
    } finally {
      setLoadingServices(false);
    }
  }, [masterId]);

  const loadExisting = useCallback(async () => {
    try {
      const from = format(new Date(), "yyyy-MM-dd");
      const to = format(addDays(new Date(), 30), "yyyy-MM-dd");
      const slots = await masterCalendarApi.getSlots(masterId, from, to);
      setExistingCount(slots.length);
    } catch {
      setExistingCount(null);
    }
  }, [masterId]);

  const loadSettings = useCallback(async () => {
    try {
      const s = await masterCalendarApi.getSettings(masterId);
      if (s && typeof s.break_between_slots === "number") {
        setBufferMinutes(s.break_between_slots);
      }
    } catch {
      // настройки могут быть не созданы — это ок
    }
  }, [masterId]);

  useEffect(() => {
    loadServices();
    loadExisting();
    loadSettings();
  }, [loadServices, loadExisting, loadSettings]);

  const handleSaveBuffer = async (value: number) => {
    setSavingBuffer(true);
    try {
      await masterCalendarApi.saveSettings({
        master_id: masterId,
        break_between_slots: value,
      });
      toast.success("Буфер сохранён");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось сохранить");
    } finally {
      setSavingBuffer(false);
    }
  };

  const toggleDay = (idx: number) => {
    setSelectedDays((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  // Подсчёт сколько окон будет создано
  const windowsCount = (() => {
    if (selectedDays.size === 0) return 0;
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    if (eh * 60 + em <= sh * 60 + sm) return 0;
    return selectedDays.size * weeks;
  })();

  // Генерация окон доступности
  const handleGenerate = async () => {
    if (selectedDays.size === 0) {
      toast.error("Выберите хотя бы один день недели");
      return;
    }

    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;
    if (endMin <= startMin) {
      toast.error("Время окончания должно быть позже начала");
      return;
    }

    if (!confirm(`Создать ${windowsCount} окон доступности на ${weeks} нед.?`)) return;

    setGenerating(true);
    try {
      const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
      let created = 0;
      let failed = 0;
      const promises: Promise<unknown>[] = [];

      // КАНОН: время вводит мастер в своей зоне. Шлём строку без offset —
      // бэкенд (time_utils.parse_client_dt) трактует её как зону мастера.
      const toIsoLocal = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:00`;

      for (let w = 0; w < weeks; w++) {
        for (const dayIdx of selectedDays) {
          const offset = dayIdx === 0 ? 6 : dayIdx - 1;
          const date = addDays(monday, w * 7 + offset);
          if (date < new Date(new Date().toDateString())) continue;

          const startDate = new Date(date);
          startDate.setHours(Math.floor(startMin / 60), startMin % 60, 0, 0);
          const endDate = new Date(date);
          endDate.setHours(Math.floor(endMin / 60), endMin % 60, 0, 0);

          // Один универсальный слот = окно доступности на весь день
          // service_id = null → подходит под любую активную услугу
          promises.push(
            masterCalendarApi
              .createSlot({
                master_id: masterId,
                service_id: null,
                datetime_start: toIsoLocal(startDate),
                datetime_end: toIsoLocal(endDate),
                max_clients: 1,
              })
              .then(() => {
                created++;
              })
              .catch(() => {
                failed++;
              })
          );
        }
      }

      await Promise.all(promises);
      if (created > 0) {
        toast.success(`Создано ${created} окон${failed ? ` (пропущено ${failed})` : ""}`);
        loadExisting();
      } else {
        toast.error("Не удалось создать окна — возможно они уже есть");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка генерации");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Шапка с подсказкой */}
      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
          <Icon name="Sparkles" size={18} className="text-primary" />
        </div>
        <div className="text-sm">
          <div className="font-semibold mb-0.5">Быстрая настройка</div>
          <div className="text-muted-foreground">
            Заполни услуги и рабочие часы — гости смогут выбрать любую услугу и удобное время в твоих окнах доступности.
            {existingCount !== null && existingCount > 0 && (
              <span className="text-foreground"> Сейчас уже создано {existingCount} окон на ближайшие 30 дней.</span>
            )}
          </div>
        </div>
      </div>

      {/* ШАГ 1: Услуги */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground inline-flex items-center justify-center text-xs font-bold">1</span>
            <h3 className="text-base font-semibold">Услуги</h3>
            <span className="text-xs text-muted-foreground">({services.filter((s) => s.is_active).length})</span>
          </div>
          {onNavigateToServices && (
            <Button size="sm" variant="outline" onClick={onNavigateToServices} className="gap-1.5">
              <Icon name="Plus" size={14} />
              Добавить
            </Button>
          )}
        </div>

        {loadingServices ? (
          <div className="flex justify-center py-6">
            <Icon name="Loader2" size={20} className="animate-spin text-muted-foreground" />
          </div>
        ) : services.filter((s) => s.is_active).length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground bg-muted/30 rounded-xl border border-dashed">
            <Icon name="Sparkles" size={28} className="mx-auto mb-2 opacity-40" />
            <p>Пока нет услуг. Добавь первую — без них гости не смогут записаться.</p>
            {onNavigateToServices && (
              <Button size="sm" variant="outline" onClick={onNavigateToServices} className="mt-3 gap-1.5">
                <Icon name="Plus" size={13} />
                Добавить услугу
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {services.filter((s) => s.is_active).map((s) => (
              <div key={s.id} className="flex items-center justify-between p-3 bg-card border rounded-xl">
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm truncate">{s.name}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-3 mt-0.5">
                    <span className="flex items-center gap-1">
                      <Icon name="Clock" size={11} />
                      {fmtDuration(s.duration_minutes)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Icon name="Wallet" size={11} />
                      {fmt(s.price)} ₽
                    </span>
                    {s.max_clients > 1 && (
                      <span className="flex items-center gap-1">
                        <Icon name="Users" size={11} />
                        до {s.max_clients}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {onNavigateToServices && (
              <button
                type="button"
                onClick={onNavigateToServices}
                className="w-full flex items-center justify-center gap-1.5 p-2.5 rounded-xl border border-dashed border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
              >
                <Icon name="Plus" size={13} />
                Добавить услугу
              </button>
            )}
          </div>
        )}
      </section>

      {/* ШАГ 2: Расписание */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground inline-flex items-center justify-center text-xs font-bold">2</span>
          <h3 className="text-base font-semibold">Рабочие часы</h3>
        </div>

        <div className="bg-card border rounded-2xl p-4 space-y-4">
          <p className="text-xs text-muted-foreground">
            Укажи дни и часы, когда ты доступен. Гость сам выберет услугу и удобное время начала внутри этого окна — система автоматически подберёт свободные интервалы под длительность услуги.
          </p>

          {/* Дни недели */}
          <div>
            <Label className="text-xs mb-2 block">Какие дни работаешь</Label>
            <div className="flex flex-wrap gap-2">
              {WEEK_DAYS.map((d) => (
                <button
                  key={d.idx}
                  type="button"
                  onClick={() => toggleDay(d.idx)}
                  className={`w-12 h-12 rounded-xl text-sm font-semibold border transition-colors ${
                    selectedDays.has(d.idx)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border hover:bg-muted"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Время работы */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs mb-1 block">Начало дня</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Конец дня</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>

          {/* Буфер между сеансами */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-xs">Буфер между сеансами, мин</Label>
              {savingBuffer && (
                <Icon name="Loader2" size={12} className="animate-spin text-muted-foreground" />
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {[0, 5, 10, 15, 20, 30, 45, 60].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setBufferMinutes(m);
                    handleSaveBuffer(m);
                  }}
                  disabled={savingBuffer}
                  className={`min-w-[48px] px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    bufferMinutes === m
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border hover:bg-muted"
                  }`}
                >
                  {m === 0 ? "Без паузы" : `${m} мин`}
                </button>
              ))}
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min={0}
                  max={240}
                  value={bufferMinutes}
                  onChange={(e) => setBufferMinutes(Math.max(0, Number(e.target.value) || 0))}
                  onBlur={() => handleSaveBuffer(bufferMinutes)}
                  className="w-20 h-8 text-xs"
                />
                <span className="text-xs text-muted-foreground">мин</span>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5">
              Время после каждой записи — отдых, уборка, подготовка. Гости не смогут забронировать его.
            </p>
          </div>

          {/* Количество недель */}
          <div>
            <Label className="text-xs mb-2 block">На сколько недель вперёд</Label>
            <div className="flex gap-2">
              {[1, 2, 4, 8].map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setWeeks(w)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    weeks === w
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border hover:bg-muted"
                  }`}
                >
                  {w} {w === 1 ? "нед." : w < 5 ? "недели" : "недель"}
                </button>
              ))}
            </div>
          </div>

          {/* Превью + кнопка */}
          <div className="border-t pt-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="text-sm">
              {windowsCount > 0 ? (
                <span>
                  Будет создано <span className="font-bold text-primary">{windowsCount}</span> рабочих окон
                </span>
              ) : (
                <span className="text-muted-foreground">Выбери дни и часы</span>
              )}
            </div>
            <Button
              onClick={handleGenerate}
              disabled={generating || windowsCount === 0}
              className="gap-1.5"
            >
              {generating ? (
                <>
                  <Icon name="Loader2" size={14} className="animate-spin" />
                  Создаём...
                </>
              ) : (
                <>
                  <Icon name="Wand2" size={14} />
                  Сгенерировать расписание
                </>
              )}
            </Button>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground mt-2">
          Когда гость бронирует время, его кусочек окна занимается, а остаток разбивается на свободные интервалы — другие гости смогут забронировать оставшееся время.
        </p>
      </section>

      {/* Ссылка на превью */}
      <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 flex items-start gap-3">
        <Icon name="Eye" size={18} className="text-emerald-600 dark:text-emerald-400 mt-0.5" />
        <div className="text-sm">
          <div className="font-semibold text-emerald-900 dark:text-emerald-200">
            Что увидит гость
          </div>
          <div className="text-emerald-800/80 dark:text-emerald-300/80 text-xs mt-0.5">
            Гости увидят твои услуги и доступное время на странице мастера. Чтобы посмотреть как это выглядит, открой свою публичную страницу.
          </div>
        </div>
      </div>
    </div>
  );
}