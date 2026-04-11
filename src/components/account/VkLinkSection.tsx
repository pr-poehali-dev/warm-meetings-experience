import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { VkLoginButton } from "@/components/extensions/vk-auth/VkLoginButton";
import { useVkAuth } from "@/components/extensions/vk-auth/useVkAuth";
import { userProfileApi } from "@/lib/user-api";
import { toast } from "sonner";
import Icon from "@/components/ui/icon";

const VK_AUTH_URL = "https://functions.poehali.dev/e0433198-3f6a-4251-aacd-b238beddae39";

interface VkLinkSectionProps {
  vkId?: string | null;
  hasPassword?: boolean;
  onLinked: (vkId: string) => void;
  onUnlinked: () => void;
}

export default function VkLinkSection({ vkId, hasPassword, onLinked, onUnlinked }: VkLinkSectionProps) {
  const [unlinking, setUnlinking] = useState(false);

  const vkAuth = useVkAuth({
    apiUrls: {
      authUrl: `${VK_AUTH_URL}?action=auth-url`,
      callback: `${VK_AUTH_URL}?action=callback`,
      refresh: `${VK_AUTH_URL}?action=refresh`,
      logout: `${VK_AUTH_URL}?action=logout`,
    },
  });

  const handleCallback = useCallback(async () => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("vk_link") !== "1") return;

    const success = await vkAuth.handleCallback(params);
    if (success && vkAuth.user && vkAuth.accessToken) {
      try {
        await userProfileApi.linkVk(String(vkAuth.user.vk_id), vkAuth.accessToken);
        onLinked(String(vkAuth.user.vk_id));
        toast.success("ВКонтакте успешно привязан");
        await vkAuth.logout();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Не удалось привязать VK");
      }
    } else if (!success) {
      toast.error("Не удалось войти через VK");
    }
    const url = new URL(window.location.href);
    url.searchParams.delete("vk_link");
    url.searchParams.delete("code");
    url.searchParams.delete("state");
    url.searchParams.delete("device_id");
    window.history.replaceState({}, "", url.toString());
  }, [vkAuth, onLinked]);

  useEffect(() => {
    handleCallback();
  }, [handleCallback]);

  const handleLinkVk = async () => {
    const response = await fetch(`${VK_AUTH_URL}?action=auth-url`);
    const data = await response.json();
    if (data.auth_url) {
      if (data.state) sessionStorage.setItem("vk_auth_state", data.state);
      if (data.code_verifier) sessionStorage.setItem("vk_auth_code_verifier", data.code_verifier);
      const callbackUrl = new URL(`${window.location.origin}/auth/vk/callback`);
      callbackUrl.searchParams.set("vk_link", "1");
      const authUrl = new URL(data.auth_url);
      authUrl.searchParams.set("redirect_uri", callbackUrl.toString());
      window.location.href = authUrl.toString();
    }
  };

  const handleUnlink = async () => {
    if (!hasPassword) {
      const confirmed = window.confirm(
        "У вас не установлен пароль. После отвязки VK единственным способом входа останется восстановление пароля через email. Продолжить?"
      );
      if (!confirmed) return;
    }
    setUnlinking(true);
    try {
      await userProfileApi.unlinkVk();
      onUnlinked();
      toast.success("VK аккаунт отвязан");
      if (!hasPassword) {
        toast.info("Рекомендуем установить пароль для входа на сайт", { duration: 5000 });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось отвязать VK");
    } finally {
      setUnlinking(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-muted-foreground">
          <path d="M12.785 16.241s.288-.032.436-.194c.136-.148.132-.427.132-.427s-.02-1.304.587-1.496c.596-.19 1.365 1.26 2.179 1.818.615.42 1.083.328 1.083.328l2.175-.03s1.138-.07.598-.964c-.044-.073-.314-.661-1.618-1.869-1.366-1.266-1.183-1.061.462-3.252.999-1.333 1.398-2.146 1.273-2.494-.12-.332-.854-.244-.854-.244l-2.449.015s-.182-.025-.316.056c-.131.079-.216.264-.216.264s-.386 1.028-.901 1.902c-1.088 1.848-1.523 1.946-1.7 1.832-.413-.267-.31-1.075-.31-1.649 0-1.794.272-2.541-.529-2.735-.266-.064-.462-.107-1.142-.114-.873-.009-1.612.003-2.03.208-.279.137-.494.442-.363.459.162.021.529.099.723.364.251.342.242 1.11.242 1.11s.144 2.111-.336 2.372c-.33.18-.783-.187-1.755-1.866-.498-.859-.874-1.81-.874-1.81s-.072-.177-.201-.272c-.156-.115-.375-.151-.375-.151l-2.327.015s-.349.01-.477.161c-.114.135-.009.413-.009.413s1.816 4.25 3.87 6.392c1.883 1.965 4.022 1.836 4.022 1.836h.97z" />
        </svg>
      </div>
      <div className="flex-1">
        <div className="text-sm text-muted-foreground">ВКонтакте</div>
        {vkId ? (
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">Привязан</span>
            <Icon name="CheckCircle" size={14} className="text-green-500" />
          </div>
        ) : (
          <div className="font-medium text-sm text-muted-foreground">Не привязан</div>
        )}
      </div>
      {vkId ? (
        <Button variant="outline" size="sm" onClick={handleUnlink} disabled={unlinking}>
          {unlinking ? <Icon name="Loader2" size={14} className="animate-spin" /> : "Отвязать"}
        </Button>
      ) : (
        <VkLoginButton
          onClick={handleLinkVk}
          isLoading={vkAuth.isLoading}
          buttonText="Привязать"
          className="h-8 text-sm px-3"
        />
      )}
    </div>
  );
}