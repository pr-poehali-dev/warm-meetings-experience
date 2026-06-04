import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { organizerApi, OrgNotifySettings } from "@/lib/organizer-api";
import { toast } from "sonner";

function NotifyChannelRow({
  icon,
  label,
  description,
  active,
  disabled,
  onToggle,
}: {
  icon: string;
  label: string;
  description: string;
  active: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${active ? "border-green-200 bg-green-50/50" : "border-border bg-muted/20"} ${disabled ? "opacity-50" : ""}`}
    >
      <div className="flex items-center gap-2.5">
        <Icon
          name={icon as "Send"}
          size={15}
          className={active ? "text-green-600" : "text-muted-foreground"}
        />
        <div>
          <p className="text-sm font-medium leading-tight">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <button
        onClick={onToggle}
        disabled={disabled}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${active ? "bg-green-500" : "bg-muted-foreground/30"}`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${active ? "translate-x-4" : "translate-x-1"}`}
        />
      </button>
    </div>
  );
}

interface Props {
  /** Если переданы готовые настройки — компонент работает в управляемом режиме */
  settings?: OrgNotifySettings | null;
  /** Заголовок блока (по умолчанию скрыт) */
  showHeader?: boolean;
}

export default function NotifyChannels({ settings: external, showHeader = true }: Props) {
  const [notifySettings, setNotifySettings] = useState<OrgNotifySettings | null>(external ?? null);
  const [savingNotify, setSavingNotify] = useState(false);

  useEffect(() => {
    if (external !== undefined) {
      setNotifySettings(external);
      return;
    }
    organizerApi.getNotifySettings().then(setNotifySettings).catch(() => {});
  }, [external]);

  const handleNotifyToggle = async (
    field: keyof Pick<OrgNotifySettings, "notify_telegram" | "notify_email" | "notify_vk">,
  ) => {
    if (!notifySettings) return;
    const newVal = !notifySettings[field];
    setNotifySettings({ ...notifySettings, [field]: newVal });
    setSavingNotify(true);
    try {
      await organizerApi.updateNotifySettings({ [field]: newVal });
    } catch {
      setNotifySettings({ ...notifySettings });
      toast.error("Не удалось сохранить настройки");
    } finally {
      setSavingNotify(false);
    }
  };

  if (!notifySettings) return null;

  return (
    <div className="space-y-4">
      {showHeader && (
        <div>
          <p className="font-semibold text-sm">Куда присылать уведомления</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Выберите каналы, по которым будут приходить оповещения о записях
          </p>
        </div>
      )}
      <div className="space-y-2">
        <NotifyChannelRow
          icon="Send"
          label="Telegram"
          description={
            notifySettings.tg_linked
              ? "Личное сообщение в Telegram"
              : "Нужно привязать аккаунт в разделе Telegram"
          }
          active={notifySettings.notify_telegram && notifySettings.tg_linked}
          disabled={!notifySettings.tg_linked || savingNotify}
          onToggle={() => handleNotifyToggle("notify_telegram")}
        />
        <NotifyChannelRow
          icon="Mail"
          label="Email"
          description={notifySettings.email ? notifySettings.email : "Email не указан в профиле"}
          active={notifySettings.notify_email && !!notifySettings.email}
          disabled={!notifySettings.email || savingNotify}
          onToggle={() => handleNotifyToggle("notify_email")}
        />
        <NotifyChannelRow
          icon="MessageCircle"
          label="ВКонтакте"
          description={
            notifySettings.vk_id ? "Личное сообщение от сообщества" : "VK не привязан в профиле"
          }
          active={notifySettings.notify_vk && !!notifySettings.vk_id}
          disabled={!notifySettings.vk_id || savingNotify}
          onToggle={() => handleNotifyToggle("notify_vk")}
        />
      </div>
      {!notifySettings.tg_linked && !notifySettings.email && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg p-2.5">
          Настройте хотя бы один канал, чтобы получать уведомления о записях.
        </p>
      )}
    </div>
  );
}
