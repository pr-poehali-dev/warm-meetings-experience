import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import Icon from "@/components/ui/icon";
import { organizerApi, Guest, GuestStats, OrgEvent } from "@/lib/organizer-api";
import { useToast } from "@/hooks/use-toast";
import GuestDialog from "./GuestDialog";

type StatusFilter = "all" | "new" | "wrote" | "confirmed" | "refused";

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "Все" },
  { key: "new", label: "Новые" },
  { key: "wrote", label: "Написал" },
  { key: "confirmed", label: "Подтверждены" },
  { key: "refused", label: "Отказы" },
];

const STATUS_MAP: Record<string, { label: string; color: string; filter: StatusFilter }> = {
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

interface Props {
  event: OrgEvent;
  onBack: () => void;
}

export default function GuestsPanel({ event, onBack }: Props) {
  const { toast } = useToast();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [stats, setStats] = useState<GuestStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [dialogGuest, setDialogGuest] = useState<Guest | null>(null);
  const [statusLoading, setStatusLoading] = useState<number | null>(null);
  const [bulkText, setBulkText] = useState("");
  const [bulkSending, setBulkSending] = useState(false);
  const [showBulk, setShowBulk] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await organizerApi.getGuests(event.id);
      setGuests(data.guests || []);
      setStats(data.stats);
    } catch {
      toast({ title: "Ошибка загрузки гостей", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [event.id, toast]);

  useEffect(() => { load(); }, [load]);

  const filteredGuests = guests.filter((g) => {
    if (filter === "all") return true;
    const s = STATUS_MAP[g.status];
    return s?.filter === filter;
  });

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filteredGuests.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredGuests.map((g) => g.id)));
    }
  };

  const handleStatusChange = async (guest: Guest, newStatus: string) => {
    setStatusLoading(guest.id);
    try {
      await organizerApi.updateGuestStatus(event.id, guest.id, newStatus);
      setGuests((prev) =>
        prev.map((g) => g.id === guest.id ? { ...g, status: newStatus } : g)
      );
      if (newStatus === "confirmed" || newStatus === "paid") {
        setStats((prev) => prev ? { ...prev, confirmed: prev.confirmed + 1, spots_left: Math.max(0, prev.spots_left - 1) } : prev);
      } else if (newStatus === "cancelled" || newStatus === "refused") {
        const wasConfirmed = ["confirmed", "paid", "подтверждён", "оплачено"].includes(guest.status);
        setStats((prev) => prev ? { ...prev, confirmed: wasConfirmed ? prev.confirmed - 1 : prev.confirmed, spots_left: wasConfirmed ? prev.spots_left + 1 : prev.spots_left } : prev);
      }
    } catch {
      toast({ title: "Ошибка обновления статуса", variant: "destructive" });
    } finally {
      setStatusLoading(null);
    }
  };

  const handleWriteOne = (guest: Guest) => {
    setDialogGuest(guest);
  };

  const handleBulkSend = async () => {
    if (!bulkText.trim() || selected.size === 0) return;
    setBulkSending(true);
    try {
      const ids = Array.from(selected);
      await organizerApi.sendMessages(ids, bulkText.trim());
      setGuests((prev) =>
        prev.map((g) =>
          selected.has(g.id) && ["new", "новая"].includes(g.status)
            ? { ...g, status: "wrote" }
            : g
        )
      );
      toast({ title: `Отправлено ${ids.length} гостям` });
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
    const link = `${window.location.origin}/events/${event.slug}`;
    navigator.clipboard.writeText(link);
    toast({ title: "Ссылка скопирована!" });
  };

  const formatDate = (iso: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" });
  };

  const spotsLabel = stats
    ? `Мест: ${stats.total_spots} | Подтверждено: ${stats.confirmed} | Ожидают: ${stats.waiting}`
    : "";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 -ml-2">
          <Icon name="ArrowLeft" size={16} />
          Назад
        </Button>
        <div>
          <h1 className="text-lg font-semibold leading-tight">{event.title}</h1>
          <p className="text-xs text-muted-foreground">
            {formatDate(event.event_date)}{event.start_time ? `, ${event.start_time.slice(0, 5)}` : ""} · {event.bath_name}
          </p>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">{spotsLabel}</p>
          <Button variant="outline" size="sm" onClick={copyInviteLink} className="gap-1.5 text-xs">
            <Icon name="Link" size={13} />
            Ссылка-приглашение
          </Button>
        </div>

        <div className="flex gap-1.5 flex-wrap">
          {STATUS_FILTERS.map((f) => {
            const count = f.key === "all" ? guests.length : guests.filter((g) => STATUS_MAP[g.status]?.filter === f.key).length;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  filter === f.key
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
                {bulkSending
                  ? <Icon name="Loader2" size={15} className="animate-spin" />
                  : <Icon name="Send" size={15} />
                }
              </Button>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Icon name="Loader2" size={28} className="animate-spin text-muted-foreground" />
        </div>
      ) : filteredGuests.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          {filter === "all" ? "Нет записавшихся гостей" : "Нет гостей с таким статусом"}
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
                      <Icon
                        name={CHANNEL_ICON[channel] || "Globe"}
                        size={13}
                        className="text-muted-foreground shrink-0"
                        title={channel}
                      />
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
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs gap-1 h-8"
                    onClick={() => handleWriteOne(guest)}
                  >
                    <Icon name="MessageSquare" size={12} />
                    Написать
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0 text-green-600 hover:bg-green-50 hover:border-green-300"
                    disabled={isLoading}
                    onClick={() => handleStatusChange(guest, "confirmed")}
                    title="Подтвердить"
                  >
                    {isLoading ? <Icon name="Loader2" size={13} className="animate-spin" /> : <Icon name="Check" size={13} />}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0 text-red-500 hover:bg-red-50 hover:border-red-300"
                    disabled={isLoading}
                    onClick={() => handleStatusChange(guest, "refused")}
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
        onClose={() => {
          setDialogGuest(null);
          load();
        }}
      />
    </div>
  );
}
