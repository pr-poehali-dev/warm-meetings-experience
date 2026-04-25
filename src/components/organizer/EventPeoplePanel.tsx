import React, { useState, useEffect, useCallback } from "react";
import { OrgEvent, OrgParticipant, Guest, GuestStats, organizerApi } from "@/lib/organizer-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import Icon from "@/components/ui/icon";
import { useToast } from "@/hooks/use-toast";
import { PAYMENT_TYPE_LABELS } from "./ParticipantPaymentEditor";
import ParticipantAddForm from "./ParticipantAddForm";
import ParticipantCard from "./ParticipantCard";
import GuestDialog from "./GuestDialog";

// ─── Guests helpers ────────────────────────────────────────────────────────────

type GuestStatusFilter = "all" | "new" | "wrote" | "confirmed" | "refused";

const GUEST_STATUS_FILTERS: { key: GuestStatusFilter; label: string }[] = [
  { key: "all", label: "Все" },
  { key: "new", label: "Новые" },
  { key: "wrote", label: "Написал" },
  { key: "confirmed", label: "Подтверждены" },
  { key: "refused", label: "Отказы" },
];

const STATUS_MAP: Record<string, { label: string; color: string; filter: GuestStatusFilter }> = {
  new: { label: "Новая", color: "bg-gray-100 text-gray-600", filter: "new" },
  новая: { label: "Новая", color: "bg-gray-100 text-gray-600", filter: "new" },
  wrote: { label: "Написал", color: "bg-yellow-100 text-yellow-700", filter: "wrote" },
  confirmed: { label: "Подтверждён", color: "bg-green-100 text-green-700", filter: "confirmed" },
  подтверждён: { label: "Подтверждён", color: "bg-green-100 text-green-700", filter: "confirmed" },
  paid: { label: "Оплачено", color: "bg-green-100 text-green-700", filter: "confirmed" },
  оплачено: { label: "Оплачено", color: "bg-green-100 text-green-700", filter: "confirmed" },
  cancelled: { label: "Отказ", color: "bg-red-100 text-red-600", filter: "refused" },
  отменено: { label: "Отказ", color: "bg-red-100 text-red-600", filter: "refused" },
  refused: { label: "Отказ", color: "bg-red-100 text-red-600", filter: "refused" },
};

const CHANNEL_ICON: Record<string, string> = {
  telegram: "Send",
  vk: "MessageCircle",
  email: "Mail",
  sms: "MessageSquare",
  site: "Globe",
};

