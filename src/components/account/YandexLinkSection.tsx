import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { YandexLoginButton } from "@/components/extensions/yandex-auth/YandexLoginButton";
import { useYandexAuth } from "@/components/extensions/yandex-auth/useYandexAuth";
import { userProfileApi } from "@/lib/user-api";
import { toast } from "sonner";
import Icon from "@/components/ui/icon";

const YANDEX_AUTH_URL = "https://functions.poehali.dev/1e5f15d8-b432-4341-9a18-4c408d3d80aa";

interface YandexLinkSectionProps {
  yandexId?: string | null;
  hasPassword?: boolean;
  onLinked: (yandexId: string) => void;
  onUnlinked: () => void;
}

export default function YandexLinkSection({ yandexId, hasPassword, onLinked, onUnlinked }: YandexLinkSectionProps) {
  const [unlinking, setUnlinking] = useState(false);

  const yandexAuth = useYandexAuth({
    apiUrls: {
      authUrl: `${YANDEX_AUTH_URL}?action=auth-url`,
      callback: `${YANDEX_AUTH_URL}?action=callback`,
      refresh: `${YANDEX_AUTH_URL}?action=refresh`,
      logout: `${YANDEX_AUTH_URL}?action=logout`,
    },
  });

  const handleCallback = useCallback(async () => {
    const params = new URLSearchParams(window.location.search);
    const isLinkFlow = sessionStorage.getItem("yandex_link_pending") === "1";
    if (!isLinkFlow || !params.get("code")) return;

    sessionStorage.removeItem("yandex_link_pending");
    const success = await yandexAuth.handleCallback(params);
    if (success && yandexAuth.user && yandexAuth.accessToken) {
      try {
        await userProfileApi.linkYandex(String(yandexAuth.user.yandex_id), yandexAuth.accessToken);
        onLinked(String(yandexAuth.user.yandex_id));
        toast.success("Яндекс успешно привязан");
        await yandexAuth.logout();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Не удалось привязать Яндекс");
      }
    } else if (!success) {
      toast.error("Не удалось войти через Яндекс");
    }
    const url = new URL(window.location.href);
    url.searchParams.delete("code");
    url.searchParams.delete("state");
    window.history.replaceState({}, "", url.toString());
  }, [yandexAuth, onLinked]);

  useEffect(() => {
    handleCallback();
  }, [handleCallback]);

  const handleLinkYandex = async () => {
    const response = await fetch(`${YANDEX_AUTH_URL}?action=auth-url`);
    const data = await response.json();
    if (data.auth_url) {
      if (data.state) sessionStorage.setItem("yandex_auth_state", data.state);
      sessionStorage.setItem("yandex_link_pending", "1");
      window.location.href = data.auth_url;
    }
  };

  const handleUnlink = async () => {
    if (!hasPassword) {
      const confirmed = window.confirm(
        "У вас не установлен пароль. После отвязки Яндекса единственным способом входа останется восстановление пароля через email. Продолжить?"
      );
      if (!confirmed) return;
    }
    setUnlinking(true);
    try {
      await userProfileApi.unlinkYandex();
      onUnlinked();
      toast.success("Яндекс аккаунт отвязан");
      if (!hasPassword) {
        toast.info("Рекомендуем установить пароль для входа на сайт", { duration: 5000 });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось отвязать Яндекс");
    } finally {
      setUnlinking(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
        <svg className="w-4 h-4 text-muted-foreground" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path
            fill="currentColor"
            d="M12.04.04C5.43.04.08,5.39.08,12s5.35,11.96,11.96,11.96,11.96-5.35,11.96-11.96S18.64.04,12.04.04ZM16.04,19.09h-2.47V6.82h-1.11c-2.03,0-3.09,1.03-3.09,2.54,0,1.71.74,2.51,2.25,3.54l1.25.84-3.59,5.37h-2.68l3.22-4.8c-1.85-1.33-2.89-2.62-2.89-4.8,0-2.74,1.91-4.6,5.53-4.6h3.59v14.19Z"
          />
        </svg>
      </div>
      <div className="flex-1">
        <div className="text-sm text-muted-foreground">Яндекс</div>
        {yandexId ? (
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">Привязан</span>
            <Icon name="CheckCircle" size={14} className="text-green-500" />
          </div>
        ) : (
          <div className="font-medium text-sm text-muted-foreground">Не привязан</div>
        )}
      </div>
      {yandexId ? (
        <Button variant="outline" size="sm" onClick={handleUnlink} disabled={unlinking}>
          {unlinking ? <Icon name="Loader2" size={14} className="animate-spin" /> : "Отвязать"}
        </Button>
      ) : (
        <YandexLoginButton
          onClick={handleLinkYandex}
          isLoading={yandexAuth.isLoading}
          buttonText="Привязать"
          className="h-8 text-sm px-3"
        />
      )}
    </div>
  );
}