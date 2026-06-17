import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Icon from "@/components/ui/icon";
import { toast } from "sonner";
import { rolesApi } from "@/lib/roles-api";
import { userAuthApi2FA } from "@/lib/user-api";
import MergeAccountModal, { MergeHint } from "@/components/admin/MergeAccountModal";

const VK_AUTH_URL = "https://functions.poehali.dev/e0433198-3f6a-4251-aacd-b238beddae39";
const USER_AUTH_URL = "https://functions.poehali.dev/d5d9f568-ba92-4605-9b95-646ba409fd8d";
const USER_PROFILE_URL = "https://functions.poehali.dev/5322ffd0-7079-40ce-9d4e-8d7fee29624c";

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
  const [mergeHint, setMergeHint] = useState<MergeHint | null>(null);
  const [pendingNav, setPendingNav] = useState<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
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
      const returnPath = sessionStorage.getItem("vk_link_return_url") || "/account";
      const linkCode = params.get("code");
      const linkVerifier = sessionStorage.getItem("vk_auth_code_verifier") || "";
      const linkDeviceId = params.get("device_id") || "";
      sessionStorage.removeItem("vk_link_pending");
      sessionStorage.removeItem("vk_link_return_url");
      sessionStorage.removeItem("vk_auth_code_verifier");

      if (!linkCode) {
        toast.error("Не получен код авторизации от ВКонтакте");
        navigate(returnPath, { replace: true });
        return;
      }

      setPendingNav(returnPath);
      (async () => {
        try {
          // 1. Обмениваем code на access_token
          const cbRes = await fetch(`${VK_AUTH_URL}?action=callback`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: linkCode, code_verifier: linkVerifier, device_id: linkDeviceId }),
          });
          const cbData = await cbRes.json();
          if (!cbRes.ok || !cbData.user?.vk_id) {
            toast.error(cbData.error || "Не удалось получить данные VK");
            navigate(returnPath, { replace: true });
            return;
          }

          // 2. Привязываем к текущему аккаунту
          const token = localStorage.getItem("user_token");
          const linkRes = await fetch(`${USER_PROFILE_URL}/?resource=link-vk`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
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
            navigate(returnPath, { replace: true });
            return;
          }

          toast.success("ВКонтакте успешно привязан");
          navigate(returnPath, { replace: true });
        } catch {
          toast.error("Ошибка привязки ВКонтакте");
          navigate(returnPath, { replace: true });
        }
      })();
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
        // Передаём имя и аватар из VK, чтобы бэкенд записал их в БД если пустые
        const sessionRes = await fetch(`${USER_AUTH_URL}/?action=vk_session`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vk_id,
            user_id,
            name: vkData.user?.name || "",
            avatar_url: vkData.user?.avatar_url || "",
          }),
        });
        const sessionData = await sessionRes.json();

        if (!sessionRes.ok) {
          toast.error(sessionData.error || "Не удалось создать сессию");
          navigate("/login", { replace: true });
          return;
        }

        // 3. Сохраняем сессию и входим
        // Мержим имя и аватар из VK-ответа, если в БД они ещё пустые
        const mergedUser = {
          ...sessionData.user,
          name: sessionData.user?.name || vkData.user?.name || "",
          avatar_url: sessionData.user?.avatar_url || vkData.user?.avatar_url || "",
        };
        localStorage.setItem("user_token", sessionData.token);
        localStorage.setItem("user_data", JSON.stringify(mergedUser));
        updateUser(mergedUser);
        clearVkStorage();

        toast.success("Вы вошли через ВКонтакте");

        // 4. Если VK-auth вернул merge_hint — показываем предложение объединить
        const hint = vkData.merge_hint;
        if (hint && hint.source_user_id && hint.target_user_id) {
          const signupReturnUrl2 = sessionStorage.getItem("signup_return_url");
          const destUrl = (signupReturnUrl2 && sessionStorage.getItem("signup_login_provider") === "vk")
            ? signupReturnUrl2
            : "/account";
          setPendingNav(destUrl);
          setMergeHint(hint);
          return;
        }

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

  const handleMerged = () => {
    setMergeHint(null);
    sessionStorage.removeItem("signup_return_url");
    sessionStorage.removeItem("signup_login_provider");
    if (pendingNav) window.location.replace(pendingNav);
    else navigate("/account", { replace: true });
  };

  const handleSkipMerge = () => {
    setMergeHint(null);
    sessionStorage.removeItem("signup_return_url");
    sessionStorage.removeItem("signup_login_provider");
    if (pendingNav) window.location.replace(pendingNav);
    else navigate("/account", { replace: true });
  };

  return (
    <>
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <Icon name="Loader2" size={32} className="animate-spin text-muted-foreground mx-auto" />
          <p className="text-muted-foreground text-sm">Авторизация через ВКонтакте...</p>
        </div>
      </div>
      {mergeHint && (
        <MergeAccountModal
          open={!!mergeHint}
          hint={mergeHint}
          onMerged={handleMerged}
          onSkip={handleSkipMerge}
        />
      )}
    </>
  );
}