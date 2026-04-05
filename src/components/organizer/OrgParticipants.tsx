import { useState } from "react";
import { OrgEvent, OrgParticipant, organizerApi } from "@/lib/organizer-api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { useToast } from "@/hooks/use-toast";
import { PAYMENT_TYPE_LABELS } from "./ParticipantPaymentEditor";
import ParticipantAddForm from "./ParticipantAddForm";
import ParticipantCard from "./ParticipantCard";

interface Props {
  event: OrgEvent;
  participants: OrgParticipant[];
  onBack: () => void;
  onRefresh: () => void;
}

export default function OrgParticipants({ event, participants, onBack, onRefresh }: Props) {
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", phone: "", email: "", telegram: "", status: "confirmed", payment_type: "", payment_amount: 0 });
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ name: "", phone: "", email: "", telegram: "" });

  const handleAddParticipant = async () => {
    if (!addForm.name || !addForm.phone) {
      toast({ title: "Укажите имя и телефон", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        event_id: event.id,
        name: addForm.name,
        phone: addForm.phone,
        email: addForm.email,
        telegram: addForm.telegram,
        status: addForm.status,
      };
      if (addForm.payment_type && addForm.payment_type !== "none") {
        payload.payment_type = addForm.payment_type;
        payload.payment_amount = addForm.payment_amount;
      }
      await organizerApi.addParticipant(payload as Parameters<typeof organizerApi.addParticipant>[0]);
      toast({ title: "Участник добавлен" });
      setAddForm({ name: "", phone: "", email: "", telegram: "", status: "confirmed", payment_type: "", payment_amount: 0 });
      setAddOpen(false);
      onRefresh();
    } catch {
      toast({ title: "Ошибка добавления", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id: number, status: string) => {
    try {
      await organizerApi.updateParticipant(id, { status });
      onRefresh();
    } catch {
      toast({ title: "Ошибка обновления статуса", variant: "destructive" });
    }
  };

  const handleAttendance = async (id: number, attended: boolean) => {
    try {
      await organizerApi.updateParticipant(id, { attended });
      onRefresh();
    } catch {
      toast({ title: "Ошибка", variant: "destructive" });
    }
  };

  const handlePaymentSave = async (id: number, data: { payment_type: string | null; payment_amount: number }) => {
    try {
      await organizerApi.updateParticipant(id, data as Partial<OrgParticipant>);
      toast({ title: "Оплата обновлена" });
      onRefresh();
    } catch {
      toast({ title: "Ошибка сохранения оплаты", variant: "destructive" });
    }
  };

  const startEditing = (p: OrgParticipant) => {
    setEditingId(p.id);
    setEditForm({ name: p.name, phone: p.phone, email: p.email || "", telegram: p.telegram || "" });
  };

  const handleEditSave = async () => {
    if (!editingId) return;
    if (!editForm.name || !editForm.phone) {
      toast({ title: "Имя и телефон обязательны", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await organizerApi.updateParticipant(editingId, editForm as Partial<OrgParticipant>);
      toast({ title: "Данные обновлены" });
      setEditingId(null);
      onRefresh();
    } catch {
      toast({ title: "Ошибка сохранения", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const exportCSV = () => {
    const rows = [
      ["Имя", "Телефон", "Email", "Telegram", "Статус", "Тип оплаты", "Сумма оплаты", "Пришёл", "Дата записи"],
      ...participants.map((p) => [
        p.name, p.phone, p.email || "", p.telegram || "",
        p.status,
        p.payment_type ? (PAYMENT_TYPE_LABELS[p.payment_type]?.label || p.payment_type) : "",
        p.payment_amount || "",
        p.attended === true ? "Да" : p.attended === false ? "Нет" : "",
        new Date(p.created_at).toLocaleDateString("ru-RU"),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `участники_${event.title}_${event.event_date}.csv`;
    a.click();
  };

  const active = participants.filter((p) => !["cancelled", "отменено"].includes(p.status));
  const paid = participants.filter((p) => ["paid", "оплачено"].includes(p.status) || p.payment_type === "full");
  const totalPaid = participants.reduce((sum, p) => sum + (p.payment_amount || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <Icon name="ArrowLeft" size={18} />
        </Button>
        <div>
          <h2 className="text-xl font-bold">Участники</h2>
          <p className="text-sm text-muted-foreground">{event.title} · {new Date(event.event_date).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Всего записей", value: active.length, sub: `из ${event.total_spots || "∞"}` },
          { label: "Оплатили", value: paid.length, sub: totalPaid > 0 ? `${totalPaid.toLocaleString("ru")} ₽` : "—" },
          { label: "Посетили", value: participants.filter((p) => p.attended === true).length, sub: "человек" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-3">
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
              <div className="text-xs text-muted-foreground">{s.sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-2">
        <Button onClick={() => setAddOpen(!addOpen)} variant="outline" className="gap-2">
          <Icon name="UserPlus" size={16} />
          Добавить вручную
        </Button>
        <Button onClick={exportCSV} variant="ghost" className="gap-2">
          <Icon name="Download" size={16} />
          Скачать CSV
        </Button>
      </div>

      {addOpen && (
        <ParticipantAddForm
          event={event}
          addForm={addForm}
          saving={saving}
          onFormChange={setAddForm}
          onSubmit={handleAddParticipant}
          onCancel={() => setAddOpen(false)}
        />
      )}

      {participants.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Icon name="Users" size={36} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Пока никто не записался</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {participants.map((p) => (
            <ParticipantCard
              key={p.id}
              participant={p}
              eventPrice={event.price_amount || 0}
              isExpanded={expandedId === p.id}
              isEditing={editingId === p.id}
              editForm={editForm}
              saving={saving}
              onEditFormChange={setEditForm}
              onStartEditing={() => startEditing(p)}
              onCancelEditing={() => setEditingId(null)}
              onEditSave={handleEditSave}
              onTogglePayment={() => setExpandedId(expandedId === p.id ? null : p.id)}
              onStatusChange={handleStatusChange}
              onAttendance={handleAttendance}
              onPaymentSave={handlePaymentSave}
            />
          ))}
        </div>
      )}
    </div>
  );
}