// ─── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  event: OrgEvent;
  participants: OrgParticipant[];
  onBack: () => void;
  onRefreshParticipants: () => void;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function EventPeoplePanel({ event, participants, onBack, onRefreshParticipants }: Props) {
  const { toast } = useToast();
  const [tab, setTab] = useState<"participants" | "guests">("participants");

  // ── Participants state ──────────────────────────────────────────────────────
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", phone: "", email: "", telegram: "", status: "confirmed", payment_type: "", payment_amount: 0 });
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ name: "", phone: "", email: "", telegram: "" });

  // ── Guests state ────────────────────────────────────────────────────────────
  const [guests, setGuests] = useState<Guest[]>([]);
  const [guestStats, setGuestStats] = useState<GuestStats | null>(null);
  const [guestsLoading, setGuestsLoading] = useState(false);
  const [guestFilter, setGuestFilter] = useState<GuestStatusFilter>("all");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [dialogGuest, setDialogGuest] = useState<Guest | null>(null);
  const [statusLoading, setStatusLoading] = useState<number | null>(null);
  const [bulkText, setBulkText] = useState("");
  const [bulkSending, setBulkSending] = useState(false);
  const [showBulk, setShowBulk] = useState(false);

  // ── Load guests ─────────────────────────────────────────────────────────────
  const loadGuests = useCallback(async () => {
    setGuestsLoading(true);
    try {
      const data = await organizerApi.getGuests(event.id);
      setGuests(data.guests || []);
      setGuestStats(data.stats);
    } catch {
      toast({ title: "Ошибка загрузки гостей", variant: "destructive" });
    } finally {
      setGuestsLoading(false);
    }
  }, [event.id, toast]);

  useEffect(() => {
    if (tab === "guests") loadGuests();
  }, [tab, loadGuests]);

  // ── Participants handlers ───────────────────────────────────────────────────
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
      onRefreshParticipants();
    } catch {
      toast({ title: "Ошибка добавления", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id: number, status: string) => {
    try {
      await organizerApi.updateParticipant(id, { status });
      onRefreshParticipants();
    } catch {
      toast({ title: "Ошибка обновления статуса", variant: "destructive" });
    }
  };

  const handleAttendance = async (id: number, attended: boolean) => {
    try {
      await organizerApi.updateParticipant(id, { attended });
      onRefreshParticipants();
    } catch {
      toast({ title: "Ошибка", variant: "destructive" });
    }
  };

  const handlePaymentSave = async (id: number, data: { payment_type: string | null; payment_amount: number }) => {
    try {
      await organizerApi.updateParticipant(id, data as Partial<OrgParticipant>);
      toast({ title: "Оплата обновлена" });
      onRefreshParticipants();
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
      onRefreshParticipants();
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

  // ── Guests handlers ─────────────────────────────────────────────────────────
  const handleGuestStatusChange = async (guest: Guest, newStatus: string) => {
    setStatusLoading(guest.id);
    try {
      await organizerApi.updateGuestStatus(event.id, guest.id, newStatus);
      setGuests((prev) => prev.map((g) => g.id === guest.id ? { ...g, status: newStatus } : g));
      if (newStatus === "confirmed" || newStatus === "paid") {
        setGuestStats((prev) => prev ? { ...prev, confirmed: prev.confirmed + 1, spots_left: Math.max(0, prev.spots_left - 1) } : prev);
      } else if (newStatus === "cancelled" || newStatus === "refused") {
        const wasConfirmed = ["confirmed", "paid", "подтверждён", "оплачено"].includes(guest.status);
        setGuestStats((prev) => prev ? { ...prev, confirmed: wasConfirmed ? prev.confirmed - 1 : prev.confirmed, spots_left: wasConfirmed ? prev.spots_left + 1 : prev.spots_left } : prev);
      }
    } catch {
      toast({ title: "Ошибка обновления статуса", variant: "destructive" });
    } finally {
      setStatusLoading(null);
    }
  };

  const handleBulkSend = async () => {
    if (!bulkText.trim() || selected.size === 0) return;
    setBulkSending(true);
    try {
      await organizerApi.sendMessages(Array.from(selected), bulkText.trim());
      setGuests((prev) =>
        prev.map((g) => selected.has(g.id) && ["new", "новая"].includes(g.status) ? { ...g, status: "wrote" } : g)
      );
      toast({ title: `Отправлено ${selected.size} гостям` });
      setSelected(new Set());
      setBulkText("");
      setShowBulk(false);
    } catch {
      toast({ title: "Ошибка отправки", variant: "destructive" });
    } finally {
      setBulkSending(false);
    }
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/events/${event.slug}`);
    toast({ title: "Ссылка скопирована!" });
  };

  const toggleSelect = (id: number) => {
    setSelected((prev) => { const n = new Set(prev); if (n.has(id)) { n.delete(id); } else { n.add(id); } return n; });
  };

  const filteredGuests = guests.filter((g) => guestFilter === "all" || STATUS_MAP[g.status]?.filter === guestFilter);

  const toggleAll = () => {
    setSelected(selected.size === filteredGuests.length ? new Set() : new Set(filteredGuests.map((g) => g.id)));
  };

  // ── Stats ───────────────────────────────────────────────────────────────────
  const active = participants.filter((p) => !["cancelled", "отменено"].includes(p.status));
  const paid = participants.filter((p) => ["paid", "оплачено"].includes(p.status) || p.payment_type === "full");
  const totalPaid = participants.reduce((sum, p) => sum + (p.payment_amount || 0), 0);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" });

  // ── Render ──────────────────────────────────────────────────────────────────
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
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab("participants")}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            tab === "participants" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Icon name="Users" size={14} />
            Участники
            {participants.length > 0 && (
              <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${tab === "participants" ? "bg-primary text-primary-foreground" : "bg-muted-foreground/20 text-muted-foreground"}`}>
                {active.length}
              </span>
            )}
          </span>
        </button>
        <button
          onClick={() => setTab("guests")}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            tab === "guests" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Icon name="MessageSquare" size={14} />
            Гости
            {guestStats && guestStats.total > 0 && (
              <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${tab === "guests" ? "bg-primary text-primary-foreground" : "bg-muted-foreground/20 text-muted-foreground"}`}>
                {guestStats.total}
              </span>
            )}
          </span>
        </button>
      </div>

      {/* ── Participants tab ──────────────────────────────────────────────────── */}
      {tab === "participants" && (
        <div className="space-y-4">
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
      )}

      {/* ── Guests tab ────────────────────────────────────────────────────────── */}
      {tab === "guests" && (
        <div className="space-y-4">
          {/* Stats + invite link */}
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                {guestStats
                  ? `Мест: ${guestStats.total_spots} · Подтверждено: ${guestStats.confirmed} · Ожидают: ${guestStats.waiting}`
                  : ""}
              </p>
              <Button variant="outline" size="sm" onClick={copyInviteLink} className="gap-1.5 text-xs">
                <Icon name="Link" size={13} />
                Ссылка-приглашение
              </Button>
            </div>

            <div className="flex gap-1.5 flex-wrap">
              {GUEST_STATUS_FILTERS.map((f) => {
                const count = f.key === "all" ? guests.length : guests.filter((g) => STATUS_MAP[g.status]?.filter === f.key).length;
                return (
                  <button
                    key={f.key}
                    onClick={() => setGuestFilter(f.key)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      guestFilter === f.key
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {f.label}
                    {count > 0 && <span className="ml-1 opacity-70">{count}</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bulk actions */}
          {selected.size > 0 && (
            <div className="rounded-xl border bg-muted/40 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Выбрано: {selected.size}</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setSelected(new Set())}>Снять</Button>
                  <Button size="sm" onClick={() => setShowBulk(true)} className="gap-1.5">
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
                    placeholder="Введите сообщение для всех выбранных..."
                    className="flex-1 text-sm rounded-lg border p-2 min-h-[60px] resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <Button onClick={handleBulkSend} disabled={bulkSending || !bulkText.trim()} className="self-end">
                    {bulkSending ? <Icon name="Loader2" size={15} className="animate-spin" /> : <Icon name="Send" size={15} />}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Guest list */}
          {guestsLoading ? (
            <div className="flex justify-center py-12">
              <Icon name="Loader2" size={28} className="animate-spin text-muted-foreground" />
            </div>
          ) : filteredGuests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              {guestFilter === "all" ? "Нет записавшихся гостей" : "Нет гостей с таким статусом"}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1 mb-1">
                <Checkbox
                  checked={selected.size === filteredGuests.length && filteredGuests.length > 0}
                  onCheckedChange={toggleAll}
                />
                <span className="text-xs text-muted-foreground">Выбрать всех</span>
              </div>

              {filteredGuests.map((guest) => {
                const statusInfo = STATUS_MAP[guest.status] || { label: guest.status, color: "bg-gray-100 text-gray-600" };
                const channel = guest.preferred_channel || "site";
                const isLoading = statusLoading === guest.id;

                return (
                  <div
                    key={guest.id}
                    className="rounded-xl border bg-card p-3 flex flex-col sm:flex-row sm:items-center gap-3"
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <Checkbox
                        checked={selected.has(guest.id)}
                        onCheckedChange={() => toggleSelect(guest.id)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-medium text-sm truncate">{guest.name}</span>
                          <Icon name={CHANNEL_ICON[channel] || "Globe"} size={13} className="text-muted-foreground shrink-0" title={channel} />
                          {guest.messages_count > 0 && (
                            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                              {guest.messages_count} {guest.messages_count === 1 ? "сообщение" : "сообщений"}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{guest.phone}</p>
                        <div className="mt-1">
                          <Badge className={`text-[11px] px-2 py-0.5 ${statusInfo.color} border-0`}>
                            {statusInfo.label}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                      <Button size="sm" variant="outline" className="text-xs gap-1 h-8" onClick={() => setDialogGuest(guest)}>
                        <Icon name="MessageSquare" size={12} />
                        Написать
                      </Button>
                      <Button
                        size="sm" variant="outline"
                        className="h-8 w-8 p-0 text-green-600 hover:bg-green-50 hover:border-green-300"
                        disabled={isLoading}
                        onClick={() => handleGuestStatusChange(guest, "confirmed")}
                        title="Подтвердить"
                      >
                        {isLoading ? <Icon name="Loader2" size={13} className="animate-spin" /> : <Icon name="Check" size={13} />}
                      </Button>
                      <Button
                        size="sm" variant="outline"
                        className="h-8 w-8 p-0 text-red-500 hover:bg-red-50 hover:border-red-300"
                        disabled={isLoading}
                        onClick={() => handleGuestStatusChange(guest, "refused")}
                        title="Отказ"
                      >
                        <Icon name="X" size={13} />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <GuestDialog
            guest={dialogGuest}
            onClose={() => { setDialogGuest(null); loadGuests(); }}
          />
        </div>
      )}
    </div>
  );
}