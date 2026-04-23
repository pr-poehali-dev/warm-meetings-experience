import { useState, useEffect, useCallback } from "react";
import { organizerApi, OrgEvent } from "@/lib/organizer-api";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";

type EventWithMeta = OrgEvent & { organizer_name?: string; organizer_email?: string };

export default function AdminEventModeration() {
  const [events, setEvents] = useState<EventWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [rejectTarget, setRejectTarget] = useState<EventWithMeta | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [tgToggles, setTgToggles] = useState<Record<number, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await organizerApi.getPendingModeration() as EventWithMeta[];
      setEvents(data);
      const defaults: Record<number, boolean> = {};
      data.forEach((ev) => { defaults[ev.id] = true; });
      setTgToggles(defaults);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (ev: EventWithMeta) => {
    setActionLoading(ev.id);
    try {
      await organizerApi.moderateEvent(ev.id, "approve", undefined, tgToggles[ev.id] ?? true);
      setEvents((prev) => prev.filter((e) => e.id !== ev.id));
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectTarget) return;
    setActionLoading(rejectTarget.id);
    try {
      await organizerApi.moderateEvent(rejectTarget.id, "reject", rejectReason);
      setEvents((prev) => prev.filter((e) => e.id !== rejectTarget.id));
      setRejectTarget(null);
      setRejectReason("");
    } finally {
      setActionLoading(null);
    }
  };

  const toggleTg = (id: number) =>
    setTgToggles((prev) => ({ ...prev, [id]: !prev[id] }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Icon name="Loader2" size={24} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold">Модерация событий</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Заявки организаторов на публикацию
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <Icon name="RefreshCw" size={14} className="mr-1.5" />
          Обновить
        </Button>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Icon name="CheckCircle" size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">Нет событий на модерации</p>
          <p className="text-sm mt-1">Все заявки обработаны</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {events.map((ev) => {
            const tgOn = tgToggles[ev.id] ?? true;
            return (
              <div key={ev.id} className="bg-white rounded-xl border p-5">
                <div className="flex gap-4">
                  {ev.image_url && (
                    <img
                      src={ev.image_url}
                      alt={ev.title}
                      className="w-24 h-24 rounded-lg object-cover flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-base leading-tight">{ev.title}</h3>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Icon name="Calendar" size={13} />
                            {ev.event_date}
                          </span>
                          {ev.start_time && (
                            <span className="flex items-center gap-1">
                              <Icon name="Clock" size={13} />
                              {ev.start_time}
                            </span>
                          )}
                          {ev.bath_name && (
                            <span className="flex items-center gap-1">
                              <Icon name="MapPin" size={13} />
                              {ev.bath_name}
                            </span>
                          )}
                        </div>
                        {ev.organizer_name && (
                          <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                            <Icon name="User" size={12} />
                            Организатор: {ev.organizer_name}
                            {ev.organizer_email && (
                              <span className="ml-1 opacity-60">({ev.organizer_email})</span>
                            )}
                          </div>
                        )}
                      </div>
                      <span className="flex-shrink-0 text-xs font-medium px-2 py-1 rounded-full bg-amber-100 text-amber-700 flex items-center gap-1">
                        <Icon name="Clock" size={11} />
                        Ожидает
                      </span>
                    </div>

                    {ev.short_description && (
                      <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{ev.short_description}</p>
                    )}

                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      {ev.price_label && (
                        <span className="flex items-center gap-1">
                          <Icon name="Banknote" size={12} />
                          {ev.price_label}
                        </span>
                      )}
                      {ev.total_spots && (
                        <span className="flex items-center gap-1">
                          <Icon name="Users" size={12} />
                          {ev.total_spots} мест
                        </span>
                      )}
                      <span className="flex items-center gap-1 opacity-60">
                        <Icon name="Tag" size={12} />
                        {ev.event_type}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action bar */}
                <div className="mt-4 pt-4 border-t flex flex-col gap-3">
                  {/* Telegram toggle */}
                  <button
                    type="button"
                    onClick={() => toggleTg(ev.id)}
                    className={`flex items-center gap-2.5 w-fit rounded-lg px-3 py-2 text-sm transition-colors border ${
                      tgOn
                        ? "bg-blue-50 border-blue-200 text-blue-700"
                        : "bg-gray-50 border-gray-200 text-gray-500"
                    }`}
                  >
                    <div className={`relative w-8 h-4 rounded-full transition-colors flex-shrink-0 ${tgOn ? "bg-blue-500" : "bg-gray-300"}`}>
                      <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${tgOn ? "translate-x-4" : "translate-x-0.5"}`} />
                    </div>
                    <Icon name="Send" size={14} />
                    <span>
                      {tgOn ? "Отправить в привязанные каналы и чаты" : "Не отправлять в Telegram"}
                    </span>
                  </button>

                  {/* Approve / Reject buttons */}
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleApprove(ev)}
                      disabled={actionLoading === ev.id}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {actionLoading === ev.id ? (
                        <Icon name="Loader2" size={14} className="animate-spin mr-1.5" />
                      ) : (
                        <Icon name="CheckCircle" size={14} className="mr-1.5" />
                      )}
                      Одобрить
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setRejectTarget(ev); setRejectReason(""); }}
                      disabled={actionLoading === ev.id}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <Icon name="XCircle" size={14} className="mr-1.5" />
                      Отклонить
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reject dialog */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="font-bold text-lg mb-1">Отклонить событие</h3>
            <p className="text-sm text-muted-foreground mb-4">
              «{rejectTarget.title}» — укажите причину, чтобы организатор мог исправить событие.
            </p>
            <textarea
              className="w-full border rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              rows={3}
              placeholder="Причина отклонения (необязательно)..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="flex gap-2 mt-4">
              <Button
                size="sm"
                variant="destructive"
                onClick={handleRejectConfirm}
                disabled={actionLoading === rejectTarget.id}
              >
                {actionLoading === rejectTarget.id ? (
                  <Icon name="Loader2" size={14} className="animate-spin mr-1.5" />
                ) : null}
                Отклонить
              </Button>
              <Button size="sm" variant="outline" onClick={() => setRejectTarget(null)}>
                Отмена
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
