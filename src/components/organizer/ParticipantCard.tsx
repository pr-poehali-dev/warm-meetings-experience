import { OrgParticipant } from "@/lib/organizer-api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Icon from "@/components/ui/icon";
import ParticipantPaymentEditor, { PaymentBadge } from "./ParticipantPaymentEditor";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  new: { label: "Новый", color: "bg-blue-100 text-blue-700" },
  confirmed: { label: "Подтверждён", color: "bg-green-100 text-green-700" },
  paid: { label: "Оплачен", color: "bg-emerald-100 text-emerald-700" },
  оплачено: { label: "Оплачен", color: "bg-emerald-100 text-emerald-700" },
  cancelled: { label: "Отменён", color: "bg-red-100 text-red-700" },
  отменено: { label: "Отменён", color: "bg-red-100 text-red-700" },
  attended: { label: "Пришёл", color: "bg-purple-100 text-purple-700" },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_LABELS[status] || { label: status, color: "bg-gray-100 text-gray-700" };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.color}`}>{s.label}</span>;
}

interface Props {
  participant: OrgParticipant;
  eventPrice: number;
  isExpanded: boolean;
  isEditing: boolean;
  editForm: { name: string; phone: string; email: string; telegram: string };
  saving: boolean;
  onEditFormChange: (data: { name: string; phone: string; email: string; telegram: string }) => void;
  onStartEditing: () => void;
  onCancelEditing: () => void;
  onEditSave: () => void;
  onTogglePayment: () => void;
  onStatusChange: (id: number, status: string) => void;
  onAttendance: (id: number, attended: boolean) => void;
  onPaymentSave: (id: number, data: { payment_type: string | null; payment_amount: number }) => Promise<void>;
}

export default function ParticipantCard({
  participant: p,
  eventPrice,
  isExpanded,
  isEditing,
  editForm,
  saving,
  onEditFormChange,
  onStartEditing,
  onCancelEditing,
  onEditSave,
  onTogglePayment,
  onStatusChange,
  onAttendance,
  onPaymentSave,
}: Props) {
  return (
    <Card className={p.attended === false ? "opacity-60" : ""}>
      <CardContent className="p-3">
        {isEditing ? (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Имя *</Label>
                <Input value={editForm.name} onChange={(e) => onEditFormChange({ ...editForm, name: e.target.value })} placeholder="Имя" />
              </div>
              <div>
                <Label className="text-xs">Телефон *</Label>
                <Input value={editForm.phone} onChange={(e) => onEditFormChange({ ...editForm, phone: e.target.value })} placeholder="+7 999 000 00 00" />
              </div>
              <div>
                <Label className="text-xs">Email</Label>
                <Input value={editForm.email} onChange={(e) => onEditFormChange({ ...editForm, email: e.target.value })} placeholder="ivan@example.com" />
              </div>
              <div>
                <Label className="text-xs">Telegram</Label>
                <Input value={editForm.telegram} onChange={(e) => onEditFormChange({ ...editForm, telegram: e.target.value })} placeholder="@username" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={onEditSave} disabled={saving}>
                {saving ? <Icon name="Loader2" size={14} className="animate-spin mr-1" /> : <Icon name="Save" size={14} className="mr-1" />}
                Сохранить
              </Button>
              <Button size="sm" variant="ghost" onClick={onCancelEditing}>Отмена</Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm font-semibold shrink-0">
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-sm">{p.name}</div>
                  <div className="text-xs text-muted-foreground flex gap-2 flex-wrap items-center">
                    <span>{p.phone}</span>
                    {p.telegram && <span>{p.telegram}</span>}
                    {p.email && <span className="hidden sm:inline">{p.email}</span>}
                  </div>
                  {p.payment_type && (
                    <div className="mt-1">
                      <PaymentBadge type={p.payment_type} amount={p.payment_amount} />
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <StatusBadge status={p.status} />
                <Select value={p.status} onValueChange={(v) => onStatusChange(p.id, v)}>
                  <SelectTrigger className="h-7 w-7 border-0 bg-transparent p-0 [&>svg]:hidden">
                    <Icon name="ChevronDown" size={14} className="text-muted-foreground" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">Новый</SelectItem>
                    <SelectItem value="confirmed">Подтверждён</SelectItem>
                    <SelectItem value="paid">Оплачен</SelectItem>
                    <SelectItem value="cancelled">Отменён</SelectItem>
                  </SelectContent>
                </Select>
                <button
                  onClick={onStartEditing}
                  title="Редактировать"
                  className="w-7 h-7 rounded-full flex items-center justify-center transition-colors bg-muted text-muted-foreground hover:bg-blue-50 hover:text-blue-600"
                >
                  <Icon name="Pencil" size={14} />
                </button>
                <button
                  onClick={onTogglePayment}
                  title="Оплата"
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                    p.payment_type
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-muted text-muted-foreground hover:bg-amber-50 hover:text-amber-600"
                  }`}
                >
                  <Icon name="Wallet" size={14} />
                </button>
                <button
                  onClick={() => onAttendance(p.id, p.attended !== true)}
                  title={p.attended === true ? "Пришёл" : "Не пришёл"}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${p.attended === true ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground hover:bg-green-50"}`}
                >
                  <Icon name="Check" size={14} />
                </button>
              </div>
            </div>
            {p.comment && (
              <div className="mt-2 text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-md">
                {p.comment}
              </div>
            )}
            {isExpanded && (
              <ParticipantPaymentEditor
                participant={p}
                eventPrice={eventPrice}
                onSave={onPaymentSave}
              />
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}