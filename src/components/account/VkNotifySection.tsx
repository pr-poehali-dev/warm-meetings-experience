import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import Icon from "@/components/ui/icon";
import { vkNotifyApi, NotificationPreferences } from "@/lib/user-api";
import { toast } from "sonner";

interface VkNotifySectionProps {
  vkId?: string | null;
}

export default function VkNotifySection({ vkId }: VkNotifySectionProps) {
  const [allowed, setAllowed] = useState(false);
  const [prefs, setPrefs] = useState<NotificationPreferences>({
    notify_service: true,
    notify_reminders: true,
    notify_marketing: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!vkId) return;
    vkNotifyApi.getPreferences()
      .then((data) => {
        setAllowed(data.vk_notify_allowed);
        if (data.preferences?.vk) {
          setPrefs(data.preferences.vk);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [vkId]);

  const handleAllowToggle = async (val: boolean) => {
    setSaving(true);
    try {
      await vkNotifyApi.allowNotify(val);
      setAllowed(val);
      toast.success(val ? "Уведомления ВКонтакте включены" : "Уведомления ВКонтакте отключены");
    } catch {
      toast.error("Не удалось изменить настройку");
    } finally {
      setSaving(false);
    }
  };

  const handlePrefToggle = async (key: keyof NotificationPreferences, val: boolean) => {
    const updated = { ...prefs, [key]: val };
    setPrefs(updated);
    try {
      await vkNotifyApi.setPreferences({ channel: "vk", ...updated });
    } catch {
      setPrefs(prefs);
      toast.error("Не удалось сохранить настройку");
    }
  };

  if (!vkId) return null;

  return (
    <div className="pt-3 border-t border-border">
      <div className="flex items-center gap-2 mb-3">
        <Icon name="Bell" size={15} className="text-muted-foreground" />
        <span className="text-sm font-medium">Уведомления ВКонтакте</span>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Icon name="Loader2" size={14} className="animate-spin" />
          Загрузка...
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm">Получать сообщения от сообщества</div>
              <div className="text-xs text-muted-foreground">Разрешить боту писать вам в ВК</div>
            </div>
            <Switch
              checked={allowed}
              onCheckedChange={handleAllowToggle}
              disabled={saving}
            />
          </div>

          {allowed && (
            <div className="pl-3 border-l-2 border-border space-y-2.5">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-normal cursor-pointer">
                  Служебные сообщения
                  <div className="text-xs text-muted-foreground font-normal">Подтверждения записей, изменения</div>
                </Label>
                <Switch
                  checked={prefs.notify_service}
                  onCheckedChange={(v) => handlePrefToggle("notify_service", v)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm font-normal cursor-pointer">
                  Напоминания
                  <div className="text-xs text-muted-foreground font-normal">За день до события</div>
                </Label>
                <Switch
                  checked={prefs.notify_reminders}
                  onCheckedChange={(v) => handlePrefToggle("notify_reminders", v)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm font-normal cursor-pointer">
                  Новости и акции
                  <div className="text-xs text-muted-foreground font-normal">Анонсы событий, специальные предложения</div>
                </Label>
                <Switch
                  checked={prefs.notify_marketing}
                  onCheckedChange={(v) => handlePrefToggle("notify_marketing", v)}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
