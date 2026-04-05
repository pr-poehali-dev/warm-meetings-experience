import { useState } from "react";
import { OrgParticipant } from "@/lib/organizer-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Icon from "@/components/ui/icon";

export const PAYMENT_TYPE_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  prepaid: { label: "Предоплата", icon: "Clock", color: "text-amber-600 bg-amber-50" },
  full: { label: "Полная оплата", icon: "CheckCircle", color: "text-emerald-600 bg-emerald-50" },
  custom: { label: "Индивидуальная", icon: "Settings", color: "text-blue-600 bg-blue-50" },
};

export function PaymentBadge({ type, amount }: { type: string | null; amount: number }) {
  if (!type) return null;
  const pt = PAYMENT_TYPE_LABELS[type];
  if (!pt) return null;
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${pt.color}`}>
      <Icon name={pt.icon} size={11} />
      {pt.label}{amount > 0 && ` · ${amount.toLocaleString("ru")} ₽`}
    </span>
  );
}

interface PaymentEditorProps {
  participant: OrgParticipant;
  eventPrice: number;
  onSave: (id: number, data: { payment_type: string | null; payment_amount: number }) => Promise<void>;
}

export default function ParticipantPaymentEditor({ participant, eventPrice, onSave }: PaymentEditorProps) {
  const [paymentType, setPaymentType] = useState<string>(participant.payment_type || "");
  const [paymentAmount, setPaymentAmount] = useState<number>(participant.payment_amount || 0);
  const [saving, setSaving] = useState(false);

  const handleTypeChange = (val: string) => {
    setPaymentType(val);
    if (val === "full" && eventPrice > 0) {
      setPaymentAmount(eventPrice);
    } else if (val === "prepaid" && eventPrice > 0) {
      setPaymentAmount(Math.round(eventPrice * 0.5));
    } else if (val === "none") {
      setPaymentAmount(0);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(participant.id, {
      payment_type: paymentType === "none" || !paymentType ? null : paymentType,
      payment_amount: paymentType === "none" || !paymentType ? 0 : paymentAmount,
    });
    setSaving(false);
  };

  const hasChanges =
    (paymentType || "") !== (participant.payment_type || "") ||
    paymentAmount !== (participant.payment_amount || 0);

  return (
    <div className="mt-3 border-t pt-3 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground">Тип оплаты</Label>
          <Select value={paymentType || "none"} onValueChange={handleTypeChange}>
            <SelectTrigger className="mt-1 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">
                <span className="flex items-center gap-1.5">
                  <Icon name="MinusCircle" size={13} className="text-muted-foreground" />
                  Не указано
                </span>
              </SelectItem>
              <SelectItem value="prepaid">
                <span className="flex items-center gap-1.5">
                  <Icon name="Clock" size={13} className="text-amber-600" />
                  Предоплата
                </span>
              </SelectItem>
              <SelectItem value="full">
                <span className="flex items-center gap-1.5">
                  <Icon name="CheckCircle" size={13} className="text-emerald-600" />
                  Полная оплата
                </span>
              </SelectItem>
              <SelectItem value="custom">
                <span className="flex items-center gap-1.5">
                  <Icon name="Settings" size={13} className="text-blue-600" />
                  Индивидуальная
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {paymentType && paymentType !== "none" && (
          <div>
            <Label className="text-xs text-muted-foreground">Сумма, ₽</Label>
            <Input
              type="number"
              className="mt-1 h-9"
              value={paymentAmount || ""}
              onChange={(e) => setPaymentAmount(parseInt(e.target.value) || 0)}
              placeholder={eventPrice > 0 ? String(eventPrice) : "0"}
            />
          </div>
        )}

        <div className="flex items-end">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="h-9"
          >
            {saving ? (
              <Icon name="Loader2" size={14} className="animate-spin mr-1" />
            ) : (
              <Icon name="Save" size={14} className="mr-1" />
            )}
            Сохранить
          </Button>
        </div>
      </div>

      {paymentType === "prepaid" && eventPrice > 0 && (
        <p className="text-xs text-muted-foreground">
          Остаток к оплате: {(eventPrice - paymentAmount).toLocaleString("ru")} ₽ из {eventPrice.toLocaleString("ru")} ₽
        </p>
      )}
    </div>
  );
}
