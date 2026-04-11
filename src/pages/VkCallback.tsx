import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Icon from "@/components/ui/icon";
import { toast } from "sonner";

const VK_AUTH_URL = "https://functions.poehali.dev/e0433198-3f6a-4251-aacd-b238beddae39";
const USER_AUTH_URL = "https://functions.poehali.dev/d5d9f568-ba92-4605-9b95-646ba409fd8d";

function getStoredCodeVerifier(): string | null {
  return sessionStorage.getItem("vk_auth_code_verifier");
}
function getStoredState(): string | null {
  return sessionStorage.getItem("vk_auth_state");
}
function clearVkStorage() {
  sessionStorage.removeItem("vk_auth_code_verifier");
  sessionStorage.removeItem("vk_auth_state");
  localStorage.removeItem("vk_auth_refresh_token");
}

export default function VkCallback() {
  const navigate = useNavigate();
  const { updateUser } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isLinkFlow = params.get("vk_link") === "1";

    if (isLinkFlow) {
      const accountUrl = new URL(`${window.location.origin}/account`);
      params.forEach((v, k) => accountUrl.searchParams.set(k, v));
      window.location.replace(accountUrl.toString());
      return;
    }

    const code = params.get("code");
    const device_id = params.get("device_id") || "";
    const state = params.get("state");

    if (!code) {
      toast.error("Не получен код авторизации от ВКонтакте");
      navigate("/login", { replace: true });
      return;
    }

    const storedState = getStoredState();
    if (storedState && state !== storedState) {
      toast.error("Ошибка безопасности: неверный state");
      navigate("/login", { replace: true });
      return;
    }

    const code_verifier = getStoredCodeVerifier();
    if (!code_verifier) {
      toast.error("Сессия устарела, попробуйте снова");
      navigate("/login", { replace: true });
      return;
    }

    (async () => {
      try {
        // 1. Обмениваем code на токены VK — получаем vk_id напрямую из ответа
        const vkRes = await fetch(`${VK_AUTH_URL}?action=callback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, code_verifier, device_id }),
        });
        const vkData = await vkRes.json();

        if (!vkRes.ok) {
          toast.error(vkData.error || "Ошибка авторизации через ВКонтакте");
          navigate("/login", { replace: true });
          return;
        }

        const vk_id = String(vkData.user?.vk_id || "");
        if (!vk_id) {
          toast.error("Не получен VK ID пользователя");
          navigate("/login", { replace: true });
          return;
        }

        const user_id = vkData.user?.id;

        // 2. Создаём сессию основной системы по vk_id + user_id
        const sessionRes = await fetch(`${USER_AUTH_URL}/?action=vk_session`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ vk_id, user_id }),
        });
        const sessionData = await sessionRes.json();

        if (!sessionRes.ok) {
          toast.error(sessionData.error || "Не удалось создать сессию");
          navigate("/login", { replace: true });
          return;
        }

        // 3. Сохраняем сессию и входим
        localStorage.setItem("user_token", sessionData.token);
        localStorage.setItem("user_data", JSON.stringify(sessionData.user));
        updateUser(sessionData.user);
        clearVkStorage();

        toast.success("Вы вошли через ВКонтакте");
        navigate("/account", { replace: true });
      } catch {
        toast.error("Ошибка соединения");
        navigate("/login", { replace: true });
      }
    })();
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