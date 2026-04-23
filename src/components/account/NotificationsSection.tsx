import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { notificationsApi, ChannelInfo, ChannelPrefs, NotificationChannels } from "@/lib/user-api";
import { toast } from "sonner";

const CHANNELS = [
  {
    key: "email" as const,
    label: "Email",
    icon: "Mail",
    description: (info: ChannelInfo) => info.value || "Не указан",
    connectHint: null,
  },
  {
    key: "vk" as const,
    label: "ВКонтакте",
    icon: "Users",
    description: () => "Привязан VK аккаунт",
    connectHint: "Привяжите VK аккаунт в профиле",
  },
  {
    key: "telegram" as const,
    label: "Telegram",
    icon: "Send",
    description: () => "Привязан Telegram",
    connectHint: "Привяжите Telegram в профиле",
  },
  {
    key: "sms" as const,
    label: "SMS",
    icon: "Smartphone",
    description: (info: ChannelInfo) => info.value ? `Только срочные` : "Укажите телефон в профиле",
    connectHint: "Только для срочных уведомлений (отмена, изменение времени)",
  },
];

const PREF_LABELS: { key: keyof ChannelPrefs; label: string; hint: string }[] = [
  { key: "notify_booking", label: "Подтверждение бронирования", hint: "При записи на событие" },
  { key: "notify_reminders", label: "Напоминания", hint: "За 24 часа и за 1 час до события" },
  { key: "notify_service", label: "Служебные", hint: "Изменения в расписании" },
  { key: "notify_urgent", label: "Срочные", hint: "Отмена события, срочные изменения" },
  { key: "notify_marketing", label: "Новости и акции", hint: "Анонсы новых событий, спецпредложения" },
];

interface ChannelRowProps {
  channelKey: keyof NotificationChannels;
  info: ChannelInfo;
  meta: typeof CHANNELS[number];
  onToggle: (active: boolean) => Promise<void>;
  onPrefToggle: (key: keyof ChannelPrefs, val: boolean) => Promise<void>;
}

function ChannelRow({ channelKey, info, meta, onToggle, onPrefToggle }: ChannelRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleToggle = async (val: boolean) => {
    setSaving(true);
    await onToggle(val);
    setSaving(false);
  };

  const isConnected = channelKey === "email" ? info.connected : info.connected && (info.allowed !== false);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="flex items-center gap-3 p-4">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${isConnected ? "bg-primary/10" : "bg-muted"}`}>
          <Icon name={meta.icon as "Mail"} size={16} className={isConnected ? "text-primary" : "text-muted-foreground"} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{meta.label}</span>
            {isConnected && (
              <span className="text-xs bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded-full">подключён</span>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {isConnected ? meta.description(info) : (meta.connectHint || "Не подключён")}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isConnected && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-muted-foreground hover:text-foreground transition-colors p-1"
              title="Настройки"
            >
              <Icon name={expanded ? "ChevronUp" : "ChevronDown"} size={15} />
            </button>
          )}
          <Switch
            checked={info.active && isConnected}
            onCheckedChange={handleToggle}
            disabled={!isConnected || saving}
          />
        </div>
      </div>

      {expanded && isConnected && (
        <div className="border-t border-border bg-muted/30 px-4 py-3 space-y-2.5">
          {PREF_LABELS.map(({ key, label, hint }) => (
            channelKey === "sms" && !["notify_urgent"].includes(key) ? null : (
              <div key={key} className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm">{label}</div>
                  <div className="text-xs text-muted-foreground">{hint}</div>
                </div>
                <Switch
                  checked={!!info.prefs[key]}
                  onCheckedChange={(val) => onPrefToggle(key, val)}
                  disabled={!info.active}
                />
              </div>
            )
          ))}
        </div>
      )}
    </div>
  );
}

export default function NotificationsSection() {
  const [channels, setChannels] = useState<NotificationChannels | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    notificationsApi.getChannels()
      .then((data) => setChannels(data.channels))
      .catch(() => toast.error("Не удалось загрузить настройки уведомлений"))
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = async (channelKey: keyof NotificationChannels, active: boolean) => {
    if (!channels) return;

    if (channelKey === "vk" && active) {
      try {
        await notificationsApi.allowVk(true);
      } catch {
        toast.error("Не удалось включить VK-уведомления");
        return;
      }
    }

    try {
      await notificationsApi.setChannel(channelKey, active);
      setChannels((prev) => prev ? {
        ...prev,
        [channelKey]: { ...prev[channelKey], active, allowed: channelKey === "vk" ? active : prev[channelKey].allowed },
      } : prev);
      toast.success(active ? "Канал включён" : "Канал отключён");
    } catch {
      toast.error("Не удалось изменить настройку");
    }
  };

  const handlePrefToggle = async (channelKey: keyof NotificationChannels, key: keyof ChannelPrefs, val: boolean) => {
    if (!channels) return;
    const updated = { ...channels[channelKey].prefs, [key]: val };
    setChannels((prev) => prev ? {
      ...prev,
      [channelKey]: { ...prev[channelKey], prefs: updated },
    } : prev);
    try {
      await notificationsApi.setPrefs(channelKey, updated);
    } catch {
      toast.error("Не удалось сохранить настройку");
      setChannels((prev) => prev ? {
        ...prev,
        [channelKey]: { ...prev[channelKey], prefs: channels[channelKey].prefs },
      } : prev);
    }
  };

  const activeCount = channels ? Object.values(channels).filter((c) => c.active && c.connected).length : 0;

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <Icon name="Bell" size={20} />
          Уведомления
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Выберите, куда отправлять напоминания о событиях и важные сообщения. Можно включить несколько каналов сразу.
        </p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Icon name="Loader2" size={16} className="animate-spin" />
            Загрузка настроек...
          </div>
        ) : channels ? (
          <div className="space-y-3">
            {activeCount === 0 && (
              <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-4">
                <Icon name="AlertTriangle" size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  Ни один канал не включён. Вы не будете получать уведомления о событиях.
                </p>
              </div>
            )}

            {CHANNELS.map((meta) => (
              <ChannelRow
                key={meta.key}
                channelKey={meta.key}
                info={channels[meta.key]}
                meta={meta}
                onToggle={(active) => handleToggle(meta.key, active)}
                onPrefToggle={(key, val) => handlePrefToggle(meta.key, key, val)}
              />
            ))}

            <p className="text-xs text-muted-foreground pt-1">
              Email всегда используется как резервный канал для срочных уведомлений.
            </p>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">Не удалось загрузить настройки</div>
        )}
      </CardContent>
    </Card>
  );
}
