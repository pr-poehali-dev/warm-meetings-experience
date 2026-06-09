import { useEffect, useState, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { masterCalendarApi } from "@/lib/master-calendar-api";

const TIMEZONES = [
  { value: "Europe/Kaliningrad", label: "Калининград (UTC+2)" },
  { value: "Europe/Moscow",      label: "Москва, Питер (UTC+3)" },
  { value: "Europe/Samara",      label: "Самара, Ижевск (UTC+4)" },
  { value: "Asia/Yekaterinburg", label: "Екатеринбург, Уфа (UTC+5)" },
  { value: "Asia/Omsk",          label: "Омск (UTC+6)" },
  { value: "Asia/Krasnoyarsk",   label: "Красноярск, Новосибирск (UTC+7)" },
  { value: "Asia/Irkutsk",       label: "Иркутск (UTC+8)" },
  { value: "Asia/Yakutsk",       label: "Якутск, Чита (UTC+9)" },
  { value: "Asia/Vladivostok",   label: "Владивосток, Хабаровск (UTC+10)" },
  { value: "Asia/Magadan",       label: "Магадан, Сахалин (UTC+11)" },
  { value: "Asia/Kamchatka",     label: "Камчатка (UTC+12)" },
];

export default function MasterScheduleSettings({ masterId }: { masterId: number }) {
  const [timezone, setTimezone] = useState("Europe/Moscow");
  const [autoConfirm, setAutoConfirm] = useState(false);
  const [bufferMinutes, setBufferMinutes] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const s = await masterCalendarApi.getSettings(masterId);
      if (!s) return;
      if (typeof s.break_between_slots === "number") setBufferMinutes(s.break_between_slots);
      if ((s as { timezone?: string }).timezone) setTimezone((s as { timezone?: string }).timezone!);
      if (typeof s.auto_confirm === "boolean") setAutoConfirm(s.auto_confirm);
    } catch {
      // нет настроек — ок
    } finally {
      setLoading(false);
    }
  }, [masterId]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await masterCalendarApi.saveSettings({
        master_id: masterId,
        timezone,
        auto_confirm: autoConfirm,
        break_between_slots: bufferMinutes,
      } as Parameters<typeof masterCalendarApi.saveSettings>[0]);
      toast.success("Настройки сохранены");
    } catch {
      toast.error("Не удалось сохранить настройки");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Icon name="Loader2" size={22} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="bg-card border rounded-2xl p-5 space-y-5">
      {/* Часовой пояс */}
      <div>
        <Label className="text-xs mb-1 block">Часовой пояс</Label>
        <select
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {TIMEZONES.map((tz) => (
            <option key={tz.value} value={tz.value}>{tz.label}</option>
          ))}
        </select>
        <p className="text-[11px] text-muted-foreground mt-1">Время в календаре, уведомлениях и карточках записей</p>
      </div>

      {/* Пауза между сеансами */}
      <div>
        <Label className="text-xs mb-1 block">Пауза между сеансами</Label>
        <select
          value={bufferMinutes}
          onChange={(e) => setBufferMinutes(Number(e.target.value))}
          className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value={0}>Без паузы</option>
          <option value={5}>5 мин</option>
          <option value={10}>10 мин</option>
          <option value={15}>15 мин</option>
          <option value={20}>20 мин</option>
          <option value={30}>30 мин</option>
          <option value={45}>45 мин</option>
          <option value={60}>1 час</option>
        </select>
        <p className="text-[11px] text-muted-foreground mt-1">Отдых, уборка, подготовка — гости не смогут занять это время</p>
      </div>

      {/* Автоподтверждение */}
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-xs font-medium">Автоподтверждение записей</Label>
          <p className="text-[11px] text-muted-foreground mt-0.5">Новые записи сразу подтверждаются, без ручной проверки</p>
        </div>
        <Switch checked={autoConfirm} onCheckedChange={setAutoConfirm} />
      </div>

      <div className="flex justify-end pt-1 border-t">
        <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5 mt-3">
          {saving && <Icon name="Loader2" size={13} className="animate-spin" />}
          <Icon name="Save" size={13} />
          Сохранить
        </Button>
      </div>
    </div>
  );
}
