import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Icon from "@/components/ui/icon";
import { toast } from "sonner";

const MERGE_API = "https://functions.poehali.dev/832b8fe2-55d9-4f1c-9d1e-4647ff305f32";

export interface MergeHint {
  source_user_id: number;
  target_user_id: number;
  target_email_masked: string;
  target_name: string;
  reason: "email_match" | "name_match";
}

interface Props {
  open: boolean;
  hint: MergeHint;
  onMerged: () => void;
  onSkip: () => void;
}

type Step = "confirm" | "code" | "done";

export default function MergeAccountModal({ open, hint, onMerged, onSkip }: Props) {
  const [step, setStep] = useState<Step>("confirm");
  const [mergeRequestId, setMergeRequestId] = useState<number | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRequestMerge = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${MERGE_API}/?action=request_merge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_user_id: hint.source_user_id,
          target_user_id: hint.target_user_id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409 && data.merge_request_id) {
          setMergeRequestId(data.merge_request_id);
          setStep("code");
          return;
        }
        setError(data.error || "Ошибка при отправке кода");
        return;
      }
      setMergeRequestId(data.merge_request_id);
      setStep("code");
    } catch {
      setError("Ошибка соединения");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!code || code.length !== 6) { setError("Введите 6-значный код"); return; }
    if (!mergeRequestId) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${MERGE_API}/?action=verify_code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merge_request_id: mergeRequestId, code }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Неверный код"); return; }
      setStep("done");
      toast.success("Аккаунты объединены!");
      setTimeout(onMerged, 1500);
    } catch {
      setError("Ошибка соединения");
    } finally {
      setLoading(false);
    }
  };

  const reasonText = hint.reason === "email_match"
    ? "ВКонтакте передал совпадающий email"
    : "Совпадает имя пользователя";

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onSkip(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon name="GitMerge" size={20} className="text-primary" />
            Объединить аккаунты
          </DialogTitle>
        </DialogHeader>

        {step === "confirm" && (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm space-y-2">
              <div className="font-semibold text-amber-800 flex items-center gap-1.5">
                <Icon name="AlertTriangle" size={14} />
                Обнаружен возможный дубль
              </div>
              <p className="text-amber-700">
                Вы вошли через ВКонтакте, но в системе уже есть аккаунт с таким же{" "}
                {hint.reason === "email_match" ? "email" : "именем"}.
              </p>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between p-3 bg-muted/40 rounded-xl">
                <div>
                  <div className="text-xs text-muted-foreground mb-0.5">VK-аккаунт (дубль)</div>
                  <div className="font-medium">#{hint.source_user_id}</div>
                </div>
                <Icon name="ArrowRight" size={16} className="text-muted-foreground" />
                <div className="text-right">
                  <div className="text-xs text-muted-foreground mb-0.5">Основной аккаунт</div>
                  <div className="font-medium">{hint.target_name}</div>
                  <div className="text-xs text-muted-foreground">{hint.target_email_masked}</div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground px-1">Причина: {reasonText}</p>
            </div>

            <p className="text-sm text-muted-foreground">
              После объединения все ваши записи и бронирования из VK-аккаунта перейдут
              на основной аккаунт. На почту{" "}
              <span className="font-medium text-foreground">{hint.target_email_masked}</span>{" "}
              придёт код подтверждения.
            </p>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-2 pt-1">
              <Button onClick={handleRequestMerge} disabled={loading} className="flex-1 gap-1.5">
                {loading
                  ? <><Icon name="Loader2" size={14} className="animate-spin" />Отправляем...</>
                  : <><Icon name="Mail" size={14} />Прислать код на почту</>}
              </Button>
              <Button variant="ghost" onClick={onSkip} disabled={loading}>
                Пропустить
              </Button>
            </div>
          </div>
        )}

        {step === "code" && (
          <div className="space-y-4">
            <div className="text-center space-y-2 py-2">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Icon name="Mail" size={22} className="text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">
                Код отправлен на{" "}
                <span className="font-medium text-foreground">{hint.target_email_masked}</span>
              </p>
            </div>

            <div className="space-y-2">
              <Input
                value={code}
                onChange={(e) => { setCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }}
                placeholder="000000"
                className="text-center text-2xl tracking-[0.5em] font-mono h-14"
                maxLength={6}
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleVerifyCode()}
              />
              {error && <p className="text-sm text-destructive text-center">{error}</p>}
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Код действует 15 минут
            </p>

            <div className="flex gap-2">
              <Button onClick={handleVerifyCode} disabled={loading || code.length !== 6} className="flex-1 gap-1.5">
                {loading
                  ? <><Icon name="Loader2" size={14} className="animate-spin" />Проверяем...</>
                  : <><Icon name="Check" size={14} />Подтвердить</>}
              </Button>
              <Button variant="ghost" onClick={() => { setStep("confirm"); setCode(""); setError(""); }}>
                Назад
              </Button>
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="text-center py-6 space-y-3">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <Icon name="CheckCircle2" size={28} className="text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-lg">Аккаунты объединены!</p>
              <p className="text-sm text-muted-foreground mt-1">
                Все данные из VK-аккаунта перенесены. Входите через основной аккаунт.
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
