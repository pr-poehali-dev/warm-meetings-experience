import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Icon from "@/components/ui/icon";
import { toast } from "sonner";
import { rolesApi } from "@/lib/roles-api";

const YANDEX_AUTH_URL = "https://functions.poehali.dev/1e5f15d8-b432-4341-9a18-4c408d3d80aa";
const USER_AUTH_URL = "https://functions.poehali.dev/d5d9f568-ba92-4605-9b95-646ba409fd8d";

function getStoredState(): string | null {
  return sessionStorage.getItem("yandex_auth_state");
}
function clearYandexStorage() {
  sessionStorage.removeItem("yandex_auth_state");
  localStorage.removeItem("yandex_auth_refresh_token");
}
function clearRole2FAStorage() {
  sessionStorage.removeItem("role_2fa_yandex_state");
  sessionStorage.removeItem("role_2fa_yandex_app_id");
}

export default function YandexCallback() {
  const navigate = useNavigate();
  const { updateUser } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isLinkFlow = params.get("yandex_link") === "1";

    // Проверяем сначала role-2fa флоу
    const role2faAppId = sessionStorage.getItem("role_2fa_yandex_app_id");
    const role2faState = sessionStorage.getItem("role_2fa_yandex_state");
    const urlStateEarly = params.get("state");
    const urlCodeEarly = params.get("code");

    if (role2faAppId && role2faState && urlStateEarly === role2faState && urlCodeEarly) {
      (async () => {
        try {
          const res = await rolesApi.verifyOAuth2FA({
            application_id: parseInt(role2faAppId, 10),
            provider: "yandex",
            code: urlCodeEarly,
          });
          toast.success(res.message);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Не удалось подтвердить через Яндекс");
        } finally {
          clearRole2FAStorage();
          navigate("/account?tab=growth", { replace: true });
        }
      })();
      return;
    }

    if (isLinkFlow) {
      const accountUrl = new URL(`${window.location.origin}/account`);
      params.forEach((v, k) => accountUrl.searchParams.set(k, v));
      window.location.replace(accountUrl.toString());
      return;
    }

    const code = params.get("code");
    const state = params.get("state");

    if (!code) {
      toast.error("Не получен код авторизации от Яндекса");
      navigate("/login", { replace: true });
      return;
    }

    const storedState = getStoredState();
    if (storedState && state !== storedState) {
      toast.error("Ошибка безопасности: неверный state");
      navigate("/login", { replace: true });
      return;
    }

    (async () => {
      try {
        const yaRes = await fetch(`${YANDEX_AUTH_URL}?action=callback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });
        const yaData = await yaRes.json();

        if (!yaRes.ok) {
          toast.error(yaData.error || "Ошибка авторизации через Яндекс");
          navigate("/login", { replace: true });
          return;
        }

        const yandex_id = String(yaData.user?.yandex_id || "");
        if (!yandex_id) {
          toast.error("Не получен Яндекс ID пользователя");
          navigate("/login", { replace: true });
          return;
        }

        const user_id = yaData.user?.id;

        const sessionRes = await fetch(`${USER_AUTH_URL}/?action=yandex_session`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ yandex_id, user_id }),
        });
        const sessionData = await sessionRes.json();

        if (!sessionRes.ok) {
          toast.error(sessionData.error || "Не удалось создать сессию");
          navigate("/login", { replace: true });
          return;
        }

        localStorage.setItem("user_token", sessionData.token);
        localStorage.setItem("user_data", JSON.stringify(sessionData.user));
        updateUser(sessionData.user);
        clearYandexStorage();

        toast.success("Вы вошли через Яндекс");
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
        <p className="text-muted-foreground text-sm">Авторизация через Яндекс...</p>
      </div>
    </div>
  );
}