/**
 * VkConnectBanner — приглашение подключить VK-уведомления.
 *
 * Два сценария:
 *   1. vkId не задан → предлагаем привязать VK через OAuth
 *   2. vkId задан    → предлагаем написать сообществу (разрешить личку)
 *
 * Props:
 *   vkId       — vk_id пользователя из профиля (undefined/null = не привязан)
 *   variant    — "banner" (заметный блок) | "inline" (компактная строка)
 *   onDismiss  — если передан, показывается крестик «Не сейчас»
 *   dismissKey — ключ в localStorage для запоминания «закрыт»
 */

import { useState } from "react";
import Icon from "@/components/ui/icon";

const VK_AUTH_URL = "https://functions.poehali.dev/e0433198-3f6a-4251-aacd-b238beddae39";
const VK_COMMUNITY = "sparcom";
const VK_WRITE_URL = `https://vk.com/write-${VK_COMMUNITY}`;

interface Props {
  vkId?: string | null;
  variant?: "banner" | "inline";
  onDismiss?: () => void;
  dismissKey?: string;
}

export default function VkConnectBanner({ vkId, variant = "banner", onDismiss, dismissKey }: Props) {
  const isLinked = Boolean(vkId);

  // Крестик работает только если VK уже привязан (сценарий «написать сообществу»).
  // Пока VK не привязан — баннер не скрывается, чтобы пользователь не потерял возможность подключить.
  const effectiveDismissKey = isLinked ? dismissKey : undefined;

  const [dismissed, setDismissed] = useState(() => {
    if (!effectiveDismissKey) return false;
    return localStorage.getItem(effectiveDismissKey) === "1";
  });
  const [loading, setLoading] = useState(false);

  if (dismissed) return null;

  const handleDismiss = () => {
    if (effectiveDismissKey) localStorage.setItem(effectiveDismissKey, "1");
    setDismissed(true);
    onDismiss?.();
  };

  // Сценарий 1: VK не привязан → OAuth
  const handleLinkVk = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${VK_AUTH_URL}?action=auth-url`);
      const data = await res.json();
      if (data.auth_url) {
        if (data.state) sessionStorage.setItem("vk_auth_state", data.state);
        if (data.code_verifier) sessionStorage.setItem("vk_auth_code_verifier", data.code_verifier);
        sessionStorage.setItem("vk_link_pending", "1");
        window.location.href = data.auth_url;
      }
    } catch {
      setLoading(false);
    }
  };

  // Сценарий 2: VK привязан → написать сообществу
  const handleWriteCommunity = () => {
    window.open(VK_WRITE_URL, "_blank", "noopener,noreferrer");
  };

  const handleClick = isLinked ? handleWriteCommunity : handleLinkVk;
  const btnLabel = isLinked ? "Написать сообществу" : "Привязать VK";
  const title = isLinked
    ? "Разрешите нам писать в VK"
    : "Получайте уведомления в ВКонтакте";
  const description = isLinked
    ? "Напишите нам одно сообщение — и мы сможем присылать подтверждения записей и напоминания прямо в личку."
    : "Привяжите VK-аккаунт — и мы сможем присылать вам подтверждения записей, напоминания и важные новости.";
  const hint = isLinked
    ? "Достаточно одного сообщения — это разрешит нам писать вам."
    : "Займёт несколько секунд — один клик через VK.";

  if (variant === "inline") {
    return (
      <div className="flex items-center gap-3 bg-[#e8f0fc] dark:bg-blue-950/40 border border-[#b8cff7] dark:border-blue-800 rounded-xl px-4 py-3">
        <div className="w-8 h-8 rounded-full bg-[#0077FF] flex items-center justify-center flex-shrink-0">
          <Icon name={isLinked ? "MessageCircle" : "Link"} size={16} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[#0d1b4b] dark:text-blue-100">{title}</p>
          <p className="text-xs text-[#4a5c8a] dark:text-blue-300 mt-0.5">{description}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleClick}
            disabled={loading}
            className="text-xs font-semibold text-white bg-[#0077FF] hover:bg-[#005fcc] disabled:opacity-60 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
          >
            {loading && <Icon name="Loader2" size={12} className="animate-spin" />}
            {loading ? "Загрузка..." : btnLabel}
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
          <Icon name={isLinked ? "MessageCircle" : "Link"} size={22} className="text-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-[#0d1b4b] dark:text-blue-100 text-base leading-tight">
            {title}
          </h3>
          <p className="text-sm text-[#4a5c8a] dark:text-blue-300 mt-1 leading-relaxed">
            {description}
          </p>
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={handleClick}
              disabled={loading}
              className="inline-flex items-center gap-2 bg-[#0077FF] hover:bg-[#005fcc] disabled:opacity-60 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm"
            >
              {loading
                ? <><Icon name="Loader2" size={15} className="animate-spin" />Загрузка...</>
                : <><Icon name={isLinked ? "ExternalLink" : "LogIn"} size={15} />{btnLabel}</>
              }
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
          <p className="text-[11px] text-[#7a8fb5] dark:text-blue-400 mt-3">{hint}</p>
        </div>
      </div>
    </div>
  );
}