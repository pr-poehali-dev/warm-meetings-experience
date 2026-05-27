import { useCallback, useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import Icon from "@/components/ui/icon";
import { crmApi, CrmEventGuest } from "@/lib/crm-api";
import { organizerApi } from "@/lib/organizer-api";
import ClientCard from "./ClientCard";
import NotifyModule from "@/components/notify/NotifyModule";
import GuestChatDialog from "./GuestChatDialog";

interface Props {
  open: boolean;
  eventId: number;
  eventTitle?: string;
  onClose: () => void;
}

const STATUS_OPTIONS = [
  { value: "new", label: "Новый", color: "bg-blue-100 text-blue-700" },
  { value: "wrote", label: "Написал", color: "bg-yellow-100 text-yellow-700" },
  { value: "confirmed", label: "Подтверждён", color: "bg-green-100 text-green-700" },
  { value: "paid", label: "Оплачен", color: "bg-emerald-100 text-emerald-700" },
  { value: "cancelled", label: "Отменён", color: "bg-red-100 text-red-700" },
];

const PAYMENT_NONE = "__none__";
const PAYMENT_TYPES = [
  { value: PAYMENT_NONE, label: "Не указан" },
  { value: "cash", label: "Наличные" },
  { value: "card", label: "Карта" },
  { value: "transfer", label: "Перевод" },
  { value: "club", label: "По клубу" },
];

type Filter = "all" | "active" | "confirmed" | "cancelled";
type View = "guests" | "broadcast";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Все" },
  { key: "active", label: "Активные" },
  { key: "confirmed", label: "Подтверждены" },
  { key: "cancelled", label: "Отказы" },
];

const CANCELLED = ["cancelled", "отменено", "refused"];
const CONFIRMED = ["confirmed", "paid", "подтверждён", "оплачено"];

function statusMeta(s: string) {
  return STATUS_OPTIONS.find((o) => o.value === s) || { value: s, label: s, color: "bg-gray-100 text-gray-700" };
}

function fmtMoney(n: number | null | undefined) {
  if (!n) return "—";
  return new Intl.NumberFormat("ru-RU").format(n) + " ₽";
}

