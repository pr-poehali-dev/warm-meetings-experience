import { useState } from "react";
import { OrgEvent, OrgParticipant, organizerApi } from "@/lib/organizer-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Icon from "@/components/ui/icon";
import { useToast } from "@/hooks/use-toast";

interface Props {
  event: OrgEvent;
  participants: OrgParticipant[];
  onBack: () => void;
  onRefresh: () => void;
}

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

export default function OrgParticipants({ event, participants, onBack, onRefresh }: Props) {
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", phone: "", email: "", telegram: "", status: "confirmed" });
  const [saving, setSaving] = useState(false);

  const handleAddParticipant = async () => {
    if (!addForm.name || !addForm.phone) {
      toast({ title: "Укажите имя и телефон", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await organizerApi.addParticipant({ event_id: event.id, ...addForm });
      toast({ title: "Участник добавлен" });
      setAddForm({ name: "", phone: "", email: "", telegram: "", status: "confirmed" });
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

  const exportCSV = () => {
    const rows = [
      ["Имя", "Телефон", "Email", "Telegram", "Статус", "Пришёл", "Дата записи"],
      ...participants.map((p) => [
        p.name, p.phone, p.email || "", p.telegram || "",
        p.status, p.attended === true ? "Да" : p.attended === false ? "Нет" : "",
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
  const paid = participants.filter((p) => ["paid", "оплачено"].includes(p.status));

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
          { label: "Оплатили", value: paid.length, sub: paid.length > 0 ? `${(paid.length * (event.price_amount || 0)).toLocaleString("ru")} ₽` : "—" },
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
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Добавить участника вручную</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Имя *</Label>
                <Input value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} placeholder="Иван Иванов" />
              </div>
              <div>
                <Label className="text-xs">Телефон *</Label>
                <Input value={addForm.phone} onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })} placeholder="+7 999 000 00 00" />
              </div>
              <div>
                <Label className="text-xs">Email</Label>
                <Input value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} placeholder="ivan@example.com" />
              </div>
              <div>
                <Label className="text-xs">Telegram</Label>
                <Input value={addForm.telegram} onChange={(e) => setAddForm({ ...addForm, telegram: e.target.value })} placeholder="@username" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Статус оплаты</Label>
              <Select value={addForm.status} onValueChange={(v) => setAddForm({ ...addForm, status: v })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="confirmed">Подтверждён (без оплаты)</SelectItem>
                  <SelectItem value="paid">Оплачен (наличными)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAddParticipant} disabled={saving}>
                {saving && <Icon name="Loader2" size={14} className="animate-spin mr-1" />}
                Добавить
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setAddOpen(false)}>Отмена</Button>
            </div>
          </CardContent>
        </Card>
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
            <Card key={p.id} className={p.attended === false ? "opacity-60" : ""}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm font-semibold shrink-0">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-sm">{p.name}</div>
                      <div className="text-xs text-muted-foreground flex gap-2 flex-wrap">
                        <span>{p.phone}</span>
                        {p.telegram && <span>{p.telegram}</span>}
                        {p.email && <span className="hidden sm:inline">{p.email}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={p.status} />
                    <Select value={p.status} onValueChange={(v) => handleStatusChange(p.id, v)}>
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
                      onClick={() => handleAttendance(p.id, p.attended !== true)}
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
