/**
 * Раздел в кабинете: возвраты по отменённым событиям «в складчину».
 * Гость выбирает способ возврата — бонусом на баланс или на карту.
 */
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import Icon from "@/components/ui/icon";
import { userProfileApi, RefundRequest } from "@/lib/user-api";
import { toast } from "sonner";

const fmt = (n: number) => n.toLocaleString("ru-RU");

const fmtDate = (s: string | null): string => {
  if (!s) return "";
  try {
    return new Date(s).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "long",
    });
  } catch {
    return s;
  }
};

export default function RefundsSection() {
  const [refunds, setRefunds] = useState<RefundRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [cardModalId, setCardModalId] = useState<number | null>(null);
  const [cardHint, setCardHint] = useState("");

  const load = () => {
    setLoading(true);
    userProfileApi
      .getRefunds()
      .then((r) => setRefunds(r.refunds || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const pending = refunds.filter((r) => r.status === "pending" && !r.method);
  const inProgress = refunds.filter((r) => r.status === "pending" && r.method === "card");
  const done = refunds.filter((r) => r.status === "done");

  const handleBonus = async (r: RefundRequest) => {
    setBusyId(r.id);
    try {
      const res = await userProfileApi.chooseRefund({ id: r.id, method: "bonus" });
      toast.success(`Зачислено ${fmt(res.amount)} ₽ бонусом на ваш баланс`);
      load();
    } catch {
      toast.error("Не удалось оформить возврат. Попробуйте позже.");
    } finally {
      setBusyId(null);
    }
  };

  const handleCard = async (r: RefundRequest) => {
    if (cardModalId !== r.id) {
      setCardModalId(r.id);
      setCardHint("");
      return;
    }
    setBusyId(r.id);
    try {
      await userProfileApi.chooseRefund({
        id: r.id,
        method: "card",
        card_payment_hint: cardHint.trim(),
      });
      toast.success("Заявка на возврат принята. Свяжемся для подтверждения реквизитов.");
      setCardModalId(null);
      setCardHint("");
      load();
    } catch {
      toast.error("Не удалось отправить заявку. Попробуйте позже.");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Icon name="Loader2" size={18} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (refunds.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <Icon name="ArrowLeftRight" size={16} className="text-orange-600" />
        Возвраты
      </h3>

      {pending.map((r) => (
        <Card key={r.id} className="border-red-500/30 bg-red-500/5 dark:bg-red-500/10">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-red-700 dark:text-red-400 mb-1">
                  <Icon name="XCircle" size={11} />
                  Событие отменено
                </div>
                <div className="text-sm font-semibold truncate">{r.event_title}</div>
                <div className="text-xs text-muted-foreground">
                  {fmtDate(r.event_date)}
                  {r.bath_name ? ` · ${r.bath_name}` : ""}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[10px] text-muted-foreground">К возврату</div>
                <div className="text-lg font-bold text-foreground">{fmt(r.amount)} ₽</div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Сбор не набрал минимального количества участников. Выберите, как вернуть клубный взнос:
            </p>

            {cardModalId === r.id ? (
              <div className="space-y-2 rounded-lg bg-background border p-3">
                <div className="text-xs font-semibold">Возврат на карту</div>
                <Textarea
                  value={cardHint}
                  onChange={(e) => setCardHint(e.target.value)}
                  rows={3}
                  placeholder="Способ возврата (карта, на которую оплачивали, номер телефона СБП и т.п.). Можно оставить пустым — свяжемся."
                  className="text-sm"
                />
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="ghost" onClick={() => setCardModalId(null)} disabled={busyId === r.id}>
                    Отмена
                  </Button>
                  <Button size="sm" onClick={() => handleCard(r)} disabled={busyId === r.id}>
                    {busyId === r.id ? (
                      <>
                        <Icon name="Loader2" size={14} className="animate-spin" />
                        Отправляем...
                      </>
                    ) : (
                      <>
                        <Icon name="Send" size={14} />
                        Подтвердить заявку
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button
                  onClick={() => handleBonus(r)}
                  disabled={busyId === r.id}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                >
                  <Icon name="Sparkles" size={14} />
                  Бонусом · мгновенно
                </Button>
                <Button
                  onClick={() => handleCard(r)}
                  disabled={busyId === r.id}
                  variant="outline"
                  className="gap-1.5"
                >
                  <Icon name="CreditCard" size={14} />
                  На карту
                </Button>
              </div>
            )}
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Бонусы можно потратить на следующих событиях. Возврат на карту обрабатывается вручную за 1–3 рабочих дня.
            </p>
          </CardContent>
        </Card>
      ))}

      {inProgress.map((r) => (
        <Card key={r.id} className="border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10">
          <CardContent className="p-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs text-amber-700 dark:text-amber-400 font-semibold">Возврат на карту обрабатывается</div>
              <div className="text-sm font-medium truncate">{r.event_title}</div>
            </div>
            <div className="text-sm font-bold shrink-0">{fmt(r.amount)} ₽</div>
          </CardContent>
        </Card>
      ))}

      {done.length > 0 && (
        <details className="text-xs">
          <summary className="text-muted-foreground cursor-pointer hover:text-foreground">
            История возвратов · {done.length}
          </summary>
          <div className="mt-2 space-y-1.5">
            {done.map((r) => (
              <div key={r.id} className="flex items-center justify-between text-xs py-1.5 px-3 rounded bg-muted/40">
                <div className="truncate flex-1 mr-2">
                  <span className="text-muted-foreground">{fmtDate(r.processed_at)}</span> · {r.event_title}
                </div>
                <div className="font-semibold shrink-0">+{fmt(r.amount)} ₽ {r.method === "bonus" ? "бонусом" : "на карту"}</div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}