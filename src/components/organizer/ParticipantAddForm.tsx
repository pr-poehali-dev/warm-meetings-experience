import { OrgEvent } from "@/lib/organizer-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Icon from "@/components/ui/icon";

interface AddFormData {
  name: string;
  phone: string;
  email: string;
  telegram: string;
  status: string;
  payment_type: string;
  payment_amount: number;
}

interface Props {
  event: OrgEvent;
  addForm: AddFormData;
  saving: boolean;
  onFormChange: (data: AddFormData) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export default function ParticipantAddForm({ event, addForm, saving, onFormChange, onSubmit, onCancel }: Props) {
  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Добавить участника вручную</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Имя *</Label>
            <Input value={addForm.name} onChange={(e) => onFormChange({ ...addForm, name: e.target.value })} placeholder="Иван Иванов" />
          </div>
          <div>
            <Label className="text-xs">Телефон *</Label>
            <Input value={addForm.phone} onChange={(e) => onFormChange({ ...addForm, phone: e.target.value })} placeholder="+7 999 000 00 00" />
          </div>
          <div>
            <Label className="text-xs">Email</Label>
            <Input value={addForm.email} onChange={(e) => onFormChange({ ...addForm, email: e.target.value })} placeholder="ivan@example.com" />
          </div>
          <div>
            <Label className="text-xs">Telegram</Label>
            <Input value={addForm.telegram} onChange={(e) => onFormChange({ ...addForm, telegram: e.target.value })} placeholder="@username" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">Статус</Label>
            <Select value={addForm.status} onValueChange={(v) => onFormChange({ ...addForm, status: v })}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="confirmed">Подтверждён</SelectItem>
                <SelectItem value="paid">Оплачен</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Тип оплаты</Label>
            <Select
              value={addForm.payment_type || "none"}
              onValueChange={(v) => {
                const pt = v === "none" ? "" : v;
                let amount = addForm.payment_amount;
                if (v === "full" && event.price_amount) amount = event.price_amount;
                if (v === "prepaid" && event.price_amount) amount = Math.round(event.price_amount * 0.5);
                if (v === "none") amount = 0;
                onFormChange({ ...addForm, payment_type: pt, payment_amount: amount });
              }}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Не указано</SelectItem>
                <SelectItem value="prepaid">Предоплата</SelectItem>
                <SelectItem value="full">Полная оплата</SelectItem>
                <SelectItem value="custom">Индивидуальная</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {addForm.payment_type && addForm.payment_type !== "none" && (
            <div>
              <Label className="text-xs">Сумма, ₽</Label>
              <Input
                type="number"
                className="mt-1"
                value={addForm.payment_amount || ""}
                onChange={(e) => onFormChange({ ...addForm, payment_amount: parseInt(e.target.value) || 0 })}
                placeholder={event.price_amount ? String(event.price_amount) : "0"}
              />
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={onSubmit} disabled={saving}>
            {saving && <Icon name="Loader2" size={14} className="animate-spin mr-1" />}
            Добавить
          </Button>
          <Button size="sm" variant="ghost" onClick={onCancel}>Отмена</Button>
        </div>
      </CardContent>
    </Card>
  );
}
