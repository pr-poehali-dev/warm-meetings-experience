import React, { useState, useEffect, useCallback } from "react";
import { OrgEvent, OrgParticipant, Guest, GuestStats, organizerApi } from "@/lib/organizer-api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Icon from "@/components/ui/icon";
import { useToast } from "@/hooks/use-toast";
import { PAYMENT_TYPE_LABELS } from "./ParticipantPaymentEditor";
import ParticipantAddForm from "./ParticipantAddForm";
import GuestDialog from "./GuestDialog";
import ParticipantPaymentEditor, { PaymentBadge } from "./ParticipantPaymentEditor";
import ConsentPhotoBadge from "@/components/ui/ConsentPhotoBadge";

// ── Объединённая персона ────────────────────────────────────────────────────

interface UnifiedPerson {
  key: string;
  name: string;
  phone: string;
  email: string;
  telegram: string;
  // Participant data
  participant: OrgParticipant | null;
  // Guest data
  guest: Guest | null;
  // Derived
  status: string;
  createdAt: string;
}

// ── Словари статусов ────────────────────────────────────────────────────────

const PART_STATUS: Record<string, { label: string; color: string }> = {
  new: { label: "Новый", color: "bg-blue-100 text-blue-700" },
  confirmed: { label: "Подтверждён", color: "bg-green-100 text-green-700" },
  paid: { label: "Оплачен", color: "bg-emerald-100 text-emerald-700" },
  оплачено: { label: "Оплачен", color: "bg-emerald-100 text-emerald-700" },
  cancelled: { label: "Отменён", color: "bg-red-100 text-red-700" },
  отменено: { label: "Отменён", color: "bg-red-100 text-red-700" },
};

const GUEST_STATUS: Record<string, { label: string; color: string }> = {
  new: { label: "Новый", color: "bg-gray-100 text-gray-600" },
  новая: { label: "Новый", color: "bg-gray-100 text-gray-600" },
  wrote: { label: "Написал", color: "bg-yellow-100 text-yellow-700" },
  confirmed: { label: "Подтверждён", color: "bg-green-100 text-green-700" },
  подтверждён: { label: "Подтверждён", color: "bg-green-100 text-green-700" },
  paid: { label: "Оплачено", color: "bg-emerald-100 text-emerald-700" },
  оплачено: { label: "Оплачено", color: "bg-emerald-100 text-emerald-700" },
  refused: { label: "Отказ", color: "bg-red-100 text-red-600" },
  cancelled: { label: "Отказ", color: "bg-red-100 text-red-600" },
  отменено: { label: "Отказ", color: "bg-red-100 text-red-600" },
};

const CHANNEL_ICON: Record<string, string> = {
  telegram: "Send", vk: "MessageCircle", email: "Mail", sms: "MessageSquare", site: "Globe",
};

type Filter = "all" | "active" | "confirmed" | "cancelled";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Все" },
  { key: "active", label: "Активные" },
  { key: "confirmed", label: "Подтверждены" },
  { key: "cancelled", label: "Отказы" },
];

// ── Props ───────────────────────────────────────────────────────────────────

interface Props {
  event: OrgEvent;
  onBack: () => void;
}

// ── Component ───────────────────────────────────────────────────────────────

