import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { organizerApi, OrgNotifySettings } from "@/lib/organizer-api";
import { tgPublishApi, TgChannel } from "@/lib/tg-publish-api";
import { toast } from "sonner";

import TelegramProgressSteps from "./telegram/TelegramProgressSteps";
import TelegramConnectedCard from "./telegram/TelegramConnectedCard";
import TelegramLinkStep from "./telegram/TelegramLinkStep";
import TelegramChannelStep from "./telegram/TelegramChannelStep";

interface Props {
  tgLinked: boolean;
  tgChannelsCount: number;
  userId: number;
  onRefresh: () => void;
  userRole?: "organizer" | "master" | "partner" | "editor";
}

const ROLE_COPY: Record<string, { title: string; desc: string }> = {
  organizer: {
    title: "Банный бот Telegram",
    desc: "Публикуйте события в ваш канал и получайте уведомления о новых записях прямо в Telegram",
  },
  master: {
    title: "Telegram для мастера",
    desc: "Публикуйте услуги и открытые слоты в свой Telegram-канал — клиенты увидят и смогут записаться",
  },
  partner: {
    title: "Telegram для управляющего",
    desc: "Публикуйте акции и обновления бани в свой канал — подписчики узнают первыми",
  },
  editor: {
    title: "Telegram для редактора",
    desc: "Публикуйте статьи блога в Telegram-канал сразу после публикации",
  },
};

export default function TelegramSettings({
  tgLinked,
  tgChannelsCount,
  userId,
  onRefresh,
  userRole = "organizer",
}: Props) {
  const roleCopy = ROLE_COPY[userRole] || ROLE_COPY.organizer;
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(false);
  const [notifySettings, setNotifySettings] =
    useState<OrgNotifySettings | null>(null);
  const [channels, setChannels] = useState<TgChannel[]>([]);

  useEffect(() => {
    organizerApi
      .getNotifySettings()
      .then(setNotifySettings)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!tgChannelsCount || !userId) return;
    tgPublishApi
      .getChannels(userId)
      .then(setChannels)
      .catch(() => {});
  }, [tgChannelsCount, userId]);

  const handleGetCode = async () => {
    setLoading(true);
    try {
      const data = await organizerApi.getTelegramCode();
      setCode(data.code);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Не удалось получить код. Попробуйте ещё раз.",
      );
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
          {roleCopy.title}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">{roleCopy.desc}</p>
      </div>

      {/* Прогресс */}
      <TelegramProgressSteps
        step1Done={step1Done}
        step2Done={step2Done}
        tgChannelsCount={tgChannelsCount}
        notifySettings={notifySettings}
        channels={channels}
      />

      {/* Всё настроено */}
      {allDone && <TelegramConnectedCard notifySettings={notifySettings} />}

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