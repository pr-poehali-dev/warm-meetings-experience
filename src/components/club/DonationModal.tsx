import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Icon from "@/components/ui/icon";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { clubApi } from "@/lib/club-api";

const PRESETS = [150, 500, 1000, 2000];
const MIN_AMOUNT = 50;
const MAX_AMOUNT = 100000;

interface DonationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source?: string;
  defaultAmount?: number;
  title?: string;
  subtitle?: string;
}

export default function DonationModal({
  open,
  onOpenChange,
  source = "header",
  defaultAmount = 500,
  title = "Поддержать клуб",
  subtitle = "Ваш взнос идёт на развитие сообщества теплого пара. Спасибо, что вы с нами!",
}: DonationModalProps) {
  const { user } = useAuth();

  const [amount, setAmount] = useState<number>(defaultAmount);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [usePreset, setUsePreset] = useState(true);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [shareStats, setShareStats] = useState(true);
  const [message, setMessage] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (open && user) {
      setGuestName((prev) => prev || user.name || "");
      setGuestEmail((prev) => prev || user.email || "");
    }
  }, [open, user]);

  useEffect(() => {
    if (!open) {
      setDone(false);
      setMessage("");
      setCustomAmount("");
      setUsePreset(true);
      setAmount(defaultAmount);
    }
  }, [open, defaultAmount]);

  const finalAmount = usePreset ? amount : Number(customAmount) || 0;
  const validEmail = !guestEmail || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(guestEmail.trim());

  const canSubmit =
    finalAmount >= MIN_AMOUNT &&
    finalAmount <= MAX_AMOUNT &&
    (user
      ? true
      : guestName.trim().length >= 2 && guestEmail.trim().length > 0 && validEmail);

  const submit = async () => {
    if (!canSubmit || loading) return;
    setLoading(true);
    try {
      const successUrl = `${window.location.origin}/club/thanks`;
      const failUrl = `${window.location.origin}/club/fail`;
      const res = await clubApi.donate({
        amount: finalAmount,
        is_anonymous: isAnonymous,
        share_stats: shareStats,
        source,
        message: message.trim() || undefined,
        guest_name: user ? undefined : guestName.trim(),
        guest_email: user ? undefined : guestEmail.trim(),
        success_url: successUrl,
        fail_url: failUrl,
      });

      if (res.payment_url) {
        window.location.href = res.payment_url;
        return;
      }

      setDone(true);
      toast.success("Спасибо за намерение поддержать клуб!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не удалось создать взнос");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md z-[300]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon name="Heart" size={20} className="text-rose-500" />
            {done ? "Спасибо!" : title}
          </DialogTitle>
        </DialogHeader>

        {done ? (
          <div className="text-center py-4 space-y-3">
            <div className="w-14 h-14 mx-auto rounded-full bg-green-100 flex items-center justify-center">
              <Icon name="CheckCircle2" size={28} className="text-green-600" />
            </div>
            <p className="text-sm text-muted-foreground">
              Ваш взнос принят. Подтверждение придёт на email.
            </p>
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Готово
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">{subtitle}</p>

            <div className="space-y-2">
              <Label className="text-xs">Сумма взноса</Label>
              <div className="grid grid-cols-4 gap-1.5">
                {PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setUsePreset(true);
                      setAmount(p);
                    }}
                    className={`text-sm py-2 rounded-md border transition-colors ${
                      usePreset && amount === p
                        ? "border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300"
                        : "border-border text-muted-foreground hover:border-foreground/30"
                    }`}
                  >
                    {p} ₽
                  </button>
                ))}
              </div>
              <Input
                type="number"
                inputMode="numeric"
                min={MIN_AMOUNT}
                max={MAX_AMOUNT}
                placeholder={`Своя сумма от ${MIN_AMOUNT} до ${MAX_AMOUNT} ₽`}
                value={customAmount}
                onChange={(e) => {
                  setCustomAmount(e.target.value);
                  setUsePreset(false);
                }}
                onFocus={() => setUsePreset(false)}
              />
            </div>

            {!user && (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Как вас зовут</Label>
                  <Input
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="Имя"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Email для чека</Label>
                  <Input
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    placeholder="you@example.com"
                    aria-invalid={!validEmail}
                    className={!validEmail ? "border-red-400" : ""}
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">Пожелание (необязательно)</Label>
              <Textarea
                rows={2}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Что хотите пожелать клубу..."
              />
            </div>

            <div className="space-y-2 pt-1">
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-border accent-rose-600"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                />
                Сделать взнос анонимным
              </label>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-border accent-rose-600"
                  checked={shareStats}
                  onChange={(e) => setShareStats(e.target.checked)}
                />
                Делиться поддержкой в общей статистике
              </label>
            </div>

            <Button
              onClick={submit}
              disabled={!canSubmit || loading}
              className="w-full bg-rose-600 hover:bg-rose-700 text-white"
            >
              {loading ? (
                <>
                  <Icon name="Loader2" size={16} className="animate-spin" />
                  Обработка...
                </>
              ) : (
                <>
                  <Icon name="Heart" size={16} />
                  Пожертвовать {finalAmount > 0 ? `${finalAmount} ₽` : ""}
                </>
              )}
            </Button>

            <p className="text-[11px] text-muted-foreground text-center">
              Оплата через Robokassa. Безопасно: карта, СБП, кошелёк.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}