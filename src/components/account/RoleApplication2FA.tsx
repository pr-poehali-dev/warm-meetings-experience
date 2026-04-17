import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Icon from "@/components/ui/icon";
import { rolesApi } from "@/lib/roles-api";
import { VkLoginButton } from "@/components/extensions/vk-auth/VkLoginButton";
import { YandexLoginButton } from "@/components/extensions/yandex-auth/YandexLoginButton";
import { toast } from "sonner";

interface Props {
  applicationId: number;
  roleName: string;
  emailMasked?: string;
  codeTtlMinutes?: number;
  onVerified: () => void;
}

type Method = "choose" | "email" | "vk" | "yandex";

const STORAGE_KEYS = {
  vk: {
    state: "role_2fa_vk_state",
    verifier: "role_2fa_vk_verifier",
    appId: "role_2fa_vk_app_id",
  },
  yandex: {
    state: "role_2fa_yandex_state",
    appId: "role_2fa_yandex_app_id",
  },
};

export default function RoleApplication2FA({
  applicationId,
  roleName,
  emailMasked: initialEmail,
  codeTtlMinutes,
  onVerified,
}: Props) {
  const [method, setMethod] = useState<Method>("choose");
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"vk" | "yandex" | null>(null);
  const [emailMasked, setEmailMasked] = useState(initialEmail || "");
  const [ttlMinutes, setTtlMinutes] = useState(codeTtlMinutes || 15);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const handleVerifyCode = async () => {
    if (code.length < 6) {
      toast.error("Введите 6-значный код");
      return;
    }
    setVerifying(true);
    try {
      const res = await rolesApi.verifyEmailCode(applicationId, code);
      toast.success(res.message);
      onVerified();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Неверный код");
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      const res = await rolesApi.resendEmailCode(applicationId);
      setEmailMasked(res.email_masked);
      setTtlMinutes(res.code_ttl_minutes);
      setCooldown(60);
      toast.success("Код отправлен повторно");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не удалось отправить код");
    } finally {
      setResending(false);
    }
  };

  const handleOAuthStart = async (provider: "vk" | "yandex") => {
    setOauthLoading(provider);
    try {
      const res = await rolesApi.startOAuth2FA(applicationId, provider);
      if (provider === "vk") {
        sessionStorage.setItem(STORAGE_KEYS.vk.state, res.state);
        if (res.code_verifier) {
          sessionStorage.setItem(STORAGE_KEYS.vk.verifier, res.code_verifier);
        }
        sessionStorage.setItem(STORAGE_KEYS.vk.appId, String(applicationId));
      } else {
        sessionStorage.setItem(STORAGE_KEYS.yandex.state, res.state);
        sessionStorage.setItem(STORAGE_KEYS.yandex.appId, String(applicationId));
      }
      window.location.href = res.auth_url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не удалось запустить авторизацию");
      setOauthLoading(null);
    }
  };

  if (method === "email") {
    return (
      <div className="space-y-4">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <Icon name="Mail" size={24} className="text-primary" />
          </div>
          <h3 className="text-base font-semibold">Подтверждение по email</h3>
          <p className="text-sm text-muted-foreground">
            Мы отправили 6-значный код на <span className="font-medium text-foreground">{emailMasked}</span>.
            Код действителен {ttlMinutes} мин.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="roleCode">Код из письма</Label>
          <Input
            id="roleCode"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
            placeholder="000000"
            inputMode="numeric"
            className="text-center text-lg tracking-widest font-mono"
            autoFocus
          />
        </div>
        <Button onClick={handleVerifyCode} disabled={verifying || code.length < 6} className="w-full">
          {verifying ? (
            <>
              <Icon name="Loader2" size={16} className="animate-spin mr-2" />
              Проверка...
            </>
          ) : (
            "Подтвердить"
          )}
        </Button>
        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={() => setMethod("choose")}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Другой способ
          </button>
          <button
            type="button"
            onClick={handleResend}
            disabled={resending || cooldown > 0}
            className="text-primary hover:text-primary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cooldown > 0
              ? `Повтор через ${cooldown} сек`
              : resending
              ? "Отправка..."
              : "Отправить код ещё раз"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
          <Icon name="ShieldCheck" size={24} className="text-primary" />
        </div>
        <h3 className="text-base font-semibold">Подтверждение личности</h3>
        <p className="text-sm text-muted-foreground">
          Чтобы защитить роль «{roleName}» от самозванцев, подтвердите, что это вы. Выберите удобный способ.
        </p>
      </div>

      <div className="space-y-2">
        <Button
          variant="outline"
          className="w-full justify-start h-12"
          onClick={() => setMethod("email")}
        >
          <Icon name="Mail" size={18} className="mr-3 text-muted-foreground" />
          <span className="flex-1 text-left">Подтвердить по email</span>
          <Icon name="ChevronRight" size={16} className="text-muted-foreground" />
        </Button>

        <VkLoginButton
          onClick={() => handleOAuthStart("vk")}
          isLoading={oauthLoading === "vk"}
          buttonText="Подтвердить через VK ID"
          className="w-full h-12"
        />

        <YandexLoginButton
          onClick={() => handleOAuthStart("yandex")}
          isLoading={oauthLoading === "yandex"}
          buttonText="Подтвердить через Яндекс ID"
          className="w-full h-12"
        />
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Если у вас нет привязанного VK или Яндекс аккаунта — он будет привязан автоматически после подтверждения.
      </p>
    </div>
  );
}
