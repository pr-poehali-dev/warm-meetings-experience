import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Icon from "@/components/ui/icon";
import { userAuthApi2FA, User } from "@/lib/user-api";
import { VkLoginButton } from "@/components/extensions/vk-auth/VkLoginButton";
import { YandexLoginButton } from "@/components/extensions/yandex-auth/YandexLoginButton";
import { toast } from "sonner";

interface Props {
  pendingToken: string;
  initialMethod: "totp" | "email" | "vk" | "yandex";
  emailMasked?: string | null;
  hasVk?: boolean;
  hasYandex?: boolean;
  onSuccess: (token: string, user: User) => void;
  onCancel: () => void;
}

type Screen = "choose" | "email" | "totp";

const STORAGE = {
  vk: {
    pending: "login_2fa_vk_pending",
    state: "login_2fa_vk_state",
    verifier: "login_2fa_vk_verifier",
  },
  yandex: {
    pending: "login_2fa_yandex_pending",
    state: "login_2fa_yandex_state",
  },
};

export default function Login2FAChallenge({
  pendingToken,
  initialMethod,
  emailMasked: initialEmail,
  hasVk,
  hasYandex,
  onSuccess,
  onCancel,
}: Props) {
  const initialScreen: Screen =
    initialMethod === "totp" ? "totp" : initialMethod === "email" ? "email" : "choose";
  const [screen, setScreen] = useState<Screen>(initialScreen);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"vk" | "yandex" | null>(null);
  const [emailMasked, setEmailMasked] = useState(initialEmail || "");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      toast.error("Введите 6-значный код из письма");
      return;
    }
    setVerifying(true);
    try {
      const data = await userAuthApi2FA.loginVerifyEmail(pendingToken, code);
      onSuccess(data.token, data.user);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Неверный код");
    } finally {
      setVerifying(false);
    }
  };

  const handleVerifyTotp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length < 6) {
      toast.error("Введите код из приложения");
      return;
    }
    setVerifying(true);
    try {
      const data = await userAuthApi2FA.verify2FA(pendingToken, code);
      onSuccess(data.token, data.user);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Неверный код");
    } finally {
      setVerifying(false);
    }
  };

  const handleResendEmail = async () => {
    setResending(true);
    try {
      const data = await userAuthApi2FA.loginResendEmail(pendingToken);
      setEmailMasked(data.email_masked);
      setCooldown(60);
      toast.success("Код отправлен повторно");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не удалось отправить");
    } finally {
      setResending(false);
    }
  };

  const handleOAuth = async (provider: "vk" | "yandex") => {
    setOauthLoading(provider);
    try {
      const data = await userAuthApi2FA.loginStartOAuth(pendingToken, provider);
      if (provider === "vk") {
        sessionStorage.setItem(STORAGE.vk.pending, pendingToken);
        sessionStorage.setItem(STORAGE.vk.state, data.state);
        if (data.code_verifier) sessionStorage.setItem(STORAGE.vk.verifier, data.code_verifier);
      } else {
        sessionStorage.setItem(STORAGE.yandex.pending, pendingToken);
        sessionStorage.setItem(STORAGE.yandex.state, data.state);
      }
      window.location.href = data.auth_url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не удалось запустить OAuth");
      setOauthLoading(null);
    }
  };

  if (screen === "totp") {
    return (
      <div className="space-y-4">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <Icon name="Shield" size={24} className="text-primary" />
          </div>
          <h2 className="text-lg font-semibold">Двухфакторная аутентификация</h2>
          <p className="text-sm text-muted-foreground">
            Введите код из приложения-аутентификатора или резервный код
          </p>
        </div>
        <form onSubmit={handleVerifyTotp} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="totpCode">Код подтверждения</Label>
            <Input
              id="totpCode"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^0-9a-f]/gi, "").slice(0, 8))}
              placeholder="000000"
              className="text-center text-lg tracking-widest font-mono"
              autoFocus
            />
          </div>
          <Button type="submit" className="w-full" disabled={verifying}>
            {verifying ? (
              <>
                <Icon name="Loader2" size={16} className="animate-spin mr-2" />
                Проверка...
              </>
            ) : (
              "Подтвердить"
            )}
          </Button>
          <button
            type="button"
            onClick={onCancel}
            className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Вернуться к входу
          </button>
        </form>
      </div>
    );
  }

  if (screen === "email") {
    return (
      <div className="space-y-4">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <Icon name="Mail" size={24} className="text-primary" />
          </div>
          <h2 className="text-lg font-semibold">Код из письма</h2>
          <p className="text-sm text-muted-foreground">
            Мы отправили 6-значный код на {emailMasked ? <span className="font-medium text-foreground">{emailMasked}</span> : "ваш email"}
          </p>
        </div>
        <form onSubmit={handleVerifyEmail} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="emailCode">Код подтверждения</Label>
            <Input
              id="emailCode"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
              placeholder="000000"
              inputMode="numeric"
              className="text-center text-lg tracking-widest font-mono"
              autoFocus
            />
          </div>
          <Button type="submit" className="w-full" disabled={verifying || code.length !== 6}>
            {verifying ? (
              <>
                <Icon name="Loader2" size={16} className="animate-spin mr-2" />
                Проверка...
              </>
            ) : (
              "Войти"
            )}
          </Button>
          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={() => { setScreen("choose"); setCode(""); }}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Другой способ
            </button>
            <button
              type="button"
              onClick={handleResendEmail}
              disabled={resending || cooldown > 0}
              className="text-primary hover:text-primary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cooldown > 0 ? `Повтор через ${cooldown} сек` : resending ? "Отправка..." : "Отправить ещё раз"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // screen === "choose"
  return (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
          <Icon name="ShieldCheck" size={24} className="text-primary" />
        </div>
        <h2 className="text-lg font-semibold">Подтвердите вход</h2>
        <p className="text-sm text-muted-foreground">
          Для дополнительной защиты выберите способ подтверждения
        </p>
      </div>

      <div className="space-y-2">
        <Button
          variant="outline"
          className="w-full justify-start h-12"
          onClick={() => setScreen("email")}
        >
          <Icon name="Mail" size={18} className="mr-3 text-muted-foreground" />
          <span className="flex-1 text-left">По email{emailMasked ? ` — ${emailMasked}` : ""}</span>
          <Icon name="ChevronRight" size={16} className="text-muted-foreground" />
        </Button>

        {hasVk && (
          <VkLoginButton
            onClick={() => handleOAuth("vk")}
            isLoading={oauthLoading === "vk"}
            buttonText="Войти через VK ID"
            className="w-full h-12"
          />
        )}

        {hasYandex && (
          <YandexLoginButton
            onClick={() => handleOAuth("yandex")}
            isLoading={oauthLoading === "yandex"}
            buttonText="Войти через Яндекс ID"
            className="w-full h-12"
          />
        )}
      </div>

      <button
        type="button"
        onClick={onCancel}
        className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        Вернуться к входу
      </button>
    </div>
  );
}
