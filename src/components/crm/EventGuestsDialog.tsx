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
import ClientCard from "./ClientCard";
import NotifyModule from "@/components/notify/NotifyModule";

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

const PAYMENT_TYPES = [
  { value: "", label: "Не указан" },
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

  // Add new
  const [adding, setAdding] = useState(false);
  const [newForm, setNewForm] = useState({ name: "", phone: "", email: "", telegram: "", status: "confirmed", payment_amount: 0, payment_type: "" });

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
    }
  }, [open, load]);

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
    setSavingId(g.signup_id);
    try {
      await crmApi.updateEventGuest(g.signup_id, { payment_type });
      setGuests((prev) => prev.map((x) => (x.signup_id === g.signup_id ? { ...x, payment_type } : x)));
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
    setSavingId(editingId);
    try {
      await crmApi.updateEventGuest(editingId, editForm);
      setGuests((prev) => prev.map((x) => (x.signup_id === editingId ? { ...x, ...editForm } : x)));
      setEditingId(null);
    } catch (e) {
      toast.error("Не сохранилось: " + String(e));
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
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
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
                      <Select value={newForm.payment_type} onValueChange={(v) => setNewForm({ ...newForm, payment_type: v })}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Способ оплаты" /></SelectTrigger>
                        <SelectContent>
                          {PAYMENT_TYPES.map((p) => <SelectItem key={p.value || "none"} value={p.value}>{p.label}</SelectItem>)}
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
                      <Card key={g.signup_id} className="border-0 shadow-sm">
                        <CardContent className="p-2.5">
                          <div className="flex items-start gap-2">
                            <Checkbox checked={selected.has(g.signup_id)} onCheckedChange={() => toggleSel(g.signup_id)} className="mt-1" />
                            <div className="flex-1 min-w-0">
                              {isEditing ? (
                                <div className="space-y-1.5">
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                                    <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} placeholder="Имя" className="h-7 text-xs" />
                                    <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} placeholder="Телефон" className="h-7 text-xs" />
                                    <Input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} placeholder="Email" className="h-7 text-xs" />
                                    <Input value={editForm.telegram} onChange={(e) => setEditForm({ ...editForm, telegram: e.target.value })} placeholder="@tg" className="h-7 text-xs" />
                                  </div>
                                  <Input value={editForm.comment} onChange={(e) => setEditForm({ ...editForm, comment: e.target.value })} placeholder="Комментарий" className="h-7 text-xs" />
                                  <div className="flex gap-1.5">
                                    <Button size="sm" onClick={saveEdit} disabled={savingId === g.signup_id} className="h-7 text-xs">Сохранить</Button>
                                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-7 text-xs">Отмена</Button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <button onClick={() => setOpenCard(g.client_key)} className="font-medium text-sm hover:underline truncate">
                                      {g.name || "Без имени"}
                                    </button>
                                    {g.tags.map((t) => (
                                      <Badge key={t.id} variant="outline" className="text-[10px] py-0 px-1.5" style={{ borderColor: t.color, color: t.color }}>
                                        {t.name}
                                      </Badge>
                                    ))}
                                  </div>
                                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                                    {g.phone && <span className="flex items-center gap-1"><Icon name="Phone" size={10} />{g.phone}</span>}
                                    {g.telegram && <span className="flex items-center gap-1"><Icon name="Send" size={10} />{g.telegram}</span>}
                                    {g.email && <span className="flex items-center gap-1"><Icon name="Mail" size={10} />{g.email}</span>}
                                  </div>
                                  {g.comment && <div className="text-xs text-muted-foreground italic mt-1">«{g.comment}»</div>}
                                </>
                              )}
                            </div>

                            {/* Inline controls */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Select value={g.status} onValueChange={(v) => handleStatusChange(g, v)} disabled={savingId === g.signup_id}>
                                <SelectTrigger className={`h-7 w-[120px] text-xs ${stMeta.color} border-0`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                                </SelectContent>
                              </Select>
                              <Input
                                type="number"
                                value={g.payment_amount || ""}
                                onChange={(e) => {
                                  const v = parseInt(e.target.value) || 0;
                                  setGuests((prev) => prev.map((x) => (x.signup_id === g.signup_id ? { ...x, payment_amount: v } : x)));
                                }}
                                onBlur={(e) => handlePaymentChange(g, parseInt(e.target.value) || 0)}
                                placeholder="₽"
                                className="h-7 w-[70px] text-xs"
                                title="Оплачено"
                              />
                              <Select value={g.payment_type || ""} onValueChange={(v) => handlePaymentType(g, v)}>
                                <SelectTrigger className="h-7 w-[90px] text-xs"><SelectValue placeholder="Способ" /></SelectTrigger>
                                <SelectContent>
                                  {PAYMENT_TYPES.map((p) => <SelectItem key={p.value || "none"} value={p.value}>{p.label}</SelectItem>)}
                                </SelectContent>
                              </Select>
                              <button
                                onClick={() => handleAttended(g, !g.attended)}
                                className={`h-7 px-2 rounded-md text-xs flex items-center gap-1 transition-colors ${g.attended ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                                title={g.attended ? "Пришёл" : "Не отмечен"}
                              >
                                <Icon name={g.attended ? "CheckCircle2" : "Circle"} size={12} />
                              </button>
                              <button onClick={() => startEdit(g)} className="h-7 w-7 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground" title="Редактировать">
                                <Icon name="Pencil" size={12} />
                              </button>
                              <button onClick={() => handleDelete(g)} className="h-7 w-7 rounded-md hover:bg-destructive/10 hover:text-destructive flex items-center justify-center text-muted-foreground" title="Удалить">
                                <Icon name="Trash2" size={12} />
                              </button>
                            </div>
                          </div>
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
    </>
  );
}