export default function EventGuestsDialog({ open, eventId, eventTitle, onClose }: Props) {
  const [guests, setGuests] = useState<CrmEventGuest[]>([]);
  const [stats, setStats] = useState({ total: 0, confirmed: 0, cancelled: 0, attended: 0, total_paid: 0 });
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("guests");
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [openCard, setOpenCard] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [savingId, setSavingId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ name: "", phone: "", email: "", telegram: "", comment: "" });

  // Личный чат с гостем
  const [chatGuest, setChatGuest] = useState<CrmEventGuest | null>(null);

  // Add new
  const [adding, setAdding] = useState(false);
  const [newForm, setNewForm] = useState({ name: "", phone: "", email: "", telegram: "", status: "confirmed", payment_amount: 0, payment_type: "" });

  // Анонимные брони и общая вместимость события
  const [anonCount, setAnonCount] = useState<number>(0);
  const [anonInput, setAnonInput] = useState<string>("0");
  const [totalSpots, setTotalSpots] = useState<number>(0);
  const [savingAnon, setSavingAnon] = useState(false);

  const loadEventCapacity = useCallback(async () => {
    if (!eventId) return;
    try {
      const ev = await organizerApi.getEvent(eventId);
      const total = ev.total_spots ?? 0;
      const anon = ev.anonymous_count ?? 0;
      setTotalSpots(total);
      setAnonCount(anon);
      setAnonInput(String(anon));
    } catch (e) {
      // молча — это не критично для основного функционала диалога
    }
  }, [eventId]);

  const saveAnonCount = async () => {
    const value = Math.max(parseInt(anonInput, 10) || 0, 0);
    if (value === anonCount) return;
    setSavingAnon(true);
    try {
      await organizerApi.updateEvent({ id: eventId, anonymous_count: value });
      setAnonCount(value);
      setAnonInput(String(value));
      toast.success(value === 0 ? "Доп. брони очищены" : `Доп. броней: ${value}`);
    } catch (e) {
      toast.error("Не удалось сохранить: " + String(e));
      setAnonInput(String(anonCount));
    } finally {
      setSavingAnon(false);
    }
  };

  const load = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      const r = await crmApi.listEventGuests(eventId);
      setGuests(r.guests);
      setStats(r.stats);
    } catch (e) {
      toast.error("Не удалось загрузить гостей: " + String(e));
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    if (open) {
      setView("guests");
      setSelected(new Set());
      load();
      loadEventCapacity();
    }
  }, [open, load, loadEventCapacity]);

  const filtered = useMemo(() => {
    return guests.filter((g) => {
      if (filter === "active" && CANCELLED.includes(g.status)) return false;
      if (filter === "confirmed" && !CONFIRMED.includes(g.status)) return false;
      if (filter === "cancelled" && !CANCELLED.includes(g.status)) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          (g.name || "").toLowerCase().includes(q) ||
          (g.phone || "").includes(q) ||
          (g.telegram || "").toLowerCase().includes(q) ||
          (g.email || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [guests, filter, search]);

  const handleStatusChange = async (g: CrmEventGuest, status: string) => {
    setSavingId(g.signup_id);
    try {
      await crmApi.updateEventGuest(g.signup_id, { status });
      setGuests((prev) => prev.map((x) => (x.signup_id === g.signup_id ? { ...x, status } : x)));
    } catch (e) {
      toast.error("Не сохранилось: " + String(e));
    } finally {
      setSavingId(null);
    }
  };

  const handlePaymentChange = async (g: CrmEventGuest, amount: number) => {
    setSavingId(g.signup_id);
    try {
      await crmApi.updateEventGuest(g.signup_id, { payment_amount: amount });
      setGuests((prev) => prev.map((x) => (x.signup_id === g.signup_id ? { ...x, payment_amount: amount } : x)));
    } catch (e) {
      toast.error("Не сохранилось: " + String(e));
    } finally {
      setSavingId(null);
    }
  };

  const handlePaymentType = async (g: CrmEventGuest, payment_type: string) => {
    const realValue = payment_type === PAYMENT_NONE ? "" : payment_type;
    setSavingId(g.signup_id);
    try {
      await crmApi.updateEventGuest(g.signup_id, { payment_type: realValue });
      setGuests((prev) => prev.map((x) => (x.signup_id === g.signup_id ? { ...x, payment_type: realValue } : x)));
    } catch (e) {
      toast.error("Не сохранилось: " + String(e));
    } finally {
      setSavingId(null);
    }
  };

  const handleAttended = async (g: CrmEventGuest, attended: boolean) => {
    setSavingId(g.signup_id);
    try {
      await crmApi.updateEventGuest(g.signup_id, { attended });
      setGuests((prev) => prev.map((x) => (x.signup_id === g.signup_id ? { ...x, attended } : x)));
      setStats((s) => ({ ...s, attended: Math.max(0, s.attended + (attended ? 1 : -1)) }));
      toast.success(attended ? `${g.name || "Гость"} отмечен как пришедший` : `Отметка снята`);
    } catch (e) {
      toast.error("Не сохранилось: " + String(e));
    } finally {
      setSavingId(null);
    }
  };

  const startEdit = (g: CrmEventGuest) => {
    setEditingId(g.signup_id);
    setEditForm({
      name: g.name || "",
      phone: g.phone || "",
      email: g.email || "",
      telegram: g.telegram || "",
      comment: g.comment || "",
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const guest = guests.find((x) => x.signup_id === editingId);
    if (!guest) return;
    const isRegistered = guest.user_id !== null;
    const payload = isRegistered
      ? { comment: editForm.comment }
      : editForm;
    setSavingId(editingId);
    try {
      await crmApi.updateEventGuest(editingId, payload);
      setGuests((prev) => prev.map((x) => (x.signup_id === editingId ? { ...x, ...payload } : x)));
      setEditingId(null);
    } catch (e) {
      toast.error("Не сохранилось: " + String(e));
    } finally {
      setSavingId(null);
    }
  };

  const handleSendInvite = async (g: CrmEventGuest) => {
    let email = (editForm.email || g.email || "").trim();
    if (!email) {
      const ask = window.prompt("Введите email гостя для отправки приглашения:");
      if (!ask) return;
      email = ask.trim();
      setEditForm((f) => ({ ...f, email }));
    }
    if (!email.includes("@")) {
      toast.error("Некорректный email");
      return;
    }
    setSavingId(g.signup_id);
    try {
      await crmApi.sendGuestInvite({ signup_id: g.signup_id, email, name: editForm.name || g.name });
      toast.success(`Приглашение отправлено на ${email}`);
    } catch (e) {
      toast.error("Не удалось отправить: " + String(e));
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (g: CrmEventGuest) => {
    if (!confirm(`Удалить гостя «${g.name}» из события?`)) return;
    try {
      await crmApi.deleteEventGuest(g.signup_id);
      setGuests((prev) => prev.filter((x) => x.signup_id !== g.signup_id));
      toast.success("Гость удалён");
    } catch (e) {
      toast.error("Не удалось удалить: " + String(e));
    }
  };

  const handleAdd = async () => {
    if (!newForm.name.trim()) {
      toast.error("Введите имя");
      return;
    }
    try {
      await crmApi.addEventGuest({ event_id: eventId, ...newForm });
      toast.success("Гость добавлен");
      setAdding(false);
      setNewForm({ name: "", phone: "", email: "", telegram: "", status: "confirmed", payment_amount: 0, payment_type: "" });
      load();
    } catch (e) {
      toast.error("Не удалось добавить: " + String(e));
    }
  };

  const toggleSel = (id: number) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto w-[calc(100vw-1rem)] sm:w-auto p-3 sm:p-6 pb-24 sm:pb-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Icon name="Users" size={18} />
              Гости события {eventTitle && <span className="text-muted-foreground font-normal">· {eventTitle}</span>}
            </DialogTitle>
          </DialogHeader>

          {/* Tabs */}
          <div className="flex gap-1.5 border-b">
            <button
              onClick={() => setView("guests")}
              className={`px-3 py-1.5 text-sm border-b-2 -mb-px ${view === "guests" ? "border-primary text-foreground font-medium" : "border-transparent text-muted-foreground"}`}
            >
              Список ({stats.total})
            </button>
            <button
              onClick={() => setView("broadcast")}
              className={`px-3 py-1.5 text-sm border-b-2 -mb-px flex items-center gap-1.5 ${view === "broadcast" ? "border-primary text-foreground font-medium" : "border-transparent text-muted-foreground"}`}
            >
              <Icon name="Send" size={13} />
              Рассылка
            </button>
          </div>

          {view === "guests" && (
            <div className="space-y-3">
              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <Card className="border-0 shadow-sm"><CardContent className="p-2.5 text-center">
                  <div className="text-[10px] uppercase text-muted-foreground">Всего</div>
                  <div className="font-bold text-base">{stats.total}</div>
                </CardContent></Card>
                <Card className="border-0 shadow-sm bg-emerald-50"><CardContent className="p-2.5 text-center">
                  <div className="text-[10px] uppercase text-muted-foreground">Подтверждено</div>
                  <div className="font-bold text-base text-emerald-700">{stats.confirmed}</div>
                </CardContent></Card>
                <Card className="border-0 shadow-sm bg-rose-50"><CardContent className="p-2.5 text-center">
                  <div className="text-[10px] uppercase text-muted-foreground">Отказы</div>
                  <div className="font-bold text-base text-rose-700">{stats.cancelled}</div>
                </CardContent></Card>
                <Card className="border-0 shadow-sm bg-blue-50"><CardContent className="p-2.5 text-center">
                  <div className="text-[10px] uppercase text-muted-foreground">Пришли</div>
                  <div className="font-bold text-base text-blue-700">{stats.attended}</div>
                </CardContent></Card>
                <Card className="border-0 shadow-sm bg-amber-50"><CardContent className="p-2.5 text-center">
                  <div className="text-[10px] uppercase text-muted-foreground">Касса</div>
                  <div className="font-bold text-base text-amber-700">{fmtMoney(stats.total_paid)}</div>
                </CardContent></Card>
              </div>

              {/* Анонимные брони */}
              <Card className="border-dashed">
                <CardContent className="p-3 flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                    <Icon name="UserMinus" size={16} className="text-muted-foreground" />
                    <div className="flex-1">
                      <div className="text-sm font-medium">Доп. брони без данных</div>
                      <div className="text-xs text-muted-foreground">
                        Учитываются в занятости события, но без личных данных гостей.
                        {totalSpots > 0 && (
                          <> Всего мест: <b>{totalSpots}</b> · занято: <b>{stats.total + anonCount}</b> ({stats.total} с данными + {anonCount} анонимных).</>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 p-0"
                      onClick={() => setAnonInput(String(Math.max(parseInt(anonInput, 10) - 1 || 0, 0)))}
                      disabled={savingAnon}
                    >
                      −
                    </Button>
                    <Input
                      type="number"
                      min={0}
                      value={anonInput}
                      onChange={(e) => setAnonInput(e.target.value)}
                      onBlur={saveAnonCount}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                      }}
                      className="h-8 w-16 text-center"
                      disabled={savingAnon}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 p-0"
                      onClick={() => {
                        const next = (parseInt(anonInput, 10) || 0) + 1;
                        if (totalSpots > 0 && stats.total + next > totalSpots) {
                          toast.error("Превышена вместимость события");
                          return;
                        }
                        setAnonInput(String(next));
                      }}
                      disabled={savingAnon}
                    >
                      +
                    </Button>
                    {parseInt(anonInput, 10) !== anonCount && (
                      <Button size="sm" onClick={saveAnonCount} disabled={savingAnon} className="h-8">
                        Сохранить
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Toolbar */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative flex-1 min-w-[180px]">
                  <Icon name="Search" size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск…" className="pl-8 h-8 text-sm" />
                </div>
                <div className="flex gap-1">
                  {FILTERS.map((f) => (
                    <button
                      key={f.key}
                      onClick={() => setFilter(f.key)}
                      className={`px-2.5 py-1 text-xs rounded-md transition-colors ${filter === f.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                <Button size="sm" onClick={() => setAdding(true)} className="gap-1 h-8">
                  <Icon name="UserPlus" size={13} />
                  Добавить
                </Button>
                {selected.size > 0 && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="gap-1 h-8"
                    onClick={() => setView("broadcast")}
                  >
                    <Icon name="Send" size={13} />
                    Написать ({selected.size})
                  </Button>
                )}
              </div>

              {/* Add form */}
              {adding && (
                <Card className="border-primary/40 shadow-sm">
                  <CardContent className="p-3 space-y-2">
                    <div className="text-xs font-medium text-muted-foreground">Новый гость</div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <Input placeholder="Имя *" value={newForm.name} onChange={(e) => setNewForm({ ...newForm, name: e.target.value })} className="h-8 text-sm" />
                      <Input placeholder="Телефон" value={newForm.phone} onChange={(e) => setNewForm({ ...newForm, phone: e.target.value })} className="h-8 text-sm" />
                      <Input placeholder="Email" value={newForm.email} onChange={(e) => setNewForm({ ...newForm, email: e.target.value })} className="h-8 text-sm" />
                      <Input placeholder="@telegram" value={newForm.telegram} onChange={(e) => setNewForm({ ...newForm, telegram: e.target.value })} className="h-8 text-sm" />
                      <Select value={newForm.status} onValueChange={(v) => setNewForm({ ...newForm, status: v })}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Select
                        value={newForm.payment_type || PAYMENT_NONE}
                        onValueChange={(v) => setNewForm({ ...newForm, payment_type: v === PAYMENT_NONE ? "" : v })}
                      >
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Способ оплаты" /></SelectTrigger>
                        <SelectContent>
                          {PAYMENT_TYPES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Input type="number" placeholder="Сумма ₽" value={newForm.payment_amount || ""} onChange={(e) => setNewForm({ ...newForm, payment_amount: parseInt(e.target.value) || 0 })} className="h-8 text-sm" />
                      <div className="flex gap-1">
                        <Button size="sm" onClick={handleAdd} className="h-8 flex-1">Добавить</Button>
                        <Button size="sm" variant="ghost" onClick={() => setAdding(false)} className="h-8">Отмена</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* List */}
              {loading ? (
                <div className="flex justify-center py-10"><Icon name="Loader2" size={20} className="animate-spin text-muted-foreground" /></div>
              ) : filtered.length === 0 ? (
                <Card className="border-dashed shadow-none"><CardContent className="p-8 text-center text-sm text-muted-foreground">
                  {guests.length === 0 ? "Пока нет гостей" : "По фильтру никого не найдено"}
                </CardContent></Card>
              ) : (
                <div className="space-y-1.5">
                  {filtered.map((g) => {
                    const stMeta = statusMeta(g.status);
                    const isEditing = editingId === g.signup_id;
                    return (
                      <Card key={g.signup_id} className="border-0 shadow-sm overflow-hidden">
                        <CardContent className="p-3 space-y-2.5">
                          {isEditing ? (
                            <div className="space-y-1.5">
                              {g.user_id !== null ? (
                                <div className="flex items-start gap-1.5 rounded-md bg-amber-50 border border-amber-200 px-2 py-1.5 text-[11px] text-amber-800">
                                  <Icon name="Lock" size={12} className="mt-0.5 shrink-0" />
                                  <span>Личные данные может менять только сам гость. Вам доступна только заметка.</span>
                                </div>
                              ) : (
                                <div className="space-y-1.5">
                                  <div className="flex items-start gap-1.5 rounded-md bg-blue-50 border border-blue-200 px-2 py-1.5 text-[11px] text-blue-800">
                                    <Icon name="Info" size={12} className="mt-0.5 shrink-0" />
                                    <span>Гость добавлен вручную и ещё не подтвердил данные — их можно править.</span>
                                  </div>
                                  <div className="flex items-start gap-1.5 rounded-md bg-emerald-50 border border-emerald-200 px-2 py-1.5 text-[11px] text-emerald-800">
                                    <Icon name="Mail" size={12} className="mt-0.5 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <div className="mb-2">
                                        Чтобы общаться и получать уведомления — пригласите гостя присоединиться. Письмо уйдёт на email с вашей реферальной ссылкой.
                                      </div>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 px-2 text-[11px] gap-1 bg-white"
                                        onClick={() => handleSendInvite(g)}
                                        disabled={savingId === g.signup_id}
                                      >
                                        <Icon name="Send" size={11} />
                                        Отправить приглашение на email
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              )}
                              <div className="grid grid-cols-2 gap-1.5">
                                <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} placeholder="Имя" className="h-9 text-sm" disabled={g.user_id !== null} />
                                <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} placeholder="Телефон" className="h-9 text-sm" disabled={g.user_id !== null} />
                                <Input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} placeholder="Email" className="h-9 text-sm" disabled={g.user_id !== null} />
                                <Input value={editForm.telegram} onChange={(e) => setEditForm({ ...editForm, telegram: e.target.value })} placeholder="@tg" className="h-9 text-sm" disabled={g.user_id !== null} />
                              </div>
                              <Input value={editForm.comment} onChange={(e) => setEditForm({ ...editForm, comment: e.target.value })} placeholder="Заметка по гостю (видна только вам)" className="h-9 text-sm" />
                              <div className="flex gap-1.5">
                                <Button size="sm" onClick={saveEdit} disabled={savingId === g.signup_id} className="h-9 text-sm flex-1">Сохранить</Button>
                                <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-9 text-sm">Отмена</Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              {/* Строка 1: чекбокс + имя/теги + статус */}
                              <div className="flex items-start gap-2">
                                <Checkbox checked={selected.has(g.signup_id)} onCheckedChange={() => toggleSel(g.signup_id)} className="mt-1 shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <button onClick={() => setOpenCard(g.client_key)} className="font-semibold text-sm hover:underline truncate text-left w-full block">
                                    {g.name || "Без имени"}
                                  </button>
                                  {g.tags.length > 0 && (
                                    <div className="flex items-center gap-1 flex-wrap mt-1">
                                      {g.tags.map((t) => (
                                        <Badge key={t.id} variant="outline" className="text-[10px] py-0 px-1.5" style={{ borderColor: t.color, color: t.color }}>
                                          {t.name}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <Select value={g.status} onValueChange={(v) => handleStatusChange(g, v)} disabled={savingId === g.signup_id}>
                                  <SelectTrigger className={`h-8 min-w-[124px] w-auto text-xs px-2 ${stMeta.color} border-0 shrink-0`}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Строка 2: контакты в столбик */}
                              <div className="flex flex-col gap-0.5 text-xs text-muted-foreground pl-6">
                                {g.phone && <a href={`tel:${g.phone}`} className="flex items-center gap-1.5 hover:text-foreground"><Icon name="Phone" size={11} className="shrink-0" /><span className="truncate">{g.phone}</span></a>}
                                {g.telegram && <span className="flex items-center gap-1.5"><Icon name="Send" size={11} className="shrink-0" /><span className="truncate">{g.telegram}</span></span>}
                                {g.email && <a href={`mailto:${g.email}`} className="flex items-center gap-1.5 hover:text-foreground"><Icon name="Mail" size={11} className="shrink-0" /><span className="truncate">{g.email}</span></a>}
                                {g.comment && <div className="text-xs italic mt-0.5">«{g.comment}»</div>}
                              </div>

                              {/* Строка 3: сумма + способ */}
                              <div className="grid grid-cols-2 gap-1.5 pl-6">
                                <Input
                                  type="number"
                                  value={g.payment_amount || ""}
                                  onChange={(e) => {
                                    const v = parseInt(e.target.value) || 0;
                                    setGuests((prev) => prev.map((x) => (x.signup_id === g.signup_id ? { ...x, payment_amount: v } : x)));
                                  }}
                                  onBlur={(e) => handlePaymentChange(g, parseInt(e.target.value) || 0)}
                                  placeholder="Сумма ₽"
                                  className="h-9 text-sm"
                                  title="Оплачено"
                                />
                                <Select value={g.payment_type || PAYMENT_NONE} onValueChange={(v) => handlePaymentType(g, v)}>
                                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Способ" /></SelectTrigger>
                                  <SelectContent>
                                    {PAYMENT_TYPES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Строка 4: панель действий — растянутые крупные кнопки */}
                              <div className="grid grid-cols-4 gap-1.5 pl-6">
                                <button
                                  onClick={() => handleAttended(g, !g.attended)}
                                  disabled={savingId === g.signup_id}
                                  className={`h-9 rounded-md flex items-center justify-center gap-1 text-xs font-medium transition-colors disabled:opacity-60 ${g.attended ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                                  title={g.attended ? "Пришёл — нажмите чтобы снять" : "Отметить, что пришёл"}
                                >
                                  {savingId === g.signup_id ? (
                                    <Icon name="Loader2" size={14} className="animate-spin" />
                                  ) : (
                                    <>
                                      <Icon name={g.attended ? "CheckCircle2" : "Circle"} size={14} />
                                      <span>{g.attended ? "Был" : "Пришёл?"}</span>
                                    </>
                                  )}
                                </button>
                                <button
                                  onClick={() => setChatGuest(g)}
                                  className="h-9 rounded-md bg-primary/10 text-primary hover:bg-primary/20 flex items-center justify-center gap-1 text-xs font-medium"
                                  title="Открыть личный чат с гостем"
                                >
                                  <Icon name="MessageSquare" size={14} />
                                  <span>Написать</span>
                                </button>
                                <button onClick={() => startEdit(g)} className="h-9 rounded-md bg-muted text-muted-foreground hover:bg-muted/70 flex items-center justify-center" title="Редактировать">
                                  <Icon name="Pencil" size={15} />
                                </button>
                                <button onClick={() => handleDelete(g)} className="h-9 rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20 flex items-center justify-center" title="Удалить">
                                  <Icon name="Trash2" size={15} />
                                </button>
                              </div>
                            </>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {view === "broadcast" && (
            <div className="-mx-1">
              <NotifyModule role="organizer" eventId={eventId} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ClientCard
        clientKey={openCard}
        onClose={() => setOpenCard(null)}
        onChanged={load}
      />

      <GuestChatDialog
        open={!!chatGuest}
        signupId={chatGuest?.signup_id ?? null}
        guestName={chatGuest?.name || "Гость"}
        guestChannel={chatGuest?.preferred_channel}
        guestPhone={chatGuest?.phone}
        guestTelegram={chatGuest?.telegram}
        guestEmail={chatGuest?.email}
        onClose={() => setChatGuest(null)}
      />
    </>
  );
}