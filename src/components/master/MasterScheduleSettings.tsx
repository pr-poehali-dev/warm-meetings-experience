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

type Settings = {
  timezone: string;
  auto_confirm: boolean;
  break_between_slots: number;
  notify_new_booking: boolean;
  notify_24h_reminder: boolean;
  notify_cancellation: boolean;
};

const NOTIFY_TOGGLES: { key: keyof Settings; label: string; desc: string }[] = [
  { key: "notify_new_booking",   label: "Новая запись",           desc: "Уведомление при каждой новой записи клиента" },
  { key: "notify_24h_reminder",  label: "Напоминание за 24 часа", desc: "Напомнить о предстоящем сеансе за сутки" },
  { key: "notify_cancellation",  label: "Отмена записи",          desc: "Уведомление при отмене клиентом" },
  { key: "auto_confirm",         label: "Автоподтверждение",      desc: "Записи автоматически получают статус «Подтверждено»" },
];

export default function MasterScheduleSettings({ masterId }: { masterId: number }) {
  const [settings, setSettings] = useState<Settings>({
    timezone: "Europe/Moscow",
    auto_confirm: false,
    break_between_slots: 0,
    notify_new_booking: true,
    notify_24h_reminder: true,
    notify_cancellation: true,
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const s = await masterCalendarApi.getSettings(masterId);
      if (!s) return;
      setSettings((prev) => ({
        ...prev,
        ...(typeof s.break_between_slots === "number" ? { break_between_slots: s.break_between_slots } : {}),
        ...((s as { timezone?: string }).timezone ? { timezone: (s as { timezone?: string }).timezone! } : {}),
        ...(typeof s.auto_confirm === "boolean" ? { auto_confirm: s.auto_confirm } : {}),
        ...(typeof s.notify_new_booking === "boolean" ? { notify_new_booking: s.notify_new_booking } : {}),
        ...(typeof s.notify_24h_reminder === "boolean" ? { notify_24h_reminder: s.notify_24h_reminder } : {}),
        ...(typeof s.notify_cancellation === "boolean" ? { notify_cancellation: s.notify_cancellation } : {}),
      }));
    } catch {
      // нет настроек — ок
    } finally {
      setLoading(false);
    }
  }, [masterId]);

  useEffect(() => { load(); }, [load]);

  const toggle = (key: keyof Settings) =>
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await masterCalendarApi.saveSettings({
        master_id: masterId,
        ...settings,
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
    <div className="space-y-4">
      {/* Основные параметры */}
      <div className="bg-card border rounded-2xl p-5 space-y-5">
        <p className="font-semibold text-sm">Расписание</p>

        <div>
          <Label className="text-xs mb-1 block">Часовой пояс</Label>
          <select
            value={settings.timezone}
            onChange={(e) => setSettings((p) => ({ ...p, timezone: e.target.value }))}
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>{tz.label}</option>
            ))}
          </select>
          <p className="text-[11px] text-muted-foreground mt-1">Время в календаре, уведомлениях и карточках записей</p>
        </div>

        <div>
          <Label className="text-xs mb-1 block">Пауза между сеансами</Label>
          <select
            value={settings.break_between_slots}
            onChange={(e) => setSettings((p) => ({ ...p, break_between_slots: Number(e.target.value) }))}
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
      </div>

      {/* Уведомления */}
      <div className="bg-card border rounded-2xl p-5 space-y-3">
        <div>
          <p className="font-semibold text-sm">О чём уведомлять</p>
          <p className="text-xs text-muted-foreground mt-0.5">Выберите события, о которых хотите получать оповещения</p>
        </div>
        {NOTIFY_TOGGLES.map((t) => (
          <div key={t.key} className="flex items-center justify-between gap-4 bg-muted/40 rounded-xl p-3">
            <div>
              <div className="font-medium text-sm">{t.label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{t.desc}</div>
            </div>
            <button
              onClick={() => toggle(t.key)}
              className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${settings[t.key] ? "bg-primary" : "bg-muted"}`}
            >
              <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${settings[t.key] ? "translate-x-5" : "translate-x-0"}`} />
            </button>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
          {saving && <Icon name="Loader2" size={13} className="animate-spin" />}
          <Icon name="Save" size={13} />
          Сохранить
        </Button>
      </div>
    </div>
  );
}
