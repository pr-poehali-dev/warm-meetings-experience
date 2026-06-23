import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { userAuthApi } from "@/lib/user-api";

export default function EmailVerifyBanner() {
  const { user, loginWithToken, updateUser } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

  if (!user || user.email_verified !== false || dismissed) return null;

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      toast.error("Введите 6-значный код из письма");
      return;
    }
    setVerifying(true);
    try {
      const res = await userAuthApi.verifyEmailCode(user.email, code);
      loginWithToken(res.token, res.user);
      toast.success("Почта подтверждена — добро пожаловать!");
    } catch {
      toast.error("Неверный или просроченный код");
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await userAuthApi.resendVerify(user.email);
      toast.success("Письмо отправлено повторно");
    } catch {
      toast.error("Не удалось отправить письмо");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="w-full bg-amber-50 border-b border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
      <div className="max-w-5xl mx-auto px-4 py-2.5">
        {!expanded ? (
          <div className="flex items-center gap-3">
            <Icon name="Mail" size={16} className="text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800 dark:text-amber-300 flex-1">
              Подтвердите почту <span className="font-medium">{user.email}</span> — письмо с кодом уже отправлено
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs border-amber-300 text-amber-800 hover:bg-amber-100 dark:text-amber-300 dark:border-amber-700"
                onClick={() => setExpanded(true)}
              >
                Ввести код
              </Button>
              <button
                onClick={() => setDismissed(true)}
                className="text-amber-500 hover:text-amber-700 p-1"
                aria-label="Закрыть"
              >
                <Icon name="X" size={14} />
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleVerify} className="flex items-center gap-2 flex-wrap">
            <Icon name="Mail" size={16} className="text-amber-600 shrink-0" />
            <span className="text-sm text-amber-800 dark:text-amber-300 shrink-0">Код из письма:</span>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              className="h-8 w-28 text-center text-sm font-mono border-amber-300"
              autoFocus
            />
            <Button
              type="submit"
              size="sm"
              className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white"
              disabled={verifying || code.length !== 6}
            >
              {verifying ? <Icon name="Loader2" size={13} className="animate-spin" /> : "Подтвердить"}
            </Button>
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="text-xs text-amber-600 hover:text-amber-800 underline"
            >
              {resending ? "Отправляем..." : "Выслать снова"}
            </button>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="text-amber-500 hover:text-amber-700 ml-auto p-1"
            >
              <Icon name="X" size={14} />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
