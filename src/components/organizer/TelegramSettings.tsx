import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import Icon from "@/components/ui/icon";
import { organizerApi, OrgNotifySettings } from "@/lib/organizer-api";
import { toast } from "sonner";

import TelegramProgressSteps from "./telegram/TelegramProgressSteps";
import TelegramConnectedCard from "./telegram/TelegramConnectedCard";
import TelegramLinkStep from "./telegram/TelegramLinkStep";
import TelegramChannelStep from "./telegram/TelegramChannelStep";

interface Props {
  tgLinked: boolean;
  tgChannelsCount: number;
  onRefresh: () => void;
}

function NotifyChannelRow({ icon, label, description, active, disabled, onToggle }: {
  icon: string; label: string; description: string;
  active: boolean; disabled: boolean; onToggle: () => void;
}) {
  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${active ? "border-green-200 bg-green-50/50" : "border-border bg-muted/20"} ${disabled ? "opacity-50" : ""}`}>
      <div className="flex items-center gap-2.5">
        <Icon name={icon as "Send"} size={15} className={active ? "text-green-600" : "text-muted-foreground"} />
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
        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${active ? "translate-x-4" : "translate-x-1"}`} />
      </button>
    </div>
  );
}

export default function TelegramSettings({ tgLinked, tgChannelsCount, onRefresh }: Props) {
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(false);
  const [notifySettings, setNotifySettings] = useState<OrgNotifySettings | null>(null);
  const [savingNotify, setSavingNotify] = useState(false);

  useEffect(() => {
    organizerApi.getNotifySettings()
      .then(setNotifySettings)
      .catch(() => {});
  }, []);

  const handleNotifyToggle = async (field: keyof Pick<OrgNotifySettings, "notify_telegram" | "notify_email" | "notify_vk">) => {
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

  const handleGetCode = async () => {
    setLoading(true);
    try {
      const data = await organizerApi.getTelegramCode();
      setCode(data.code);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не удалось получить код. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleCheck = async () => {
    setChecking(true);
    await onRefresh();
    setTimeout(() => setChecking(false), 1000);
  };

  const step1Done = tgLinked;
  const step2Done = tgChannelsCount > 0;
  const allDone = step1Done && step2Done;

  return (
    <div className="space-y-5">

      {/* Шапка */}
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Icon name="Send" size={20} className="text-primary" />
          Telegram-бот для организаторов
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Бот автоматически публикует события в ваш канал и присылает уведомления о новых записях
        </p>
      </div>

      {/* Прогресс */}
      <TelegramProgressSteps
        step1Done={step1Done}
        step2Done={step2Done}
        tgChannelsCount={tgChannelsCount}
        notifySettings={notifySettings}
      />

      {/* Всё настроено */}
      {allDone && <TelegramConnectedCard notifySettings={notifySettings} />}

      {/* Уведомления о новых записях */}
      {notifySettings && (
        <Card>
          <CardContent className="pt-5 space-y-4">
            <div>
              <p className="font-semibold text-sm">Уведомления о новых записях</p>
              <p className="text-xs text-muted-foreground mt-0.5">Выберите, куда присылать оповещение когда кто-то записался на вашу встречу</p>
            </div>
            <div className="space-y-2">
              <NotifyChannelRow
                icon="Send"
                label="Telegram"
                description={notifySettings.tg_linked ? "Личное сообщение в Telegram" : "Нужно привязать аккаунт выше"}
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
                description={notifySettings.vk_id ? "Личное сообщение от сообщества" : "VK не привязан в профиле"}
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
          </CardContent>
        </Card>
      )}

      {/* Шаг 1: Привязка аккаунта */}
      {!step1Done && (
        <TelegramLinkStep
          code={code}
          loading={loading}
          copied={copied}
          checking={checking}
          onGetCode={handleGetCode}
          onCopy={handleCopy}
          onCheck={handleCheck}
        />
      )}

      {/* Шаг 2: Подключение канала */}
      {step1Done && !step2Done && (
        <TelegramChannelStep
          checking={checking}
          copied={copied}
          onCheck={handleCheck}
          onCopy={handleCopy}
        />
      )}
    </div>
  );
}
