import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Icon from "@/components/ui/icon";
import { toast } from "sonner";
import { rolesApi } from "@/lib/roles-api";
import { userAuthApi2FA } from "@/lib/user-api";

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
function clearRole2FAStorage() {
  sessionStorage.removeItem("role_2fa_vk_state");
  sessionStorage.removeItem("role_2fa_vk_verifier");
  sessionStorage.removeItem("role_2fa_vk_app_id");
}
function clearLogin2FAStorage() {
  sessionStorage.removeItem("login_2fa_vk_pending");
  sessionStorage.removeItem("login_2fa_vk_state");
  sessionStorage.removeItem("login_2fa_vk_verifier");
}

export default function VkCallback() {
  const navigate = useNavigate();
  const { updateUser, loginWithToken } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isLinkFlow = sessionStorage.getItem("vk_link_pending") === "1";
    const urlStateEarly = params.get("state");
    const urlCodeEarly = params.get("code");
    const deviceIdEarly = params.get("device_id") || "";

    // 1) Проверяем login-2fa флоу
    const login2faPending = sessionStorage.getItem("login_2fa_vk_pending");
    const login2faState = sessionStorage.getItem("login_2fa_vk_state");
    const login2faVerifier = sessionStorage.getItem("login_2fa_vk_verifier");

    if (login2faPending && login2faState && urlStateEarly === login2faState && urlCodeEarly) {
      (async () => {
        try {
          const res = await userAuthApi2FA.loginVerifyOAuth({
            pending_token: login2faPending,
            provider: "vk",
            code: urlCodeEarly,
            state: urlStateEarly,
            code_verifier: login2faVerifier || undefined,
            device_id: deviceIdEarly || undefined,
          });
          loginWithToken(res.token, res.user);
          toast.success("Вход подтверждён");
          navigate("/account", { replace: true });
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Не удалось подтвердить вход через VK");
          navigate("/login", { replace: true });
        } finally {
          clearLogin2FAStorage();
        }
      })();
      return;
    }

    // 2) Проверяем role-2fa флоу
    const role2faAppId = sessionStorage.getItem("role_2fa_vk_app_id");
    const role2faState = sessionStorage.getItem("role_2fa_vk_state");
    const role2faVerifier = sessionStorage.getItem("role_2fa_vk_verifier");

    if (role2faAppId && role2faState && urlStateEarly === role2faState && urlCodeEarly) {
      (async () => {
        try {
          const res = await rolesApi.verifyOAuth2FA({
            application_id: parseInt(role2faAppId, 10),
            provider: "vk",
            code: urlCodeEarly,
            code_verifier: role2faVerifier || undefined,
            device_id: deviceIdEarly || undefined,
          });
          toast.success(res.message);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Не удалось подтвердить через VK");
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

        const signupReturnUrl = sessionStorage.getItem("signup_return_url");
        if (signupReturnUrl && sessionStorage.getItem("signup_login_provider") === "vk") {
          sessionStorage.removeItem("signup_return_url");
          sessionStorage.removeItem("signup_login_provider");
          window.location.replace(signupReturnUrl);
          return;
        }
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