export default function UnifiedPeoplePanel({ event, onBack }: Props) {
  const { toast } = useToast();

  const [participants, setParticipants] = useState<OrgParticipant[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [guestStats, setGuestStats] = useState<GuestStats | null>(null);
  const [loading, setLoading] = useState(true);

  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", phone: "", email: "", telegram: "", status: "confirmed", payment_type: "", payment_amount: 0 });
  const [saving, setSaving] = useState(false);

  const [dialogGuest, setDialogGuest] = useState<Guest | null>(null);
  const [bulkText, setBulkText] = useState("");
  const [bulkSending, setBulkSending] = useState(false);
  const [showBulk, setShowBulk] = useState(false);

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", phone: "", email: "", telegram: "" });
  const [paymentKey, setPaymentKey] = useState<string | null>(null);

  // ── Load ──────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pData, gData] = await Promise.all([
        organizerApi.getParticipants(event.id),
        organizerApi.getGuests(event.id),
      ]);
      setParticipants(pData);
      setGuests(gData.guests || []);
      setGuestStats(gData.stats);
    } catch {
      toast({ title: "Ошибка загрузки", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [event.id, toast]);

  useEffect(() => { load(); }, [load]);

  // ── Merge guests + participants ───────────────────────────────────────────

  const people = React.useMemo((): UnifiedPerson[] => {
    const map = new Map<string, UnifiedPerson>();

    // Сначала participants — они более "богатые" (оплата, посещаемость)
    for (const p of participants) {
      const key = `p:${p.id}`;
      map.set(p.phone || key, {
        key,
        name: p.name,
        phone: p.phone,
        email: p.email || "",
        telegram: p.telegram || "",
        participant: p,
        guest: null,
        status: p.status,
        createdAt: p.created_at,
      });
    }

    // Гости — объединяем по телефону если уже есть, иначе добавляем
    for (const g of guests) {
      const phone = g.phone;
      if (phone && map.has(phone)) {
        const existing = map.get(phone)!;
        map.set(phone, { ...existing, guest: g });
      } else {
        const key = `g:${g.id}`;
        map.set(phone || key, {
          key,
          name: g.name,
          phone: g.phone,
          email: g.email || "",
          telegram: g.telegram || "",
          participant: null,
          guest: g,
          status: g.status,
          createdAt: g.created_at,
        });
      }
    }

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [participants, guests]);

  // ── Filtering ─────────────────────────────────────────────────────────────

  const CANCELLED_STATUSES = ["cancelled", "отменено", "refused"];
  const CONFIRMED_STATUSES = ["confirmed", "paid", "подтверждён", "оплачено"];

  const filtered = people.filter((p) => {
    if (filter === "active" && CANCELLED_STATUSES.includes(p.status)) return false;
    if (filter === "confirmed" && !CONFIRMED_STATUSES.includes(p.status)) return false;
    if (filter === "cancelled" && !CANCELLED_STATUSES.includes(p.status)) return false;
    if (search) {
      const q = search.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.phone.includes(q) || (p.telegram || "").toLowerCase().includes(q);
    }
    return true;
  });

  // ── Stats ─────────────────────────────────────────────────────────────────

  const totalActive = people.filter((p) => !CANCELLED_STATUSES.includes(p.status)).length;
  const totalConfirmed = people.filter((p) => CONFIRMED_STATUSES.includes(p.status)).length;
  const totalPaid = participants.reduce((s, p) => s + (p.payment_amount || 0), 0);
  const totalAttended = participants.filter((p) => p.attended === true).length;

  // ── Selection ─────────────────────────────────────────────────────────────

  const toggleSelect = (key: string) => {
    setSelected((prev) => { const n = new Set(prev); if (n.has(key)) { n.delete(key); } else { n.add(key); } return n; });
  };

  const toggleAll = () => {
    setSelected(selected.size === filtered.length ? new Set() : new Set(filtered.map((p) => p.key)));
  };

  // ── Participants handlers ─────────────────────────────────────────────────

  const handleAddParticipant = async () => {
    if (!addForm.name || !addForm.phone) {
      toast({ title: "Укажите имя и телефон", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        event_id: event.id,
        name: addForm.name, phone: addForm.phone,
        email: addForm.email, telegram: addForm.telegram,
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
      load();
    } catch {
      toast({ title: "Ошибка добавления", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handlePartStatusChange = async (id: number, status: string) => {
    try {
      await organizerApi.updateParticipant(id, { status });
      setParticipants((prev) => prev.map((p) => p.id === id ? { ...p, status } : p));
    } catch {
      toast({ title: "Ошибка", variant: "destructive" });
    }
  };

  const handleAttendance = async (id: number, attended: boolean) => {
    try {
      await organizerApi.updateParticipant(id, { attended });
      setParticipants((prev) => prev.map((p) => p.id === id ? { ...p, attended } : p));
    } catch {
      toast({ title: "Ошибка", variant: "destructive" });
    }
  };

  const handlePaymentSave = async (id: number, data: { payment_type: string | null; payment_amount: number }) => {
    try {
      await organizerApi.updateParticipant(id, data as Partial<OrgParticipant>);
      toast({ title: "Оплата сохранена" });
      setParticipants((prev) => prev.map((p) => p.id === id ? { ...p, ...data } : p));
      setPaymentKey(null);
    } catch {
      toast({ title: "Ошибка сохранения", variant: "destructive" });
    }
  };

  const handleEditSave = async (person: UnifiedPerson) => {
    if (!editForm.name || !editForm.phone) {
      toast({ title: "Имя и телефон обязательны", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (person.participant) {
        await organizerApi.updateParticipant(person.participant.id, editForm as Partial<OrgParticipant>);
      }
      toast({ title: "Данные обновлены" });
      setEditingKey(null);
      load();
    } catch {
      toast({ title: "Ошибка", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // ── Guest handlers ────────────────────────────────────────────────────────

  const handleGuestStatusChange = async (guest: Guest, newStatus: string) => {
    try {
      await organizerApi.updateGuestStatus(event.id, guest.id, newStatus);
      setGuests((prev) => prev.map((g) => g.id === guest.id ? { ...g, status: newStatus } : g));
    } catch {
      toast({ title: "Ошибка", variant: "destructive" });
    }
  };

  const handleBulkSend = async () => {
    if (!bulkText.trim() || selected.size === 0) return;
    const guestIds = Array.from(selected)
      .map((key) => filtered.find((p) => p.key === key)?.guest?.id)
      .filter((id): id is number => id !== undefined);
    if (guestIds.length === 0) {
      toast({ title: "Среди выбранных нет гостей с каналом связи", variant: "destructive" });
      return;
    }
    setBulkSending(true);
    try {
      await organizerApi.sendMessages(guestIds, bulkText.trim());
      toast({ title: `Отправлено ${guestIds.length} гостям` });
      setSelected(new Set());
      setBulkText("");
      setShowBulk(false);
    } catch {
      toast({ title: "Ошибка отправки", variant: "destructive" });
    } finally {
      setBulkSending(false);
    }
  };

  // ── CSV export ────────────────────────────────────────────────────────────

  const exportCSV = () => {
    const rows = [
      ["Имя", "Телефон", "Email", "Telegram", "Статус", "Тип оплаты", "Сумма", "Пришёл", "Дата"],
      ...people.map((p) => [
        p.name, p.phone, p.email, p.telegram,
        p.status,
        p.participant?.payment_type ? (PAYMENT_TYPE_LABELS[p.participant.payment_type]?.label || p.participant.payment_type) : "",
        p.participant?.payment_amount || "",
        p.participant?.attended === true ? "Да" : p.participant?.attended === false ? "Нет" : "",
        new Date(p.createdAt).toLocaleDateString("ru-RU"),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `гости_${event.title}_${event.event_date}.csv`;
    a.click();
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/events/${event.slug}`);
    toast({ title: "Ссылка скопирована!" });
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" });

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <Icon name="ArrowLeft" size={18} />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold truncate">{event.title}</h2>
          <p className="text-sm text-muted-foreground">
            {formatDate(event.event_date)}{event.start_time ? `, ${event.start_time.slice(0, 5)}` : ""}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={copyInviteLink} className="gap-1.5 text-xs shrink-0">
          <Icon name="Link" size={13} />
          <span className="hidden sm:inline">Ссылка</span>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Всего", value: totalActive, sub: `из ${event.total_spots || "∞"}` },
          { label: "Подтверждено", value: totalConfirmed, sub: "человек" },
          { label: "Собрано", value: totalPaid > 0 ? `${totalPaid.toLocaleString("ru")} ₽` : "—", sub: "оплата" },
          { label: "Пришли", value: totalAttended, sub: "на встречу" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border bg-card p-3 text-center">
            <div className="text-xl font-bold leading-tight">{s.value}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Icon name="Search" size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по имени, телефону..."
            className="pl-8 h-8 text-sm"
          />
        </div>
        <div className="flex gap-1.5">
          {FILTERS.map((f) => {
            const count = f.key === "all" ? people.length
              : f.key === "active" ? people.filter((p) => !CANCELLED_STATUSES.includes(p.status)).length
              : f.key === "confirmed" ? totalConfirmed
              : people.filter((p) => CANCELLED_STATUSES.includes(p.status)).length;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                  filter === f.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {f.label} {count > 0 && <span className="opacity-70">{count}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Actions row */}
      <div className="flex gap-2 flex-wrap">
        <Button onClick={() => setAddOpen(!addOpen)} variant="outline" size="sm" className="gap-1.5 text-xs">
          <Icon name="UserPlus" size={14} />
          Добавить
        </Button>
        <Button onClick={exportCSV} variant="ghost" size="sm" className="gap-1.5 text-xs">
          <Icon name="Download" size={14} />
          CSV
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

      {/* Bulk panel */}
      {selected.size > 0 && (
        <div className="rounded-xl border bg-muted/40 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Выбрано: {selected.size}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setSelected(new Set())}>Снять</Button>
              <Button size="sm" onClick={() => setShowBulk(!showBulk)} className="gap-1.5">
                <Icon name="Send" size={13} />
                Написать всем
              </Button>
            </div>
          </div>
          {showBulk && (
            <div className="flex gap-2">
              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder="Сообщение для всех выбранных гостей..."
                className="flex-1 text-sm rounded-lg border p-2 min-h-[60px] resize-none focus:outline-none focus:ring-2 focus:ring-ring bg-background"
              />
              <Button onClick={handleBulkSend} disabled={bulkSending || !bulkText.trim()} className="self-end">
                {bulkSending ? <Icon name="Loader2" size={15} className="animate-spin" /> : <Icon name="Send" size={15} />}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Icon name="Loader2" size={28} className="animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          <Icon name="Users" size={36} className="mx-auto mb-3 opacity-20" />
          {search ? "Никого не найдено" : "Пока никто не записался"}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <Checkbox
              checked={selected.size === filtered.length && filtered.length > 0}
              onCheckedChange={toggleAll}
            />
            <span className="text-xs text-muted-foreground">Выбрать всех ({filtered.length})</span>
          </div>

          {filtered.map((person) => {
            const p = person.participant;
            const g = person.guest;
            const isExpanded = expandedKey === person.key;
            const isEditing = editingKey === person.key;
            const isPaymentOpen = paymentKey === person.key;
            const channel = g?.preferred_channel || "site";
            const statusInfo = p
              ? (PART_STATUS[p.status] || { label: p.status, color: "bg-gray-100 text-gray-700" })
              : (GUEST_STATUS[g?.status || ""] || { label: g?.status || "", color: "bg-gray-100 text-gray-600" });
            const isCancelled = CANCELLED_STATUSES.includes(person.status);

            return (
              <div
                key={person.key}
                className={`rounded-xl border bg-card transition-all ${isCancelled ? "opacity-50" : ""}`}
              >
                <div className="p-3">
                  {isEditing ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Имя *</p>
                          <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Телефон *</p>
                          <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Email</p>
                          <Input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Telegram</p>
                          <Input value={editForm.telegram} onChange={(e) => setEditForm({ ...editForm, telegram: e.target.value })} />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleEditSave(person)} disabled={saving}>
                          {saving ? <Icon name="Loader2" size={13} className="animate-spin mr-1" /> : <Icon name="Save" size={13} className="mr-1" />}
                          Сохранить
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingKey(null)}>Отмена</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selected.has(person.key)}
                        onCheckedChange={() => toggleSelect(person.key)}
                        className="mt-1 shrink-0"
                      />

                      {/* Avatar */}
                      <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm font-semibold shrink-0">
                        {person.name.charAt(0).toUpperCase()}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-medium text-sm">{person.name}</span>
                          {/* Источник записи */}
                          {g && (
                            <Icon
                              name={CHANNEL_ICON[channel] || "Globe"}
                              size={12}
                              className="text-muted-foreground"
                              title={`Канал: ${channel}`}
                            />
                          )}
                          {p?.consent_photo && <ConsentPhotoBadge consent={p.consent_photo} />}
                          {/* Бейдж оплаты */}
                          {p?.payment_type && <PaymentBadge type={p.payment_type} amount={p.payment_amount} />}
                          {/* Счётчик сообщений */}
                          {g && g.messages_count > 0 && (
                            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                              {g.messages_count} сообщ.
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-muted-foreground mt-0.5 flex gap-2 flex-wrap">
                          <span>{person.phone}</span>
                          {person.telegram && <span>{person.telegram}</span>}
                          {person.email && <span className="hidden md:inline">{person.email}</span>}
                        </div>

                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {/* Статус участника */}
                          {p && (
                            <div className="flex items-center gap-1">
                              <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${statusInfo.color}`}>
                                {statusInfo.label}
                              </span>
                              <Select value={p.status} onValueChange={(v) => handlePartStatusChange(p.id, v)}>
                                <SelectTrigger className="h-6 w-6 border-0 bg-transparent p-0 [&>svg]:hidden">
                                  <Icon name="ChevronDown" size={12} className="text-muted-foreground" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="new">Новый</SelectItem>
                                  <SelectItem value="confirmed">Подтверждён</SelectItem>
                                  <SelectItem value="paid">Оплачен</SelectItem>
                                  <SelectItem value="cancelled">Отменён</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                          {/* Статус гостя (если нет участника) */}
                          {!p && g && (
                            <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${statusInfo.color}`}>
                              {statusInfo.label}
                            </span>
                          )}
                          {/* Посещаемость */}
                          {p && (
                            <button
                              onClick={() => handleAttendance(p.id, !p.attended)}
                              className={`text-[11px] px-2 py-0.5 rounded-full font-medium transition-colors ${
                                p.attended === true
                                  ? "bg-purple-100 text-purple-700"
                                  : "bg-muted text-muted-foreground hover:bg-purple-50 hover:text-purple-600"
                              }`}
                            >
                              {p.attended === true ? "Пришёл" : "Отметить"}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        {/* Написать (только если есть guest) */}
                        {g && (
                          <button
                            onClick={() => setDialogGuest(g)}
                            title="Написать"
                            className="w-7 h-7 rounded-full flex items-center justify-center bg-muted text-muted-foreground hover:bg-blue-50 hover:text-blue-600 transition-colors"
                          >
                            <Icon name="MessageSquare" size={14} />
                          </button>
                        )}
                        {/* Оплата (только участник) */}
                        {p && (
                          <button
                            onClick={() => setPaymentKey(isPaymentOpen ? null : person.key)}
                            title="Оплата"
                            className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                              p.payment_type ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground hover:bg-amber-50 hover:text-amber-600"
                            }`}
                          >
                            <Icon name="Wallet" size={14} />
                          </button>
                        )}
                        {/* Подтвердить/отказ (только гость без участника) */}
                        {!p && g && (
                          <>
                            <button
                              onClick={() => handleGuestStatusChange(g, "confirmed")}
                              title="Подтвердить"
                              className="w-7 h-7 rounded-full flex items-center justify-center bg-muted text-muted-foreground hover:bg-green-50 hover:text-green-600 transition-colors"
                            >
                              <Icon name="Check" size={14} />
                            </button>
                            <button
                              onClick={() => handleGuestStatusChange(g, "refused")}
                              title="Отказ"
                              className="w-7 h-7 rounded-full flex items-center justify-center bg-muted text-muted-foreground hover:bg-red-50 hover:text-red-500 transition-colors"
                            >
                              <Icon name="X" size={14} />
                            </button>
                          </>
                        )}
                        {/* Редактировать (только участник) */}
                        {p && (
                          <button
                            onClick={() => { setEditingKey(person.key); setEditForm({ name: p.name, phone: p.phone, email: p.email || "", telegram: p.telegram || "" }); }}
                            title="Редактировать"
                            className="w-7 h-7 rounded-full flex items-center justify-center bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                          >
                            <Icon name="Pencil" size={13} />
                          </button>
                        )}
                        {/* Показать/скрыть детали */}
                        <button
                          onClick={() => setExpandedKey(isExpanded ? null : person.key)}
                          className="w-7 h-7 rounded-full flex items-center justify-center bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                        >
                          <Icon name={isExpanded ? "ChevronUp" : "ChevronDown"} size={13} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Payment editor */}
                  {!isEditing && isPaymentOpen && p && (
                    <div className="mt-3 pt-3 border-t">
                      <ParticipantPaymentEditor
                        participantId={p.id}
                        currentType={p.payment_type || null}
                        currentAmount={p.payment_amount || 0}
                        eventPrice={event.price_amount || 0}
                        onSave={(data) => handlePaymentSave(p.id, data)}
                        onCancel={() => setPaymentKey(null)}
                      />
                    </div>
                  )}

                  {/* Expanded details */}
                  {!isEditing && isExpanded && (
                    <div className="mt-3 pt-3 border-t grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-muted-foreground">
                      {person.email && <div><span className="font-medium text-foreground">Email:</span> {person.email}</div>}
                      {person.telegram && <div><span className="font-medium text-foreground">TG:</span> {person.telegram}</div>}
                      {p?.comment && <div className="col-span-2"><span className="font-medium text-foreground">Комментарий:</span> {p.comment}</div>}
                      <div><span className="font-medium text-foreground">Записался:</span> {new Date(person.createdAt).toLocaleDateString("ru-RU")}</div>
                      {p && <div><span className="font-medium text-foreground">Источник:</span> {p.payment_type ? "Участник" : "Запись"}</div>}
                      {g && <div><span className="font-medium text-foreground">Канал:</span> {g.preferred_channel || "сайт"}</div>}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Guest dialog */}
      <GuestDialog
        guest={dialogGuest}
        onClose={() => { setDialogGuest(null); load(); }}
      />
    </div>
  );
}
