import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Icon from "@/components/ui/icon";
import { toast } from "sonner";
import { userAuthApi, User } from "@/lib/user-api";

interface EmailVerifyPanelProps {
  email: string;
  /** Вызывается после успешного подтверждения — передаёт токен и пользователя. */
  onVerified: (token: string, user: User) => void;
  className?: string;
}

export default function EmailVerifyPanel({ email, onVerified, className }: EmailVerifyPanelProps) {
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      toast.error("Введите 6-значный код из письма");
      return;
    }
    setVerifying(true);
    try {
      const res = await userAuthApi.verifyEmailCode(email, code);
      onVerified(res.token, res.user);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Неверный код");
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await userAuthApi.resendVerify(email);
      toast.success("Письмо отправлено повторно");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не удалось отправить письмо");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className={className}>
      <div className="text-center mb-5">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Icon name="Mail" size={32} className="text-amber-600" />
        </div>
        <h2 className="text-xl font-bold">Подтвердите почту</h2>
        <p className="text-muted-foreground mt-2 text-sm">
          Мы отправили письмо с кодом на{" "}
          <span className="font-medium text-foreground">{email}</span>.
          Введите код из темы письма или перейдите по ссылке внутри.
        </p>
      </div>

      <form onSubmit={handleVerify} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="verify-code">Код из письма</Label>
          <Input
            id="verify-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="text-center text-2xl tracking-[0.5em] font-mono h-14"
          />
        </div>
        <Button type="submit" className="w-full" disabled={verifying || code.length !== 6}>
          {verifying ? (
            <>
              <Icon name="Loader2" size={16} className="animate-spin mr-2" />
              Проверяем...
            </>
          ) : (
            "Подтвердить и войти"
          )}
        </Button>
      </form>

      <div className="text-center mt-4">
        <button
          type="button"
          onClick={handleResend}
          disabled={resending}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2 disabled:opacity-60"
        >
          {resending ? "Отправляем..." : "Отправить письмо повторно"}
        </button>
      </div>
    </div>
  );
}