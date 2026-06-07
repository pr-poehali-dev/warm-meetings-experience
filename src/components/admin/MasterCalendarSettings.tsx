import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { masterCalendarApi } from "@/lib/master-calendar-api";
import type { CalendarSettings } from "@/lib/master-calendar-api";

interface SettingsForm {
  default_slot_duration: number;
  break_between_slots: number;
  prep_time: number;
  max_clients_per_day: number;
  auto_confirm: boolean;
  notify_new_booking: boolean;
  notify_24h_reminder: boolean;
  notify_cancellation: boolean;
  timezone: string;
}

const defaultSettings: SettingsForm = {
  default_slot_duration: 60,
  break_between_slots: 15,
  prep_time: 15,
  max_clients_per_day: 5,
  auto_confirm: false,
  notify_new_booking: true,
  notify_24h_reminder: true,
  notify_cancellation: true,
  timezone: "Europe/Moscow",
};

const TIMEZONES: { value: string; label: string; offset: string }[] = [
  { value: "Europe/Kaliningrad", label: "Калининград", offset: "UTC+2" },
  { value: "Europe/Moscow", label: "Москва, Санкт-Петербург", offset: "UTC+3" },
  { value: "Europe/Samara", label: "Самара, Ижевск", offset: "UTC+4" },
  { value: "Asia/Yekaterinburg", label: "Екатеринбург, Уфа, Пермь", offset: "UTC+5" },
  { value: "Asia/Omsk", label: "Омск", offset: "UTC+6" },
  { value: "Asia/Krasnoyarsk", label: "Красноярск, Новосибирск", offset: "UTC+7" },
  { value: "Asia/Irkutsk", label: "Иркутск, Улан-Удэ", offset: "UTC+8" },
  { value: "Asia/Yakutsk", label: "Якутск, Чита", offset: "UTC+9" },
  { value: "Asia/Vladivostok", label: "Владивосток, Хабаровск", offset: "UTC+10" },
  { value: "Asia/Magadan", label: "Магадан, Сахалин", offset: "UTC+11" },
  { value: "Asia/Kamchatka", label: "Камчатка", offset: "UTC+12" },
];

const MasterCalendarSettings = ({ masterId }: { masterId: number }) => {
  const [form, setForm] = useState<SettingsForm>({ ...defaultSettings });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [masterId]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const data = await masterCalendarApi.getSettings(masterId);
      setForm({
        default_slot_duration: data.default_slot_duration ?? defaultSettings.default_slot_duration,
        break_between_slots: data.break_between_slots ?? defaultSettings.break_between_slots,
        prep_time: data.prep_time ?? defaultSettings.prep_time,
        max_clients_per_day: data.max_clients_per_day ?? defaultSettings.max_clients_per_day,
        auto_confirm: data.auto_confirm ?? defaultSettings.auto_confirm,
        notify_new_booking: data.notify_new_booking ?? defaultSettings.notify_new_booking,
        notify_24h_reminder: data.notify_24h_reminder ?? defaultSettings.notify_24h_reminder,
        notify_cancellation: data.notify_cancellation ?? defaultSettings.notify_cancellation,
        timezone: (data as { timezone?: string }).timezone ?? defaultSettings.timezone,
      });
      setLoaded(true);
    } catch {
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await masterCalendarApi.saveSettings({
        master_id: masterId,
        default_slot_duration: form.default_slot_duration,
        break_between_slots: form.break_between_slots,
        prep_time: form.prep_time,
        max_clients_per_day: form.max_clients_per_day,
        auto_confirm: form.auto_confirm,
        notify_new_booking: form.notify_new_booking,
        notify_24h_reminder: form.notify_24h_reminder,
        notify_cancellation: form.notify_cancellation,
        timezone: form.timezone,
      } as Partial<CalendarSettings> & { master_id: number });
      toast({ title: "Готово", description: "Настройки сохранены" });
    } catch {
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить настройки",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateNumber = (field: keyof SettingsForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: Number(value) || 0 }));
  };

  const updateToggle = (field: keyof SettingsForm, value: boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  if (loading && !loaded) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Настройки календаря</h1>
          <p className="text-gray-500 mt-1 text-sm">Параметры расписания и уведомлений</p>
        </div>
        <div className="text-center py-12">
          <Icon name="Loader2" size={32} className="animate-spin mx-auto text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Настройки календаря</h1>
        <p className="text-gray-500 mt-1 text-sm">Параметры расписания и уведомлений</p>
      </div>

      <div className="space-y-6 max-w-2xl">
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Icon name="Globe" size={18} className="text-nature-forest" />
            <h2 className="text-lg font-semibold text-gray-900">Часовой пояс</h2>
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-900">Часовой пояс мастера</Label>
            <p className="text-xs text-gray-500 mt-0.5 mb-2">
              Все уведомления (Telegram, Email, SMS) и время в карточках записей будут показываться в этом поясе
            </p>
            <select
              value={form.timezone}
              onChange={(e) => setForm((p) => ({ ...p, timezone: e.target.value }))}
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label} ({tz.offset})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Icon name="Zap" size={18} className="text-nature-forest" />
            <h2 className="text-lg font-semibold text-gray-900">Автоматизация</h2>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium text-gray-900">Автоматическое подтверждение</Label>
              <p className="text-xs text-gray-500 mt-0.5">
                Новые записи будут автоматически подтверждаться без ручной модерации
              </p>
            </div>
            <Switch
              checked={form.auto_confirm}
              onCheckedChange={(v) => updateToggle("auto_confirm", v)}
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-nature-forest hover:bg-nature-forest/90 text-white"
          >
            {saving && <Icon name="Loader2" size={16} className="animate-spin" />}
            <Icon name="Save" size={16} />
            Сохранить настройки
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MasterCalendarSettings;