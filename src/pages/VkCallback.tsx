import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useVkAuth } from "@/components/extensions/vk-auth/useVkAuth";
import Icon from "@/components/ui/icon";
import { toast } from "sonner";

const VK_AUTH_URL = "https://functions.poehali.dev/e0433198-3f6a-4251-aacd-b238beddae39";

export default function VkCallback() {
  const navigate = useNavigate();

  const auth = useVkAuth({
    apiUrls: {
      authUrl: `${VK_AUTH_URL}?action=auth-url`,
      callback: `${VK_AUTH_URL}?action=callback`,
      refresh: `${VK_AUTH_URL}?action=refresh`,
      logout: `${VK_AUTH_URL}?action=logout`,
    },
  });

  useEffect(() => {
    auth.handleCallback().then((success) => {
      if (success) {
        toast.success("Вы вошли через ВКонтакте");
        navigate("/account", { replace: true });
      } else {
        toast.error("Не удалось войти через ВКонтакте");
        navigate("/login", { replace: true });
      }
    });
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-3">
        <Icon name="Loader2" size={32} className="animate-spin text-muted-foreground mx-auto" />
        <p className="text-muted-foreground text-sm">Авторизация через ВКонтакте...</p>
      </div>
    </div>
  );
}
