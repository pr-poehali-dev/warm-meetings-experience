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

import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { toast } from "sonner";
import MergeAccountModal, { MergeHint } from "@/components/admin/MergeAccountModal";

const VK_AUTH_URL = "https://functions.poehali.dev/e0433198-3f6a-4251-aacd-b238beddae39";
const USER_PROFILE_URL = "https://functions.poehali.dev/5322ffd0-7079-40ce-9d4e-8d7fee29624c";
const VK_COMMUNITY = "sparcom";
const VK_WRITE_URL = `https://vk.com/write-${VK_COMMUNITY}`;

interface Props {
  vkId?: string | null;
  variant?: "banner" | "inline";
  onDismiss?: () => void;
  dismissKey?: string;
  onLinked?: (vkId: string) => void;
}

export default function VkConnectBanner({ vkId, variant = "banner", onDismiss, dismissKey, onLinked }: Props) {
  const isLinked = Boolean(vkId);
  const [mergeHint, setMergeHint] = useState<MergeHint | null>(null);

  // Обработка возврата с VK OAuth (если вернулись на эту же страницу)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const isLinkFlow = sessionStorage.getItem("vk_link_pending") === "1";
    if (!isLinkFlow || !code) return;

    sessionStorage.removeItem("vk_link_pending");
    sessionStorage.removeItem("vk_link_return_url");

    const codeVerifier = sessionStorage.getItem("vk_auth_code_verifier") || "";
    const deviceId = params.get("device_id") || "";

    (async () => {
      try {
        // 1. Обмениваем code на access_token через VK-auth
        const cbRes = await fetch(`${VK_AUTH_URL}?action=callback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, code_verifier: codeVerifier, device_id: deviceId }),
        });
        const cbData = await cbRes.json();
        if (!cbRes.ok || !cbData.user?.vk_id) {
          toast.error(cbData.error || "Не удалось получить данные VK");
          return;
        }

        // 2. Привязываем к текущему аккаунту
        const token = localStorage.getItem("user_token");
        const linkRes = await fetch(`${USER_PROFILE_URL}/?resource=link-vk`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Session-Token": token || "" },
          body: JSON.stringify({ vk_id: String(cbData.user.vk_id), access_token: cbData.access_token }),
        });
        const linkData = await linkRes.json();
        if (!linkRes.ok) {
          // VK уже привязан к аккаунту-дублю → предлагаем объединить
          if (linkRes.status === 409 && linkData.code === "vk_already_linked" && linkData.other_user_id) {
            setMergeHint({
              source_user_id: linkData.other_user_id,
              target_user_id: linkData.current_user_id,
              target_email_masked: linkData.current_email_masked || "",
              target_name: linkData.current_name || "",
              reason: "name_match",
            });
            return;
          }
          toast.error(linkData.error || "Не удалось привязать VK");
          return;
        }

        toast.success("ВКонтакте успешно привязан");
        onLinked?.(String(cbData.user.vk_id));
      } catch {
        toast.error("Ошибка привязки ВКонтакте");
      } finally {
        // Убираем параметры из URL
        const url = new URL(window.location.href);
        url.searchParams.delete("code");
        url.searchParams.delete("state");
        url.searchParams.delete("device_id");
        window.history.replaceState({}, "", url.toString());
      }
    })();
  }, [onLinked]);

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
        sessionStorage.setItem("vk_link_return_url", window.location.pathname + window.location.search);
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

  const mergeModal = mergeHint && (
    <MergeAccountModal
      open={!!mergeHint}
      hint={mergeHint}
      onMerged={() => { setMergeHint(null); onLinked?.(""); }}
      onSkip={() => setMergeHint(null)}
    />
  );

  if (variant === "inline") {
    return (
      <>
      {mergeModal}
      <div className="bg-[#e8f0fc] dark:bg-blue-950/40 border border-[#b8cff7] dark:border-blue-800 rounded-xl px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-full bg-[#0077FF] flex items-center justify-center flex-shrink-0">
            <Icon name={isLinked ? "MessageCircle" : "Link"} size={13} className="text-white" />
          </div>
          <p className="text-sm font-medium text-[#0d1b4b] dark:text-blue-100">{title}</p>
        </div>
        <p className="text-xs text-[#4a5c8a] dark:text-blue-300 mb-3 leading-relaxed">{description}</p>
        <div className="flex items-center gap-2">
          <button
            onClick={handleClick}
            disabled={loading}
            className="text-xs font-semibold text-white bg-[#0077FF] hover:bg-[#005fcc] disabled:opacity-60 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
          >
            {loading && <Icon name="Loader2" size={12} className="animate-spin" />}
            {loading ? "Загрузка..." : btnLabel}
          </button>
          {effectiveDismissKey && onDismiss && (
            <button
              onClick={handleDismiss}
              className="text-xs text-[#7a8fb5] hover:text-[#4a5c8a] dark:hover:text-blue-300 transition-colors"
            >
              Не сейчас
            </button>
          )}
        </div>
      </div>
      </>
    );
  }

  return (
    <>
    {mergeModal}
    <div className="bg-gradient-to-br from-[#e8f0fc] to-[#dce9ff] dark:from-blue-950/50 dark:to-blue-900/30 border border-[#b8cff7] dark:border-blue-800 rounded-2xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-xl bg-[#0077FF] flex items-center justify-center flex-shrink-0 shadow-sm">
          <Icon name={isLinked ? "MessageCircle" : "Link"} size={18} className="text-white" />
        </div>
        <h3 className="font-semibold text-[#0d1b4b] dark:text-blue-100 text-base leading-tight">
          {title}
        </h3>
      </div>
      <p className="text-sm text-[#4a5c8a] dark:text-blue-300 leading-relaxed mb-4">
        {description}
      </p>
      <div className="flex items-center gap-3">
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
        {effectiveDismissKey && onDismiss && (
          <button
            onClick={handleDismiss}
            className="text-sm text-[#7a8fb5] hover:text-[#4a5c8a] dark:hover:text-blue-300 transition-colors"
          >
            Не сейчас
          </button>
        )}
      </div>
    </div>
    </>
  );
}