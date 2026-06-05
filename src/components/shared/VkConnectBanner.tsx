/**
 * VkConnectBanner — экологичное приглашение написать сообществу ВК.
 *
 * Механика:
 *   1. Пользователь нажимает кнопку → открывается vk.com/im с готовым текстом
 *   2. Отправив хотя бы одно сообщение, он разрешает сообществу писать в ответ
 *
 * Props:
 *   variant   — "banner" (заметный блок, по умолчанию) | "inline" (компактная строка)
 *   onDismiss — если передан, показывается крестик «Не сейчас»
 *   dismissKey — ключ в localStorage для запоминания «закрыт»
 */

import { useState } from "react";
import Icon from "@/components/ui/icon";

const VK_COMMUNITY = "sparcom";
const VK_URL = `https://vk.com/write-${VK_COMMUNITY}`;

interface Props {
  variant?: "banner" | "inline";
  onDismiss?: () => void;
  dismissKey?: string;
}

export default function VkConnectBanner({ variant = "banner", onDismiss, dismissKey }: Props) {
  const [dismissed, setDismissed] = useState(() => {
    if (!dismissKey) return false;
    return localStorage.getItem(dismissKey) === "1";
  });

  if (dismissed) return null;

  const handleDismiss = () => {
    if (dismissKey) localStorage.setItem(dismissKey, "1");
    setDismissed(true);
    onDismiss?.();
  };

  const handleOpen = () => {
    window.open(VK_URL, "_blank", "noopener,noreferrer");
  };

  if (variant === "inline") {
    return (
      <div className="flex items-center gap-3 bg-[#e8f0fc] dark:bg-blue-950/40 border border-[#b8cff7] dark:border-blue-800 rounded-xl px-4 py-3">
        <div className="w-8 h-8 rounded-full bg-[#0077FF] flex items-center justify-center flex-shrink-0">
          <Icon name="MessageCircle" size={16} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[#0d1b4b] dark:text-blue-100">
            Получайте уведомления в ВКонтакте
          </p>
          <p className="text-xs text-[#4a5c8a] dark:text-blue-300 mt-0.5">
            Напишите нам одно сообщение — и мы сможем оповещать вас в VK
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleOpen}
            className="text-xs font-semibold text-white bg-[#0077FF] hover:bg-[#005fcc] px-3 py-1.5 rounded-lg transition-colors"
          >
            Написать
          </button>
          {onDismiss && (
            <button
              onClick={handleDismiss}
              className="text-[#7a8fb5] hover:text-[#0d1b4b] dark:hover:text-white transition-colors"
              title="Не сейчас"
            >
              <Icon name="X" size={15} />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-gradient-to-br from-[#e8f0fc] to-[#dce9ff] dark:from-blue-950/50 dark:to-blue-900/30 border border-[#b8cff7] dark:border-blue-800 rounded-2xl p-5">
      {onDismiss && (
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-[#7a8fb5] hover:text-[#0d1b4b] dark:hover:text-white transition-colors"
          title="Не сейчас"
        >
          <Icon name="X" size={16} />
        </button>
      )}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-[#0077FF] flex items-center justify-center flex-shrink-0 shadow-md">
          <Icon name="MessageCircle" size={22} className="text-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-[#0d1b4b] dark:text-blue-100 text-base leading-tight">
            Подключите уведомления в ВКонтакте
          </h3>
          <p className="text-sm text-[#4a5c8a] dark:text-blue-300 mt-1 leading-relaxed">
            Напишите нам любое сообщение в VK — и вы будете получать
            подтверждения записей, напоминания и важные новости прямо в личку.
          </p>
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={handleOpen}
              className="inline-flex items-center gap-2 bg-[#0077FF] hover:bg-[#005fcc] text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm"
            >
              <Icon name="ExternalLink" size={15} />
              Написать сообществу
            </button>
            {onDismiss && (
              <button
                onClick={handleDismiss}
                className="text-sm text-[#7a8fb5] hover:text-[#4a5c8a] dark:hover:text-blue-300 transition-colors"
              >
                Не сейчас
              </button>
            )}
          </div>
          <p className="text-[11px] text-[#7a8fb5] dark:text-blue-400 mt-3">
            Вам нужно отправить только одно сообщение — этого достаточно, чтобы разрешить нам писать вам.
          </p>
        </div>
      </div>
    </div>
  );
}